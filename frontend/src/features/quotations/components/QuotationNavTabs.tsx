"use client";

import React from "react";
import Link from "next/link";
import { QuotationProductType } from "../types";

interface QuotationNavTabsProps {
  productType: QuotationProductType;
  activeView: "list" | "new";
  onChangeProductType?: (type: QuotationProductType) => void;
  onChangeView?: (view: "list" | "new") => void;
}

export const QuotationNavTabs: React.FC<QuotationNavTabsProps> = ({
  productType,
  activeView,
  onChangeProductType,
  onChangeView,
}) => {
  const getProductTitle = () => {
    switch (productType) {
      case "LIFE_GUARD":
        return "Life Guard";
      case "PROTECT_AND_EARN":
        return "Protect & Earn";
      case "RETIRE_ENJOY_I":
        return "Retire Enjoy I";
      default:
        return "Quotation";
    }
  };

  const pageTitle =
    activeView === "list"
      ? `Quotation List - ${getProductTitle()}`
      : `Add Quotation - ${getProductTitle()}`;

  const products: Array<{ type: QuotationProductType; label: string }> = [
    { type: "PROTECT_AND_EARN", label: "Protect & Earn" },
    { type: "LIFE_GUARD", label: "Life Guard" },
    { type: "RETIRE_ENJOY_I", label: "Retire Enjoy I" },
  ];

  return (
    <div className="w-full space-y-4">
      {/* Top Header Row with Breadcrumb Title and Sub-Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-600 pb-2">
        <h1 className="text-xl font-semibold text-blue-700 tracking-tight">
          {pageTitle}
        </h1>

        {/* Sub-tabs: My Quotations / New Quotation */}
        <div className="flex items-center rounded-lg border border-slate-300 bg-white p-0.5 shadow-sm">
          <button
            onClick={() => onChangeView && onChangeView("list")}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${
              activeView === "list"
                ? "bg-[#186a8e] text-white shadow-inner font-semibold"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            My Quotations
          </button>
          <button
            onClick={() => onChangeView && onChangeView("new")}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${
              activeView === "new"
                ? "bg-[#186a8e] text-white shadow-inner font-semibold"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            New Quotation
          </button>
        </div>
      </div>

      {/* Main 3 Product Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {products.map((p) => {
          const isActive = productType === p.type;
          return (
            <button
              key={p.type}
              onClick={() => onChangeProductType && onChangeProductType(p.type)}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                isActive
                  ? "border-blue-600 text-blue-700 bg-blue-50/50"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
