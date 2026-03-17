"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/documents/status-badge";
import { formatMoney } from "@/lib/documents/calculator";
import type { DocStatus } from "@prisma/client";

export interface InvoiceRow {
  id: string;
  documentNumber: string;
  clientName: string;
  issueDate: string;
  dueDate: string | null;
  grandTotalSen: number;
  status: DocStatus;
}

const columns: Column<InvoiceRow>[] = [
  { key: "documentNumber", header: "Number", sortable: true, render: r => (
    <Link href={`/dashboard/invoices/${r.id}`} className="font-medium hover:underline">{r.documentNumber}</Link>
  )},
  { key: "clientName", header: "Client", sortable: true, render: r => r.clientName },
  { key: "issueDate", header: "Date", sortable: true, render: r => new Date(r.issueDate).toLocaleDateString("en-MY") },
  { key: "dueDate", header: "Due", render: r => r.dueDate ? new Date(r.dueDate).toLocaleDateString("en-MY") : "—" },
  { key: "grandTotalSen", header: "Total", sortable: true, render: r => formatMoney(r.grandTotalSen) },
  { key: "status", header: "Status", render: r => <StatusBadge status={r.status} /> },
  { key: "actions", header: "", render: r => (
    <Link href={`/dashboard/invoices/${r.id}`}><Button variant="outline" size="sm">View</Button></Link>
  )},
];

export function InvoiceList({ rows }: { rows: InvoiceRow[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-muted-foreground text-sm">{rows.length} total</p>
        </div>
        <Link href="/dashboard/invoices/new"><Button>+ New Invoice</Button></Link>
      </div>
      <DataTable data={rows} columns={columns} searchPlaceholder="Search invoices..." searchFields={["documentNumber", "clientName"]} />
    </div>
  );
}
