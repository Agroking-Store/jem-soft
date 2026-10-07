import { Header } from "@/shared/components/Header";
import { Sidebar } from "@/shared/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto bg-slate-50/50">
          {children}
        </main>
      </div>
    </div>
  );
}