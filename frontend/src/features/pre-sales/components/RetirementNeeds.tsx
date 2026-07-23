"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RotateCcw, Download, Eye, AlertCircle, Loader2 } from "lucide-react";
import PreSalesModuleNav from "./PreSalesModuleNav";
import { SearchableSelect } from "@/features/customers/components/CustomerUi";

type Unit = "month" | "annum";

interface NeedCategory {
  key: string;
  label: string;
  cost: number | "";
  unit: Unit;
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

const RATE_OPTIONS = [4, 5, 6, 6.5, 7, 7.5, 8].map((v) => ({ value: String(v), label: `${v}` }));

const CATEGORY_DEFS: { key: string; label: string }[] = [
  { key: "basic", label: "Basic & Essential Needs" },
  { key: "lifestyle", label: "Lifestyle Maintenance" },
  { key: "healthcare", label: "Healthcare" },
  { key: "buffer", label: "Buffer For Unforeseen Expenses" },
];

export default function RetirementNeedsCalculator() {
  const router = useRouter();
  const proposalRef = useRef<HTMLDivElement>(null);

  const [salutation, setSalutation] = useState("Mr.");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [retirement, setRetirement] = useState<number | "">(60);
  const [inflation, setInflation] = useState<number>(6);

  const [categories, setCategories] = useState<NeedCategory[]>(
    CATEGORY_DEFS.map((c) => ({ key: c.key, label: c.label, cost: "", unit: "month" as Unit }))
  );

  const [showResults, setShowResults] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => setAge(computeAge(dob)), [dob]);

  const n = Number(retirement || 0) - Number(age || 0);

  // Annual cost at retirement age for one category — computed live so the
  // "Annual Cost at Age X" field updates as the user types, before Calculate.
  function annualCostAtRetirement(cat: NeedCategory) {
    if (cat.cost === "" || !age || !retirement || n <= 0) return 0;
    const annualToday = cat.unit === "month" ? Number(cat.cost) * 12 : Number(cat.cost);
    const factor = Math.pow(1 + inflation / 100, n);
    return annualToday * factor;
  }

  const totalAnnualCost = categories.reduce((sum, c) => sum + annualCostAtRetirement(c), 0);

