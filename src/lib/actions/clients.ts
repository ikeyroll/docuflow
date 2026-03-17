"use server";

import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { clientFormSchema, supplierFormSchema } from "@/lib/validations/client";

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };

// ── Clients ───────────────────────────────────────────────────────────────────

export async function createClient(formData: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN", "MANAGER", "STAFF"]);

    const parsed = clientFormSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    const client = await db.client.create({ data: parsed.data });
    return { success: true, data: { id: client.id } };
  } catch (error) {
    console.error("createClient failed:", error);
    return { success: false, error: "Failed to create client" };
  }
}

export async function updateClient(id: string, formData: unknown): Promise<ActionResult> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN", "MANAGER"]);

    const parsed = clientFormSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    await db.client.update({ where: { id }, data: parsed.data });
    return { success: true };
  } catch (error) {
    console.error("updateClient failed:", error);
    return { success: false, error: "Failed to update client" };
  }
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

export async function createSupplier(formData: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN", "MANAGER", "STAFF"]);

    const parsed = supplierFormSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    const supplier = await db.supplier.create({ data: parsed.data });
    return { success: true, data: { id: supplier.id } };
  } catch (error) {
    console.error("createSupplier failed:", error);
    return { success: false, error: "Failed to create supplier" };
  }
}

export async function updateSupplier(id: string, formData: unknown): Promise<ActionResult> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN", "MANAGER"]);

    const parsed = supplierFormSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: "Validation failed" };

    await db.supplier.update({ where: { id }, data: parsed.data });
    return { success: true };
  } catch (error) {
    console.error("updateSupplier failed:", error);
    return { success: false, error: "Failed to update supplier" };
  }
}
