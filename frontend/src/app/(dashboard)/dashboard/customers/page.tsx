import { Suspense } from "react";
import CustomerListPage from "@/features/customers/pages/CustomerListPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <CustomerListPage />
    </Suspense>
  );
}
