import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SupplierForm } from "@/components/forms/supplier-form";

export default async function NewSupplierPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Supplier</h1>
        <p className="text-muted-foreground text-sm">Add a new supplier to your directory.</p>
      </div>
      <SupplierForm mode="create" />
    </div>
  );
}
