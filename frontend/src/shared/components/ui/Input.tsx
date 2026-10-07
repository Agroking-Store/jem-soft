import { InputHTMLAttributes, forwardRef, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = "", ...props }, ref) => {
    return (
      <div className="flex w-full flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </label>
        <div className="group relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#B8873A]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full rounded-xl border bg-white py-2.75 text-sm text-slate-900 transition-all
              ${icon ? "pl-10 pr-3" : "px-3"}
              border-slate-200 outline-none placeholder:text-slate-400
              hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15
              ${error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-400/15" : ""}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="mt-0.5 text-xs text-rose-600">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";
