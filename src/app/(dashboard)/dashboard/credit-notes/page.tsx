import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CreditNoteList } from "./credit-note-list";

export default async function CreditNotesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  let docs: any[] = [];
  try {
    docs = await db.document.findMany({
      where: { docType: "CREDIT_NOTE" },
      include: { client: { select: { companyName: true } } },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch credit notes:", error);
  }

  const rows = docs.map(d => ({
    id: d.id,
    documentNumber: d.documentNumber,
    clientName: d.client?.companyName ?? "—",
    issueDate: d.issueDate.toISOString(),
    grandTotalSen: d.grandTotalSen,
    status: d.status,
  }));

  return <CreditNoteList rows={rows} />;
}
