import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/documents/calculator";
import { DocStatus } from "@prisma/client";
import Link from "next/link";

export default async function ReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const now = new Date();
  const thisYearStart = new Date(now.getFullYear(), 0, 1);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    revenueThisMonth,
    revenueThisYear,
    sstCollected,
    agingCurrent,
    aging30,
    aging60,
    aging90plus,
    topClients,
  ] = await Promise.all([
    // Revenue this month (paid invoices)
    db.payment.aggregate({
      where: { paymentDate: { gte: thisMonthStart } },
      _sum: { amountSen: true },
    }),
    // Revenue this year
    db.payment.aggregate({
      where: { paymentDate: { gte: thisYearStart } },
      _sum: { amountSen: true },
    }),
    // SST collected this year (tax on paid invoices)
    db.document.aggregate({
      where: {
        docType: "INVOICE",
        status: DocStatus.PAID,
        issueDate: { gte: thisYearStart },
      },
      _sum: { taxTotalSen: true },
    }),
    // Aging: current (not yet due)
    db.document.aggregate({
      where: { docType: "INVOICE", status: { in: [DocStatus.SENT, DocStatus.PARTIALLY_PAID] }, dueDate: { gt: now } },
      _sum: { grandTotalSen: true },
      _count: true,
    }),
    // Aging: 1-30 days overdue
    db.document.aggregate({
      where: { docType: "INVOICE", status: DocStatus.OVERDUE, dueDate: { gt: new Date(now.getTime() - 30 * 86400000), lte: now } },
      _sum: { grandTotalSen: true },
      _count: true,
    }),
    // Aging: 31-60 days overdue
    db.document.aggregate({
      where: { docType: "INVOICE", status: DocStatus.OVERDUE, dueDate: { gt: new Date(now.getTime() - 60 * 86400000), lte: new Date(now.getTime() - 30 * 86400000) } },
      _sum: { grandTotalSen: true },
      _count: true,
    }),
    // Aging: 60+ days overdue
    db.document.aggregate({
      where: { docType: "INVOICE", status: DocStatus.OVERDUE, dueDate: { lte: new Date(now.getTime() - 60 * 86400000) } },
      _sum: { grandTotalSen: true },
      _count: true,
    }),
    // Top clients by revenue
    db.payment.groupBy({
      by: ["documentId"],
      _sum: { amountSen: true },
      orderBy: { _sum: { amountSen: "desc" } },
      take: 10,
    }),
  ]);

  // Get top clients with names
  const topClientDocs = await Promise.all(
    topClients.map(async (p) => {
      const doc = await db.document.findUnique({
        where: { id: p.documentId },
        select: { clientId: true, client: { select: { companyName: true } } },
      });
      return { clientName: doc?.client?.companyName ?? "—", amountSen: p._sum.amountSen ?? 0 };
    })
  );

  // Aggregate by client name
  const clientRevMap: Record<string, number> = {};
  for (const c of topClientDocs) {
    clientRevMap[c.clientName] = (clientRevMap[c.clientName] ?? 0) + c.amountSen;
  }
  const clientRevList = Object.entries(clientRevMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground text-sm">Financial overview and summaries</p>
        </div>
        <Link href="/api/reports/csv" className="text-sm text-primary hover:underline">Export CSV ↓</Link>
      </div>

      {/* Revenue */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Revenue This Month</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-700">{formatMoney(revenueThisMonth._sum?.amountSen ?? 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Revenue This Year</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatMoney(revenueThisYear._sum?.amountSen ?? 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">SST Collected (YTD)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatMoney(sstCollected._sum.taxTotalSen ?? 0)}</div><p className="text-xs text-muted-foreground mt-1">From paid invoices</p></CardContent>
        </Card>
      </div>

      {/* Aging Report */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold">Accounts Receivable Aging</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-muted-foreground"><th className="text-left pb-2">Age</th><th className="text-right pb-2">Count</th><th className="text-right pb-2">Amount</th></tr></thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">Current (not yet due)</td>
                <td className="text-right py-2">{agingCurrent._count}</td>
                <td className="text-right py-2 font-medium">{formatMoney(agingCurrent._sum.grandTotalSen ?? 0)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">1–30 days overdue</td>
                <td className="text-right py-2">{aging30._count}</td>
                <td className="text-right py-2 font-medium text-yellow-700">{formatMoney(aging30._sum.grandTotalSen ?? 0)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">31–60 days overdue</td>
                <td className="text-right py-2">{aging60._count}</td>
                <td className="text-right py-2 font-medium text-orange-700">{formatMoney(aging60._sum.grandTotalSen ?? 0)}</td>
              </tr>
              <tr>
                <td className="py-2">60+ days overdue</td>
                <td className="text-right py-2">{aging90plus._count}</td>
                <td className="text-right py-2 font-medium text-red-700">{formatMoney(aging90plus._sum.grandTotalSen ?? 0)}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Top Clients */}
      {clientRevList.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Top Clients by Revenue</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clientRevList.map(([name, amount]) => {
                const maxAmount = clientRevList[0][1];
                const pct = Math.round((amount / maxAmount) * 100);
                return (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{name}</span>
                      <span>{formatMoney(amount)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
