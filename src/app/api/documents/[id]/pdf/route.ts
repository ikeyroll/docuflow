import { auth } from "@/lib/auth";
import { generateDocumentPdf } from "@/lib/pdf/generator";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const doc = await db.document.findUnique({ where: { id }, select: { documentNumber: true } });
    if (!doc) return new NextResponse("Not Found", { status: 404 });

    const pdfBuffer = await generateDocumentPdf(id);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${doc.documentNumber}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return new NextResponse("PDF generation failed", { status: 500 });
  }
}
