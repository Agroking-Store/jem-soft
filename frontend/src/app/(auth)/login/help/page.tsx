import Link from "next/link";

export const metadata = { title: "Sign-in Help | JEM Soft" };

export default function LoginHelpPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-10">
      <h1 className="text-2xl font-bold text-slate-900">Need help signing in?</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Contact your JEM Soft administrator to verify your account or reset your password.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      >
        Back to sign in
      </Link>
    </div>
  );
}
