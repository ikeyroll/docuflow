import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ACTION_COLORS: Record<string, string> = {
  CREATED: "bg-green-100 text-green-800",
  EDITED: "bg-blue-100 text-blue-800",
  STATUS_CHANGED: "bg-yellow-100 text-yellow-800",
  CONVERTED: "bg-purple-100 text-purple-800",
  PAYMENT_RECORDED: "bg-teal-100 text-teal-800",
  DELETED: "bg-red-100 text-red-800",
};

export default async function AuditLogPage({ searchParams }: { searchParams: { page?: string } }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center"><h2 className="text-xl font-semibold">Access Denied</h2><p className="text-muted-foreground">Admin only.</p></div>
      </div>
    );
  }

  const page = parseInt(searchParams.page ?? "1");
  const perPage = 50;
  const skip = (page - 1) * perPage;

  const [logs, total] = await Promise.all([
    db.documentHistory.findMany({
      include: {
        document: { select: { documentNumber: true, docType: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: perPage,
    }),
    db.documentHistory.count(),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground text-sm">{total} entries</p>
      </div>

      <Card>
        <CardContent className="pt-4">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No activity recorded yet.</p>
          ) : (
            <div className="space-y-0 divide-y">
              {logs.map(log => (
                <div key={log.id} className="flex items-start gap-4 py-3 text-sm">
                  <span className="text-muted-foreground text-xs whitespace-nowrap mt-0.5 w-36 shrink-0">
                    {new Date(log.createdAt).toLocaleString("en-MY")}
                  </span>
                  <Badge className={`text-xs shrink-0 ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-700"}`}>
                    {log.action.replace("_", " ")}
                  </Badge>
                  <span className="flex-1">{log.description}</span>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">{log.document?.documentNumber ?? ""}</div>
                    <div className="text-xs text-muted-foreground">{log.changedById}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && <a href={`?page=${page - 1}`} className="text-sm text-primary hover:underline">← Previous</a>}
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          {page < totalPages && <a href={`?page=${page + 1}`} className="text-sm text-primary hover:underline">Next →</a>}
        </div>
      )}
    </div>
  );
}
