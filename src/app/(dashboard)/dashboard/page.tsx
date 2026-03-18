import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/documents/calculator";
import { DocStatus } from "@prisma/client";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const now = new Date();

  let outstanding = 0;
  let paidThisMonth = 0;
  let overdueCount = 0;
  let draftCount = 0;
  let recentQuotations: any[] = [];
  let recentInvoices: any[] = [];
  let overdueList: any[] = [];

  try {
    const [
      outstandingAgg,
      paidThisMonthAgg,
      overdueCountResult,
      draftCountResult,
      recentQuotationsResult,
      recentInvoicesResult,
      overdueListResult,
    ] = await Promise.all([
      db.document.aggregate({
        where: { docType: "INVOICE", status: { in: [DocStatus.SENT, DocStatus.PARTIALLY_PAID, DocStatus.OVERDUE] } },
        _sum: { grandTotalSen: true },
      }).catch(() => ({ _sum: { grandTotalSen: null } })),
      db.payment.aggregate({
        where: { paymentDate: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
        _sum: { amountSen: true },
      }).catch(() => ({ _sum: { amountSen: null } })),
      db.document.count({ where: { docType: "INVOICE", status: DocStatus.OVERDUE } }).catch(() => 0),
      db.document.count({ where: { status: DocStatus.DRAFT } }).catch(() => 0),
      db.document.findMany({
        where: { docType: "QUOTATION" },
        include: { client: { select: { companyName: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }).catch(() => []),
      db.document.findMany({
        where: { docType: "INVOICE" },
        include: { client: { select: { companyName: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }).catch(() => []),
      db.document.findMany({
        where: { docType: "INVOICE", status: DocStatus.OVERDUE },
        include: { client: { select: { companyName: true } } },
        orderBy: { dueDate: "asc" },
        take: 5,
      }).catch(() => []),
    ]);

    outstanding = outstandingAgg._sum?.grandTotalSen ?? 0;
    paidThisMonth = paidThisMonthAgg._sum?.amountSen ?? 0;
    overdueCount = overdueCountResult;
    draftCount = draftCountResult;
    recentQuotations = recentQuotationsResult;
    recentInvoices = recentInvoicesResult;
    overdueList = overdueListResult;
  } catch (error) {
    console.error("Dashboard data fetch error:", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Welcome back, {session.user.name}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Outstanding</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(outstanding)}</div>
            <p className="text-xs text-muted-foreground mt-1">Unpaid invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Paid This Month</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{formatMoney(paidThisMonth)}</div>
            <p className="text-xs text-muted-foreground mt-1">{now.toLocaleString("en-MY", { month: "long", year: "numeric" })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Overdue</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-600" : ""}`}>{overdueCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Invoice{overdueCount !== 1 ? "s" : ""} overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Drafts</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Unsent documents</p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Alert */}
      {overdueList.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700">⚠ Overdue Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueList.map(inv => (
                <div key={inv.id} className="flex items-center justify-between text-sm">
                  <div>
                    <Link href={`/dashboard/invoices/${inv.id}`} className="font-medium hover:underline text-red-800">{inv.documentNumber}</Link>
                    <span className="text-red-600 ml-2">{inv.client?.companyName}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-red-800">{formatMoney(inv.grandTotalSen)}</div>
                    {inv.dueDate && <div className="text-xs text-red-500">Due {new Date(inv.dueDate).toLocaleDateString("en-MY")}</div>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Quotations</CardTitle>
            <Link href="/dashboard/quotations" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {recentQuotations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No quotations yet. <Link href="/dashboard/quotations/new" className="text-primary hover:underline">Create one</Link></p>
            ) : (
              <div className="space-y-2">
                {recentQuotations.map(q => (
                  <div key={q.id} className="flex items-center justify-between text-sm">
                    <div>
                      <Link href={`/dashboard/quotations/${q.id}`} className="font-medium hover:underline">{q.documentNumber}</Link>
                      <span className="text-muted-foreground ml-2">{q.client?.companyName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{formatMoney(q.grandTotalSen)}</span>
                      <Badge variant="outline" className="text-xs">{q.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Invoices</CardTitle>
            <Link href="/dashboard/invoices" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {recentInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices yet. <Link href="/dashboard/invoices/new" className="text-primary hover:underline">Create one</Link></p>
            ) : (
              <div className="space-y-2">
                {recentInvoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between text-sm">
                    <div>
                      <Link href={`/dashboard/invoices/${inv.id}`} className="font-medium hover:underline">{inv.documentNumber}</Link>
                      <span className="text-muted-foreground ml-2">{inv.client?.companyName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{formatMoney(inv.grandTotalSen)}</span>
                      <Badge variant="outline" className="text-xs">{inv.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
