export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 auth-gradient">
      <div className="hidden lg:flex flex-col justify-center px-16 xl:px-24">
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-white p-2 rounded-lg">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold italic">
              JEM
            </div>
          </div>
          <span className="text-3xl font-bold tracking-tight text-white">
            JEM
          </span>
        </div>

        <h1 className="text-5xl font-bold text-white leading-tight mb-6">
          Smart Insurance & <br />
          Investment Management <br />
          Platform
        </h1>

        <p className="text-gray-400 text-lg max-w-md leading-relaxed">
          Experience the next generation of financial clarity with our
          enterprise-grade portfolio intelligence and risk assessment tools.
        </p>
      </div>

      <div className="flex items-center justify-center p-6 lg:bg-slate-900/20">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
