"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/documents/status-badge";
import { formatMoney } from "@/lib/documents/calculator";
import type { DocStatus } from "@prisma/client";

export interface PurchaseOrderRow {
  id: string;
  documentNumber: string;
  supplierName: string;
  issueDate: string;
  grandTotalSen: number;
  status: DocStatus;
}

const columns: Column<PurchaseOrderRow>[] = [
  { key: "documentNumber", header: "Number", sortable: true, render: r => (
    <Link href={`/dashboard/purchase-orders/${r.id}`} className="font-medium hover:underline">{r.documentNumber}</Link>
  )},
  { key: "supplierName", header: "Supplier", sortable: true, render: r => r.supplierName },
  { key: "issueDate", header: "Date", sortable: true, render: r => new Date(r.issueDate).toLocaleDateString("en-MY") },
  { key: "grandTotalSen", header: "Total", sortable: true, render: r => formatMoney(r.grandTotalSen) },
  { key: "status", header: "Status", render: r => <StatusBadge status={r.status} /> },
  { key: "actions", header: "", render: r => (
    <Link href={`/dashboard/purchase-orders/${r.id}`}><Button variant="outline" size="sm">View</Button></Link>
  )},
];

export function PurchaseOrderList({ rows }: { rows: PurchaseOrderRow[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground text-sm">{rows.length} total</p>
        </div>
        <Link href="/dashboard/purchase-orders/new"><Button>+ New Purchase Order</Button></Link>
      </div>
      <DataTable data={rows} columns={columns} searchPlaceholder="Search purchase orders..." searchFields={["documentNumber", "supplierName"]} />
    </div>
  );
}
