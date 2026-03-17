"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { CompanySettings } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { companyInfoSchema, type CompanyInfoData } from "@/lib/validations/setup";
import { updateCompanySettings } from "@/lib/actions/settings";

interface CompanySettingsFormProps {
  company: CompanySettings;
}

export function CompanySettingsForm({ company }: CompanySettingsFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<CompanyInfoData>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: {
      name: company.name,
      ssmNumber: company.ssmNumber,
      sstNumber: company.sstNumber,
      address: company.address,
      phone: company.phone,
      email: company.email,
      website: company.website,
    },
  });

  async function onSubmit(data: CompanyInfoData) {
    const result = await updateCompanySettings(data);
    if (result.success) {
      toast.success("Company settings saved");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Company Name *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="ssmNumber">SSM Number</Label>
              <Input id="ssmNumber" {...register("ssmNumber")} placeholder="202401012345" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sstNumber">SST Number</Label>
              <Input id="sstNumber" {...register("sstNumber")} placeholder="B16-1234-56789012" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="address">Address *</Label>
            <Input id="address" {...register("address")} />
            {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} placeholder="+603-1234 5678" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="website">Website</Label>
            <Input id="website" {...register("website")} placeholder="https://company.com" />
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
