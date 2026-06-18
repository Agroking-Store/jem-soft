import { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "outline";
}

export const Button = ({
  children,
  isLoading = false,
  variant = "primary",
  className = "",
  disabled,
  ...props
}: ButtonProps) => {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`
        flex items-center justify-center gap-2
        w-full px-4 py-3 rounded-lg font-semibold
        transition-all duration-200
        disabled:opacity-60 disabled:cursor-not-allowed
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {isLoading ? <Loader2 size={20} className="animate-spin" /> : children}
    </button>
  );
};