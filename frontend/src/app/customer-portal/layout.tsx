import CustomerPortalLayout from "@/features/customers/pages/CustomerPortalLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CustomerPortalLayout>{children}</CustomerPortalLayout>;
}
