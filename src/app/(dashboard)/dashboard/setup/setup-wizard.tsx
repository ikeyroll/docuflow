"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { CompanySettings, BankAccount, NumberingConfig } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import {
  companyInfoSchema,
  defaultsSchema,
  numberingConfigSchema,
  type CompanyInfoData,
  type DefaultsData,
  type NumberingConfigData,
  type BankAccountData,
} from "@/lib/validations/setup";
import {
  saveCompanyInfo,
  uploadLogo,
  saveBankAccounts,
  saveDefaults,
  saveNumberingConfig,
  completeSetup,
} from "@/lib/actions/setup";

const STEPS = [
  "Company Info",
  "Logo",
  "Bank Accounts",
  "Defaults",
  "Numbering",
  "Review",
];

interface SetupWizardProps {
  initialCompany: CompanySettings;
  initialBankAccounts: BankAccount[];
  initialNumberingConfigs: NumberingConfig[];
}

// ── Step 1: Company Info ───────────────────────────────────────────────────────
function StepCompanyInfo({
  initial,
  onNext,
}: {
  initial: CompanySettings;
  onNext: (data: CompanyInfoData) => void;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CompanyInfoData>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: {
      name: initial.name,
      ssmNumber: initial.ssmNumber,
      sstNumber: initial.sstNumber,
      address: initial.address,
      phone: initial.phone,
      email: initial.email,
      website: initial.website,
    },
  });

  async function onSubmit(data: CompanyInfoData) {
    const result = await saveCompanyInfo(data);
    if (!result.success) { toast.error(result.error); return; }
    onNext(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1">
          <Label htmlFor="name">Company Name *</Label>
          <Input id="name" {...register("name")} placeholder="FACEZ SDN. BHD." />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="ssmNumber">SSM Number</Label>
            <Input id="ssmNumber" {...register("ssmNumber")} placeholder="202401012345" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sstNumber">SST Number</Label>
            <Input id="sstNumber" {...register("sstNumber")} placeholder="B16-1234-56789012" />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="address">Address *</Label>
          <Input id="address" {...register("address")} placeholder="No. 1, Jalan Bukit Bintang, 55100 Kuala Lumpur" />
          {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone")} placeholder="+603-1234 5678" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} placeholder="hello@company.com" />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="website">Website</Label>
          <Input id="website" {...register("website")} placeholder="https://company.com" />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Next →"}
        </Button>
      </div>
    </form>
  );
}

// ── Step 2: Logo Upload ────────────────────────────────────────────────────────
function StepLogo({
  currentLogoUrl,
  onNext,
  onBack,
}: {
  currentLogoUrl: string | null;
  onNext: (logoUrl: string | null) => void;
  onBack: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(currentLogoUrl);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fd = new FormData();
    fd.append("logo", file);
    const result = await uploadLogo(fd);
    setUploading(false);

    if (!result.success) { toast.error(result.error); return; }
    setPreview(result.data?.logoUrl ?? null);
    toast.success("Logo uploaded");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {preview && (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Company logo" className="h-20 w-20 object-contain border rounded-md p-1" />
            <p className="text-sm text-muted-foreground">Current logo</p>
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="logo">Upload Logo (JPG/PNG/WebP, max 2MB)</Label>
          <Input id="logo" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} disabled={uploading} />
        </div>
        {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
      </div>
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button onClick={() => onNext(preview)}>Next →</Button>
      </div>
    </div>
  );
}

// ── Step 3: Bank Accounts ──────────────────────────────────────────────────────
function StepBankAccounts({
  initial,
  onNext,
  onBack,
}: {
  initial: BankAccount[];
  onNext: (accounts: BankAccountData[]) => void;
  onBack: () => void;
}) {
  const { register, control, handleSubmit, formState: { isSubmitting } } = useForm<{ accounts: BankAccountData[] }>({
    defaultValues: {
      accounts: initial.length > 0
        ? initial.map((a) => ({ bankName: a.bankName, accountNumber: a.accountNumber, accountHolder: a.accountHolder, isDefault: a.isDefault }))
        : [{ bankName: "", accountNumber: "", accountHolder: "", isDefault: true }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "accounts" });

  async function onSubmit(data: { accounts: BankAccountData[] }) {
    const result = await saveBankAccounts(data.accounts);
    if (!result.success) { toast.error(result.error); return; }
    onNext(data.accounts);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.id} className="border rounded-md p-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium">Bank Account {index + 1}</p>
            {fields.length > 1 && (
              <Button type="button" variant="outline" size="sm" onClick={() => remove(index)}>
                Remove
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <Label>Bank Name *</Label>
              <Input {...register(`accounts.${index}.bankName`)} placeholder="Maybank" />
            </div>
            <div className="space-y-1">
              <Label>Account Number *</Label>
              <Input {...register(`accounts.${index}.accountNumber`)} placeholder="1234567890" />
            </div>
            <div className="space-y-1">
              <Label>Account Holder *</Label>
              <Input {...register(`accounts.${index}.accountHolder`)} placeholder="FACEZ SDN. BHD." />
            </div>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ bankName: "", accountNumber: "", accountHolder: "", isDefault: false })}
      >
        + Add Bank Account
      </Button>
      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>← Back</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Next →"}
        </Button>
      </div>
    </form>
  );
}

// ── Step 4: Defaults ───────────────────────────────────────────────────────────
function StepDefaults({
  initial,
  onNext,
  onBack,
}: {
  initial: CompanySettings;
  onNext: (data: DefaultsData) => void;
  onBack: () => void;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<DefaultsData>({
    resolver: zodResolver(defaultsSchema),
    defaultValues: {
      defaultCurrency: initial.defaultCurrency,
      defaultPaymentTerms: initial.defaultPaymentTerms,
      defaultTaxRate: initial.defaultTaxRate,
    },
  });

  async function onSubmit(data: DefaultsData) {
    const result = await saveDefaults(data);
    if (!result.success) { toast.error(result.error); return; }
    onNext(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1">
          <Label htmlFor="defaultCurrency">Default Currency</Label>
          <Input id="defaultCurrency" {...register("defaultCurrency")} placeholder="MYR" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="defaultPaymentTerms">Default Payment Terms (days)</Label>
          <Input id="defaultPaymentTerms" type="number" {...register("defaultPaymentTerms", { valueAsNumber: true })} placeholder="30" />
          {errors.defaultPaymentTerms && <p className="text-xs text-destructive">{errors.defaultPaymentTerms.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="defaultTaxRate">Default Tax Rate (basis points, e.g. 600 = 6%)</Label>
          <Input id="defaultTaxRate" type="number" {...register("defaultTaxRate", { valueAsNumber: true })} placeholder="600" />
          <p className="text-xs text-muted-foreground">600 = 6% service tax, 1000 = 10% sales tax, 0 = exempt</p>
          {errors.defaultTaxRate && <p className="text-xs text-destructive">{errors.defaultTaxRate.message}</p>}
        </div>
      </div>
      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>← Back</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Next →"}
        </Button>
      </div>
    </form>
  );
}

// ── Step 5: Numbering Config ───────────────────────────────────────────────────
const DOC_TYPES = [
  { key: "QUOTATION" as const, label: "Quotation" },
  { key: "INVOICE" as const, label: "Invoice" },
  { key: "PURCHASE_ORDER" as const, label: "Purchase Order" },
  { key: "CREDIT_NOTE" as const, label: "Credit Note" },
];

function StepNumbering({
  initial,
  onNext,
  onBack,
}: {
  initial: NumberingConfig[];
  onNext: (data: NumberingConfigData) => void;
  onBack: () => void;
}) {
  const configByType = Object.fromEntries(initial.map((c) => [c.docType, c]));

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<NumberingConfigData>({
    resolver: zodResolver(numberingConfigSchema),
    defaultValues: {
      QUOTATION: { prefix: configByType["QUOTATION"]?.prefix ?? "QT", format: configByType["QUOTATION"]?.format ?? "{PREFIX}-{YYYY}-{SEQ:4}" },
      INVOICE: { prefix: configByType["INVOICE"]?.prefix ?? "INV", format: configByType["INVOICE"]?.format ?? "{PREFIX}-{YYYY}-{SEQ:4}" },
      PURCHASE_ORDER: { prefix: configByType["PURCHASE_ORDER"]?.prefix ?? "PO", format: configByType["PURCHASE_ORDER"]?.format ?? "{PREFIX}-{YYYY}-{SEQ:4}" },
      CREDIT_NOTE: { prefix: configByType["CREDIT_NOTE"]?.prefix ?? "CN", format: configByType["CREDIT_NOTE"]?.format ?? "{PREFIX}-{YYYY}-{SEQ:4}" },
    },
  });

  async function onSubmit(data: NumberingConfigData) {
    const result = await saveNumberingConfig(data);
    if (!result.success) { toast.error(result.error); return; }
    onNext(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pattern tokens: <code className="bg-muted px-1 rounded">{"{PREFIX}"}</code>{" "}
        <code className="bg-muted px-1 rounded">{"{YYYY}"}</code>{" "}
        <code className="bg-muted px-1 rounded">{"{SEQ:4}"}</code> (4-digit sequence)
      </p>
      {DOC_TYPES.map(({ key, label }) => (
        <div key={key} className="border rounded-md p-4 space-y-3">
          <p className="text-sm font-medium">{label}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Prefix</Label>
              <Input {...register(`${key}.prefix`)} placeholder="QT" />
            </div>
            <div className="space-y-1">
              <Label>Format</Label>
              <Input {...register(`${key}.format`)} placeholder="{PREFIX}-{YYYY}-{SEQ:4}" />
            </div>
          </div>
        </div>
      ))}
      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>← Back</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Next →"}
        </Button>
      </div>
    </form>
  );
}

// ── Step 6: Review & Complete ──────────────────────────────────────────────────
function StepReview({
  companyInfo,
  onBack,
  onComplete,
}: {
  companyInfo: CompanyInfoData | null;
  onBack: () => void;
  onComplete: () => void;
}) {
  const [completing, setCompleting] = useState(false);

  async function handleComplete() {
    setCompleting(true);
    const result = await completeSetup();
    if (!result.success) {
      toast.error(result.error);
      setCompleting(false);
      return;
    }
    toast.success("Setup complete! Welcome to DocuFlow.");
    onComplete();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="font-semibold">Company Information</h3>
        <div className="bg-muted/50 rounded-md p-4 text-sm space-y-1">
          <p><span className="text-muted-foreground">Name:</span> {companyInfo?.name}</p>
          <p><span className="text-muted-foreground">SSM:</span> {companyInfo?.ssmNumber || "—"}</p>
          <p><span className="text-muted-foreground">SST:</span> {companyInfo?.sstNumber || "—"}</p>
          <p><span className="text-muted-foreground">Address:</span> {companyInfo?.address}</p>
          <p><span className="text-muted-foreground">Phone:</span> {companyInfo?.phone || "—"}</p>
          <p><span className="text-muted-foreground">Email:</span> {companyInfo?.email || "—"}</p>
        </div>
      </div>
      <Separator />
      <p className="text-sm text-muted-foreground">
        All settings can be edited later under <strong>Settings</strong>.
      </p>
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button onClick={handleComplete} disabled={completing}>
          {completing ? "Finishing..." : "Complete Setup ✓"}
        </Button>
      </div>
    </div>
  );
}

// ── Main Wizard ────────────────────────────────────────────────────────────────
export function SetupWizard({ initialCompany, initialBankAccounts, initialNumberingConfigs }: SetupWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfoData | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialCompany.logoUrl);

  const progressPct = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {step + 1} of {STEPS.length}: <strong>{STEPS[step]}</strong></span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
          <CardDescription>
            {step === 0 && "Enter your company details for documents and invoices."}
            {step === 1 && "Upload your company logo (optional)."}
            {step === 2 && "Add your bank account details for invoice payment instructions."}
            {step === 3 && "Set your default currency, payment terms, and tax rate."}
            {step === 4 && "Configure how document numbers are generated."}
            {step === 5 && "Review your setup and confirm."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 0 && (
            <StepCompanyInfo
              initial={initialCompany}
              onNext={(data) => { setCompanyInfo(data); setStep(1); }}
            />
          )}
          {step === 1 && (
            <StepLogo
              currentLogoUrl={logoUrl}
              onNext={(url) => { setLogoUrl(url); setStep(2); }}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <StepBankAccounts
              initial={initialBankAccounts}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <StepDefaults
              initial={initialCompany}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <StepNumbering
              initial={initialNumberingConfigs}
              onNext={() => setStep(5)}
              onBack={() => setStep(3)}
            />
          )}
          {step === 5 && (
            <StepReview
              companyInfo={companyInfo}
              onBack={() => setStep(4)}
              onComplete={() => router.push("/dashboard")}
            />
          )}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          All information can be updated later in Settings.
        </CardFooter>
      </Card>
    </div>
  );
}
