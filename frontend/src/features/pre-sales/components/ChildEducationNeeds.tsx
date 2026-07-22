"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RotateCcw, Download, Eye, AlertCircle, Loader2 } from "lucide-react";
import PreSalesModuleNav from "./PreSalesModuleNav";
import { SearchableSelect } from "@/features/customers/components/CustomerUi";

// "years" categories: user enters years-remaining directly (School Education).
// "age" categories: user enters the child's age at which the goal occurs,
// and years-remaining is derived from the child's current age.
type CategoryMode = "years" | "age";

interface ExpenseCategory {
  key: string;
  label: string;
  mode: CategoryMode;
  years: number | "";      // used when mode === "years"
  targetAge: number | "";  // used when mode === "age"
  cost: number | "";
  resultLabel: string;     // "Total Cost of Schooling" vs "Future Cost"
}

function fmt(n: number) {
  return Math.round(n).toLocaleString("en-IN");
}

function computeAge(dobStr: string): number | "" {
  if (!dobStr) return "";
  const birth = new Date(dobStr);
  if (isNaN(birth.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : 0;
}

const CATEGORY_DEFS: { key: string; label: string; mode: CategoryMode; resultLabel: string }[] = [
  { key: "school", label: "School Education Expenses", mode: "years", resultLabel: "Total Cost of Schooling" },
  { key: "graduation", label: "Graduation Expenses", mode: "age", resultLabel: "Future Cost" },
  { key: "postgrad", label: "Post Graduation Expenses", mode: "age", resultLabel: "Future Cost" },
  { key: "career", label: "Career Launching", mode: "age", resultLabel: "Future Cost" },
  { key: "marriage", label: "Marriage", mode: "age", resultLabel: "Future Cost" },
];

export default function ChildEducationNeedsCalculator() {
  const router = useRouter();
  const proposalRef = useRef<HTMLDivElement>(null);

  const [salutation, setSalutation] = useState("Mr.");
  const [childName, setChildName] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [inflation, setInflation] = useState<number | "">(6);
  const [savingRate, setSavingRate] = useState<number | "">(6);

  const [categories, setCategories] = useState<ExpenseCategory[]>(
    CATEGORY_DEFS.map((c) => ({ key: c.key, label: c.label, mode: c.mode, years: "", targetAge: "", cost: "", resultLabel: c.resultLabel }))
  );

  const [showResults, setShowResults] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => setAge(computeAge(dob)), [dob]);

  // Years remaining for a category — direct entry for "years" mode, or
  // derived from the child's current age for "age" mode.
  function yearsFor(cat: ExpenseCategory) {
    if (cat.mode === "years") {
      return cat.years === "" ? 0 : Number(cat.years);
    }
    if (age === "" || cat.targetAge === "") return 0;
    return Math.max(0, Number(cat.targetAge) - Number(age));
  }

  // Future cost — computed live so the row updates as the user types,
  // before Calculate.
  function futureCost(cat: ExpenseCategory) {
    if (cat.cost === "") return 0;
    const n = yearsFor(cat);
    const rate = inflation === "" ? 0 : Number(inflation);
    return Number(cat.cost) * Math.pow(1 + rate / 100, n);
  }

  const totalUpbringingCost = categories.reduce((sum, c) => sum + futureCost(c), 0);

  const updateCategory = (key: string, patch: Partial<ExpenseCategory>) => {
    setCategories((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  };

  const handleReset = () => {
    setSalutation("Mr.");
    setChildName("");
    setDob("");
    setAge("");
    setInflation(6);
    setSavingRate(6);
    setCategories(CATEGORY_DEFS.map((c) => ({ key: c.key, label: c.label, mode: c.mode, years: "", targetAge: "", cost: "", resultLabel: c.resultLabel })));
    setShowResults(false);
    setValidationError(null);
  };

  const calculate = useCallback((): boolean => {
    setValidationError(null);
    if (!childName.trim()) { setValidationError("Please enter the child's name."); return false; }
    if (!dob) { setValidationError("Please enter the child's date of birth."); return false; }
    const hasAnyCost = categories.some((c) => c.cost !== "" && Number(c.cost) > 0);
    if (!hasAnyCost) { setValidationError("Please enter at least one expense category."); return false; }
    const badAge = categories.some(
      (c) => c.mode === "age" && c.cost !== "" && Number(c.cost) > 0 && (c.targetAge === "" || Number(c.targetAge) <= Number(age))
    );
    if (badAge) { setValidationError("'At What Age' must be greater than the child's current age."); return false; }
    setShowResults(true);
    return true;
  }, [childName, dob, age, categories]);

  // ── Shared PDF builder — used by both "View" and "Download" ──────────
  const buildPdf = async () => {
    const ok = calculate();
    if (!ok) return null;
    await new Promise((r) => setTimeout(r, 200));
    if (!proposalRef.current) return null;

    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import("jspdf"),
      import("html2canvas"),
    ]);
    const node = proposalRef.current;
    const scale = 2;
    const canvas = await html2canvas(node, { scale, useCORS: true, backgroundColor: "#ffffff", logging: false });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const usableW = pageW - margin * 2;
    const usableHmm = pageH - margin * 2 - 6;
    const pxPerMm = canvas.width / usableW;
    const pageHpx = usableHmm * pxPerMm;

    const containerTop = node.getBoundingClientRect().top;
    const atoms = Array.from(node.querySelectorAll("tr, [data-pdf-block]"));
    const bounds = atoms
      .map((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        return { top: (r.top - containerTop) * scale, bottom: (r.bottom - containerTop) * scale };
      })
      .sort((a, b) => a.top - b.top);

    function snapEnd(naiveEnd: number, startPx: number) {
      if (naiveEnd >= canvas.height) return canvas.height;
      const straddling = bounds.find((b) => b.top < naiveEnd && b.bottom > naiveEnd && b.top >= startPx);
      if (!straddling) return naiveEnd;
      return straddling.top > startPx ? straddling.top : naiveEnd;
    }

    const slices: { start: number; end: number }[] = [];
    let cursor = 0;
    while (cursor < canvas.height) {
      const end = snapEnd(Math.min(cursor + pageHpx, canvas.height), cursor);
      slices.push({ start: cursor, end });
      cursor = end;
    }
    const totalPages = slices.length;

    slices.forEach((slice, idx) => {
      if (idx > 0) pdf.addPage();
      const sliceHpx = slice.end - slice.start;
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHpx;
      const ctx = sliceCanvas.getContext("2d")!;
      ctx.drawImage(canvas, 0, slice.start, canvas.width, sliceHpx, 0, 0, canvas.width, sliceHpx);
      const sliceHmm = sliceHpx / pxPerMm;
      pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, margin, usableW, sliceHmm);
      pdf.setFontSize(8);
      pdf.setTextColor(120);
      pdf.text(`Pg. ${idx + 1} of ${totalPages}`, pageW - margin, pageH - 4, { align: "right" });
    });

    return pdf;
  };

  // ── View PDF — opens the generated report in a new tab before downloading ──
  const handleViewPDF = async () => {
    setPreviewing(true);
    try {
      const pdf = await buildPdf();
      if (!pdf) return;
      window.open(pdf.output("bloburl") as unknown as string, "_blank");
    } finally {
      setPreviewing(false);
    }
  };

  // ── Download PDF
  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const pdf = await buildPdf();
      if (!pdf) return;
      const clientName = childName.trim() ? childName.trim().replace(/\s+/g, "_") : "Child_Education";
      pdf.save(`${clientName}_Education_Needs_Report.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900">Child Education Needs Analysis</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} title="Reset" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
            <RotateCcw size={16} />
          </button>
          <button onClick={() => router.back()} title="Back" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
            <ArrowLeft size={16} />
          </button>
        </div>
      </div>

      <PreSalesModuleNav />

      {/* ── Child Info ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
        <div className="border-b border-slate-200 bg-slate-50/90 px-5 py-3.5">
          <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">Child Info</h2>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex gap-2">
              <div className="w-24">
                <SearchableSelect label="Title" value={salutation} onChange={setSalutation} options={["Mr.", "Mrs.", "Ms.", "Master", "Miss"].map((s) => ({ value: s, label: s }))} />
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Child Name<span className="ml-0.5 text-rose-500">*</span></label>
                <input value={childName} onChange={(e) => setChildName(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15" />
              </div>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Date of Birth<span className="ml-0.5 text-rose-500">*</span></label>
            <div className="flex gap-2">
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15" />
              <input readOnly value={age} title="Age" className="w-16 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 text-center text-sm text-slate-500" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Inflation Rate</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={inflation}
                onChange={(e) => setInflation(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15"
              />
              <span className="text-sm text-slate-500">%</span>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Saving Rate</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={savingRate}
                onChange={(e) => setSavingRate(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15"
              />
              <span className="text-sm text-slate-500">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Expense Categories ─────────────────────────────────────────── */}
      {categories.map((cat) => (
        <div key={cat.key} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
          <div className="border-b border-slate-200 bg-slate-50/90 px-5 py-3.5">
            <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">{cat.label}</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
            <div className="min-w-0">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {cat.mode === "years" ? "No. of Years Remaining" : "At What Age"}
              </label>
              <div className="flex items-center gap-2">
                {cat.mode === "years" ? (
                  <input
                    type="number"
                    value={cat.years}
                    onChange={(e) => updateCategory(cat.key, { years: e.target.value === "" ? "" : Number(e.target.value) })}
                    className="w-full min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15"
                  />
                ) : (
                  <input
                    type="number"
                    value={cat.targetAge}
                    onChange={(e) => updateCategory(cat.key, { targetAge: e.target.value === "" ? "" : Number(e.target.value) })}
                    className="w-full min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15"
                  />
                )}
                <span className="text-sm text-slate-500">Yrs.</span>
              </div>
            </div>
            <div className="min-w-0">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {cat.mode === "years" ? "Present Annual Cost" : "Cost As On Today"}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={cat.cost}
                  onChange={(e) => updateCategory(cat.key, { cost: e.target.value === "" ? "" : Number(e.target.value) })}
                  className="w-full min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15"
                />
                <span className="text-sm text-slate-500">Rs.</span>
              </div>
            </div>
            <div className="min-w-0">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 truncate">{cat.resultLabel}</label>
              <div className="flex items-center gap-2">
                <input readOnly title={`${fmt(futureCost(cat))}`} value={fmt(futureCost(cat))} className="w-full min-w-0 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700" />
                <span className="text-sm text-slate-500">Rs.</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* ── Result ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
        <div className="border-b border-slate-200 bg-slate-50/90 px-5 py-3.5">
          <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">Result</h2>
        </div>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <p className="text-sm font-medium text-slate-700 whitespace-nowrap">Total cost of Upbringing your child</p>
            <input readOnly value={`Rs. ${fmt(totalUpbringingCost)}`} className="w-56 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700" />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleViewPDF}
              disabled={previewing || downloading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              {previewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
              {previewing ? "Preparing..." : "View PDF"}
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading || previewing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B1220] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#16294D] disabled:opacity-60"
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {downloading ? "Generating..." : "Create PDF"}
            </button>
          </div>
        </div>
        {validationError && (
          <div className="mx-5 mb-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle size={16} />
            {validationError}
          </div>
        )}
      </div>

      {/* ── REPORT PREVIEW / PDF CAPTURE TEMPLATE ─────────────────────────── */}
      {showResults && (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
          <div className="border-b border-slate-200 bg-slate-50/90 px-5 py-4">
            <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">Report Preview</h2>
            <p className="mt-1 text-sm text-slate-500">This is exactly what your downloaded PDF will look like.</p>
          </div>
          <div className="overflow-x-auto bg-slate-100 p-4 sm:p-6">
            <div
              ref={proposalRef}
              style={{
                width: "794px",
                margin: "0 auto",
                backgroundColor: "#fff",
                fontFamily: "Arial, sans-serif",
                fontSize: "13px",
                color: "#111",
                padding: "48px 40px",
                lineHeight: "1.5",
                boxShadow: "0 4px 24px rgba(15,23,42,0.12)",
              }}
            >
              <div data-pdf-block style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "2px solid #0B1220", paddingBottom: "8px", marginBottom: "20px" }}>
                <div>
                  <div style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "1px", textTransform: "uppercase" }}>Child Education Needs Analysis</div>
                  <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>Projected cost of upbringing {childName || "the child"}</div>
                </div>
              </div>

              <div data-pdf-block style={{ border: "1px solid #ccc", borderRadius: "6px", padding: "14px 18px", marginBottom: "18px", background: "#fafafa" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", fontSize: "13px" }}>
                  <div><strong>Child's Name:</strong> {salutation} {childName}</div>
                  <div style={{ textAlign: "right" }}><strong>Date of Birth:</strong> {dob}</div>
                  <div><strong>Present Age:</strong> {age} yrs.</div>
                  <div style={{ textAlign: "right" }}><strong>Inflation Rate:</strong> {inflation === "" ? "—" : Number(inflation).toFixed(2)}% p.a.</div>
                  <div><strong>Saving Rate:</strong> {savingRate === "" ? "—" : Number(savingRate).toFixed(2)}% p.a.</div>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "18px" }}>
                <thead>
                  <tr style={{ background: "#0B1220", color: "#fff" }}>
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>Expense Category</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>{"Yrs. / At What Age"}</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Cost As On Today</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>{"Result"}</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat, i) => (
                    <tr key={cat.key} style={{ background: i % 2 === 0 ? "#fff" : "#f8f8f8", borderBottom: "1px solid #e5e5e5" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{cat.label}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace" }}>
                        {cat.mode === "years" ? (cat.years || "—") : (cat.targetAge || "—")}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace" }}>Rs. {fmt(Number(cat.cost || 0))}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>Rs. {fmt(futureCost(cat))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div data-pdf-block style={{ border: "1px solid #B8873A", borderRadius: "6px", padding: "14px 18px", marginBottom: "16px", background: "#fffbf2", textAlign: "center" }}>
                <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#7a5200", marginBottom: "4px" }}>Total Cost of Upbringing Your Child</div>
                <div style={{ fontSize: "20px", fontWeight: 900, color: "#0B1220" }}>Rs. {fmt(totalUpbringingCost)}</div>
              </div>

              <p data-pdf-block style={{ margin: 0, fontSize: "12.5px", lineHeight: "1.65", color: "#333" }}>
                This projects the future cost of {childName || "the child"}'s schooling, graduation, post-graduation, career
                launching and marriage, assuming today's costs grow at {inflation === "" ? "—" : Number(inflation).toFixed(2)}%
                p.a. education inflation. Use this figure to plan a corpus sized to fund the child's upbringing without financial
                strain.
              </p>

              <div data-pdf-block style={{ marginTop: "28px", borderTop: "2px solid #0B1220", paddingTop: "10px", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#555", fontWeight: 600 }}>
                <span>Insure And Be Secure</span>
                <span>Generated on {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}