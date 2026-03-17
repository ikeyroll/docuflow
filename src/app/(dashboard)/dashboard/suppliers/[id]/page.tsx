import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupplierForm } from "@/components/forms/supplier-form";

function formatMoney(sen: number) {
  return `RM ${(sen / 100).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  VOID: "bg-red-100 text-red-500",
};

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const supplier = await db.supplier.findUnique({
    where: { id },
    include: {
      documents: {
        select: {
          id: true, documentNumber: true, docType: true, status: true,
          issueDate: true, grandTotalSen: true,
        },
        orderBy: { issueDate: "desc" },
        take: 20,
      },
    },
  });

  if (!supplier) notFound();

  const canEdit = ["ADMIN", "MANAGER"].includes(session.user.role);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{supplier.companyName}</h1>
          <p className="text-muted-foreground text-sm">{supplier.name}</p>
        </div>
        <Link href="/dashboard/suppliers">
          <Button variant="outline">← Back</Button>
        </Link>
      </div>

      {canEdit && (
        <SupplierForm
          mode="edit"
          initial={{
            id: supplier.id,
            name: supplier.name,
            companyName: supplier.companyName,
            email: supplier.email,
            phone: supplier.phone,
            address: supplier.address,
            notes: supplier.notes,
            isActive: supplier.isActive,
          }}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {supplier.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents yet.</p>
          ) : (
            <div className="space-y-2">
              {supplier.documents.map((doc) => (
                <Link key={doc.id} href={`/dashboard/purchase-orders/${doc.id}`} className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{doc.documentNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.docType.replace("_", " ")} · {new Date(doc.issueDate).toLocaleDateString("en-MY")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatMoney(doc.grandTotalSen)}</span>
                    <Badge className={`text-xs ${STATUS_COLORS[doc.status] ?? "bg-gray-100 text-gray-700"} hover:${STATUS_COLORS[doc.status]}`}>
                      {doc.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
