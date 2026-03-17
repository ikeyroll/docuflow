"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { NumberingConfig } from "@prisma/client";
import { DocType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { numberingFormSchema, type NumberingFormData } from "@/lib/validations/settings";
import { updateNumberingConfig } from "@/lib/actions/settings";

const DOC_TYPE_LABELS: Record<DocType, string> = {
  QUOTATION: "Quotation",
  INVOICE: "Invoice",
  PURCHASE_ORDER: "Purchase Order",
  CREDIT_NOTE: "Credit Note",
};

function NumberingConfigCard({ config }: { config: NumberingConfig }) {
  const router = useRouter();
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting, isDirty } } = useForm<NumberingFormData>({
    resolver: zodResolver(numberingFormSchema),
    defaultValues: { prefix: config.prefix, format: config.format, resetYearly: config.resetYearly },
  });

  async function onSubmit(data: NumberingFormData) {
    const result = await updateNumberingConfig(config.docType, data);
    if (result.success) { toast.success(`${DOC_TYPE_LABELS[config.docType]} numbering saved`); router.refresh(); }
    else toast.error(result.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{DOC_TYPE_LABELS[config.docType]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Prefix</Label>
              <Input {...register("prefix")} placeholder="QT" />
              {errors.prefix && <p className="text-xs text-destructive">{errors.prefix.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Format</Label>
              <Input {...register("format")} placeholder="{PREFIX}-{YYYY}-{SEQ:4}" />
              {errors.format && <p className="text-xs text-destructive">{errors.format.message}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`reset-${config.docType}`}
              checked={watch("resetYearly")}
              onChange={(e) => setValue("resetYearly", e.target.checked, { shouldDirty: true })}
              className="h-4 w-4"
            />
            <Label htmlFor={`reset-${config.docType}`}>Reset sequence yearly</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Current sequence: <strong>{config.currentSequence}</strong>
            {config.lastResetYear && <> · Last reset: {config.lastResetYear}</>}
          </p>
          <p className="text-xs text-muted-foreground">
            Tokens: <code className="bg-muted px-1 rounded">{"{PREFIX}"}</code>{" "}
            <code className="bg-muted px-1 rounded">{"{YYYY}"}</code>{" "}
            <code className="bg-muted px-1 rounded">{"{MM}"}</code>{" "}
            <code className="bg-muted px-1 rounded">{"{SEQ:4}"}</code>
          </p>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <Button type="submit" size="sm" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

export function NumberingConfigList({ configs }: { configs: NumberingConfig[] }) {
  return (
    <div className="space-y-4">
      {configs.map((config) => (
        <NumberingConfigCard key={config.id} config={config} />
      ))}
    </div>
  );
}
