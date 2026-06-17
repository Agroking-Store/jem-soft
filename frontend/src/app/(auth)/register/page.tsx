import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata = { title: "Register | JEM Soft" };

export default function RegisterPage() {
  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-700">Create account</h2>
        <p className="text-sm text-gray-500 mt-1">Join JEM Soft today</p>
      </div>
      <RegisterForm />
    </div>
  );
}
