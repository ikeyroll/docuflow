# DATABASE.md — Data Structure

## Overview

PostgreSQL database, managed via Prisma ORM. Single-tenant — one database per company deployment.

All monetary values are stored as **integers in sen** (1 MYR = 100 sen).
All timestamps are stored in **UTC**.
All IDs are **CUID strings** (Prisma default) unless otherwise noted.

## Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// COMPANY SETTINGS (Single row — this company's configuration)
// ============================================================

model CompanySettings {
  id              String   @id @default(cuid())
  name            String   @default("")
  ssmNumber       String   @default("") @map("ssm_number")
  sstNumber       String   @default("") @map("sst_number")
  logoUrl         String?  @map("logo_url")
  address         String   @default("")
  phone           String   @default("")
  email           String   @default("")
  website         String   @default("")
  defaultCurrency String   @default("MYR") @map("default_currency")
  defaultPaymentTerms Int  @default(30) @map("default_payment_terms") // days
  defaultTaxRate  Int      @default(600) @map("default_tax_rate") // 6.00% stored as 600 (basis points)
  isSetupComplete Boolean  @default(false) @map("is_setup_complete")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  bankAccounts    BankAccount[]

  @@map("company_settings")
}

model BankAccount {
  id              String   @id @default(cuid())
  bankName        String   @map("bank_name")
  accountNumber   String   @map("account_number")
  accountHolder   String   @map("account_holder")
  isDefault       Boolean  @default(false) @map("is_default")
  companyId       String   @map("company_id")
  company         CompanySettings @relation(fields: [companyId], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now()) @map("created_at")

  @@map("bank_accounts")
}

// ============================================================
// USERS & AUTH
// ============================================================

enum UserRole {
  ADMIN
  MANAGER
  STAFF
  VIEWER
}

