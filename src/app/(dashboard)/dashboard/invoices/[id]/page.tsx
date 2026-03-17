import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/documents/status-badge";
import { DocumentActions } from "@/components/documents/document-actions";
import { RecordPaymentForm } from "@/components/documents/record-payment-form";
import { formatMoney } from "@/lib/documents/calculator";
import { DocType, DocStatus } from "@prisma/client";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const doc = await db.document.findUnique({
    where: { id, docType: DocType.INVOICE },
    include: {
      client: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paymentDate: "desc" } },
      history: { orderBy: { createdAt: "desc" }, take: 10 },
      createdBy: { select: { name: true } },
    },
  });

  if (!doc) notFound();

  const totalPaid = doc.payments.reduce((s, p) => s + p.amountSen, 0);
  const remaining = doc.grandTotalSen - totalPaid;
  const canManage = ["ADMIN", "MANAGER"].includes(session.user.role);
  const canEdit = canManage || session.user.role === "STAFF";
  const payableStatuses: string[] = [DocStatus.SENT, DocStatus.OVERDUE, DocStatus.PARTIALLY_PAID];
  const canRecordPayment = canManage && payableStatuses.includes(doc.status);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1"><Link href="/dashboard/invoices" className="text-sm text-muted-foreground hover:underline">← Invoices</Link></div>
          <h1 className="text-2xl font-bold">{doc.documentNumber}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={doc.status} />
            {doc.referenceNumber && <span className="text-sm text-muted-foreground">Ref: {doc.referenceNumber}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canRecordPayment && <RecordPaymentForm invoiceId={doc.id} remainingAmountSen={remaining} />}
          {canManage && <DocumentActions id={doc.id} docType={doc.docType} status={doc.status} canEdit={canEdit} />}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Client</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">{doc.client?.companyName}</p>
            <p className="text-muted-foreground">{doc.client?.name}</p>
            {doc.client?.email && <p>{doc.client.email}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Issue Date</span><span>{new Date(doc.issueDate).toLocaleDateString("en-MY")}</span></div>
            {doc.dueDate && <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span>{new Date(doc.dueDate).toLocaleDateString("en-MY")}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-bold">{formatMoney(doc.grandTotalSen)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="text-green-700">{formatMoney(totalPaid)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Balance</span><span className={remaining > 0 ? "text-red-600 font-medium" : "text-green-700"}>{formatMoney(remaining)}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Line Items</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-muted-foreground"><th className="text-left pb-2">Description</th><th className="text-right pb-2">Qty</th><th className="text-right pb-2">Unit Price</th><th className="text-right pb-2">Tax</th><th className="text-right pb-2">Total</th></tr></thead>
            <tbody>
              {doc.lineItems.map(li => (
                <tr key={li.id} className="border-b last:border-0">
                  <td className="py-2">{li.description}</td>
                  <td className="text-right py-2">{(li.quantity / 100).toFixed(2)} {li.unit}</td>
                  <td className="text-right py-2">{formatMoney(li.unitPriceSen)}</td>
                  <td className="text-right py-2">{li.taxRate > 0 ? `${(li.taxRate / 100).toFixed(0)}%` : "—"}</td>
                  <td className="text-right py-2 font-medium">{formatMoney(li.lineTotalSen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 space-y-1 text-sm max-w-xs ml-auto">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(doc.subtotalSen)}</span></div>
            {doc.discountTotalSen > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>-{formatMoney(doc.discountTotalSen)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatMoney(doc.taxTotalSen)}</span></div>
            <Separator />
            <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatMoney(doc.grandTotalSen)}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Payments */}
      {doc.payments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Payments</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-muted-foreground"><th className="text-left pb-2">Date</th><th className="text-left pb-2">Method</th><th className="text-left pb-2">Reference</th><th className="text-right pb-2">Amount</th></tr></thead>
              <tbody>
                {doc.payments.map(p => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2">{new Date(p.paymentDate).toLocaleDateString("en-MY")}</td>
                    <td className="py-2">{p.method.replace("_", " ")}</td>
                    <td className="py-2">{p.referenceNumber || "—"}</td>
                    <td className="text-right py-2 font-medium text-green-700">{formatMoney(p.amountSen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {doc.history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {doc.history.map(h => (
                <div key={h.id} className="flex items-start gap-3 text-sm">
                  <span className="text-muted-foreground text-xs mt-0.5 whitespace-nowrap">{new Date(h.createdAt).toLocaleString("en-MY")}</span>
                  <span>{h.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
