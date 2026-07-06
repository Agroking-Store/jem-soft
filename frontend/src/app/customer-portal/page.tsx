import { Suspense } from "react";
import CustomerListPage from "@/features/customers/pages/CustomerListPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CustomerListPage />
    </Suspense>
  );
}
