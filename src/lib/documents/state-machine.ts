import { DocType, DocStatus } from "@prisma/client";

/**
 * Valid status transitions per document type.
 * Key: current status → Value: allowed next statuses
 */
const QUOTATION_TRANSITIONS: Partial<Record<DocStatus, DocStatus[]>> = {
  DRAFT:    [DocStatus.SENT],
  SENT:     [DocStatus.ACCEPTED, DocStatus.REJECTED, DocStatus.EXPIRED],
  ACCEPTED: [DocStatus.CONVERTED],
  REJECTED: [],
  EXPIRED:  [],
  CONVERTED:[],
};

const INVOICE_TRANSITIONS: Partial<Record<DocStatus, DocStatus[]>> = {
  DRAFT:           [DocStatus.SENT],
  SENT:            [DocStatus.PARTIALLY_PAID, DocStatus.PAID, DocStatus.OVERDUE, DocStatus.VOID],
  OVERDUE:         [DocStatus.PARTIALLY_PAID, DocStatus.PAID, DocStatus.VOID],
  PARTIALLY_PAID:  [DocStatus.PAID, DocStatus.VOID],
  PAID:            [],
  VOID:            [],
};

const PO_TRANSITIONS: Partial<Record<DocStatus, DocStatus[]>> = {
  DRAFT:              [DocStatus.SENT],
  SENT:               [DocStatus.ACKNOWLEDGED, DocStatus.VOID],
  ACKNOWLEDGED:       [DocStatus.PARTIALLY_RECEIVED, DocStatus.CONVERTED],
  PARTIALLY_RECEIVED: [DocStatus.CONVERTED],
  CONVERTED:          [],
  VOID:               [],
};

const CREDIT_NOTE_TRANSITIONS: Partial<Record<DocStatus, DocStatus[]>> = {
  DRAFT: [DocStatus.SENT],
  SENT:  [DocStatus.PAID, DocStatus.VOID],
  PAID:  [],
  VOID:  [],
};

const TRANSITIONS: Record<DocType, Partial<Record<DocStatus, DocStatus[]>>> = {
  [DocType.QUOTATION]:      QUOTATION_TRANSITIONS,
  [DocType.INVOICE]:        INVOICE_TRANSITIONS,
  [DocType.PURCHASE_ORDER]: PO_TRANSITIONS,
  [DocType.CREDIT_NOTE]:    CREDIT_NOTE_TRANSITIONS,
};

export function canTransition(docType: DocType, current: DocStatus, target: DocStatus): boolean {
  const allowed = TRANSITIONS[docType][current];
  return allowed ? allowed.includes(target) : false;
}

export function getAvailableTransitions(docType: DocType, current: DocStatus): DocStatus[] {
  return TRANSITIONS[docType][current] ?? [];
}

export const STATUS_LABELS: Record<DocStatus, string> = {
  DRAFT:              "Draft",
  SENT:               "Sent",
  ACCEPTED:           "Accepted",
  REJECTED:           "Rejected",
  EXPIRED:            "Expired",
  CONVERTED:          "Converted",
  PARTIALLY_PAID:     "Partially Paid",
  PAID:               "Paid",
  OVERDUE:            "Overdue",
  VOID:               "Void",
  ACKNOWLEDGED:       "Acknowledged",
  PARTIALLY_RECEIVED: "Partially Received",
  FULFILLED:          "Fulfilled",
  CANCELLED:          "Cancelled",
};

export const STATUS_COLORS: Record<DocStatus, string> = {
  DRAFT:              "bg-gray-100 text-gray-700",
  SENT:               "bg-blue-100 text-blue-700",
  ACCEPTED:           "bg-green-100 text-green-800",
  REJECTED:           "bg-red-100 text-red-700",
  EXPIRED:            "bg-orange-100 text-orange-700",
  CONVERTED:          "bg-purple-100 text-purple-700",
  PARTIALLY_PAID:     "bg-yellow-100 text-yellow-800",
  PAID:               "bg-green-100 text-green-800",
  OVERDUE:            "bg-red-100 text-red-700",
  VOID:               "bg-gray-100 text-gray-500",
  ACKNOWLEDGED:       "bg-blue-100 text-blue-700",
  PARTIALLY_RECEIVED: "bg-yellow-100 text-yellow-800",
  FULFILLED:          "bg-green-100 text-green-800",
  CANCELLED:          "bg-gray-100 text-gray-500",
};
