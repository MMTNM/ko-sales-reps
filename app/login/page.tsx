import { redirect } from "next/navigation";
import { getOptionalPageUser } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getOptionalPageUser();
  if (user) redirect("/");

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
        <p className="mt-1 text-sm text-gray-500">KO Roofing sales portal</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
