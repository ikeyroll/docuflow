"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { DocType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { templateFormSchema, type TemplateFormData } from "@/lib/validations/settings";
import { updateTemplate } from "@/lib/actions/settings";

const DOC_TYPE_LABELS: Record<DocType, string> = {
  QUOTATION: "Quotation",
  INVOICE: "Invoice",
  PURCHASE_ORDER: "Purchase Order",
  CREDIT_NOTE: "Credit Note",
};

interface TemplateRow {
  id: string;
  name: string;
  docType: DocType;
  isDefault: boolean;
  htmlContent: string;
  cssContent: string;
  createdAt: Date;
}

function EditTemplateDialog({ template, onClose }: { template: TemplateRow; onClose: () => void }) {
  const router = useRouter();
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: template.name,
      htmlContent: template.htmlContent,
      cssContent: template.cssContent,
      isDefault: template.isDefault,
    },
  });

  async function onSubmit(data: TemplateFormData) {
    const result = await updateTemplate(template.id, data);
    if (result.success) {
      toast.success("Template saved");
      onClose();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Template — {DOC_TYPE_LABELS[template.docType]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Template Name *</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={watch("isDefault")}
              onChange={(e) => setValue("isDefault", e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="isDefault">Set as default for {DOC_TYPE_LABELS[template.docType]}</Label>
          </div>
          <Tabs defaultValue="html">
            <TabsList>
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="css">CSS</TabsTrigger>
            </TabsList>
            <TabsContent value="html" className="space-y-1">
              <Label>HTML Content *</Label>
              <Textarea
                {...register("htmlContent")}
                className="font-mono text-xs min-h-[400px]"
                spellCheck={false}
              />
              {errors.htmlContent && <p className="text-xs text-destructive">{errors.htmlContent.message}</p>}
            </TabsContent>
            <TabsContent value="css" className="space-y-1">
              <Label>CSS Styles</Label>
              <Textarea
                {...register("cssContent")}
                className="font-mono text-xs min-h-[400px]"
                spellCheck={false}
              />
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Template"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TemplateList({ templates }: { templates: TemplateRow[] }) {
  const [editTemplate, setEditTemplate] = useState<TemplateRow | null>(null);

  // Group by docType
  const grouped = templates.reduce<Record<string, TemplateRow[]>>((acc, t) => {
    if (!acc[t.docType]) acc[t.docType] = [];
    acc[t.docType].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([docType, docTemplates]) => (
        <div key={docType} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {DOC_TYPE_LABELS[docType as DocType]}
          </h2>
          <div className="space-y-2">
            {docTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
                      {template.isDefault && (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">Default</Badge>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEditTemplate(template)}>
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-3 px-4">
                  <p className="text-xs text-muted-foreground">
                    {template.htmlContent.length.toLocaleString()} chars HTML
                    {template.cssContent.length > 0 && ` · ${template.cssContent.length.toLocaleString()} chars CSS`}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {templates.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No templates found.</p>
      )}

      {editTemplate && <EditTemplateDialog template={editTemplate} onClose={() => setEditTemplate(null)} />}
    </div>
  );
}
