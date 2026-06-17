import { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

export const Button = ({
  children,
  isLoading = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) => {
  return (
    <button
      disabled={disabled || isLoading}
      className={`
        flex items-center justify-center gap-2
        w-full px-4 py-3 rounded-lg font-bold text-slate-900
        bg-brand-blue hover:bg-[#c5d3ff] transition-all
        disabled:opacity-60 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    >
      {isLoading ? <Loader2 size={20} className="animate-spin" /> : children}
    </button>
  );
};
