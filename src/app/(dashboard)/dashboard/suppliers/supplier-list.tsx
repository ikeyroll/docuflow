"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/shared/data-table";

export interface SupplierRow {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  isActive: boolean;
}

const columns: Column<SupplierRow>[] = [
  { key: "companyName", header: "Company", sortable: true, render: r => (
    <Link href={`/dashboard/suppliers/${r.id}`} className="font-medium hover:underline">{r.companyName}</Link>
  )},
  { key: "name", header: "Contact", sortable: true, render: r => r.name },
  { key: "email", header: "Email", render: r => r.email || "—" },
  { key: "phone", header: "Phone", render: r => r.phone || "—" },
  { key: "isActive", header: "Status", render: r => (
    <Badge className={r.isActive ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-gray-100 text-gray-600 hover:bg-gray-100"}>
      {r.isActive ? "Active" : "Inactive"}
    </Badge>
  )},
  { key: "actions", header: "", render: r => (
    <Link href={`/dashboard/suppliers/${r.id}`}><Button variant="outline" size="sm">View</Button></Link>
  )},
];

export function SupplierList({ rows }: { rows: SupplierRow[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <p className="text-muted-foreground text-sm">{rows.length} total</p>
        </div>
        <Link href="/dashboard/suppliers/new"><Button>+ New Supplier</Button></Link>
      </div>
      <DataTable data={rows} columns={columns} searchPlaceholder="Search suppliers..." searchFields={["companyName", "name", "email"]} />
    </div>
  );
}
