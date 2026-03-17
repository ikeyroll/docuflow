import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ClientForm } from "@/components/forms/client-form";

export default async function NewClientPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Client</h1>
        <p className="text-muted-foreground text-sm">Add a new client to your directory.</p>
      </div>
      <ClientForm mode="create" />
    </div>
  );
}
