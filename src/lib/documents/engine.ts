import { db } from "@/lib/db";
import { DocType, DocStatus, DiscountType } from "@prisma/client";
import { calculateDocumentTotals } from "./calculator";
import { generateNextNumber } from "./numbering";
import { canTransition } from "./state-machine";

export interface LineItemInput {
  productId?: string;
  description: string;
  quantity: number;       // integer × 100
  unit: string;
  unitPriceSen: number;
  discountType: DiscountType;
  discountValue: number;
  taxRate: number;
  sortOrder: number;
}

export interface CreateDocumentInput {
  docType: DocType;
  clientId?: string;
  supplierId?: string;
  issueDate: Date;
  dueDate?: Date;
  validUntil?: Date;
  notes: string;
  terms: string;
  currency: string;
  templateId?: string;
  referenceNumber?: string;
  lineItems: LineItemInput[];
}

export async function createDocument(data: CreateDocumentInput, userId: string) {
  return db.$transaction(async (tx) => {
    const documentNumber = await generateNextNumber(tx, data.docType);

    const totals = calculateDocumentTotals(
      data.lineItems.map((li) => ({
        quantity: li.quantity,
        unitPriceSen: li.unitPriceSen,
        discountType: li.discountType,
        discountValue: li.discountValue,
        taxRate: li.taxRate,
      }))
    );

    const lineItemsData = data.lineItems.map((li) => {
      const calc = calculateDocumentTotals([{
        quantity: li.quantity,
        unitPriceSen: li.unitPriceSen,
        discountType: li.discountType,
        discountValue: li.discountValue,
        taxRate: li.taxRate,
      }]);
      return {
        productId: li.productId,
        description: li.description,
        quantity: li.quantity,
        unit: li.unit,
        unitPriceSen: li.unitPriceSen,
        discountType: li.discountType,
        discountValue: li.discountValue,
        taxRate: li.taxRate,
        lineTotalSen: calc.grandTotalSen,
        sortOrder: li.sortOrder,
      };
    });

    const document = await tx.document.create({
      data: {
        docType: data.docType,
        documentNumber,
        referenceNumber: data.referenceNumber ?? "",
        status: DocStatus.DRAFT,
        clientId: data.clientId || undefined,
        supplierId: data.supplierId || undefined,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        validUntil: data.validUntil,
        notes: data.notes,
        terms: data.terms,
        currency: data.currency,
        templateId: data.templateId || undefined,
        createdById: userId,
        ...totals,
        lineItems: { create: lineItemsData },
      },
      include: { lineItems: true },
    });

    await tx.documentHistory.create({
      data: {
        documentId: document.id,
        action: "CREATED",
        description: `${data.docType.replace("_", " ")} ${documentNumber} created`,
        snapshotJson: document as object,
        changedById: userId,
      },
    });

    return document;
  });
}

export async function updateDocument(
  id: string,
  data: Omit<CreateDocumentInput, "docType">,
  userId: string
) {
  return db.$transaction(async (tx) => {
    const existing = await tx.document.findUniqueOrThrow({ where: { id } });

    const totals = calculateDocumentTotals(
      data.lineItems.map((li) => ({
        quantity: li.quantity,
        unitPriceSen: li.unitPriceSen,
        discountType: li.discountType,
        discountValue: li.discountValue,
        taxRate: li.taxRate,
      }))
    );

    // Delete old line items and recreate
    await tx.documentLineItem.deleteMany({ where: { documentId: id } });

    const document = await tx.document.update({
      where: { id },
      data: {
        referenceNumber: data.referenceNumber ?? existing.referenceNumber,
        clientId: data.clientId || null,
        supplierId: data.supplierId || null,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        validUntil: data.validUntil,
        notes: data.notes,
        terms: data.terms,
        currency: data.currency,
        templateId: data.templateId,
        version: { increment: 1 },
        ...totals,
        lineItems: {
          create: data.lineItems.map((li) => {
            const calc = calculateDocumentTotals([{
              quantity: li.quantity,
              unitPriceSen: li.unitPriceSen,
              discountType: li.discountType,
              discountValue: li.discountValue,
              taxRate: li.taxRate,
            }]);
            return {
              productId: li.productId,
              description: li.description,
              quantity: li.quantity,
              unit: li.unit,
              unitPriceSen: li.unitPriceSen,
              discountType: li.discountType,
              discountValue: li.discountValue,
              taxRate: li.taxRate,
              lineTotalSen: calc.grandTotalSen,
              sortOrder: li.sortOrder,
            };
          }),
        },
      },
      include: { lineItems: true },
    });

    await tx.documentHistory.create({
      data: {
        documentId: id,
        action: "EDITED",
        description: `${existing.docType.replace("_", " ")} ${existing.documentNumber} updated (v${document.version})`,
        snapshotJson: document as object,
        changedById: userId,
      },
    });

    return document;
  });
}

