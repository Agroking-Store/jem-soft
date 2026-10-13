import Link from "next/link";

export const metadata = { title: "Terms of Service | JEM Soft" };

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-white px-5 py-12 text-slate-900 sm:px-8">
      <Link href="/login" className="text-sm font-semibold text-blue-600 hover:text-blue-700">Back to sign in</Link>
      <h1 className="mt-8 text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        JEM Soft is provided for authorized insurance-management work. Use the application only with valid organizational access and ensure records are accurate before saving, sending, or generating reports.
      </p>
      <h2 className="mt-8 text-xl font-semibold">Access and security</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Do not share accounts or export customer information outside approved business processes. Your organization may limit access according to your assigned role.
      </p>
    </main>
  );
}
