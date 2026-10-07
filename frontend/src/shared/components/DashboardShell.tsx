"use client";

import { useState } from "react";
import { Header } from "@/shared/components/Header";
import { Sidebar } from "@/shared/components/Sidebar";

export const DashboardShell = ({ children }: { children: React.ReactNode }) => {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);

  const closeNavigation = () => setIsNavigationOpen(false);

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <Sidebar isOpen={isNavigationOpen} onClose={closeNavigation} />
      {isNavigationOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-slate-950/40 lg:hidden"
          aria-label="Close navigation overlay"
          onClick={closeNavigation}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          isNavigationOpen={isNavigationOpen}
          onMenuToggle={() => setIsNavigationOpen((isOpen) => !isOpen)}
        />
        <main className="min-w-0 flex-1 overflow-x-hidden bg-slate-50/50 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
