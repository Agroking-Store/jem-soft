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
        <label className="text-xs font-medium text-slate-600 uppercase tracking-wider">
          {label}
        </label>
        <div className="relative group">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full bg-slate-50 border rounded-lg text-sm py-2.5 transition-all
              ${icon ? "pl-10" : "px-3"}
              outline-none border-slate-200 text-slate-900
              focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
              placeholder:text-slate-400
              ${error ? "border-red-500 focus:ring-red-500/20" : "hover:border-slate-300"}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";