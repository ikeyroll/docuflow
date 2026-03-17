"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { paymentSchema, type PaymentFormData } from "@/lib/validations/document";
import { recordPaymentAction } from "@/lib/actions/documents";

const PAYMENT_METHODS = [
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CASH", label: "Cash" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "E_WALLET", label: "E-Wallet" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "OTHER", label: "Other" },
];

export function RecordPaymentForm({ invoiceId, remainingAmountSen }: { invoiceId: string; remainingAmountSen: number }) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const { register, handleSubmit, setValue, reset, formState: { isSubmitting } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema) as Resolver<PaymentFormData>,
    defaultValues: { paymentDate: today, method: "BANK_TRANSFER", referenceNumber: "", notes: "", amountSen: remainingAmountSen },
  });

  async function onSubmit(data: PaymentFormData) {
    const res = await recordPaymentAction(invoiceId, data);
    if (res.success) {
      toast.success("Payment recorded");
      reset();
      setOpen(false);
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">+ Record Payment</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Amount (RM) *</Label>
            <Input
              type="number"
              step="0.01"
              defaultValue={(remainingAmountSen / 100).toFixed(2)}
              onChange={e => setValue("amountSen", Math.round(parseFloat(e.target.value || "0") * 100))}
            />
          </div>
          <div className="space-y-1">
            <Label>Payment Date *</Label>
            <Input type="date" {...register("paymentDate")} />
          </div>
          <div className="space-y-1">
            <Label>Method *</Label>
            <Select defaultValue="BANK_TRANSFER" onValueChange={v => setValue("method", v as PaymentFormData["method"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Reference / Cheque Number</Label>
            <Input {...register("referenceNumber")} placeholder="TXN123456" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Recording..." : "Record Payment"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
