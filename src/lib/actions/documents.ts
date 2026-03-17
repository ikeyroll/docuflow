"use server";

import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { createDocument, updateDocument, transitionDocument, convertDocument, duplicateDocument } from "@/lib/documents/engine";
import { DocType, DocStatus, DiscountType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { documentSchema, paymentSchema } from "@/lib/validations/document";
import { ringgitToSen } from "@/lib/documents/calculator";

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };

function getDocPath(docType: DocType) {
  const map: Record<DocType, string> = {
    QUOTATION: "quotations",
    INVOICE: "invoices",
    PURCHASE_ORDER: "purchase-orders",
    CREDIT_NOTE: "credit-notes",
  };
  return `/dashboard/${map[docType]}`;
}

export async function createDocumentAction(docType: DocType, formData: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN", "MANAGER", "STAFF"]);

    const parsed = documentSchema.safeParse(formData);
    if (!parsed.success) {
      const msg = parsed.error.issues.map(i => i.message).join(", ");
      return { success: false, error: msg };
    }

    const d = parsed.data;
    const doc = await createDocument({
      docType,
      clientId: d.clientId || undefined,
      supplierId: d.supplierId || undefined,
      issueDate: new Date(d.issueDate),
      dueDate: d.dueDate ? new Date(d.dueDate) : undefined,
      validUntil: d.validUntil ? new Date(d.validUntil) : undefined,
      referenceNumber: d.referenceNumber,
      notes: d.notes,
      terms: d.terms,
      currency: d.currency,
      templateId: d.templateId || undefined,
      lineItems: d.lineItems.map((li, i) => ({
        productId: li.productId || undefined,
        description: li.description,
        quantity: Math.round(li.quantity * 100),
        unit: li.unit,
        unitPriceSen: li.unitPriceSen,
        discountType: li.discountType as DiscountType,
        discountValue: li.discountValue,
        taxRate: li.taxRate,
        sortOrder: li.sortOrder || i,
      })),
    }, session.user.id);

    revalidatePath(getDocPath(docType));
    return { success: true, data: { id: doc.id } };
  } catch (error) {
    console.error("createDocumentAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create document" };
  }
}

export async function updateDocumentAction(id: string, formData: unknown): Promise<ActionResult> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN", "MANAGER", "STAFF"]);

    const parsed = documentSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues.map(i => i.message).join(", ") };
    }

    const d = parsed.data;
    const doc = await updateDocument(id, {
      clientId: d.clientId || undefined,
      supplierId: d.supplierId || undefined,
      issueDate: new Date(d.issueDate),
      dueDate: d.dueDate ? new Date(d.dueDate) : undefined,
      validUntil: d.validUntil ? new Date(d.validUntil) : undefined,
      referenceNumber: d.referenceNumber,
      notes: d.notes,
      terms: d.terms,
      currency: d.currency,
      templateId: d.templateId || undefined,
      lineItems: d.lineItems.map((li, i) => ({
        productId: li.productId || undefined,
        description: li.description,
        quantity: Math.round(li.quantity * 100),
        unit: li.unit,
        unitPriceSen: li.unitPriceSen,
        discountType: li.discountType as DiscountType,
        discountValue: li.discountValue,
        taxRate: li.taxRate,
        sortOrder: li.sortOrder || i,
      })),
    }, session.user.id);

    revalidatePath(getDocPath(doc.docType));
    revalidatePath(`${getDocPath(doc.docType)}/${id}`);
    return { success: true };
  } catch (error) {
    console.error("updateDocumentAction failed:", error);
    return { success: false, error: "Failed to update document" };
  }
}

export async function transitionDocumentAction(id: string, targetStatus: DocStatus): Promise<ActionResult> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN", "MANAGER"]);

    const doc = await transitionDocument(id, targetStatus, session.user.id);
    revalidatePath(getDocPath(doc.docType));
    revalidatePath(`${getDocPath(doc.docType)}/${id}`);
    return { success: true };
  } catch (error) {
    console.error("transitionDocumentAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update status" };
  }
}

export async function convertDocumentAction(sourceId: string, targetType: DocType): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN", "MANAGER"]);

    const newDoc = await convertDocument(sourceId, targetType, session.user.id);
    revalidatePath(getDocPath(targetType));
    return { success: true, data: { id: newDoc.id } };
  } catch (error) {
    console.error("convertDocumentAction failed:", error);
    return { success: false, error: "Failed to convert document" };
  }
}

export async function duplicateDocumentAction(sourceId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN", "MANAGER", "STAFF"]);

    const newDoc = await duplicateDocument(sourceId, session.user.id);
    revalidatePath(getDocPath(newDoc.docType));
    return { success: true, data: { id: newDoc.id } };
  } catch (error) {
    console.error("duplicateDocumentAction failed:", error);
    return { success: false, error: "Failed to duplicate document" };
  }
}

export async function deleteDocumentAction(id: string): Promise<ActionResult> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN"]);

    const doc = await db.document.findUniqueOrThrow({ where: { id } });
    if (doc.status !== DocStatus.DRAFT) {
      return { success: false, error: "Only draft documents can be deleted" };
    }

    await db.document.delete({ where: { id } });
    revalidatePath(getDocPath(doc.docType));
    return { success: true };
  } catch (error) {
    console.error("deleteDocumentAction failed:", error);
    return { success: false, error: "Failed to delete document" };
  }
}

export async function recordPaymentAction(invoiceId: string, formData: unknown): Promise<ActionResult> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN", "MANAGER"]);

    const parsed = paymentSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues.map(i => i.message).join(", ") };
    }

    const invoice = await db.document.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { payments: true },
    });

    const d = parsed.data;
    await db.payment.create({
      data: {
        documentId: invoiceId,
        amountSen: d.amountSen,
        paymentDate: new Date(d.paymentDate),
        method: d.method as never,
        referenceNumber: d.referenceNumber,
        notes: d.notes,
        recordedById: session.user.id,
      },
    });

    // Calculate total paid
    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amountSen, 0) + d.amountSen;
    const newStatus = totalPaid >= invoice.grandTotalSen ? DocStatus.PAID : DocStatus.PARTIALLY_PAID;

    await db.document.update({
      where: { id: invoiceId },
      data: { status: newStatus },
    });

    await db.documentHistory.create({
      data: {
        documentId: invoiceId,
        action: "PAYMENT_RECORDED",
        description: `Payment of RM ${(d.amountSen / 100).toFixed(2)} recorded`,
        changedById: session.user.id,
      },
    });

    revalidatePath(`/dashboard/invoices/${invoiceId}`);
    revalidatePath("/dashboard/invoices");
    return { success: true };
  } catch (error) {
    console.error("recordPaymentAction failed:", error);
    return { success: false, error: "Failed to record payment" };
  }
}
