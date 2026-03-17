"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/shared/data-table";
import type { TaxCategory } from "@prisma/client";

export interface ProductRow {
  id: string;
  name: string;
  defaultPrice: number;
  unit: string;
  taxCategory: TaxCategory;
  category: string;
  isActive: boolean;
}

function formatMoney(sen: number) {
  return `RM ${(sen / 100).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TAX_LABELS: Record<TaxCategory, string> = {
  SERVICE_TAX: "Service Tax",
  SALES_TAX: "Sales Tax",
  EXEMPT: "Exempt",
};

const columns: Column<ProductRow>[] = [
  { key: "name", header: "Name", sortable: true, render: r => (
    <Link href={`/dashboard/products/${r.id}`} className="font-medium hover:underline">{r.name}</Link>
  )},
  { key: "defaultPrice", header: "Price", sortable: true, render: r => formatMoney(r.defaultPrice) },
  { key: "unit", header: "Unit", render: r => r.unit },
  { key: "taxCategory", header: "Tax", render: r => TAX_LABELS[r.taxCategory] },
  { key: "category", header: "Category", render: r => r.category || "—" },
  { key: "isActive", header: "Status", render: r => (
    <Badge className={r.isActive ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-gray-100 text-gray-600 hover:bg-gray-100"}>
      {r.isActive ? "Active" : "Inactive"}
    </Badge>
  )},
  { key: "actions", header: "", render: r => (
    <Link href={`/dashboard/products/${r.id}`}><Button variant="outline" size="sm">Edit</Button></Link>
  )},
];

export function ProductList({ rows }: { rows: ProductRow[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products & Services</h1>
          <p className="text-muted-foreground text-sm">{rows.length} total</p>
        </div>
        <Link href="/dashboard/products/new"><Button>+ New Product</Button></Link>
      </div>
      <DataTable data={rows} columns={columns} searchPlaceholder="Search products..." searchFields={["name", "category"]} />
    </div>
  );
}
