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
      "border-2 border-[#0B1220] text-[#0B1220] hover:bg-[#0B1220]/5 bg-transparent",
    destructive:
      "bg-[#A93226] hover:bg-[#8E2A20] text-white shadow-sm",
    ghost:
      "text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-transparent",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`
        flex items-center justify-center gap-2
        px-4 py-2.5 rounded-lg font-semibold text-sm
        transition-all duration-200
        disabled:opacity-60 disabled:cursor-not-allowed
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