model User {
  id              String   @id @default(cuid())
  email           String   @unique
  name            String
  passwordHash    String   @map("password_hash")
  role            UserRole @default(STAFF)
  isActive        Boolean  @default(true) @map("is_active")
  lastLoginAt     DateTime? @map("last_login_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  documentsCreated  Document[]   @relation("CreatedBy")
  documentsApproved Document[]   @relation("ApprovedBy")
  paymentsRecorded  Payment[]    @relation("RecordedBy")
  activityLogs      ActivityLog[]

  @@map("users")
}

// ============================================================
// CLIENTS & SUPPLIERS
// ============================================================

model Client {
  id              String   @id @default(cuid())
  name            String   // Contact person name
  companyName     String   @map("company_name")
  email           String   @default("")
  phone           String   @default("")
  billingAddress  String   @default("") @map("billing_address")
  shippingAddress String   @default("") @map("shipping_address")
  paymentTerms    Int?     @map("payment_terms") // Override default, in days
  notes           String   @default("")
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  documents       Document[]

  @@map("clients")
}

model Supplier {
  id              String   @id @default(cuid())
  name            String   // Contact person name
  companyName     String   @map("company_name")
  email           String   @default("")
  phone           String   @default("")
  address         String   @default("")
  notes           String   @default("")
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  documents       Document[]

  @@map("suppliers")
}

// ============================================================
// PRODUCT / SERVICE CATALOGUE
// ============================================================

enum TaxCategory {
  SERVICE_TAX     // 6%
  SALES_TAX       // 10%
  EXEMPT          // 0%
}

model Product {
  id              String      @id @default(cuid())
  name            String
  description     String      @default("")
  defaultPrice    Int         @map("default_price") // in sen
  unit            String      @default("unit") // pcs, hours, sets, lots, kg, etc.
  taxCategory     TaxCategory @default(SERVICE_TAX) @map("tax_category")
  category        String      @default("")
  isActive        Boolean     @default(true) @map("is_active")
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")

  lineItems       DocumentLineItem[]

  @@map("products")
}

// ============================================================
// DOCUMENTS (Quotation, Invoice, PO, Credit Note)
// ============================================================

enum DocType {
  QUOTATION
  INVOICE
  PURCHASE_ORDER
  CREDIT_NOTE
}

enum DocStatus {
  DRAFT
  SENT
  ACCEPTED           // Quotation only
  REJECTED            // Quotation only
  EXPIRED             // Quotation only
  CONVERTED           // Quotation only (converted to invoice/PO)
  PARTIALLY_PAID      // Invoice only
  PAID                // Invoice only
  OVERDUE             // Invoice only
  VOID                // Invoice / Credit Note
  ACKNOWLEDGED        // PO only
  PARTIALLY_RECEIVED  // PO only
  FULFILLED           // PO only
  CANCELLED           // PO only
}

model Document {
  id                String     @id @default(cuid())
  docType           DocType    @map("doc_type")
  documentNumber    String     @unique @map("document_number")
  referenceNumber   String     @default("") @map("reference_number") // Client's PO number, etc.
  status            DocStatus  @default(DRAFT)
  version           Int        @default(1)

  // Relations — a document has either a client (quotation/invoice) or supplier (PO)
  clientId          String?    @map("client_id")
  client            Client?    @relation(fields: [clientId], references: [id])
  supplierId        String?    @map("supplier_id")
  supplier          Supplier?  @relation(fields: [supplierId], references: [id])

  // Dates
  issueDate         DateTime   @map("issue_date")
  dueDate           DateTime?  @map("due_date")        // Invoice: payment due. PO: delivery expected.
  validUntil        DateTime?  @map("valid_until")      // Quotation: expiry date

  // Money (all in sen)
  subtotalSen       Int        @default(0) @map("subtotal_sen")
  discountTotalSen  Int        @default(0) @map("discount_total_sen")
  taxTotalSen       Int        @default(0) @map("tax_total_sen")
  roundingAdjSen    Int        @default(0) @map("rounding_adj_sen") // Bank Negara 5 sen rounding
  grandTotalSen     Int        @default(0) @map("grand_total_sen")

  // Content
  notes             String     @default("")
  terms             String     @default("")
  currency          String     @default("MYR")

  // Document chain (quotation → invoice/PO)
  parentDocumentId  String?    @map("parent_document_id")
  parentDocument    Document?  @relation("DocumentChain", fields: [parentDocumentId], references: [id])
  childDocuments    Document[] @relation("DocumentChain")

  // Template used
  templateId        String?    @map("template_id")
  template          Template?  @relation(fields: [templateId], references: [id])

  // PDF
  pdfUrl            String?    @map("pdf_url")

  // Audit
  createdById       String     @map("created_by_id")
  createdBy         User       @relation("CreatedBy", fields: [createdById], references: [id])
  approvedById      String?    @map("approved_by_id")
  approvedBy        User?      @relation("ApprovedBy", fields: [approvedById], references: [id])
  sentAt            DateTime?  @map("sent_at")
  createdAt         DateTime   @default(now()) @map("created_at")
  updatedAt         DateTime   @updatedAt @map("updated_at")

  lineItems         DocumentLineItem[]
  payments          Payment[]
  history           DocumentHistory[]

  @@index([docType, status])
  @@index([clientId])
  @@index([supplierId])
  @@index([createdAt])
  @@index([documentNumber])
  @@map("documents")
}

// ============================================================
// LINE ITEMS
// ============================================================

enum DiscountType {
  PERCENTAGE
  FIXED
}

model DocumentLineItem {
  id              String       @id @default(cuid())
  documentId      String       @map("document_id")
  document        Document     @relation(fields: [documentId], references: [id], onDelete: Cascade)
  productId       String?      @map("product_id")
  product         Product?     @relation(fields: [productId], references: [id])

  description     String
  quantity        Int          // Stored as quantity × 100 for decimal support (e.g., 1.5 = 150)
  unit            String       @default("unit")
  unitPriceSen    Int          @map("unit_price_sen")

  discountType    DiscountType @default(PERCENTAGE) @map("discount_type")
  discountValue   Int          @default(0) @map("discount_value") // percentage as basis points (500 = 5.00%) or fixed in sen
  taxRate         Int          @default(600) @map("tax_rate") // basis points: 600 = 6.00%
  lineTotalSen    Int          @default(0) @map("line_total_sen") // After discount, before tax

  sortOrder       Int          @default(0) @map("sort_order")

  @@index([documentId])
  @@map("document_line_items")
}

// ============================================================
// PAYMENTS (Against invoices)
// ============================================================

enum PaymentMethod {
  BANK_TRANSFER
  CASH
  CHEQUE
  E_WALLET
  CREDIT_CARD
  OTHER
}

model Payment {
  id              String        @id @default(cuid())
  documentId      String        @map("document_id")
  document        Document      @relation(fields: [documentId], references: [id], onDelete: Cascade)

  amountSen       Int           @map("amount_sen")
  paymentDate     DateTime      @map("payment_date")
  method          PaymentMethod
  referenceNumber String        @default("") @map("reference_number")
  notes           String        @default("")

  recordedById    String        @map("recorded_by_id")
  recordedBy      User          @relation("RecordedBy", fields: [recordedById], references: [id])
  createdAt       DateTime      @default(now()) @map("created_at")

  @@index([documentId])
  @@map("payments")
}

// ============================================================
// DOCUMENT HISTORY (Version tracking)
// ============================================================

enum HistoryAction {
  CREATED
  EDITED
  STATUS_CHANGED
  APPROVED
  SENT
  VOIDED
  CONVERTED
  PAYMENT_RECORDED
}

model DocumentHistory {
  id              String        @id @default(cuid())
  documentId      String        @map("document_id")
  document        Document      @relation(fields: [documentId], references: [id], onDelete: Cascade)

  action          HistoryAction
  description     String        @default("") // Human-readable: "Status changed from Draft to Sent"
  snapshotJson    Json?         @map("snapshot_json") // Full document state at this point
  changedById     String        @map("changed_by_id")
  createdAt       DateTime      @default(now()) @map("created_at")

  @@index([documentId])
  @@map("document_history")
}

// ============================================================
// TEMPLATES
// ============================================================

model Template {
  id              String   @id @default(cuid())
  name            String
  docType         DocType  @map("doc_type")
  htmlContent     String   @map("html_content") @db.Text
  cssContent      String   @default("") @map("css_content") @db.Text
  isDefault       Boolean  @default(false) @map("is_default")
  createdById     String?  @map("created_by_id")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  documents       Document[]

  @@map("templates")
}

// ============================================================
// DOCUMENT NUMBERING CONFIG
// ============================================================

model NumberingConfig {
  id              String   @id @default(cuid())
  docType         DocType  @unique @map("doc_type")
  prefix          String   // e.g., "QT", "INV", "PO", "CN"
  format          String   @default("{PREFIX}-{YYYY}-{SEQ:4}") // Pattern
  currentSequence Int      @default(0) @map("current_sequence")
  resetYearly     Boolean  @default(true) @map("reset_yearly")
  lastResetYear   Int?     @map("last_reset_year")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("numbering_config")
}

// ============================================================
// ACTIVITY LOG (System-wide audit)
// ============================================================

model ActivityLog {
  id              String   @id @default(cuid())
  userId          String   @map("user_id")
  user            User     @relation(fields: [userId], references: [id])
  action          String   // "created_quotation", "updated_client", "logged_in", etc.
  entityType      String   @map("entity_type") // "document", "client", "user", etc.
  entityId        String?  @map("entity_id")
  details         Json?    // Additional context
  ipAddress       String?  @map("ip_address")
  createdAt       DateTime @default(now()) @map("created_at")

  @@index([userId])
  @@index([entityType, entityId])
  @@index([createdAt])
  @@map("activity_log")
}
```

## Seed Data

The seed script (`prisma/seed.ts`) should create:

1. **Default Admin User**
   - Email: `admin@company.com` (changeable)
   - Password: `changeme123` (must change on first login)
   - Role: ADMIN

2. **Empty Company Settings** (single row, `is_setup_complete: false`)
   - Triggers the setup wizard on first login

3. **Default Numbering Config** (one row per doc type):
   - QUOTATION: prefix `QT`, format `{PREFIX}-{YYYY}-{SEQ:4}`
   - INVOICE: prefix `INV`, format `{PREFIX}-{YYYY}-{SEQ:4}`
   - PURCHASE_ORDER: prefix `PO`, format `{PREFIX}-{YYYY}-{SEQ:4}`
   - CREDIT_NOTE: prefix `CN`, format `{PREFIX}-{YYYY}-{SEQ:4}`

4. **Default Templates** (one per doc type):
   - Simple, clean HTML templates with company header placeholder
   - Professional layout suitable for Malaysian businesses

## Key Design Decisions

### Money as Sen (Integer)
Prevents floating-point errors. All calculations use integer math.
- Store: `123450` (sen)
- Display: `RM 1,234.50`
- Input: User types `1234.50`, convert to `123450` before storing

### Quantity as Integer × 100
Supports decimal quantities (e.g., 1.5 hours) without floating point.
- Store: `150` (1.5 × 100)
- Display: `1.5`
- Input: User types `1.5`, convert to `150` before storing

### Tax Rate as Basis Points
- Store: `600` (6.00%)
- Display: `6%`
- Calculation: `(amount × taxRate) / 10000`

### Discount Value
- If `PERCENTAGE`: stored as basis points (e.g., `500` = 5.00%)
- If `FIXED`: stored in sen (e.g., `10000` = RM100.00)

### Rounding Adjustment
Bank Negara Malaysia rounding rule: cash transactions round to nearest 5 sen.
- `RM 10.01` or `RM 10.02` → `RM 10.00` (round down)
- `RM 10.03` or `RM 10.04` → `RM 10.05` (round up)
- `RM 10.06` or `RM 10.07` → `RM 10.05` (round down)
- `RM 10.08` or `RM 10.09` → `RM 10.10` (round up)
- Electronic payments: no rounding needed

### Document Snapshots
`snapshot_json` in `DocumentHistory` stores the complete document state (including line items, totals) as JSON. This enables point-in-time reconstruction without complex temporal queries.
