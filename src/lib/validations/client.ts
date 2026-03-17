import { z } from "zod";

export const clientFormSchema = z.object({
  name: z.string().min(1, "Contact name is required"),
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Valid email required").or(z.literal("")),
  phone: z.string(),
  billingAddress: z.string(),
  shippingAddress: z.string(),
  paymentTerms: z.number().int().positive().nullable(),
  notes: z.string(),
  isActive: z.boolean(),
});

export const supplierFormSchema = z.object({
  name: z.string().min(1, "Contact name is required"),
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Valid email required").or(z.literal("")),
  phone: z.string(),
  address: z.string(),
  notes: z.string(),
  isActive: z.boolean(),
});

export type ClientFormData = z.infer<typeof clientFormSchema>;
export type SupplierFormData = z.infer<typeof supplierFormSchema>;
