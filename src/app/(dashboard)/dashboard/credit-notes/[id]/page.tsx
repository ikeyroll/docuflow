import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/documents/status-badge";
import { DocumentActions } from "@/components/documents/document-actions";
import { formatMoney } from "@/lib/documents/calculator";
import { DocType } from "@prisma/client";

export default async function CreditNoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const doc = await db.document.findUnique({
    where: { id, docType: DocType.CREDIT_NOTE },
    include: {
      client: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      history: { orderBy: { createdAt: "desc" }, take: 10 },
      createdBy: { select: { name: true } },
    },
  });

  if (!doc) notFound();
  const canManage = ["ADMIN", "MANAGER"].includes(session.user.role);
  const canEdit = canManage || session.user.role === "STAFF";

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1"><Link href="/dashboard/credit-notes" className="text-sm text-muted-foreground hover:underline">← Credit Notes</Link></div>
          <h1 className="text-2xl font-bold">{doc.documentNumber}</h1>
          <div className="flex items-center gap-2 mt-1"><StatusBadge status={doc.status} /></div>
        </div>
        {canManage && <DocumentActions id={doc.id} docType={doc.docType} status={doc.status} canEdit={canEdit} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Client</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">{doc.client?.companyName}</p>
            <p className="text-muted-foreground">{doc.client?.name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{new Date(doc.issueDate).toLocaleDateString("en-MY")}</span></div>
            {doc.dueDate && <div className="flex justify-between"><span className="text-muted-foreground">Due</span><span>{new Date(doc.dueDate).toLocaleDateString("en-MY")}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold">{formatMoney(doc.grandTotalSen)}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Line Items</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-muted-foreground"><th className="text-left pb-2">Description</th><th className="text-right pb-2">Qty</th><th className="text-right pb-2">Unit Price</th><th className="text-right pb-2">Total</th></tr></thead>
            <tbody>
              {doc.lineItems.map(li => (
                <tr key={li.id} className="border-b last:border-0">
                  <td className="py-2">{li.description}</td>
                  <td className="text-right py-2">{(li.quantity / 100).toFixed(2)} {li.unit}</td>
                  <td className="text-right py-2">{formatMoney(li.unitPriceSen)}</td>
                  <td className="text-right py-2 font-medium">{formatMoney(li.lineTotalSen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 space-y-1 text-sm max-w-xs ml-auto">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(doc.subtotalSen)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatMoney(doc.taxTotalSen)}</span></div>
            <Separator />
            <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatMoney(doc.grandTotalSen)}</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
