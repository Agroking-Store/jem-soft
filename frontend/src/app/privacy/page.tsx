import Link from "next/link";

export const metadata = { title: "Privacy Policy | JEM Soft" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-white px-5 py-12 text-slate-900 sm:px-8">
      <Link href="/login" className="text-sm font-semibold text-blue-600 hover:text-blue-700">Back to sign in</Link>
      <h1 className="mt-8 text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        JEM Soft processes account, customer, policy, payment, claim, and communication data only to provide the insurance management services authorized for your organization.
      </p>
      <h2 className="mt-8 text-xl font-semibold">Your responsibilities</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Keep your sign-in credentials private and use customer information only for authorized business activities. Contact your organization administrator if you need access support or believe your account has been compromised.
      </p>
    </main>
  );
}
