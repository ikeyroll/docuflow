"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Client, Supplier, Product, Template, TaxCategory } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { documentSchema, type DocumentFormData, type LineItemFormData } from "@/lib/validations/document";
import { formatMoney, calculateLineItem, calculateDocumentTotals } from "@/lib/documents/calculator";

interface DocumentFormProps {
  docType: "QUOTATION" | "INVOICE" | "PURCHASE_ORDER" | "CREDIT_NOTE";
  clients: Pick<Client, "id" | "name" | "companyName">[];
  suppliers: Pick<Supplier, "id" | "name" | "companyName">[];
  products: Pick<Product, "id" | "name" | "defaultPrice" | "unit" | "taxCategory">[];
  templates: Pick<Template, "id" | "name">[];
  defaultCurrency: string;
  defaultTaxRate: number;
  defaultPaymentTerms: number;
  defaultTerms?: string;
  onSubmit: (data: DocumentFormData) => Promise<{ success: boolean; error?: string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any;
  submitLabel?: string;
}

const TAX_OPTIONS = [
  { label: "No Tax (0%)", value: 0 },
  { label: "Service Tax 6%", value: 600 },
  { label: "Sales Tax 10%", value: 1000 },
  { label: "SST 8%", value: 800 },
];

export function DocumentForm({
  docType,
  clients,
  suppliers,
  products,
  templates,
  defaultCurrency,
  defaultTaxRate,
  defaultPaymentTerms,
  defaultTerms = "",
  onSubmit,
  initialData,
  submitLabel = "Save",
}: DocumentFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const defaultDue = new Date(Date.now() + defaultPaymentTerms * 86400000).toISOString().split("T")[0];

  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema) as Resolver<DocumentFormData>,
    defaultValues: initialData ?? {
      clientId: "",
      supplierId: "",
      issueDate: today,
      dueDate: docType !== "QUOTATION" ? defaultDue : undefined,
      validUntil: docType === "QUOTATION" ? new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0] : undefined,
      referenceNumber: "",
      notes: "",
      terms: defaultTerms,
      currency: defaultCurrency,
      lineItems: [{ description: "", quantity: 1, unit: "unit", unitPriceSen: 0, discountType: "PERCENTAGE", discountValue: 0, taxRate: defaultTaxRate, sortOrder: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });
  const watchedItems = watch("lineItems");

  const totals = calculateDocumentTotals(
    (watchedItems || []).map(li => ({
      quantity: Math.round((li.quantity || 0) * 100),
      unitPriceSen: li.unitPriceSen || 0,
      discountType: li.discountType as "PERCENTAGE" | "FIXED",
      discountValue: li.discountValue || 0,
      taxRate: li.taxRate || 0,
    }))
  );

  function taxRateFromCategory(taxCategory: TaxCategory): number {
    if (taxCategory === "SERVICE_TAX") return 600;
    if (taxCategory === "SALES_TAX") return 1000;
    return 0;
  }

