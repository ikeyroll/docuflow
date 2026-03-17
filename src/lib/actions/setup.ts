"use server";

import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  companyInfoSchema,
  bankAccountSchema,
  defaultsSchema,
  numberingConfigSchema,
  type BankAccountData,
} from "@/lib/validations/setup";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { DocType } from "@prisma/client";

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };

async function getCompanyId() {
  const company = await db.companySettings.findFirst({ select: { id: true } });
  if (!company) throw new Error("Company settings not found");
  return company.id;
}

export async function saveCompanyInfo(formData: unknown): Promise<ActionResult> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN"]);

    const parsed = companyInfoSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.flatten().formErrors.join(", ") || "Validation failed" };
    }

    const companyId = await getCompanyId();
    await db.companySettings.update({
      where: { id: companyId },
      data: parsed.data,
    });

    return { success: true };
  } catch (error) {
    console.error("saveCompanyInfo failed:", error);
    return { success: false, error: "Failed to save company info" };
  }
}

export async function uploadLogo(_formData: FormData): Promise<ActionResult<{ logoUrl: string }>> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN"]);

    const file = _formData.get("logo") as File | null;
    if (!file) return { success: false, error: "No file provided" };

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return { success: false, error: "Only JPG, PNG, and WebP images are allowed" };
    }
    if (file.size > 2 * 1024 * 1024) {
      return { success: false, error: "Image must be under 2MB" };
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filename = `logo.${ext}`;
    const uploadsDir = join(process.cwd(), "public", "uploads", "logos");
    await mkdir(uploadsDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(uploadsDir, filename), buffer);

    const logoUrl = `/uploads/logos/${filename}`;
    const companyId = await getCompanyId();
    await db.companySettings.update({
      where: { id: companyId },
      data: { logoUrl },
    });

    return { success: true, data: { logoUrl } };
  } catch (error) {
    console.error("uploadLogo failed:", error);
    return { success: false, error: "Failed to upload logo" };
  }
}

export async function saveBankAccounts(accounts: BankAccountData[]): Promise<ActionResult> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN"]);

    for (const account of accounts) {
      const parsed = bankAccountSchema.safeParse(account);
      if (!parsed.success) {
        return { success: false, error: "Invalid bank account data" };
      }
    }

    const companyId = await getCompanyId();

    // Replace all bank accounts
    await db.bankAccount.deleteMany({ where: { companyId } });

    if (accounts.length > 0) {
      // Ensure exactly one default
      const hasDefault = accounts.some((a) => a.isDefault);
      const accountsWithDefault = accounts.map((a, i) => ({
        ...a,
        isDefault: hasDefault ? a.isDefault : i === 0,
        companyId,
      }));

      await db.bankAccount.createMany({ data: accountsWithDefault });
    }

    return { success: true };
  } catch (error) {
    console.error("saveBankAccounts failed:", error);
    return { success: false, error: "Failed to save bank accounts" };
  }
}

export async function saveDefaults(formData: unknown): Promise<ActionResult> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN"]);

    const parsed = defaultsSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: "Invalid defaults data" };
    }

    const companyId = await getCompanyId();
    await db.companySettings.update({
      where: { id: companyId },
      data: parsed.data,
    });

    return { success: true };
  } catch (error) {
    console.error("saveDefaults failed:", error);
    return { success: false, error: "Failed to save defaults" };
  }
}

export async function saveNumberingConfig(formData: unknown): Promise<ActionResult> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN"]);

    const parsed = numberingConfigSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: "Invalid numbering config" };
    }

    const docTypeMap: Record<string, DocType> = {
      QUOTATION: DocType.QUOTATION,
      INVOICE: DocType.INVOICE,
      PURCHASE_ORDER: DocType.PURCHASE_ORDER,
      CREDIT_NOTE: DocType.CREDIT_NOTE,
    };

    for (const [key, config] of Object.entries(parsed.data)) {
      await db.numberingConfig.update({
        where: { docType: docTypeMap[key] },
        data: { prefix: config.prefix, format: config.format },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("saveNumberingConfig failed:", error);
    return { success: false, error: "Failed to save numbering config" };
  }
}

export async function completeSetup(): Promise<ActionResult> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN"]);

    const companyId = await getCompanyId();
    await db.companySettings.update({
      where: { id: companyId },
      data: { isSetupComplete: true },
    });

    return { success: true };
  } catch (error) {
    console.error("completeSetup failed:", error);
    return { success: false, error: "Failed to complete setup" };
  }
}
