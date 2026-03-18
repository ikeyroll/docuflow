import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SupplierList } from "./supplier-list";

export default async function SuppliersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  let suppliers: any[] = [];
  try {
    suppliers = await db.supplier.findMany({
      select: { id: true, name: true, companyName: true, email: true, phone: true, isActive: true },
      orderBy: { companyName: "asc" },
    });
  } catch (error) {
    console.error("Failed to fetch suppliers:", error);
  }

  const rows = suppliers.map(s => ({
    id: s.id,
    name: s.name,
    companyName: s.companyName,
    email: s.email ?? "",
    phone: s.phone ?? "",
    isActive: s.isActive,
  }));

  return <SupplierList rows={rows} />;
}
