import { z } from "zod";

export const companyInfoSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  ssmNumber: z.string(),
  sstNumber: z.string(),
  address: z.string().min(1, "Address is required"),
  phone: z.string(),
  email: z.string().email("Enter a valid email").or(z.literal("")),
  website: z.string(),
});

export const bankAccountSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  accountHolder: z.string().min(1, "Account holder name is required"),
  isDefault: z.boolean(),
});

export const defaultsSchema = z.object({
  defaultCurrency: z.string().min(1),
  defaultPaymentTerms: z.number().int().positive(),
  defaultTaxRate: z.number().int().min(0).max(10000),
});

export const numberingConfigSchema = z.object({
  QUOTATION: z.object({ prefix: z.string().min(1), format: z.string().min(1) }),
  INVOICE: z.object({ prefix: z.string().min(1), format: z.string().min(1) }),
  PURCHASE_ORDER: z.object({ prefix: z.string().min(1), format: z.string().min(1) }),
  CREDIT_NOTE: z.object({ prefix: z.string().min(1), format: z.string().min(1) }),
});

export type CompanyInfoData = z.infer<typeof companyInfoSchema>;
export type BankAccountData = z.infer<typeof bankAccountSchema>;
export type DefaultsData = z.infer<typeof defaultsSchema>;
export type NumberingConfigData = z.infer<typeof numberingConfigSchema>;
