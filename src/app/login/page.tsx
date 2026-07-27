import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-md">
        <div className="mb-6 flex flex-col gap-1 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            FoosKonnekt
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
