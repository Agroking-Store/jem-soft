"use client";

import React, { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RotateCcw, Download, AlertCircle, Loader2 } from "lucide-react";
import PreSalesModuleNav from "./PreSalesModuleNav";
import { SearchableSelect } from "@/features/customers/components/CustomerUi";

interface WealthRow {
  year: number;
  income: number;
  expenses: number;
  netWealth: number;
}

function fmt(n: number) {
  return n.toLocaleString("en-IN");
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

const RATE_OPTIONS = [4, 5, 6, 7, 8].map((v) => ({ value: String(v), label: `${v}` }));
const SAVING_RATE_OPTIONS = [4, 4.5, 5, 5.5, 6, 6.5, 7].map((v) => ({ value: String(v), label: `${v}` }));

export default function IncomeReplacementCalculator() {
  const router = useRouter();
  const proposalRef = useRef<HTMLDivElement>(null);

  const [salutation, setSalutation] = useState("Mr.");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [retirement, setRetirement] = useState<number | "">("");
  const [annualIncome, setAnnualIncome] = useState<number | "">("");
  const [expenses, setExpenses] = useState<number | "">("");
  const [incomeGrowth, setIncomeGrowth] = useState<number | "">("");
  const [inflation, setInflation] = useState<number>(5);
  const [savingRate, setSavingRate] = useState<number>(5.5);
  const [presentSavings, setPresentSavings] = useState<number | "">(0);
  const [existingCover, setExistingCover] = useState<number | "">(0);

  const [showResults, setShowResults] = useState(false);
  const [tableData, setTableData] = useState<WealthRow[]>([]);
  const [totalNetWealth, setTotalNetWealth] = useState(0);
  const [insuranceRecommended, setInsuranceRecommended] = useState(0);
  const [additionalInsurance, setAdditionalInsurance] = useState(0);
  const [cashFlow, setCashFlow] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  React.useEffect(() => setAge(computeAge(dob)), [dob]);

  const handleReset = () => {
    setSalutation("Mr.");
    setName("");
    setDob("");
    setAge("");
    setRetirement("");
    setAnnualIncome("");
    setExpenses("");
    setIncomeGrowth("");
    setInflation(5);
    setSavingRate(5.5);
    setPresentSavings(0);
    setExistingCover(0);
    setShowResults(false);
    setTableData([]);
    setValidationError(null);
  };

  // Growing annuity due PV — same verified formula used in the HLV calculator.
  function pvGrowingAnnuityDue(PMT: number, g: number, r: number, n: number) {
    if (Math.abs(r - g) < 1e-9) return PMT * n * (1 + r);
    return (PMT * (1 - Math.pow((1 + g) / (1 + r), n))) / (r - g) * (1 + r);
  }

  const calculate = useCallback((): boolean => {
    setValidationError(null);
    if (!name.trim()) { setValidationError("Please enter the name."); return false; }
    if (!dob) { setValidationError("Please enter the date of birth."); return false; }
    if (retirement === "" || age === "") { setValidationError("Please specify Retirement Age."); return false; }
    if (Number(retirement) <= Number(age)) { setValidationError("Retirement Age must be greater than current age."); return false; }
    if (!annualIncome || Number(annualIncome) <= 0) { setValidationError("Annual Income must be > 0."); return false; }
    if (!expenses || Number(expenses) <= 0) { setValidationError("Expenses on self must be > 0."); return false; }
    if (incomeGrowth === "" || Number(incomeGrowth) < 0) { setValidationError("Please specify Extd. Growth in Income."); return false; }

    const n = Number(retirement) - Number(age);
    const g1 = Number(incomeGrowth) / 100; // income growth
    const g2 = inflation / 100;            // expense growth
    const r = savingRate / 100;
    const income0 = Number(annualIncome);
    const exp0 = Number(expenses);
    const sav = Number(presentSavings || 0);
    const cov = Number(existingCover || 0);

    // Year-by-year wealth table
    const rows: WealthRow[] = [];
    let income = income0;
    let expense = exp0;
    let yr = new Date().getFullYear();
    let total = 0;
    for (let i = 0; i < n; i++) {
      const roundedIncome = Math.round(income);
      const roundedExpense = Math.round(expense);
      const net = roundedIncome - roundedExpense;
      rows.push({ year: yr, income: roundedIncome, expenses: roundedExpense, netWealth: net });
      total += net;
      income = income * (1 + g1);
      expense = expense * (1 + g2);
      yr++;
    }

    const pvIncome = pvGrowingAnnuityDue(income0, g1, r, n);
    const pvExpense = pvGrowingAnnuityDue(exp0, g2, r, n);
    const recommended = Math.round(pvIncome - pvExpense);
    const already = sav + cov;
    const additional = Math.max(0, recommended - already);

    setTableData(rows);
    setTotalNetWealth(total);
    setInsuranceRecommended(recommended);
    setAdditionalInsurance(additional);
    setCashFlow(already);
    setShowResults(true);
    return true;
  }, [name, dob, age, retirement, annualIncome, expenses, incomeGrowth, inflation, savingRate, presentSavings, existingCover]);

  // ── PDF download — same row-safe pagination as the HLV calculator ──────
  const handleDownloadPDF = async () => {
    const ok = calculate();
    if (!ok) return;
    await new Promise((r) => setTimeout(r, 200));
    if (!proposalRef.current) return;
    setDownloading(true);
    try {
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

      const clientName = name.trim() ? `${salutation}_${name.trim().replace(/\s+/g, "_")}` : "Income_Replacement";
      pdf.save(`${clientName}_Income_Replacement_Report.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  const n = Number(retirement || 0) - Number(age || 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900">Pre-Sales Tools</h1>
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
          <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
            Income Replacement Analysis
          </h2>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1220] px-4 py-2 text-xs font-semibold text-white hover:bg-[#16294D] disabled:opacity-60"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {downloading ? "Generating..." : "Download PDF"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="w-24">
                <SearchableSelect
                  label="Salutation"
                  value={salutation}
                  onChange={setSalutation}
                  options={["Mr.", "Mrs.", "Ms.", "Dr."].map((s) => ({ value: s, label: s }))}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Name<span className="ml-0.5 text-rose-500">*</span></label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15" />
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">D.O.B.<span className="ml-0.5 text-rose-500">*</span></label>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15" />
              </div>
              <div className="w-20">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Age</label>
                <input readOnly value={age} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Retirement Age<span className="ml-0.5 text-rose-500">*</span></label>
              <input type="number" value={retirement} onChange={(e) => setRetirement(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15" />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Annual Income<span className="ml-0.5 text-rose-500">*</span></label>
              <input type="number" value={annualIncome} onChange={(e) => setAnnualIncome(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15" />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Expenses (on self)<span className="ml-0.5 text-rose-500">*</span></label>
              <input type="number" value={expenses} onChange={(e) => setExpenses(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15" />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Extd. Growth in Income<span className="ml-0.5 text-rose-500">*</span></label>
              <div className="flex items-center gap-2">
                <input type="number" value={incomeGrowth} onChange={(e) => setIncomeGrowth(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15" />
                <span className="text-sm text-slate-500 whitespace-nowrap">% p.a</span>
              </div>
            </div>

            <SearchableSelect
              label="Inflation Rate"
              value={String(inflation)}
              onChange={(v) => setInflation(Number(v))}
              options={RATE_OPTIONS}
            />

            <div>
              <SearchableSelect
                label="Saving Rate"
                value={String(savingRate)}
                onChange={(v) => setSavingRate(Number(v))}
                options={SAVING_RATE_OPTIONS}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Present Liquidable Savings</label>
              <input type="number" value={presentSavings} onChange={(e) => setPresentSavings(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15" />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Existing Life Insurance Cover</label>
              <input type="number" value={existingCover} onChange={(e) => setExistingCover(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15" />
            </div>
          </div>
        </div>

        {validationError && (
          <div className="mx-5 mb-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle size={16} />
            {validationError}
          </div>
        )}

        <div className="border-t border-slate-200 px-5 py-4">
          <button onClick={calculate} className="rounded-xl bg-[#0B1220] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#16294D]">
            Calculate
          </button>
        </div>
      </div>

      {showResults && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Total Net Wealth</p>
            <p className="mt-1 font-serif text-xl font-semibold text-slate-900">₹ {fmt(totalNetWealth)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Insurance Recommended</p>
            <p className="mt-1 font-serif text-xl font-semibold text-slate-900">₹ {fmt(insuranceRecommended)}</p>
          </div>
          <div className="rounded-2xl border border-[#B8873A]/30 bg-[#B8873A]/5 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B8873A]">Additional Insurance Needed</p>
            <p className="mt-1 font-serif text-xl font-semibold text-[#0B1220]">₹ {fmt(additionalInsurance)}</p>
          </div>
        </div>
      )}

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
              <div data-pdf-block style={{ borderBottom: "2px solid #0B1220", paddingBottom: "8px", marginBottom: "20px" }}>
                <div style={{ fontSize: "20px", fontWeight: 900, textTransform: "uppercase" }}>Income Replacement Analysis</div>
              </div>

              <div data-pdf-block style={{ border: "1px solid #ccc", borderRadius: "6px", padding: "14px 18px", marginBottom: "14px", background: "#fafafa" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", fontSize: "13px" }}>
                  <div><strong>Name:</strong> {salutation} {name}</div>
                  <div style={{ textAlign: "right" }}><strong>Date of Birth:</strong> {dob}</div>
                  <div><strong>Present Age:</strong> {age} yrs.</div>
                  <div style={{ textAlign: "right" }}><strong>Retirement Age:</strong> {retirement} yrs.</div>
                  <div><strong>Annual Income:</strong> ₹ {fmt(Number(annualIncome || 0))}</div>
                  <div style={{ textAlign: "right" }}><strong>Expenses on self:</strong> ₹ {fmt(Number(expenses || 0))}</div>
                  <div><strong>Rate of Inflation:</strong> {inflation.toFixed(2)}% p.a.</div>
                  <div style={{ textAlign: "right" }}><strong>Rate of Interest (Tax free):</strong> {savingRate.toFixed(2)}% p.a.</div>
                </div>
              </div>

              <div data-pdf-block style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>Estimated Growth</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "#0B1220", color: "#fff" }}>
                      <th style={{ padding: "6px 10px", textAlign: "left" }}>Stage</th>
                      <th style={{ padding: "6px 10px", textAlign: "left" }}>Period</th>
                      <th style={{ padding: "6px 10px", textAlign: "left" }}>Growth Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: "6px 10px" }}>1</td>
                      <td style={{ padding: "6px 10px" }}>{n}</td>
                      <td style={{ padding: "6px 10px" }}>{Number(incomeGrowth || 0).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div data-pdf-block style={{ border: "1px solid #B8873A", borderRadius: "6px", padding: "10px 18px", marginBottom: "14px", background: "#fffbf2", fontSize: "12.5px", lineHeight: "1.65" }}>
                {salutation} {name} is considered as the Bread Winner of his family. Considering the growth pattern specified in the table above, he will be generating wealth in the next {n} years as follows:
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px" }}>
                <thead>
                  <tr style={{ background: "#0B1220", color: "#fff" }}>
                    {["Year", "Annual Income", "Expenses On Self", "Net Wealth"].map((h) => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: h === "Year" ? "left" : "right", fontSize: "11px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8f8f8", borderBottom: "1px solid #e5e5e5" }}>
                      <td style={{ padding: "6px 10px", fontWeight: 600 }}>{row.year}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "monospace" }}>{fmt(row.income)}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "monospace", color: "#b45309" }}>{fmt(row.expenses)}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmt(row.netWealth)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p data-pdf-block style={{ fontSize: "10px", color: "#777", marginTop: "10px" }}>
                Note: Mutual Fund Investments are subject to market risks. If you find any difference between this report and your AMC statement, please contact us.
              </p>

              <div data-pdf-block style={{ border: "1px solid #ccc", borderRadius: "6px", padding: "14px 18px", marginTop: "18px", marginBottom: "10px", background: "#fafafa" }}>
                <strong>Total Net Wealth:</strong> ₹ {fmt(totalNetWealth)}
              </div>

              <div data-pdf-block style={{ fontSize: "12.5px", lineHeight: "1.65", marginBottom: "14px" }}>
                In an unfortunate event of his death, his family may get deprived of the wealth that you would have generated otherwise.
                Hence there is a need to safeguard this potential wealth. An insurance of Rs. {fmt(insuranceRecommended)} is recommended to ensure the same flow of wealth as shown above.
                Since he is already insured for Rs. {fmt(cashFlow)}, a further insurance of Rs. {fmt(additionalInsurance)} is now suggested.
              </div>

              <div data-pdf-block style={{ marginTop: "24px", borderTop: "2px solid #0B1220", paddingTop: "10px", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#555", fontWeight: 600 }}>
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