  const updateCategory = (key: string, patch: Partial<NeedCategory>) => {
    setCategories((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  };

  const handleReset = () => {
    setSalutation("Mr.");
    setName("");
    setDob("");
    setAge("");
    setRetirement(60);
    setInflation(6);
    setCategories(CATEGORY_DEFS.map((c) => ({ key: c.key, label: c.label, cost: "", unit: "month" as Unit })));
    setShowResults(false);
    setValidationError(null);
  };

  const calculate = useCallback((): boolean => {
    setValidationError(null);
    if (!name.trim()) { setValidationError("Please enter the name."); return false; }
    if (!dob) { setValidationError("Please enter the date of birth."); return false; }
    if (!retirement || Number(retirement) <= Number(age)) { setValidationError("Retirement Age must be greater than current age."); return false; }
    const hasAnyCost = categories.some((c) => c.cost !== "" && Number(c.cost) > 0);
    if (!hasAnyCost) { setValidationError("Please enter at least one cost category."); return false; }
    setShowResults(true);
    return true;
  }, [name, dob, age, retirement, categories]);

  // ── Shared PDF builder — row-safe pagination, used by both View and Download ──
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

  // ── View PDF — opens the report in a new tab before downloading ──
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
      const clientName = name.trim() ? `${salutation}_${name.trim().replace(/\s+/g, "_")}` : "Retirement_Needs";
      pdf.save(`${clientName}_Retirement_Needs_Report.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900">Retirement Needs Analysis</h1>
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

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-5 py-4">
          <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">Proposer Info</h2>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex gap-2">
              <div className="w-24">
                <SearchableSelect label="Title" value={salutation} onChange={setSalutation} options={["Mr.", "Mrs.", "Ms.", "Dr."].map((s) => ({ value: s, label: s }))} />
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Name<span className="ml-0.5 text-rose-500">*</span></label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15" />
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Date of Birth<span className="ml-0.5 text-rose-500">*</span></label>
            <div className="flex gap-2">
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15" />
              <input readOnly value={age} title="Age" className="w-16 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 text-center text-sm text-slate-500" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Retirement Age</label>
            <input type="number" value={retirement} onChange={(e) => setRetirement(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15" />
          </div>
          <div className="md:col-span-4 md:w-56">
            <SearchableSelect label="Inflation Rate (%)" value={String(inflation)} onChange={(v) => setInflation(Number(v))} options={RATE_OPTIONS} />
          </div>
        </div>
      </div>

      {categories.map((cat) => (
        <div key={cat.key} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
          <div className="border-b border-slate-200 bg-slate-50/90 px-5 py-3.5">
            <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">{cat.label}</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
            <div className="min-w-0">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Cost As On Today</label>
              <input
                type="number"
                value={cat.cost}
                onChange={(e) => updateCategory(cat.key, { cost: e.target.value === "" ? "" : Number(e.target.value) })}
                className="w-full min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15"
              />
            </div>
            <div className="min-w-0">
              <SearchableSelect
                label="Unit"
                value={cat.unit}
                onChange={(v) => updateCategory(cat.key, { unit: v as Unit })}
                options={[
                  { value: "month", label: "Per Month" },
                  { value: "annum", label: "Per Annum" },
                ]}
              />
            </div>
            <div className="min-w-0">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 truncate">
                Annual Cost at Age {retirement || "—"}
              </label>
              <input readOnly title={`₹ ${fmt(annualCostAtRetirement(cat))}`} value={`₹ ${fmt(annualCostAtRetirement(cat))}`} className="w-full min-w-0 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700" />
            </div>
          </div>
        </div>
      ))}

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
        <div className="border-b border-slate-200 bg-slate-50/90 px-5 py-3.5">
          <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">Result</h2>
        </div>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Total Annual Cost of Living (at retirement)</p>
            <p className="mt-1 break-words font-serif text-2xl font-semibold text-slate-900">₹ {fmt(totalAnnualCost)}</p>
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
                  <div style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "1px", textTransform: "uppercase" }}>Retirement Needs Analysis</div>
                  <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>Estimated cost of living at retirement</div>
                </div>
              </div>

              <div data-pdf-block style={{ border: "1px solid #ccc", borderRadius: "6px", padding: "14px 18px", marginBottom: "18px", background: "#fafafa" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", fontSize: "13px" }}>
                  <div><strong>Name:</strong> {salutation} {name}</div>
                  <div style={{ textAlign: "right" }}><strong>Date of Birth:</strong> {dob}</div>
                  <div><strong>Present Age:</strong> {age} yrs.</div>
                  <div style={{ textAlign: "right" }}><strong>Retirement Age:</strong> {retirement} yrs.</div>
                  <div><strong>Years to Retirement:</strong> {n > 0 ? n : "—"}</div>
                  <div style={{ textAlign: "right" }}><strong>Inflation Rate:</strong> {inflation.toFixed(2)}% p.a.</div>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "18px" }}>
                <thead>
                  <tr style={{ background: "#0B1220", color: "#fff" }}>
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>Need Category</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Cost As On Today</th>
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>Unit</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Annual Cost at Age {retirement}</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat, i) => (
                    <tr key={cat.key} style={{ background: i % 2 === 0 ? "#fff" : "#f8f8f8", borderBottom: "1px solid #e5e5e5" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{cat.label}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace" }}>₹ {fmt(Number(cat.cost || 0))}</td>
                      <td style={{ padding: "8px 10px" }}>{cat.unit === "month" ? "Per Month" : "Per Annum"}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>₹ {fmt(annualCostAtRetirement(cat))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div data-pdf-block style={{ border: "1px solid #B8873A", borderRadius: "6px", padding: "14px 18px", marginBottom: "16px", background: "#fffbf2", textAlign: "center" }}>
                <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#7a5200", marginBottom: "4px" }}>Total Annual Cost of Living at Age {retirement}</div>
                <div style={{ fontSize: "20px", fontWeight: 900, color: "#0B1220" }}>₹ {fmt(totalAnnualCost)}</div>
              </div>

              <p data-pdf-block style={{ margin: 0, fontSize: "12.5px", lineHeight: "1.65", color: "#333" }}>
                This projects what {salutation} {name}'s current cost of living, growing at {inflation.toFixed(2)}% p.a. inflation, will
                cost annually by age {retirement}. Use this figure to plan a retirement corpus sized to sustain the same standard of
                living without a working income.
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