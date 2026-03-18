import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { QuotationList } from "./quotation-list";

export default async function QuotationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  let quotations: any[] = [];
  try {
    quotations = await db.document.findMany({
      where: { docType: "QUOTATION" },
      include: { client: { select: { companyName: true } } },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch quotations:", error);
  }

  const rows = quotations.map(q => ({
    id: q.id,
    documentNumber: q.documentNumber,
    clientName: q.client?.companyName ?? "—",
    issueDate: q.issueDate.toISOString(),
    validUntil: q.validUntil?.toISOString() ?? null,
    grandTotalSen: q.grandTotalSen,
    status: q.status,
  }));

  return <QuotationList rows={rows} />;
}
