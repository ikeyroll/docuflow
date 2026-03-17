import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const payments = await db.payment.findMany({
    include: {
      document: {
        select: { documentNumber: true, docType: true, issueDate: true, client: { select: { companyName: true } } },
      },
    },
    orderBy: { paymentDate: "desc" },
  });

  const rows = [
    ["Date", "Document", "Type", "Client", "Amount (RM)", "Method", "Reference"],
    ...payments.map(p => [
      new Date(p.paymentDate).toLocaleDateString("en-MY"),
      p.document.documentNumber,
      p.document.docType,
      p.document.client?.companyName ?? "",
      (p.amountSen / 100).toFixed(2),
      p.method,
      p.referenceNumber,
    ]),
  ];

  const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="revenue-report-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
