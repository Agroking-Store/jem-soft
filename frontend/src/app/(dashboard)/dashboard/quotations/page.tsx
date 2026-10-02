"use client";

import { Suspense, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import { AppDispatch, RootState } from "@/store/store";
import { fetchQuotations } from "@/features/quotations/quotationSlice";
import QuotationModuleNav from "@/features/quotations/components/QuotationModuleNav";
import { QuotationPageHero } from "@/features/quotations/components/QuotationUi";
import QuotationListPage from "@/features/quotations/pages/QuotationListPage";
import QuotationCreatePage from "@/features/quotations/pages/QuotationCreatePage";
import QuotationDetailsPage from "@/features/quotations/pages/QuotationDetailsPage";
import {
  QuotationModalShell,
  type QuotationModalEntry,
} from "@/features/quotations/components/QuotationModalStack";
import type { QuotationProductType } from "@/features/quotations/types";

function QuotationsPageInner() {
  const dispatch = useDispatch<AppDispatch>();
  const searchParams = useSearchParams();
  const { total } = useSelector((state: RootState) => state.quotations);

  const productParam = searchParams.get("product");
  const productType: QuotationProductType =
    productParam === "PROTECT_AND_EARN" || productParam === "RETIRE_ENJOY_I"
      ? productParam
      : "LIFE_GUARD";

  const [modalStack, setModalStack] = useState<QuotationModalEntry[]>([]);

  useEffect(() => {
    dispatch(fetchQuotations({ productType, page: 1, limit: 6 }));
  }, [dispatch, productType]);

  const openModal = (type: QuotationModalEntry["type"], id?: string, pt?: QuotationProductType) => {
    const key = `${type}-${id || "new"}-${Date.now()}`;
    let entry: QuotationModalEntry;
    if (type === "create") {
      entry = { key, type, productType: pt || productType };
    } else {
      entry = { key, type, id: id || "" };
    }
    setModalStack((prev) => [...prev, entry]);
  };

  const closeTopModal = () => {
    setModalStack((prev) => prev.slice(0, -1));
  };

  const closeModalAt = (index: number) => {
    setModalStack((prev) => prev.slice(0, index));
  };

  const renderModalContent = (modal: QuotationModalEntry) => {
    switch (modal.type) {
      case "create":
        return (
          <QuotationCreatePage
            productType={modal.productType}
            onClose={closeTopModal}
            onSaved={() => {
              dispatch(fetchQuotations({ productType, page: 1, limit: 6 }));
              closeTopModal();
            }}
          />
        );
      case "details":
        return (
          <QuotationDetailsPage
            quotationId={modal.id}
            onClose={closeTopModal}
            onOpenModal={openModal}
            modalStackLength={modalStack.length}
          />
        );
      case "report":
        return (
          <QuotationDetailsPage
            quotationId={modal.id}
            onClose={closeTopModal}
            onOpenModal={openModal}
            modalStackLength={modalStack.length}
            initialTab="report"
          />
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <QuotationPageHero
        title="Quotations"
        subtitle={`Manage your LIC quotation illustrations and reports`}
        icon={FileText}
        actions={
          <button
            type="button"
            onClick={() => openModal("create")}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
          >
            <Plus size={16} />
            Add Quotation
          </button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <QuotationModuleNav />
      </div>

      <QuotationListPage
        productType={productType}
        onOpenModal={openModal}
      />

      {modalStack.map((modal, index) => (
        <QuotationModalShell
          key={modal.key}
          entry={modal}
          depth={index}
          isTop={index === modalStack.length - 1}
          onClose={() => closeModalAt(index)}
        >
          {renderModalContent(modal)}
        </QuotationModalShell>
      ))}
    </div>
  );
}

export default function QuotationsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <QuotationsPageInner />
    </Suspense>
  );
}
