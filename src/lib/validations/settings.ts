import { z } from "zod";
import { UserRole } from "@prisma/client";

export const userFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  role: z.nativeEnum(UserRole),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  isActive: z.boolean(),
});

export const editUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean(),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
});

export const bankAccountFormSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  accountHolder: z.string().min(1, "Account holder is required"),
  isDefault: z.boolean(),
});

export const numberingFormSchema = z.object({
  prefix: z.string().min(1, "Prefix is required"),
  format: z.string().min(1, "Format is required"),
  resetYearly: z.boolean(),
});

export const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  htmlContent: z.string().min(1, "HTML content is required"),
  cssContent: z.string(),
  isDefault: z.boolean(),
});

export type UserFormData = z.infer<typeof userFormSchema>;
export type EditUserData = z.infer<typeof editUserSchema>;
export type BankAccountFormData = z.infer<typeof bankAccountFormSchema>;
export type NumberingFormData = z.infer<typeof numberingFormSchema>;
export type TemplateFormData = z.infer<typeof templateFormSchema>;
