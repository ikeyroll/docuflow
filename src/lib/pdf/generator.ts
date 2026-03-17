import puppeteer from "puppeteer";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/documents/calculator";
import { DocType } from "@prisma/client";

const DOC_TITLES: Record<DocType, string> = {
  QUOTATION: "QUOTATION",
  INVOICE: "INVOICE",
  PURCHASE_ORDER: "PURCHASE ORDER",
  CREDIT_NOTE: "CREDIT NOTE",
};

export async function generateDocumentPdf(documentId: string): Promise<Buffer> {
  const doc = await db.document.findUniqueOrThrow({
    where: { id: documentId },
    include: {
      client: true,
      supplier: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      payments: true,
      template: true,
    },
  });

  const company = await db.companySettings.findFirst({
    include: { bankAccounts: { where: { isDefault: true }, take: 1 } },
  });

  const party = doc.client || doc.supplier;
  const totalPaid = doc.payments.reduce((s, p) => s + p.amountSen, 0);
  const remaining = doc.grandTotalSen - totalPaid;

  let html: string;
  if (doc.template?.htmlContent) {
    html = buildTemplateHtml(doc.template.htmlContent, doc.template.cssContent ?? "", doc, company, party, totalPaid, remaining);
  } else {
    html = buildHtml(doc, company, party, totalPaid, remaining);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
      printBackground: true,
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

interface PdfTemplate {
  htmlContent: string;
  cssContent: string;
}

interface PdfDoc {
  template?: PdfTemplate | null;
  docType: string;
  documentNumber: string;
  referenceNumber: string;
  issueDate: Date;
  dueDate: Date | null;
  validUntil: Date | null;
  currency: string;
  subtotalSen: number;
  discountTotalSen: number;
  taxTotalSen: number;
  roundingAdjSen: number;
  grandTotalSen: number;
  notes: string;
  terms: string;
  client: { companyName: string; name: string; email: string; phone: string; billingAddress: string } | null;
  supplier: { companyName: string; name: string; email: string; phone: string } | null;
  lineItems: { description: string; quantity: number; unit: string; unitPriceSen: number; discountType: string; discountValue: number; taxRate: number; lineTotalSen: number }[];
  payments: { amountSen: number; paymentDate: Date; method: string; referenceNumber: string }[];
}

function buildTemplateHtml(
  htmlContent: string,
  cssContent: string,
  doc: PdfDoc,
  company: { name: string; address: string; phone: string; email: string; ssmNumber: string; sstNumber: string; logoUrl: string | null; bankAccounts: { bankName: string; accountNumber: string; accountHolder: string }[] } | null,
  party: { companyName: string; name: string; email: string; phone: string } | null,
  totalPaid: number,
  remaining: number
): string {
  const title = DOC_TITLES[doc.docType as DocType] ?? doc.docType;
  const bank = company?.bankAccounts[0];

  const lineRows = doc.lineItems.map(li => `
    <tr>
      <td>${escHtml(li.description)}</td>
      <td class="right">${(li.quantity / 100).toFixed(2)} ${escHtml(li.unit)}</td>
      <td class="right">${formatMoney(li.unitPriceSen)}</td>
      <td class="right">${li.discountValue > 0 ? (li.discountType === "PERCENTAGE" ? `${(li.discountValue / 100).toFixed(0)}%` : formatMoney(li.discountValue)) : "—"}</td>
      <td class="right">${li.taxRate > 0 ? `${(li.taxRate / 100).toFixed(0)}%` : "—"}</td>
      <td class="right">${formatMoney(li.lineTotalSen)}</td>
    </tr>
  `).join("");

  const replacements: Record<string, string> = {
    "{{DOC_TITLE}}": title,
    "{{DOC_NUMBER}}": escHtml(doc.documentNumber),
    "{{DOC_TYPE}}": escHtml(doc.docType),
    "{{REFERENCE_NUMBER}}": escHtml(doc.referenceNumber),
    "{{ISSUE_DATE}}": new Date(doc.issueDate).toLocaleDateString("en-MY"),
    "{{DUE_DATE}}": doc.dueDate ? new Date(doc.dueDate).toLocaleDateString("en-MY") : "—",
    "{{VALID_UNTIL}}": doc.validUntil ? new Date(doc.validUntil).toLocaleDateString("en-MY") : "—",
    "{{CURRENCY}}": escHtml(doc.currency),
    "{{PARTY_COMPANY}}": escHtml(party?.companyName ?? ""),
    "{{PARTY_NAME}}": escHtml(party?.name ?? ""),
    "{{PARTY_EMAIL}}": escHtml(party?.email ?? ""),
    "{{PARTY_PHONE}}": escHtml(party?.phone ?? ""),
    "{{COMPANY_NAME}}": escHtml(company?.name ?? ""),
    "{{COMPANY_ADDRESS}}": escHtml(company?.address ?? ""),
    "{{COMPANY_PHONE}}": escHtml(company?.phone ?? ""),
    "{{COMPANY_EMAIL}}": escHtml(company?.email ?? ""),
    "{{COMPANY_SSM}}": escHtml(company?.ssmNumber ?? ""),
    "{{COMPANY_SST}}": escHtml(company?.sstNumber ?? ""),
    "{{COMPANY_LOGO}}": company?.logoUrl ? `<img src="${escHtml(company.logoUrl)}" style="height:60px;object-fit:contain" alt="logo">` : "",
    "{{LINE_ITEMS}}": lineRows,
    "{{SUBTOTAL}}": formatMoney(doc.subtotalSen),
    "{{DISCOUNT_TOTAL}}": formatMoney(doc.discountTotalSen),
    "{{TAX_TOTAL}}": formatMoney(doc.taxTotalSen),
    "{{GRAND_TOTAL}}": formatMoney(doc.grandTotalSen),
    "{{TOTAL_PAID}}": formatMoney(totalPaid),
    "{{BALANCE_DUE}}": formatMoney(remaining),
    "{{NOTES}}": escHtml(doc.notes),
    "{{TERMS}}": escHtml(doc.terms),
    "{{BANK_NAME}}": escHtml(bank?.bankName ?? ""),
    "{{BANK_ACCOUNT}}": escHtml(bank?.accountNumber ?? ""),
    "{{BANK_HOLDER}}": escHtml(bank?.accountHolder ?? ""),
  };

  let body = htmlContent;
  for (const [token, value] of Object.entries(replacements)) {
    body = body.replaceAll(token, value);
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>${cssContent}</style>
</head>
<body>${body}</body>
</html>`;
}

function buildHtml(
  doc: PdfDoc,
  company: {
    name: string; address: string; phone: string; email: string; ssmNumber: string; sstNumber: string; logoUrl: string | null;
    bankAccounts: { bankName: string; accountNumber: string; accountHolder: string }[];
  } | null,
  party: { companyName: string; name: string; email: string; phone: string } | null,
  totalPaid: number,
  remaining: number
) {
  const title = DOC_TITLES[doc.docType as DocType] ?? doc.docType;
  const bank = company?.bankAccounts[0];

  const lineRows = doc.lineItems.map(li => `
    <tr>
      <td>${escHtml(li.description)}</td>
      <td class="right">${(li.quantity / 100).toFixed(2)} ${escHtml(li.unit)}</td>
      <td class="right">${formatMoney(li.unitPriceSen)}</td>
      <td class="right">${li.discountValue > 0 ? (li.discountType === "PERCENTAGE" ? `${(li.discountValue / 100).toFixed(0)}%` : formatMoney(li.discountValue)) : "—"}</td>
      <td class="right">${li.taxRate > 0 ? `${(li.taxRate / 100).toFixed(0)}%` : "—"}</td>
      <td class="right bold">${formatMoney(li.lineTotalSen)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1a1a1a; line-height: 1.5; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .company-logo { height: 60px; object-fit: contain; }
  .doc-title { font-size: 28px; font-weight: 700; text-align: right; color: #1a1a1a; }
  .doc-number { font-size: 14px; color: #666; text-align: right; }
  .company-name { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
  .meta { color: #555; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
  .section-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 6px; font-weight: 600; }
  .bold { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { background: #f4f4f5; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; }
  td { padding: 8px; border-bottom: 1px solid #e4e4e7; }
  .right { text-align: right; }
  .totals { width: 280px; margin-left: auto; }
  .totals tr td { border: none; padding: 4px 8px; }
  .totals .grand td { font-size: 14px; font-weight: 700; border-top: 2px solid #1a1a1a; padding-top: 8px; }
  .footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 28px; }
  .box { background: #f9f9f9; border: 1px solid #e4e4e7; border-radius: 6px; padding: 14px; }
  .box-title { font-weight: 600; margin-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #666; }
  .notes { white-space: pre-line; color: #444; }
  .stamp { text-align: right; margin-top: 40px; color: #bbb; font-size: 10px; }
</style>
</head>
<body>

<div class="header">
  <div>
    ${company?.logoUrl ? `<img src="${escHtml(company.logoUrl)}" class="company-logo" alt="logo">` : ""}
    <div class="company-name">${escHtml(company?.name ?? "")}</div>
    <div class="meta">${escHtml(company?.address ?? "")}</div>
    ${company?.phone ? `<div class="meta">${escHtml(company.phone)}</div>` : ""}
    ${company?.email ? `<div class="meta">${escHtml(company.email)}</div>` : ""}
    ${company?.ssmNumber ? `<div class="meta">SSM: ${escHtml(company.ssmNumber)}</div>` : ""}
    ${company?.sstNumber ? `<div class="meta">SST: ${escHtml(company.sstNumber)}</div>` : ""}
  </div>
  <div>
    <div class="doc-title">${title}</div>
    <div class="doc-number"># ${escHtml(doc.documentNumber)}</div>
    ${doc.referenceNumber ? `<div class="doc-number">Ref: ${escHtml(doc.referenceNumber)}</div>` : ""}
  </div>
</div>

<div class="grid2">
  <div>
    <div class="section-label">${doc.docType === "PURCHASE_ORDER" ? "Supplier" : "Bill To"}</div>
    <div class="bold">${escHtml(party?.companyName ?? "")}</div>
    <div class="meta">${escHtml(party?.name ?? "")}</div>
    ${party?.email ? `<div class="meta">${escHtml(party.email)}</div>` : ""}
    ${party?.phone ? `<div class="meta">${escHtml(party.phone)}</div>` : ""}
  </div>
  <div>
    <div class="section-label">Document Details</div>
    <table style="width:auto">
      <tr><td class="meta" style="border:none;padding:2px 8px 2px 0">Issue Date</td><td style="border:none;padding:2px 0" class="bold">${new Date(doc.issueDate).toLocaleDateString("en-MY")}</td></tr>
      ${doc.dueDate ? `<tr><td class="meta" style="border:none;padding:2px 8px 2px 0">Due Date</td><td style="border:none;padding:2px 0" class="bold">${new Date(doc.dueDate).toLocaleDateString("en-MY")}</td></tr>` : ""}
      ${doc.validUntil ? `<tr><td class="meta" style="border:none;padding:2px 8px 2px 0">Valid Until</td><td style="border:none;padding:2px 0" class="bold">${new Date(doc.validUntil).toLocaleDateString("en-MY")}</td></tr>` : ""}
      <tr><td class="meta" style="border:none;padding:2px 8px 2px 0">Currency</td><td class="bold" style="border:none;padding:2px 0">${escHtml(doc.currency)}</td></tr>
    </table>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Description</th>
      <th class="right">Qty</th>
      <th class="right">Unit Price</th>
      <th class="right">Discount</th>
      <th class="right">Tax</th>
      <th class="right">Amount</th>
    </tr>
  </thead>
  <tbody>${lineRows}</tbody>
</table>

<table class="totals">
  <tbody>
    <tr><td class="meta">Subtotal</td><td class="right">${formatMoney(doc.subtotalSen)}</td></tr>
    ${doc.discountTotalSen > 0 ? `<tr><td style="color:#dc2626">Discount</td><td class="right" style="color:#dc2626">-${formatMoney(doc.discountTotalSen)}</td></tr>` : ""}
    <tr><td class="meta">Tax</td><td class="right">${formatMoney(doc.taxTotalSen)}</td></tr>
    ${doc.roundingAdjSen !== 0 ? `<tr><td class="meta">Rounding</td><td class="right">${doc.roundingAdjSen > 0 ? "+" : ""}${formatMoney(Math.abs(doc.roundingAdjSen))}</td></tr>` : ""}
    <tr class="grand"><td>TOTAL</td><td class="right">${formatMoney(doc.grandTotalSen)}</td></tr>
    ${totalPaid > 0 ? `<tr><td style="color:#16a34a">Amount Paid</td><td class="right" style="color:#16a34a">${formatMoney(totalPaid)}</td></tr>` : ""}
    ${remaining > 0 && totalPaid > 0 ? `<tr><td style="color:#dc2626;font-weight:600">Balance Due</td><td class="right" style="color:#dc2626;font-weight:600">${formatMoney(remaining)}</td></tr>` : ""}
  </tbody>
</table>

<div class="footer-grid">
  ${bank ? `<div class="box"><div class="box-title">Payment Details</div><div>${escHtml(bank.bankName)}</div><div>${escHtml(bank.accountHolder)}</div><div>${escHtml(bank.accountNumber)}</div></div>` : "<div></div>"}
  ${doc.notes || doc.terms ? `<div class="box"><div class="box-title">Notes</div><div class="notes">${escHtml(doc.notes || doc.terms)}</div></div>` : "<div></div>"}
</div>

<div class="stamp">Generated by DocuFlow</div>
</body>
</html>`;
}

function escHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
