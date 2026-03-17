import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TemplateList } from "./template-list";

export default async function TemplatesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const templates = await db.template.findMany({
    orderBy: [{ docType: "asc" }, { isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true, name: true, docType: true, isDefault: true, htmlContent: true, cssContent: true, createdAt: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Document Templates</h1>
        <p className="text-muted-foreground text-sm">Edit HTML/CSS templates used to generate PDFs.</p>
      </div>
      <TemplateList templates={templates} />
    </div>
  );
}
