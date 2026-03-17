import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CompanySettingsForm } from "./company-form";

export default async function CompanySettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const company = await db.companySettings.findFirst();
  if (!company) redirect("/dashboard");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Company Settings</h1>
        <p className="text-muted-foreground text-sm">Update your company profile information.</p>
      </div>
      <CompanySettingsForm company={company} />
    </div>
  );
}