export async function transitionDocument(
  id: string,
  targetStatus: DocStatus,
  userId: string,
  description?: string
) {
  return db.$transaction(async (tx) => {
    const doc = await tx.document.findUniqueOrThrow({ where: { id } });

    if (!canTransition(doc.docType, doc.status, targetStatus)) {
      throw new Error(`Cannot transition ${doc.docType} from ${doc.status} to ${targetStatus}`);
    }

    const updateData: Record<string, unknown> = { status: targetStatus };
    if (targetStatus === DocStatus.SENT) updateData.sentAt = new Date();

    const updated = await tx.document.update({ where: { id }, data: updateData });

    await tx.documentHistory.create({
      data: {
        documentId: id,
        action: "STATUS_CHANGED",
        description: description ?? `Status changed from ${doc.status} to ${targetStatus}`,
        changedById: userId,
      },
    });

    return updated;
  });
}

export async function convertDocument(
  sourceId: string,
  targetType: DocType,
  userId: string
) {
  return db.$transaction(async (tx) => {
    const source = await tx.document.findUniqueOrThrow({
      where: { id: sourceId },
      include: { lineItems: true },
    });

    const newNumber = await generateNextNumber(tx, targetType);

    const totals = {
      subtotalSen: source.subtotalSen,
      discountTotalSen: source.discountTotalSen,
      taxTotalSen: source.taxTotalSen,
      roundingAdjSen: source.roundingAdjSen,
      grandTotalSen: source.grandTotalSen,
    };

    const newDoc = await tx.document.create({
      data: {
        docType: targetType,
        documentNumber: newNumber,
        status: DocStatus.DRAFT,
        clientId: source.clientId,
        supplierId: source.supplierId,
        issueDate: new Date(),
        notes: source.notes,
        terms: source.terms,
        currency: source.currency,
        templateId: source.templateId,
        parentDocumentId: source.id,
        createdById: userId,
        ...totals,
        lineItems: {
          create: source.lineItems.map((li) => ({
            productId: li.productId,
            description: li.description,
            quantity: li.quantity,
            unit: li.unit,
            unitPriceSen: li.unitPriceSen,
            discountType: li.discountType,
            discountValue: li.discountValue,
            taxRate: li.taxRate,
            lineTotalSen: li.lineTotalSen,
            sortOrder: li.sortOrder,
          })),
        },
      },
      include: { lineItems: true },
    });

    // Mark source as converted
    await tx.document.update({ where: { id: sourceId }, data: { status: DocStatus.CONVERTED } });

    await tx.documentHistory.create({
      data: {
        documentId: sourceId,
        action: "CONVERTED",
        description: `Converted to ${targetType.replace("_", " ")} ${newNumber}`,
        changedById: userId,
      },
    });

    await tx.documentHistory.create({
      data: {
        documentId: newDoc.id,
        action: "CREATED",
        description: `Created from ${source.docType.replace("_", " ")} ${source.documentNumber}`,
        changedById: userId,
      },
    });

    return newDoc;
  });
}

export async function duplicateDocument(sourceId: string, userId: string) {
  return db.$transaction(async (tx) => {
    const source = await tx.document.findUniqueOrThrow({
      where: { id: sourceId },
      include: { lineItems: true },
    });

    const newNumber = await generateNextNumber(tx, source.docType);

    const totals = {
      subtotalSen: source.subtotalSen,
      discountTotalSen: source.discountTotalSen,
      taxTotalSen: source.taxTotalSen,
      roundingAdjSen: source.roundingAdjSen,
      grandTotalSen: source.grandTotalSen,
    };

    const newDoc = await tx.document.create({
      data: {
        docType: source.docType,
        documentNumber: newNumber,
        status: DocStatus.DRAFT,
        clientId: source.clientId,
        supplierId: source.supplierId,
        issueDate: new Date(),
        dueDate: source.dueDate,
        validUntil: source.validUntil,
        notes: source.notes,
        terms: source.terms,
        currency: source.currency,
        templateId: source.templateId,
        createdById: userId,
        ...totals,
        lineItems: {
          create: source.lineItems.map((li) => ({
            productId: li.productId,
            description: li.description,
            quantity: li.quantity,
            unit: li.unit,
            unitPriceSen: li.unitPriceSen,
            discountType: li.discountType,
            discountValue: li.discountValue,
            taxRate: li.taxRate,
            lineTotalSen: li.lineTotalSen,
            sortOrder: li.sortOrder,
          })),
        },
      },
    });

    await tx.documentHistory.create({
      data: {
        documentId: newDoc.id,
        action: "CREATED",
        description: `Duplicated from ${source.documentNumber}`,
        changedById: userId,
      },
    });

    return newDoc;
  });
}
