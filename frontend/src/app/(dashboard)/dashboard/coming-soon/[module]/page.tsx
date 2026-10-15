import Link from "next/link";
import { ArrowLeft, Clock3 } from "lucide-react";

type ComingSoonPageProps = {
  params: Promise<{
    module: string;
  }>;
};

const moduleTitles: Record<string, string> = {
  "users-permissions": "Users & Permissions",
  organization: "Organization",
  settings: "Settings",
  "my-account": "My Account",
};

export default async function ComingSoonPage({ params }: ComingSoonPageProps) {
  const { module } = await params;
  const title = moduleTitles[module] ?? "Feature";

  return (
    <div className="max-w-5xl mx-auto min-h-[60vh] flex items-center justify-center">
      <div className="w-full bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Clock3 className="h-7 w-7" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
          Coming Soon
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">
          This section is being prepared and will be available soon.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
