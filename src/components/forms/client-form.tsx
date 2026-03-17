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
import { clientFormSchema, type ClientFormData } from "@/lib/validations/client";
import { createClient, updateClient } from "@/lib/actions/clients";

interface ClientFormProps {
  initial?: ClientFormData & { id?: string };
  mode: "create" | "edit";
}

export function ClientForm({ initial, mode }: ClientFormProps) {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: initial ?? {
      name: "", companyName: "", email: "", phone: "",
      billingAddress: "", shippingAddress: "",
      paymentTerms: null, notes: "", isActive: true,
    },
  });

  async function onSubmit(data: ClientFormData) {
    if (mode === "create") {
      const result = await createClient(data);
      if (result.success) {
        toast.success("Client created");
        router.push(`/dashboard/clients/${result.data?.id}`);
      } else {
        toast.error(result.error);
      }
    } else {
      if (!initial?.id) return;
      const result = await updateClient(initial.id, data);
      if (result.success) {
        toast.success("Client updated");
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
              <Input {...register("companyName")} placeholder="Acme Sdn. Bhd." />
              {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Contact Name *</Label>
              <Input {...register("name")} placeholder="Ahmad bin Ali" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" {...register("email")} placeholder="ahmad@acme.com" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input {...register("phone")} placeholder="+6012-345 6789" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Billing Address</Label>
            <Textarea {...register("billingAddress")} rows={2} placeholder="No. 1, Jalan Ampang, 50450 Kuala Lumpur" />
          </div>
          <div className="space-y-1">
            <Label>Shipping Address <span className="text-muted-foreground text-xs">(leave blank if same as billing)</span></Label>
            <Textarea {...register("shippingAddress")} rows={2} />
          </div>
          <div className="space-y-1">
            <Label>Payment Terms (days)</Label>
            <Input
              type="number"
              {...register("paymentTerms", { setValueAs: (v) => (v === "" || v === null) ? null : parseInt(v) })}
              placeholder="30"
              className="max-w-[120px]"
            />
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
            {isSubmitting ? "Saving..." : mode === "create" ? "Create Client" : "Save Changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </CardFooter>
      </Card>
    </form>
  );
}
