"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { supplierFormSchema, type SupplierFormData } from "@/lib/validations/client";
import { createSupplier, updateSupplier } from "@/lib/actions/clients";

interface SupplierFormProps {
  initial?: SupplierFormData & { id?: string };
  mode: "create" | "edit";
}

export function SupplierForm({ initial, mode }: SupplierFormProps) {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: initial ?? {
      name: "", companyName: "", email: "", phone: "",
      address: "", notes: "", isActive: true,
    },
  });

  async function onSubmit(data: SupplierFormData) {
    if (mode === "create") {
      const result = await createSupplier(data);
      if (result.success) {
        toast.success("Supplier created");
        router.push(`/dashboard/suppliers/${result.data?.id}`);
      } else {
        toast.error(result.error);
      }
    } else {
      if (!initial?.id) return;
      const result = await updateSupplier(initial.id, data);
      if (result.success) {
        toast.success("Supplier updated");
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Company Name *</Label>
              <Input {...register("companyName")} placeholder="Vendor Sdn. Bhd." />
              {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Contact Name *</Label>
              <Input {...register("name")} placeholder="Ali bin Ahmad" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input {...register("phone")} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Address</Label>
            <Textarea {...register("address")} rows={2} />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea {...register("notes")} rows={2} />
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
            {isSubmitting ? "Saving..." : mode === "create" ? "Create Supplier" : "Save Changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </CardFooter>
      </Card>
    </form>
  );
}
