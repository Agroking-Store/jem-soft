import { InputHTMLAttributes, forwardRef, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </label>
        <div className="relative group">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#B8873A] transition-colors">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full bg-white border rounded-lg text-sm py-2.5 transition-all
              ${icon ? "pl-10 pr-3" : "px-3"}
              outline-none text-slate-900
              border-slate-200 hover:border-slate-300
              focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A]
              placeholder:text-slate-400
              ${error ? "border-red-400 focus:ring-red-400/20 focus:border-red-400" : ""}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";