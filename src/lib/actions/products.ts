"use server";

import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { productFormSchema } from "@/lib/validations/product";

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };

function ringgitToSen(ringgit: number): number {
  return Math.round(ringgit * 100);
}

export async function createProduct(formData: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN", "MANAGER", "STAFF"]);

    const parsed = productFormSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    const { defaultPriceRinggit, ...rest } = parsed.data;
    const product = await db.product.create({
      data: { ...rest, defaultPrice: ringgitToSen(defaultPriceRinggit) },
    });

    return { success: true, data: { id: product.id } };
  } catch (error) {
    console.error("createProduct failed:", error);
    return { success: false, error: "Failed to create product" };
  }
}

export async function updateProduct(id: string, formData: unknown): Promise<ActionResult> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN", "MANAGER"]);

    const parsed = productFormSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    const { defaultPriceRinggit, ...rest } = parsed.data;
    await db.product.update({
      where: { id },
      data: { ...rest, defaultPrice: ringgitToSen(defaultPriceRinggit) },
    });

    return { success: true };
  } catch (error) {
    console.error("updateProduct failed:", error);
    return { success: false, error: "Failed to update product" };
  }
}
