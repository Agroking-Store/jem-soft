"use client";

import { useState, useRef } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  Calendar,
  Building2,
  FileText,
  CheckCircle2,
  FileCheck,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store/store";
import { uploadCommissionBill, fetchCommissionBills } from "../commissionSlice";
import toast from "react-hot-toast";

interface UploadCommissionBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (billId?: string) => void;
}

export default function UploadCommissionBillModal({
  isOpen,
  onClose,
  onSuccess,
}: UploadCommissionBillModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { agencies } = useSelector((state: RootState) => state.agency);
  const { isUploading } = useSelector((state: RootState) => state.commissions);

  const [billNumber, setBillNumber] = useState<string>(
    `BILL-${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, "0")}`
  );
  const [billDate, setBillDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("");
  const [billType, setBillType] = useState<"consolidated" | "agent-wise">("consolidated");

  const [totalPremium, setTotalPremium] = useState<string>("");
  const [grossCommission, setGrossCommission] = useState<string>("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error("Please select the LIC Statement PDF file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("billNumber", billNumber.trim());
    formData.append("billDate", billDate);
    formData.append("billType", billType);
    if (selectedAgencyId) formData.append("agencyId", selectedAgencyId);

    if (totalPremium) formData.append("totalPremium", totalPremium);
    if (grossCommission) formData.append("grossCommission", grossCommission);

    formData.append("statementFile", selectedFile);

    const toastId = toast.loading("Uploading and saving commission statement PDF...");

    try {
      const res = await dispatch(uploadCommissionBill(formData)).unwrap();
      toast.success(res.message || "Commission bill PDF uploaded successfully!", {
        id: toastId,
      });
      dispatch(fetchCommissionBills(selectedAgencyId || undefined));
      onSuccess(res.bill?.id);
      onClose();
    } catch (err: any) {
      toast.error(err || "Failed to upload statement", { id: toastId });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1877F2]">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Upload Commission Statement (PDF)
              </h2>
              <p className="text-xs text-slate-500">
                Upload fortnightly LIC commission bill document
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bill Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bill Number / Code *
              </label>
              <div className="relative">
                <FileText
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  required
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  placeholder="e.g. 12/206"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-[#1877F2] focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                />
              </div>
            </div>

            {/* Bill Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Statement Date *
              </label>
              <div className="relative">
                <Calendar
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="date"
                  required
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-[#1877F2] focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Agency */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Agency
              </label>
              <div className="relative">
                <Building2
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={selectedAgencyId}
                  onChange={(e) => setSelectedAgencyId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-[#1877F2] focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                >
                  <option value="">Primary Agency</option>
                  {agencies?.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.agencyName} ({ag.agencyCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bill Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bill Type
              </label>
              <select
                value={billType}
                onChange={(e) => setBillType(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-sm text-slate-800 outline-none focus:border-[#1877F2] focus:bg-white focus:ring-2 focus:ring-blue-500/15"
              >
                <option value="consolidated">Consolidated Statement</option>
                <option value="agent-wise">Agent Wise Statement</option>
              </select>
            </div>
          </div>

          {/* Optional Amounts from cover page */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Premium Amount (₹) <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="number"
                step="any"
                value={totalPremium}
                onChange={(e) => setTotalPremium(e.target.value)}
                placeholder="e.g. 150000"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-sm text-slate-800 outline-none focus:border-[#1877F2] focus:bg-white focus:ring-2 focus:ring-blue-500/15"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gross Commission (₹) <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="number"
                step="any"
                value={grossCommission}
                onChange={(e) => setGrossCommission(e.target.value)}
                placeholder="e.g. 25000"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-sm text-slate-800 outline-none focus:border-[#1877F2] focus:bg-white focus:ring-2 focus:ring-blue-500/15"
              />
            </div>
          </div>

          {/* File Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Statement PDF File *
            </label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-[#1877F2] bg-blue-50/50"
                  : selectedFile
                  ? "border-green-400 bg-green-50/30"
                  : "border-slate-200 hover:border-blue-300 bg-slate-50/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center gap-1.5 text-slate-700">
                  <FileCheck size={36} className="text-emerald-600" />
                  <p className="text-xs font-bold text-slate-900 truncate max-w-xs">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Click to change
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#1877F2]">
                    <Upload size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Drop statement PDF here or <span className="text-[#1877F2]">browse</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Accepts official LIC PDF statement files
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1877F2] to-[#2563eb] text-white text-xs font-semibold shadow-md shadow-blue-500/20 hover:opacity-95 disabled:opacity-50 transition cursor-pointer"
            >
              {isUploading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Uploading PDF...</span>
                </>
              ) : (
                <>
                  <Upload size={14} />
                  <span>Upload & Save PDF</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
