"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/documents/status-badge";
import { formatMoney } from "@/lib/documents/calculator";
import type { DocStatus } from "@prisma/client";

export interface CreditNoteRow {
  id: string;
  documentNumber: string;
  clientName: string;
  issueDate: string;
  grandTotalSen: number;
  status: DocStatus;
}

const columns: Column<CreditNoteRow>[] = [
  { key: "documentNumber", header: "Number", sortable: true, render: r => (
    <Link href={`/dashboard/credit-notes/${r.id}`} className="font-medium hover:underline">{r.documentNumber}</Link>
  )},
  { key: "clientName", header: "Client", sortable: true, render: r => r.clientName },
  { key: "issueDate", header: "Date", sortable: true, render: r => new Date(r.issueDate).toLocaleDateString("en-MY") },
  { key: "grandTotalSen", header: "Amount", sortable: true, render: r => formatMoney(r.grandTotalSen) },
  { key: "status", header: "Status", render: r => <StatusBadge status={r.status} /> },
  { key: "actions", header: "", render: r => (
    <Link href={`/dashboard/credit-notes/${r.id}`}><Button variant="outline" size="sm">View</Button></Link>
  )},
];

export function CreditNoteList({ rows }: { rows: CreditNoteRow[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Credit Notes</h1>
          <p className="text-muted-foreground text-sm">{rows.length} total</p>
        </div>
        <Link href="/dashboard/credit-notes/new"><Button>+ New Credit Note</Button></Link>
      </div>
      <DataTable data={rows} columns={columns} searchPlaceholder="Search credit notes..." searchFields={["documentNumber", "clientName"]} />
    </div>
  );
}
