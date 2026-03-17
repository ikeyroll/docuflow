import { z } from "zod";
import { TaxCategory } from "@prisma/client";

export const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string(),
  defaultPriceRinggit: z.number().min(0, "Price cannot be negative"),
  unit: z.string().min(1, "Unit is required"),
  taxCategory: z.nativeEnum(TaxCategory),
  category: z.string(),
  isActive: z.boolean(),
});

export type ProductFormData = z.infer<typeof productFormSchema>;
