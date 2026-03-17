import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DocumentForm } from "@/components/documents/document-form";
import { updateDocumentAction } from "@/lib/actions/documents";
import { DocType, DocStatus } from "@prisma/client";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const doc = await db.document.findUnique({
    where: { id, docType: DocType.INVOICE },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });

  if (!doc) notFound();
  if (doc.status !== DocStatus.DRAFT) redirect(`/dashboard/invoices/${id}`);

  const [clients, products, templates, company] = await Promise.all([
    db.client.findMany({ where: { isActive: true }, select: { id: true, name: true, companyName: true }, orderBy: { companyName: "asc" } }),
    db.product.findMany({ where: { isActive: true }, select: { id: true, name: true, defaultPrice: true, unit: true, taxCategory: true }, orderBy: { name: "asc" } }),
    db.template.findMany({ where: { docType: DocType.INVOICE }, select: { id: true, name: true } }),
    db.companySettings.findFirst({ select: { defaultCurrency: true, defaultTaxRate: true, defaultPaymentTerms: true } }),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Edit {doc.documentNumber}</h1>
      <DocumentForm
        docType="INVOICE"
        clients={clients}
        suppliers={[]}
        products={products}
        templates={templates}
        defaultCurrency={company?.defaultCurrency ?? "MYR"}
        defaultTaxRate={company?.defaultTaxRate ?? 600}
        defaultPaymentTerms={company?.defaultPaymentTerms ?? 30}
        submitLabel="Save Changes"
        initialData={{
          clientId: doc.clientId ?? "",
          issueDate: doc.issueDate.toISOString().split("T")[0],
          dueDate: doc.dueDate?.toISOString().split("T")[0] ?? "",
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
        onSubmit={async (data) => { "use server"; return updateDocumentAction(id, data); }}
      />
    </div>
  );
}
