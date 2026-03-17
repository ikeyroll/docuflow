"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { BankAccount } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { bankAccountFormSchema, type BankAccountFormData } from "@/lib/validations/settings";
import { createBankAccount, updateBankAccount, deleteBankAccount } from "@/lib/actions/settings";

interface BankAccountListProps {
  accounts: BankAccount[];
}

function BankAccountForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: BankAccountFormData;
  onSubmit: (data: BankAccountFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountFormSchema),
    defaultValues: initial ?? { bankName: "", accountNumber: "", accountHolder: "", isDefault: false },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label>Bank Name *</Label>
        <Input {...register("bankName")} placeholder="Maybank" />
        {errors.bankName && <p className="text-xs text-destructive">{errors.bankName.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Account Number *</Label>
        <Input {...register("accountNumber")} placeholder="1234567890" />
        {errors.accountNumber && <p className="text-xs text-destructive">{errors.accountNumber.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Account Holder *</Label>
        <Input {...register("accountHolder")} placeholder="FACEZ SDN. BHD." />
        {errors.accountHolder && <p className="text-xs text-destructive">{errors.accountHolder.message}</p>}
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="isDefault" checked={watch("isDefault")} onChange={(e) => setValue("isDefault", e.target.checked)} className="h-4 w-4" />
        <Label htmlFor="isDefault">Set as default</Label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : submitLabel}</Button>
      </DialogFooter>
    </form>
  );
}

export function BankAccountList({ accounts }: BankAccountListProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [editAccount, setEditAccount] = useState<BankAccount | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleCreate(data: BankAccountFormData) {
    const result = await createBankAccount(data);
    if (result.success) { toast.success("Bank account added"); setShowCreate(false); router.refresh(); }
    else toast.error(result.error);
  }

  async function handleUpdate(data: BankAccountFormData) {
    if (!editAccount) return;
    const result = await updateBankAccount(editAccount.id, data);
    if (result.success) { toast.success("Bank account updated"); setEditAccount(null); router.refresh(); }
    else toast.error(result.error);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const result = await deleteBankAccount(id);
    setDeleting(null);
    if (result.success) { toast.success("Bank account deleted"); router.refresh(); }
    else toast.error(result.error);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>+ Add Bank Account</Button>
      </div>

      {accounts.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No bank accounts added yet.</p>
      )}

      <div className="space-y-3">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardContent className="pt-4 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{account.bankName}</p>
                  {account.isDefault && <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Default</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{account.accountNumber}</p>
                <p className="text-sm text-muted-foreground">{account.accountHolder}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditAccount(account)}>Edit</Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleting === account.id}
                  onClick={() => handleDelete(account.id)}
                >
                  {deleting === account.id ? "..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(v) => !v && setShowCreate(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
          <BankAccountForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} submitLabel="Add" />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editAccount && (
        <Dialog open onOpenChange={(v) => !v && setEditAccount(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Bank Account</DialogTitle></DialogHeader>
            <BankAccountForm
              initial={{ bankName: editAccount.bankName, accountNumber: editAccount.accountNumber, accountHolder: editAccount.accountHolder, isDefault: editAccount.isDefault }}
              onSubmit={handleUpdate}
              onCancel={() => setEditAccount(null)}
              submitLabel="Save"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
