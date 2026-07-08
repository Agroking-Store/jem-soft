import { Suspense } from "react";
import CustomerListPage from "@/features/customers/pages/CustomerListPage";

function Loading() {
  return <div>Loading...</div>;
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <CustomerListPage />
    </Suspense>
  );
}
