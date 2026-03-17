import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { InvoiceList } from "./invoice-list";

export default async function InvoicesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const invoices = await db.document.findMany({
    where: { docType: "INVOICE" },
    include: { client: { select: { companyName: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows = invoices.map(d => ({
    id: d.id,
    documentNumber: d.documentNumber,
    clientName: d.client?.companyName ?? "—",
    issueDate: d.issueDate.toISOString(),
    dueDate: d.dueDate?.toISOString() ?? null,
    grandTotalSen: d.grandTotalSen,
    status: d.status,
  }));

  return <InvoiceList rows={rows} />;
}