  function handleProductSelect(index: number, productId: string) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    setValue(`lineItems.${index}.productId`, productId);
    setValue(`lineItems.${index}.description`, product.name);
    setValue(`lineItems.${index}.unitPriceSen`, product.defaultPrice);
    setValue(`lineItems.${index}.unit`, product.unit);
    setValue(`lineItems.${index}.taxRate`, taxRateFromCategory(product.taxCategory));
  }

  async function onFormSubmit(data: DocumentFormData) {
    setSubmitting(true);
    const result = await onSubmit(data);
    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error ?? "Failed to save");
      return;
    }
    toast.success("Saved successfully");
    router.back();
  }

  const showClient = docType !== "PURCHASE_ORDER";
  const showSupplier = docType === "PURCHASE_ORDER";

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Header fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {showClient && (
          <div className="space-y-1">
            <Label>Client *</Label>
            <Select onValueChange={v => setValue("clientId", v)} defaultValue={initialData?.clientId ?? undefined}>
              <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.companyName} ({c.name})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {showSupplier && (
          <div className="space-y-1">
            <Label>Supplier *</Label>
            <Select onValueChange={v => setValue("supplierId", v)} defaultValue={initialData?.supplierId || undefined}>
              <SelectTrigger><SelectValue placeholder="Select supplier..." /></SelectTrigger>
              <SelectContent>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.companyName} ({s.name})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1">
          <Label>Issue Date *</Label>
          <Input type="date" {...register("issueDate")} />
          {errors.issueDate && <p className="text-xs text-destructive">{errors.issueDate.message}</p>}
        </div>

        {docType === "QUOTATION" && (
          <div className="space-y-1">
            <Label>Valid Until</Label>
            <Input type="date" {...register("validUntil")} />
          </div>
        )}
        {(docType === "INVOICE" || docType === "CREDIT_NOTE") && (
          <div className="space-y-1">
            <Label>Due Date</Label>
            <Input type="date" {...register("dueDate")} />
          </div>
        )}

        <div className="space-y-1">
          <Label>Reference / PO Number</Label>
          <Input {...register("referenceNumber")} placeholder="e.g. PO-2024-001" />
        </div>

        <div className="space-y-1">
          <Label>Currency</Label>
          <Input {...register("currency")} placeholder="MYR" />
        </div>

        {templates.length > 0 && (
          <div className="space-y-1">
            <Label>Template</Label>
            <Select onValueChange={v => setValue("templateId", v as string)} defaultValue={initialData?.templateId ?? undefined}>
              <SelectTrigger><SelectValue placeholder="Default template" /></SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Separator />

      {/* Line Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Line Items</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ description: "", quantity: 1, unit: "unit", unitPriceSen: 0, discountType: "PERCENTAGE", discountValue: 0, taxRate: defaultTaxRate, sortOrder: fields.length })}
          >
            + Add Item
          </Button>
        </div>

        {errors.lineItems?.root && (
          <p className="text-xs text-destructive">{errors.lineItems.root.message}</p>
        )}

        <div className="space-y-3">
          {fields.map((field, index) => {
            const item = watchedItems?.[index];
            const lineCalc = item ? calculateLineItem({
              quantity: Math.round((item.quantity || 0) * 100),
              unitPriceSen: item.unitPriceSen || 0,
              discountType: item.discountType as "PERCENTAGE" | "FIXED",
              discountValue: item.discountValue || 0,
              taxRate: item.taxRate || 0,
            }) : null;

            return (
              <Card key={field.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Product (optional)</Label>
                      <Select onValueChange={v => handleProductSelect(index, v as string)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pick a product..." /></SelectTrigger>
                        <SelectContent>
                          {products.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {fields.length > 1 && (
                      <Button type="button" variant="outline" size="sm" className="mt-5" onClick={() => remove(index)}>✕</Button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Description *</Label>
                    <Input className="text-sm" {...register(`lineItems.${index}.description`)} placeholder="Item description" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input className="text-sm" type="number" step="0.01" {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unit</Label>
                      <Input className="text-sm" {...register(`lineItems.${index}.unit`)} placeholder="unit" />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">Unit Price (RM)</Label>
                      <Input
                        className="text-sm"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        defaultValue={(field.unitPriceSen / 100).toFixed(2)}
                        onChange={e => setValue(`lineItems.${index}.unitPriceSen`, Math.round(parseFloat(e.target.value || "0") * 100))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Discount Type</Label>
                      <Select
                        defaultValue={field.discountType}
                        onValueChange={v => setValue(`lineItems.${index}.discountType`, v as "PERCENTAGE" | "FIXED")}
                      >
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERCENTAGE">%</SelectItem>
                          <SelectItem value="FIXED">RM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Discount</Label>
                      <Input
                        className="text-sm"
                        type="number"
                        step="0.01"
                        placeholder="0"
                        defaultValue={item?.discountType === "FIXED" ? (field.discountValue / 100).toFixed(2) : (field.discountValue / 100).toFixed(2)}
                        onChange={e => {
                          const val = parseFloat(e.target.value || "0");
                          const type = watch(`lineItems.${index}.discountType`);
                          setValue(`lineItems.${index}.discountValue`, type === "FIXED" ? Math.round(val * 100) : Math.round(val * 100));
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tax</Label>
                      <Select
                        defaultValue={String(field.taxRate ?? 0)}
                        onValueChange={v => setValue(`lineItems.${index}.taxRate`, parseInt(String(v ?? 0)))}
                      >
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TAX_OPTIONS.map(t => (
                            <SelectItem key={t.value} value={String(t.value)}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {lineCalc && (
                    <div className="text-right text-sm text-muted-foreground">
                      Line Total: <span className="font-medium text-foreground">{formatMoney(lineCalc.totalSen)}</span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Totals */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-1 text-sm max-w-xs ml-auto">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(totals.subtotalSen)}</span>
            </div>
            {totals.discountTotalSen > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount</span>
                <span>-{formatMoney(totals.discountTotalSen)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatMoney(totals.taxTotalSen)}</span>
            </div>
            {totals.roundingAdjSen !== 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Rounding</span>
                <span>{totals.roundingAdjSen > 0 ? "+" : ""}{formatMoney(Math.abs(totals.roundingAdjSen))}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>{formatMoney(totals.grandTotalSen)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes & Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Notes</Label>
          <Textarea {...register("notes")} rows={3} placeholder="Additional notes for the client..." />
        </div>
        <div className="space-y-1">
          <Label>Terms & Conditions</Label>
          <Textarea {...register("terms")} rows={3} placeholder="Payment terms, warranty info..." />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
