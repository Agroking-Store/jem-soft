import { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "outline" | "destructive" | "ghost";
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = ({
  children,
  isLoading = false,
  variant = "primary",
  className = "",
  disabled,
  leftIcon,
  rightIcon,
  ...props
}: ButtonProps) => {
  const variants = {
    primary:
      "bg-[#0B1220] hover:bg-[#16294D] text-white shadow-sm shadow-[#0B1220]/20",
    secondary:
      "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200",
    outline:
      "border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 bg-white",
    destructive:
      "bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/15",
    ghost:
      "text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-transparent",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`
        flex items-center justify-center gap-2
        rounded-xl px-4 py-2.5 text-sm font-semibold
        transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8873A]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white
        disabled:cursor-not-allowed disabled:opacity-60
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
