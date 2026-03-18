import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SetupWizard } from "./setup-wizard";

export default async function SetupPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  let company = null;
  let bankAccounts: any[] = [];
  let numberingConfigs: any[] = [];

  try {
    [company, bankAccounts, numberingConfigs] = await Promise.all([
      db.companySettings.findFirst(),
      db.bankAccount.findMany({ orderBy: { createdAt: "asc" } }).catch(() => []),
      db.numberingConfig.findMany({ orderBy: { docType: "asc" } }).catch(() => []),
    ]);
  } catch (error) {
    console.error("Failed to fetch setup data:", error);
  }

  if (!company) redirect("/dashboard");

  // Already set up — go to dashboard
  if (company.isSetupComplete) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4">
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome to DocuFlow</h1>
        <p className="text-muted-foreground mt-1">
          Let&apos;s set up your company in a few quick steps.
        </p>
      </div>
      <SetupWizard
        initialCompany={company}
        initialBankAccounts={bankAccounts}
        initialNumberingConfigs={numberingConfigs}
      />
    </div>
    </div>
  );
}
