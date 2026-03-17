import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProductList } from "./product-list";

export default async function ProductsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const products = await db.product.findMany({
    select: { id: true, name: true, defaultPrice: true, unit: true, taxCategory: true, category: true, isActive: true },
    orderBy: { name: "asc" },
  });

  const rows = products.map(p => ({
    id: p.id,
    name: p.name,
    defaultPrice: p.defaultPrice,
    unit: p.unit,
    taxCategory: p.taxCategory,
    category: p.category ?? "",
    isActive: p.isActive,
  }));

  return <ProductList rows={rows} />;
}
