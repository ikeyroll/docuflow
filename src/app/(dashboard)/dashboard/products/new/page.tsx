import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ProductForm } from "@/components/forms/product-form";

export default async function NewProductPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Product / Service</h1>
        <p className="text-muted-foreground text-sm">Add a product or service to your catalogue.</p>
      </div>
      <ProductForm mode="create" />
    </div>
  );
}
