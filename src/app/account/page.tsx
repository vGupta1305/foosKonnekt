import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default async function AccountPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-sm flex-1 px-4 py-16 sm:px-6">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium">{session.username}</span>{" "}
          ({session.role === "ADMIN" ? "Admin" : "Read-only"})
        </p>
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-md">
        <h2 className="mb-4 text-base font-semibold">Change password</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
