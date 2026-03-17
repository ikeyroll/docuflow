"use server";

import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  companyInfoSchema,
} from "@/lib/validations/setup";
import {
  editUserSchema,
  userFormSchema,
  bankAccountFormSchema,
  numberingFormSchema,
  templateFormSchema,
} from "@/lib/validations/settings";
import { DocType } from "@prisma/client";
import bcrypt from "bcryptjs";

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };

// ── Company ───────────────────────────────────────────────────────────────────

export async function updateCompanySettings(formData: unknown): Promise<ActionResult> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN"]);

    const parsed = companyInfoSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: "Validation failed" };
    }

    const company = await db.companySettings.findFirst({ select: { id: true } });
    if (!company) return { success: false, error: "Company settings not found" };

    await db.companySettings.update({ where: { id: company.id }, data: parsed.data });
    return { success: true };
  } catch (error) {
    console.error("updateCompanySettings failed:", error);
    return { success: false, error: "Failed to update company settings" };
  }
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function createUser(formData: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN"]);

    const parsed = userFormSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: "Validation failed" };
    }

    const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return { success: false, error: "Email already in use" };

    if (!parsed.data.password) {
      return { success: false, error: "Password is required for new users" };
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await db.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
        isActive: parsed.data.isActive,
        passwordHash,
      },
    });

    return { success: true, data: { id: user.id } };
  } catch (error) {
    console.error("createUser failed:", error);
    return { success: false, error: "Failed to create user" };
  }
}

export async function updateUser(id: string, formData: unknown): Promise<ActionResult> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN"]);

    const parsed = editUserSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: "Validation failed" };
    }

    // Prevent admin from deactivating themselves
    if (id === session.user.id && !parsed.data.isActive) {
      return { success: false, error: "You cannot deactivate your own account" };
    }

    const updateData: Record<string, unknown> = {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    };

    if (parsed.data.password) {
      updateData.passwordHash = await bcrypt.hash(parsed.data.password, 12);
    }

    await db.user.update({ where: { id }, data: updateData });
    return { success: true };
  } catch (error) {
    console.error("updateUser failed:", error);
    return { success: false, error: "Failed to update user" };
  }
}

// ── Bank Accounts ─────────────────────────────────────────────────────────────

export async function createBankAccount(formData: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN"]);

    const parsed = bankAccountFormSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    const company = await db.companySettings.findFirst({ select: { id: true } });
    if (!company) return { success: false, error: "Company not found" };

    // If this is default, unset others
    if (parsed.data.isDefault) {
      await db.bankAccount.updateMany({ where: { companyId: company.id }, data: { isDefault: false } });
    }

    const account = await db.bankAccount.create({
      data: { ...parsed.data, companyId: company.id },
    });

    return { success: true, data: { id: account.id } };
  } catch (error) {
    console.error("createBankAccount failed:", error);
    return { success: false, error: "Failed to create bank account" };
  }
}

export async function updateBankAccount(id: string, formData: unknown): Promise<ActionResult> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN"]);

    const parsed = bankAccountFormSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    const company = await db.companySettings.findFirst({ select: { id: true } });
    if (!company) return { success: false, error: "Company not found" };

    if (parsed.data.isDefault) {
      await db.bankAccount.updateMany({ where: { companyId: company.id }, data: { isDefault: false } });
    }

    await db.bankAccount.update({ where: { id }, data: parsed.data });
    return { success: true };
  } catch (error) {
    console.error("updateBankAccount failed:", error);
    return { success: false, error: "Failed to update bank account" };
  }
}

export async function deleteBankAccount(id: string): Promise<ActionResult> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN"]);

    await db.bankAccount.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    console.error("deleteBankAccount failed:", error);
    return { success: false, error: "Failed to delete bank account" };
  }
}

// ── Numbering ─────────────────────────────────────────────────────────────────

export async function updateNumberingConfig(docType: DocType, formData: unknown): Promise<ActionResult> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN"]);

    const parsed = numberingFormSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    await db.numberingConfig.update({
      where: { docType },
      data: { prefix: parsed.data.prefix, format: parsed.data.format, resetYearly: parsed.data.resetYearly },
    });

    return { success: true };
  } catch (error) {
    console.error("updateNumberingConfig failed:", error);
    return { success: false, error: "Failed to update numbering config" };
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

export async function updateTemplate(id: string, formData: unknown): Promise<ActionResult> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN"]);

    const parsed = templateFormSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    if (parsed.data.isDefault) {
      // Get the template to find its docType, then unset default for that docType
      const template = await db.template.findUnique({ where: { id }, select: { docType: true } });
      if (template) {
        await db.template.updateMany({
          where: { docType: template.docType },
          data: { isDefault: false },
        });
      }
    }

    await db.template.update({ where: { id }, data: parsed.data });
    return { success: true };
  } catch (error) {
    console.error("updateTemplate failed:", error);
    return { success: false, error: "Failed to update template" };
  }
}
