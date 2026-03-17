"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TaxCategory } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { productFormSchema, type ProductFormData } from "@/lib/validations/product";
import { createProduct, updateProduct } from "@/lib/actions/products";

const UNIT_OPTIONS = ["unit", "pcs", "set", "kg", "g", "litre", "m", "m²", "hr", "day", "month"];

const TAX_CATEGORY_LABELS: Record<TaxCategory, string> = {
  SERVICE_TAX: "Service Tax (6%)",
  SALES_TAX: "Sales Tax (10%)",
  EXEMPT: "Exempt",
};

interface ProductFormProps {
  initial?: ProductFormData & { id?: string };
  mode: "create" | "edit";
}

export function ProductForm({ initial, mode }: ProductFormProps) {
  const router = useRouter();
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting, isDirty } } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initial ?? {
      name: "", description: "", defaultPriceRinggit: 0,
      unit: "unit", taxCategory: TaxCategory.SERVICE_TAX,
      category: "", isActive: true,
    },
  });

  async function onSubmit(data: ProductFormData) {
    if (mode === "create") {
      const result = await createProduct(data);
      if (result.success) {
        toast.success("Product created");
        router.push(`/dashboard/products`);
      } else {
        toast.error(result.error);
      }
    } else {
      if (!initial?.id) return;
      const result = await updateProduct(initial.id, data);
      if (result.success) {
        toast.success("Product updated");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1">
            <Label>Product / Service Name *</Label>
            <Input {...register("name")} placeholder="Web Development Service" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea {...register("description")} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Default Price (RM)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">RM</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-10"
                  {...register("defaultPriceRinggit", { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>
              {errors.defaultPriceRinggit && <p className="text-xs text-destructive">{errors.defaultPriceRinggit.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Unit *</Label>
              <Select value={(watch("unit") as string) || "unit"} onValueChange={(v) => setValue("unit", v as ProductFormData["unit"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Tax Category</Label>
              <Select value={watch("taxCategory") ?? TaxCategory.SERVICE_TAX} onValueChange={(v) => setValue("taxCategory", v as TaxCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(TaxCategory).map((t) => (
                    <SelectItem key={t} value={t}>{TAX_CATEGORY_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Input {...register("category")} placeholder="e.g. IT Services, Hardware" />
            </div>
          </div>
          {mode === "edit" && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" {...register("isActive")} className="h-4 w-4" />
              <Label htmlFor="isActive">Active</Label>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t pt-4 flex gap-2">
          <Button type="submit" disabled={isSubmitting || (mode === "edit" && !isDirty)}>
            {isSubmitting ? "Saving..." : mode === "create" ? "Create Product" : "Save Changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </CardFooter>
      </Card>
    </form>
  );
}
