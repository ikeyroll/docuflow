"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DocStatus, DocType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAvailableTransitions, STATUS_LABELS } from "@/lib/documents/state-machine";
import {
  transitionDocumentAction,
  convertDocumentAction,
  duplicateDocumentAction,
  deleteDocumentAction,
} from "@/lib/actions/documents";

interface DocumentActionsProps {
  id: string;
  docType: DocType;
  status: DocStatus;
  canEdit: boolean;
  canConvertToInvoice?: boolean;
}

const DOC_PATH: Record<DocType, string> = {
  QUOTATION: "/dashboard/quotations",
  INVOICE: "/dashboard/invoices",
  PURCHASE_ORDER: "/dashboard/purchase-orders",
  CREDIT_NOTE: "/dashboard/credit-notes",
};

export function DocumentActions({ id, docType, status, canEdit, canConvertToInvoice }: DocumentActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const transitions = getAvailableTransitions(docType, status);

  async function handleTransition(target: DocStatus) {
    setLoading(true);
    const res = await transitionDocumentAction(id, target);
    setLoading(false);
    if (res.success) toast.success(`Status updated to ${STATUS_LABELS[target]}`);
    else toast.error(res.error);
  }

  async function handleConvert() {
    setLoading(true);
    const res = await convertDocumentAction(id, DocType.INVOICE);
    setLoading(false);
    if (res.success && res.data) {
      toast.success("Converted to Invoice");
      router.push(`/dashboard/invoices/${res.data.id}`);
    } else if (!res.success) toast.error(res.error);
  }

  async function handleDuplicate() {
    setLoading(true);
    const res = await duplicateDocumentAction(id);
    setLoading(false);
    if (res.success && res.data) {
      toast.success("Duplicated");
      router.push(`${DOC_PATH[docType]}/${res.data.id}`);
    } else if (!res.success) toast.error(res.error);
  }

  async function handleDelete() {
    if (!confirm("Delete this draft? This cannot be undone.")) return;
    setLoading(true);
    const res = await deleteDocumentAction(id);
    setLoading(false);
    if (res.success) {
      toast.success("Deleted");
      router.push(DOC_PATH[docType]);
    } else toast.error(res.error);
  }

  return (
    <div className="flex gap-2">
      {canEdit && status === DocStatus.DRAFT && (
        <Button variant="outline" size="sm" onClick={() => router.push(`${DOC_PATH[docType]}/${id}/edit`)}>
          Edit
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={loading} />}>
          Actions ▾
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {transitions.map(t => (
            <DropdownMenuItem key={t} onClick={() => handleTransition(t)}>
              Mark as {STATUS_LABELS[t]}
            </DropdownMenuItem>
          ))}
          {canConvertToInvoice && status === DocStatus.ACCEPTED && (
            <DropdownMenuItem onClick={handleConvert}>Convert to Invoice</DropdownMenuItem>
          )}
          {transitions.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem onClick={handleDuplicate}>Duplicate</DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(`/api/documents/${id}/pdf`, "_blank")}>Download PDF</DropdownMenuItem>
          {status === DocStatus.DRAFT && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleDelete}>Delete</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
