import { LoginForm } from "@/features/auth/components/LoginForm";
import Link from "next/link";

export const metadata = { title: "Login | JEM Soft" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-8">
      <LoginForm />

      <div className="text-center space-y-6">
        <div className="flex justify-center gap-6 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
          <span>© 2025 JEM Soft. All rights reserved.</span>
        </div>
        <div className="flex justify-center gap-4 text-xs text-slate-400">
          <Link href="#" className="hover:text-blue-600 transition-colors">
            Privacy Policy
          </Link>
          <Link href="#" className="hover:text-blue-600 transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}