import "dotenv/config";
import { PrismaClient, DocType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const QUOTATION_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  {{CSS}}
</style>
</head>
<body>
  <div class="document">
    <header class="doc-header">
      <div class="company-info">
        {{#if company.logoUrl}}<img src="{{company.logoUrl}}" alt="Logo" class="logo">{{/if}}
        <div>
          <h1 class="company-name">{{company.name}}</h1>
          <p>{{company.address}}</p>
          <p>Tel: {{company.phone}} | Email: {{company.email}}</p>
          {{#if company.sstNumber}}<p>SST No: {{company.sstNumber}}</p>{{/if}}
          {{#if company.ssmNumber}}<p>SSM No: {{company.ssmNumber}}</p>{{/if}}
        </div>
      </div>
      <div class="doc-title-block">
        <h2 class="doc-title">QUOTATION</h2>
        <table class="doc-meta">
          <tr><td>Quotation No:</td><td><strong>{{document.documentNumber}}</strong></td></tr>
          <tr><td>Date:</td><td>{{document.issueDate}}</td></tr>
          <tr><td>Valid Until:</td><td>{{document.validUntil}}</td></tr>
          {{#if document.referenceNumber}}<tr><td>Reference:</td><td>{{document.referenceNumber}}</td></tr>{{/if}}
        </table>
      </div>
    </header>

    <section class="bill-to">
      <h3>QUOTATION FOR:</h3>
      <p><strong>{{client.companyName}}</strong></p>
      <p>{{client.name}}</p>
      <p>{{client.billingAddress}}</p>
      <p>{{client.email}}</p>
    </section>

    <table class="line-items">
      <thead>
        <tr>
          <th class="col-no">No.</th>
          <th class="col-desc">Description</th>
          <th class="col-qty">Qty</th>
          <th class="col-unit">Unit</th>
          <th class="col-price">Unit Price</th>
          <th class="col-disc">Disc.</th>
          <th class="col-tax">Tax</th>
          <th class="col-total">Amount</th>
        </tr>
      </thead>
      <tbody>
        {{#each lineItems}}
        <tr>
          <td class="col-no">{{add @index 1}}</td>
          <td class="col-desc">{{description}}</td>
          <td class="col-qty text-right">{{displayQuantity}}</td>
          <td class="col-unit">{{unit}}</td>
          <td class="col-price text-right">{{displayUnitPrice}}</td>
          <td class="col-disc text-right">{{displayDiscount}}</td>
          <td class="col-tax text-right">{{displayTaxRate}}</td>
          <td class="col-total text-right">{{displayLineTotal}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>

    <div class="totals-section">
      <table class="totals">
        <tr><td>Subtotal</td><td class="text-right">{{totals.displaySubtotal}}</td></tr>
        {{#if totals.hasDiscount}}<tr><td>Discount</td><td class="text-right">- {{totals.displayDiscountTotal}}</td></tr>{{/if}}
        <tr><td>Tax (SST)</td><td class="text-right">{{totals.displayTaxTotal}}</td></tr>
        {{#if totals.hasRounding}}<tr><td>Rounding Adjustment</td><td class="text-right">{{totals.displayRoundingAdj}}</td></tr>{{/if}}
        <tr class="grand-total"><td><strong>GRAND TOTAL (MYR)</strong></td><td class="text-right"><strong>{{totals.displayGrandTotal}}</strong></td></tr>
      </table>
    </div>

    {{#if document.notes}}
    <section class="notes">
      <h4>Notes</h4>
      <p>{{document.notes}}</p>
    </section>
    {{/if}}

    {{#if document.terms}}
    <section class="terms">
      <h4>Terms & Conditions</h4>
      <p>{{document.terms}}</p>
    </section>
    {{/if}}

    <footer class="doc-footer">
      <p>This quotation is valid for {{document.validityDays}} days from the date of issue.</p>
      <p>Thank you for your business.</p>
    </footer>
  </div>
</body>
</html>`;

const INVOICE_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  {{CSS}}
</style>
</head>
<body>
  <div class="document">
    <header class="doc-header">
      <div class="company-info">
        {{#if company.logoUrl}}<img src="{{company.logoUrl}}" alt="Logo" class="logo">{{/if}}
        <div>
          <h1 class="company-name">{{company.name}}</h1>
          <p>{{company.address}}</p>
          <p>Tel: {{company.phone}} | Email: {{company.email}}</p>
          {{#if company.sstNumber}}<p>SST No: {{company.sstNumber}}</p>{{/if}}
          {{#if company.ssmNumber}}<p>SSM No: {{company.ssmNumber}}</p>{{/if}}
        </div>
      </div>
      <div class="doc-title-block">
        <h2 class="doc-title">TAX INVOICE</h2>
        <table class="doc-meta">
          <tr><td>Invoice No:</td><td><strong>{{document.documentNumber}}</strong></td></tr>
          <tr><td>Date:</td><td>{{document.issueDate}}</td></tr>
          <tr><td>Due Date:</td><td>{{document.dueDate}}</td></tr>
          {{#if document.referenceNumber}}<tr><td>Reference:</td><td>{{document.referenceNumber}}</td></tr>{{/if}}
        </table>
      </div>
    </header>

    <section class="bill-to">
      <h3>BILL TO:</h3>
      <p><strong>{{client.companyName}}</strong></p>
      <p>{{client.name}}</p>
      <p>{{client.billingAddress}}</p>
      <p>{{client.email}}</p>
    </section>

    <table class="line-items">
      <thead>
        <tr>
          <th class="col-no">No.</th>
          <th class="col-desc">Description</th>
          <th class="col-qty">Qty</th>
          <th class="col-unit">Unit</th>
          <th class="col-price">Unit Price</th>
          <th class="col-disc">Disc.</th>
          <th class="col-tax">Tax</th>
          <th class="col-total">Amount</th>
        </tr>
      </thead>
      <tbody>
        {{#each lineItems}}
        <tr>
          <td class="col-no">{{add @index 1}}</td>
          <td class="col-desc">{{description}}</td>
          <td class="col-qty text-right">{{displayQuantity}}</td>
          <td class="col-unit">{{unit}}</td>
          <td class="col-price text-right">{{displayUnitPrice}}</td>
          <td class="col-disc text-right">{{displayDiscount}}</td>
          <td class="col-tax text-right">{{displayTaxRate}}</td>
          <td class="col-total text-right">{{displayLineTotal}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>

    <div class="totals-section">
      <table class="totals">
        <tr><td>Subtotal</td><td class="text-right">{{totals.displaySubtotal}}</td></tr>
        {{#if totals.hasDiscount}}<tr><td>Discount</td><td class="text-right">- {{totals.displayDiscountTotal}}</td></tr>{{/if}}
        <tr><td>Tax (SST)</td><td class="text-right">{{totals.displayTaxTotal}}</td></tr>
        {{#if totals.hasRounding}}<tr><td>Rounding Adjustment</td><td class="text-right">{{totals.displayRoundingAdj}}</td></tr>{{/if}}
        <tr class="grand-total"><td><strong>GRAND TOTAL (MYR)</strong></td><td class="text-right"><strong>{{totals.displayGrandTotal}}</strong></td></tr>
      </table>
    </div>

    {{#if bankAccounts}}
    <section class="bank-details">
      <h4>Payment Details</h4>
      {{#each bankAccounts}}
      <p><strong>{{bankName}}</strong> | Account: {{accountNumber}} | {{accountHolder}}</p>
      {{/each}}
    </section>
    {{/if}}

    {{#if document.notes}}
    <section class="notes">
      <h4>Notes</h4>
      <p>{{document.notes}}</p>
    </section>
    {{/if}}

    {{#if document.terms}}
    <section class="terms">
      <h4>Terms & Conditions</h4>
      <p>{{document.terms}}</p>
    </section>
    {{/if}}

    <footer class="doc-footer">
      <p>Thank you for your business.</p>
    </footer>
  </div>
</body>
</html>`;

const PO_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  {{CSS}}
</style>
</head>
<body>
  <div class="document">
    <header class="doc-header">
      <div class="company-info">
        {{#if company.logoUrl}}<img src="{{company.logoUrl}}" alt="Logo" class="logo">{{/if}}
        <div>
          <h1 class="company-name">{{company.name}}</h1>
          <p>{{company.address}}</p>
          <p>Tel: {{company.phone}} | Email: {{company.email}}</p>
          {{#if company.ssmNumber}}<p>SSM No: {{company.ssmNumber}}</p>{{/if}}
        </div>
      </div>
      <div class="doc-title-block">
        <h2 class="doc-title">PURCHASE ORDER</h2>
        <table class="doc-meta">
          <tr><td>PO No:</td><td><strong>{{document.documentNumber}}</strong></td></tr>
          <tr><td>Date:</td><td>{{document.issueDate}}</td></tr>
          <tr><td>Delivery By:</td><td>{{document.dueDate}}</td></tr>
          {{#if document.referenceNumber}}<tr><td>Reference:</td><td>{{document.referenceNumber}}</td></tr>{{/if}}
        </table>
      </div>
    </header>

    <section class="bill-to">
      <h3>SUPPLIER:</h3>
      <p><strong>{{supplier.companyName}}</strong></p>
      <p>{{supplier.name}}</p>
      <p>{{supplier.address}}</p>
      <p>{{supplier.email}}</p>
    </section>

    <table class="line-items">
      <thead>
        <tr>
          <th class="col-no">No.</th>
          <th class="col-desc">Description</th>
          <th class="col-qty">Qty</th>
          <th class="col-unit">Unit</th>
          <th class="col-price">Unit Price</th>
          <th class="col-total">Amount</th>
        </tr>
      </thead>
      <tbody>
        {{#each lineItems}}
        <tr>
          <td class="col-no">{{add @index 1}}</td>
          <td class="col-desc">{{description}}</td>
          <td class="col-qty text-right">{{displayQuantity}}</td>
          <td class="col-unit">{{unit}}</td>
          <td class="col-price text-right">{{displayUnitPrice}}</td>
          <td class="col-total text-right">{{displayLineTotal}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>

    <div class="totals-section">
      <table class="totals">
        <tr><td>Subtotal</td><td class="text-right">{{totals.displaySubtotal}}</td></tr>
        {{#if totals.hasDiscount}}<tr><td>Discount</td><td class="text-right">- {{totals.displayDiscountTotal}}</td></tr>{{/if}}
        <tr><td>Tax (SST)</td><td class="text-right">{{totals.displayTaxTotal}}</td></tr>
        <tr class="grand-total"><td><strong>TOTAL (MYR)</strong></td><td class="text-right"><strong>{{totals.displayGrandTotal}}</strong></td></tr>
      </table>
    </div>

    {{#if document.notes}}
    <section class="notes">
      <h4>Notes</h4>
      <p>{{document.notes}}</p>
    </section>
    {{/if}}

    {{#if document.terms}}
    <section class="terms">
      <h4>Terms & Conditions</h4>
      <p>{{document.terms}}</p>
    </section>
    {{/if}}

    <footer class="doc-footer">
      <p>Authorised by: _________________________ Date: _____________</p>
    </footer>
  </div>
</body>
</html>`;

const CREDIT_NOTE_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  {{CSS}}
</style>
</head>
<body>
  <div class="document">
    <header class="doc-header">
      <div class="company-info">
        {{#if company.logoUrl}}<img src="{{company.logoUrl}}" alt="Logo" class="logo">{{/if}}
        <div>
          <h1 class="company-name">{{company.name}}</h1>
          <p>{{company.address}}</p>
          <p>Tel: {{company.phone}} | Email: {{company.email}}</p>
          {{#if company.sstNumber}}<p>SST No: {{company.sstNumber}}</p>{{/if}}
          {{#if company.ssmNumber}}<p>SSM No: {{company.ssmNumber}}</p>{{/if}}
        </div>
      </div>
      <div class="doc-title-block">
        <h2 class="doc-title">CREDIT NOTE</h2>
        <table class="doc-meta">
          <tr><td>Credit Note No:</td><td><strong>{{document.documentNumber}}</strong></td></tr>
          <tr><td>Date:</td><td>{{document.issueDate}}</td></tr>
          {{#if document.referenceNumber}}<tr><td>Reference Invoice:</td><td>{{document.referenceNumber}}</td></tr>{{/if}}
        </table>
      </div>
    </header>

    <section class="bill-to">
      <h3>CREDIT TO:</h3>
      <p><strong>{{client.companyName}}</strong></p>
      <p>{{client.name}}</p>
      <p>{{client.billingAddress}}</p>
    </section>

    <table class="line-items">
      <thead>
        <tr>
          <th class="col-no">No.</th>
          <th class="col-desc">Description</th>
          <th class="col-qty">Qty</th>
          <th class="col-unit">Unit</th>
          <th class="col-price">Unit Price</th>
          <th class="col-total">Amount</th>
        </tr>
      </thead>
      <tbody>
        {{#each lineItems}}
        <tr>
          <td class="col-no">{{add @index 1}}</td>
          <td class="col-desc">{{description}}</td>
          <td class="col-qty text-right">{{displayQuantity}}</td>
          <td class="col-unit">{{unit}}</td>
          <td class="col-price text-right">{{displayUnitPrice}}</td>
          <td class="col-total text-right">{{displayLineTotal}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>

    <div class="totals-section">
      <table class="totals">
        <tr><td>Subtotal</td><td class="text-right">{{totals.displaySubtotal}}</td></tr>
        {{#if totals.hasDiscount}}<tr><td>Discount</td><td class="text-right">- {{totals.displayDiscountTotal}}</td></tr>{{/if}}
        <tr><td>Tax (SST)</td><td class="text-right">{{totals.displayTaxTotal}}</td></tr>
        <tr class="grand-total"><td><strong>TOTAL CREDIT (MYR)</strong></td><td class="text-right"><strong>{{totals.displayGrandTotal}}</strong></td></tr>
      </table>
    </div>

    {{#if document.notes}}
    <section class="notes">
      <h4>Notes</h4>
      <p>{{document.notes}}</p>
    </section>
    {{/if}}

    <footer class="doc-footer">
      <p>Thank you for your business.</p>
    </footer>
  </div>
</body>
</html>`;

const DEFAULT_CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, sans-serif; font-size: 11pt; color: #222; background: #fff; }
.document { max-width: 210mm; margin: 0 auto; padding: 15mm 15mm 10mm; }

.doc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #1a56db; padding-bottom: 15px; }
.company-info { display: flex; gap: 12px; align-items: flex-start; }
.logo { width: 60px; height: 60px; object-fit: contain; }
.company-name { font-size: 16pt; font-weight: bold; color: #1a56db; margin-bottom: 4px; }
.company-info p { font-size: 9pt; color: #555; margin: 2px 0; }

.doc-title-block { text-align: right; }
.doc-title { font-size: 20pt; font-weight: bold; color: #1a56db; margin-bottom: 8px; }
.doc-meta td { font-size: 9.5pt; padding: 2px 4px; }
.doc-meta td:first-child { color: #666; text-align: right; }
.doc-meta td:last-child { text-align: left; padding-left: 8px; }

.bill-to { margin: 16px 0; background: #f8f9fa; padding: 12px; border-radius: 4px; }
.bill-to h3 { font-size: 9pt; color: #888; letter-spacing: 0.05em; margin-bottom: 6px; }
.bill-to p { font-size: 10pt; margin: 2px 0; }

.line-items { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 9.5pt; }
.line-items thead tr { background: #1a56db; color: #fff; }
.line-items th { padding: 7px 6px; text-align: left; font-weight: 600; font-size: 8.5pt; }
.line-items td { padding: 6px 6px; border-bottom: 1px solid #e5e7eb; }
.line-items tbody tr:nth-child(even) { background: #f9fafb; }
.text-right { text-align: right; }
.col-no { width: 4%; }
.col-desc { width: 35%; }
.col-qty { width: 7%; }
.col-unit { width: 7%; }
.col-price { width: 12%; }
.col-disc { width: 8%; }
.col-tax { width: 7%; }
.col-total { width: 12%; }

.totals-section { display: flex; justify-content: flex-end; margin: 8px 0 16px; }
.totals { border-collapse: collapse; font-size: 10pt; min-width: 260px; }
.totals td { padding: 4px 8px; }
.totals td:first-child { color: #555; text-align: right; }
.totals td:last-child { text-align: right; min-width: 100px; }
.grand-total td { border-top: 2px solid #1a56db; padding-top: 8px; font-size: 11pt; color: #1a56db; }

.bank-details { margin: 12px 0; padding: 10px 12px; border-left: 3px solid #1a56db; background: #eff6ff; font-size: 9.5pt; }
.bank-details h4 { margin-bottom: 6px; color: #1a56db; }
.notes, .terms { margin: 10px 0; font-size: 9pt; color: #555; }
.notes h4, .terms h4 { font-size: 9.5pt; color: #333; margin-bottom: 4px; }

.doc-footer { margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 8.5pt; color: #888; text-align: center; }

@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .document { padding: 10mm; }
}
`;

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Admin user
  const passwordHash = await bcrypt.hash("changeme123", 12);
  const admin = await db.user.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: {
      email: "admin@company.com",
      name: "Admin",
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log("✅ Admin user created:", admin.email);

  // 2. Company settings (single empty row)
  const existingSettings = await db.companySettings.findFirst();
  if (!existingSettings) {
    await db.companySettings.create({
      data: { isSetupComplete: false },
    });
    console.log("✅ Company settings row created");
  } else {
    console.log("ℹ️  Company settings already exists — skipped");
  }

  // 3. Numbering configs
  const numberingConfigs = [
    { docType: DocType.QUOTATION, prefix: "QT" },
    { docType: DocType.INVOICE, prefix: "INV" },
    { docType: DocType.PURCHASE_ORDER, prefix: "PO" },
    { docType: DocType.CREDIT_NOTE, prefix: "CN" },
  ];

  for (const config of numberingConfigs) {
    await db.numberingConfig.upsert({
      where: { docType: config.docType },
      update: {},
      create: {
        docType: config.docType,
        prefix: config.prefix,
        format: "{PREFIX}-{YYYY}-{SEQ:4}",
        currentSequence: 0,
        resetYearly: true,
      },
    });
  }
  console.log("✅ Numbering configs created");

  // 4. Default templates (one per doc type)
  const templates = [
    { docType: DocType.QUOTATION, name: "Default Quotation", html: QUOTATION_TEMPLATE },
    { docType: DocType.INVOICE, name: "Default Invoice", html: INVOICE_TEMPLATE },
    { docType: DocType.PURCHASE_ORDER, name: "Default Purchase Order", html: PO_TEMPLATE },
    { docType: DocType.CREDIT_NOTE, name: "Default Credit Note", html: CREDIT_NOTE_TEMPLATE },
  ];

  for (const t of templates) {
    const existing = await db.template.findFirst({
      where: { docType: t.docType, isDefault: true },
    });
    if (!existing) {
      await db.template.create({
        data: {
          name: t.name,
          docType: t.docType,
          htmlContent: t.html,
          cssContent: DEFAULT_CSS,
          isDefault: true,
          createdById: admin.id,
        },
      });
    }
  }
  console.log("✅ Default templates created");

  console.log("\n🎉 Seed complete!");
  console.log("   Login: admin@company.com / changeme123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
