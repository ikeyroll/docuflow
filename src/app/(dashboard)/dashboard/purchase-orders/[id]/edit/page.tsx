import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DocumentForm } from "@/components/documents/document-form";
import { updateDocumentAction } from "@/lib/actions/documents";
import { DocType, DocStatus } from "@prisma/client";

export default async function EditPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const canManage = ["ADMIN", "MANAGER"].includes(session.user.role);
  if (!canManage) redirect(`/dashboard/purchase-orders/${id}`);

  const doc = await db.document.findUnique({
    where: { id, docType: DocType.PURCHASE_ORDER },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });

  if (!doc) notFound();
  if (doc.status !== DocStatus.DRAFT) redirect(`/dashboard/purchase-orders/${id}`);

  const [suppliers, products, company] = await Promise.all([
    db.supplier.findMany({ where: { isActive: true }, select: { id: true, name: true, companyName: true }, orderBy: { companyName: "asc" } }),
    db.product.findMany({ where: { isActive: true }, select: { id: true, name: true, defaultPrice: true, unit: true, taxCategory: true }, orderBy: { name: "asc" } }),
    db.companySettings.findFirst({ select: { defaultCurrency: true, defaultTaxRate: true, defaultPaymentTerms: true } }),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit {doc.documentNumber}</h1>
      </div>
      <DocumentForm
        docType="PURCHASE_ORDER"
        clients={[]}
        suppliers={suppliers}
        products={products}
        templates={[]}
        defaultCurrency={company?.defaultCurrency ?? "MYR"}
        defaultTaxRate={company?.defaultTaxRate ?? 0}
        defaultPaymentTerms={company?.defaultPaymentTerms ?? 30}
        submitLabel="Save Changes"
        initialData={{
          supplierId: doc.supplierId ?? "",
          issueDate: doc.issueDate.toISOString().split("T")[0],
          referenceNumber: doc.referenceNumber,
          notes: doc.notes,
          terms: doc.terms,
          currency: doc.currency,
          lineItems: doc.lineItems.map(li => ({
            productId: li.productId ?? undefined,
            description: li.description,
            quantity: li.quantity / 100,
            unit: li.unit,
            unitPriceSen: li.unitPriceSen,
            discountType: li.discountType as "PERCENTAGE" | "FIXED",
            discountValue: li.discountValue,
            taxRate: li.taxRate,
            sortOrder: li.sortOrder,
          })),
        }}
        onSubmit={async (data) => {
          "use server";
          return updateDocumentAction(id, data);
        }}
      />
    </div>
  );
}
