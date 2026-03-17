import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/forms/product-form";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const product = await db.product.findUnique({ where: { id } });
  if (!product) notFound();

  const canEdit = ["ADMIN", "MANAGER"].includes(session.user.role);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="text-muted-foreground text-sm">{product.category || "Uncategorised"}</p>
        </div>
        <Link href="/dashboard/products">
          <Button variant="outline">← Back</Button>
        </Link>
      </div>

      {canEdit ? (
        <ProductForm
          mode="edit"
          initial={{
            id: product.id,
            name: product.name,
            description: product.description,
            defaultPriceRinggit: product.defaultPrice / 100,
            unit: product.unit,
            taxCategory: product.taxCategory,
            category: product.category,
            isActive: product.isActive,
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">You do not have permission to edit products.</p>
      )}
    </div>
  );
}
