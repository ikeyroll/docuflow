import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PurchaseOrderList } from "./purchase-order-list";

export default async function PurchaseOrdersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const pos = await db.document.findMany({
    where: { docType: "PURCHASE_ORDER" },
    include: { supplier: { select: { companyName: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows = pos.map(d => ({
    id: d.id,
    documentNumber: d.documentNumber,
    supplierName: d.supplier?.companyName ?? "—",
    issueDate: d.issueDate.toISOString(),
    grandTotalSen: d.grandTotalSen,
    status: d.status,
  }));

  return <PurchaseOrderList rows={rows} />;
}
