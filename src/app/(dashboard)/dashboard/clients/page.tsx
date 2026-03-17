import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ClientList } from "./client-list";

export default async function ClientsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const clients = await db.client.findMany({
    select: { id: true, name: true, companyName: true, email: true, phone: true, isActive: true },
    orderBy: { companyName: "asc" },
  });

  const rows = clients.map(c => ({
    id: c.id,
    name: c.name,
    companyName: c.companyName,
    email: c.email ?? "",
    phone: c.phone ?? "",
    isActive: c.isActive,
  }));

  return <ClientList rows={rows} />;
}
