import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DocumentForm } from "@/components/documents/document-form";
import { createDocumentAction } from "@/lib/actions/documents";
import { DocType } from "@prisma/client";

export default async function NewCreditNotePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [clients, products, templates, company] = await Promise.all([
    db.client.findMany({ where: { isActive: true }, select: { id: true, name: true, companyName: true }, orderBy: { companyName: "asc" } }),
    db.product.findMany({ where: { isActive: true }, select: { id: true, name: true, defaultPrice: true, unit: true, taxCategory: true }, orderBy: { name: "asc" } }),
    db.template.findMany({ where: { docType: DocType.CREDIT_NOTE }, select: { id: true, name: true } }),
    db.companySettings.findFirst({ select: { defaultCurrency: true, defaultTaxRate: true, defaultPaymentTerms: true } }),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div><h1 className="text-2xl font-bold">New Credit Note</h1></div>
      <DocumentForm
        docType="CREDIT_NOTE"
        clients={clients}
        suppliers={[]}
        products={products}
        templates={templates}
        defaultCurrency={company?.defaultCurrency ?? "MYR"}
        defaultTaxRate={company?.defaultTaxRate ?? 600}
        defaultPaymentTerms={company?.defaultPaymentTerms ?? 30}
        submitLabel="Create Credit Note"
        onSubmit={async (data) => { "use server"; return createDocumentAction(DocType.CREDIT_NOTE, data); }}
      />
    </div>
  );
}
