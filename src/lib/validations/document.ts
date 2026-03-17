import { z } from "zod";

export const lineItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.string().default("unit"),
  unitPriceSen: z.number().int().min(0),
  discountType: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  discountValue: z.number().int().min(0).default(0),
  taxRate: z.number().int().min(0).default(0),
  sortOrder: z.number().int().default(0),
});

export const documentSchema = z.object({
  clientId: z.string().optional(),
  supplierId: z.string().optional(),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().optional(),
  validUntil: z.string().optional(),
  referenceNumber: z.string(),
  notes: z.string(),
  terms: z.string(),
  currency: z.string(),
  templateId: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

export const paymentSchema = z.object({
  amountSen: z.number().int().positive("Amount must be positive"),
  paymentDate: z.string().min(1, "Payment date is required"),
  method: z.enum(["BANK_TRANSFER", "CASH", "CHEQUE", "E_WALLET", "CREDIT_CARD", "OTHER"]),
  referenceNumber: z.string(),
  notes: z.string(),
});

export type DocumentFormData = z.infer<typeof documentSchema>;
export type LineItemFormData = z.infer<typeof lineItemSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
