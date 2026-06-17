import { LoginForm } from "@/features/auth/components/LoginForm";
import Link from "next/link";

export const metadata = { title: "Login | JEM" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-10">
      <LoginForm />

      <div className="text-center space-y-6">
        <div className="flex justify-center gap-6 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
          <span>© 2025 JEM. All rights reserved.</span>
        </div>
        <div className="flex justify-center gap-4 text-xs text-gray-400">
          <Link href="#" className="hover:text-white">
            Privacy Policy
          </Link>
          <Link href="#" className="hover:text-white">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
