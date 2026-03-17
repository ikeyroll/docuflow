# API.md — API Endpoints

## Overview

API routes are implemented as Next.js Route Handlers in `src/app/api/`. Most data mutations use Server Actions instead of API routes for forms. API routes are used for:
- PDF generation and download
- Data fetching for client-side components (datatables, dropdowns)
- External integrations (Phase 2+)

All endpoints require authentication via NextAuth session. Role checks are enforced per endpoint.

## Response Format

All API responses follow this structure:

```typescript
// Success
{
  success: true,
  data: T
}

// Error
{
  success: false,
  error: string,
  code?: string // Machine-readable error code
}

// List responses
{
  success: true,
  data: T[],
  pagination: {
    total: number,
    page: number,
    pageSize: number,
    totalPages: number
  }
}
```

## Authentication & Common Headers

All requests must include a valid NextAuth session cookie. No API key auth for MVP.

```
Cookie: next-auth.session-token=...
Content-Type: application/json
```

## Endpoints

### Auth

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/api/auth/[...nextauth]` | Public | NextAuth handlers (login, logout, session) |

NextAuth handles all auth flows. No custom auth endpoints needed.

---

### Company Settings

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/settings/company` | All | Get company profile |
| PATCH | `/api/settings/company` | Admin | Update company profile |
| POST | `/api/settings/company/logo` | Admin | Upload company logo |
| GET | `/api/settings/bank-accounts` | All | List bank accounts |
| POST | `/api/settings/bank-accounts` | Admin | Add bank account |
| PATCH | `/api/settings/bank-accounts/:id` | Admin | Update bank account |
| DELETE | `/api/settings/bank-accounts/:id` | Admin | Delete bank account |
| GET | `/api/settings/numbering` | Admin | Get numbering config |
| PATCH | `/api/settings/numbering/:docType` | Admin | Update numbering format |

**POST `/api/settings/company/logo`**
- Content-Type: `multipart/form-data`
- Field: `logo` (image file, max 2MB, jpg/png only)
- Returns: `{ success: true, data: { logoUrl: string } }`

---

### Users

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/users` | Admin | List all users |
| POST | `/api/users` | Admin | Create user |
| GET | `/api/users/:id` | Admin | Get user details |
| PATCH | `/api/users/:id` | Admin | Update user (name, role, active status) |
| PATCH | `/api/users/:id/password` | Admin, Self | Change password |
| DELETE | `/api/users/:id` | Admin | Deactivate user (soft delete) |

**POST `/api/users`**
```json
{
  "email": "staff@company.com",
  "name": "Ahmad bin Ali",
  "password": "tempPassword123",
  "role": "STAFF"
}
```

---

### Clients

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/clients` | All (Staff: limited) | List clients |
| POST | `/api/clients` | Admin, Manager, Staff | Create client |
| GET | `/api/clients/:id` | All (Staff: own docs only) | Get client with transaction summary |
| PATCH | `/api/clients/:id` | Admin, Manager | Update client |
| DELETE | `/api/clients/:id` | Admin, Manager | Deactivate client |

**GET `/api/clients` Query Params:**
- `search` — Search by name or company name
- `active` — `true` or `false`
- `page` — Page number (default 1)
- `pageSize` — Items per page (default 20)

---

### Suppliers

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/suppliers` | All (Staff: limited) | List suppliers |
| POST | `/api/suppliers` | Admin, Manager, Staff | Create supplier |
| GET | `/api/suppliers/:id` | All | Get supplier with PO summary |
| PATCH | `/api/suppliers/:id` | Admin, Manager | Update supplier |
| DELETE | `/api/suppliers/:id` | Admin, Manager | Deactivate supplier |

Same query params as clients.

---

### Products

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/products` | All | List products |
| POST | `/api/products` | Admin, Manager | Create product |
| GET | `/api/products/:id` | All | Get product details |
| PATCH | `/api/products/:id` | Admin, Manager | Update product |
| DELETE | `/api/products/:id` | Admin, Manager | Deactivate product |

**GET `/api/products` Query Params:**
- `search` — Search by name or description
- `category` — Filter by category
- `active` — `true` or `false`
- `page`, `pageSize`

---

### Documents (Quotations, Invoices, POs, Credit Notes)

All document types share the same API structure, differentiated by `docType` parameter.

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/documents` | Scoped by role | List documents |
| POST | `/api/documents` | Admin, Manager, Staff | Create document |
| GET | `/api/documents/:id` | Scoped by role | Get document with line items |
| PATCH | `/api/documents/:id` | Scoped by role | Update document |
| DELETE | `/api/documents/:id` | Admin, Manager | Void/delete document |
| POST | `/api/documents/:id/status` | Admin, Manager | Change document status |
| POST | `/api/documents/:id/convert` | Admin, Manager | Convert to another doc type |
| POST | `/api/documents/:id/duplicate` | Admin, Manager, Staff | Duplicate document as new draft |
| GET | `/api/documents/:id/pdf` | All with access | Generate/download PDF |
| POST | `/api/documents/:id/send` | Admin, Manager | Send via email |
| GET | `/api/documents/:id/history` | Admin, Manager | Get version history |

**GET `/api/documents` Query Params:**
- `docType` — `QUOTATION`, `INVOICE`, `PURCHASE_ORDER`, `CREDIT_NOTE` (required)
- `status` — Filter by status
- `clientId` — Filter by client
- `supplierId` — Filter by supplier
- `dateFrom`, `dateTo` — Date range filter
- `search` — Search by document number or reference
- `page`, `pageSize`
- `sortBy` — `createdAt`, `documentNumber`, `grandTotalSen`, `dueDate`
- `sortOrder` — `asc` or `desc`

**POST `/api/documents`**
```json
{
  "docType": "QUOTATION",
  "clientId": "clxxx...",
  "issueDate": "2026-03-16",
  "validUntil": "2026-04-15",
  "notes": "Thank you for your enquiry.",
  "terms": "Payment within 30 days of invoice.",
  "templateId": "clxxx...",
  "lineItems": [
    {
      "productId": "clxxx...",
      "description": "Website Development",
      "quantity": 100,
      "unit": "unit",
      "unitPriceSen": 500000,
      "discountType": "PERCENTAGE",
      "discountValue": 0,
      "taxRate": 600,
      "sortOrder": 0
    }
  ]
}
```
- Document number is auto-generated by the numbering engine.
- Totals (subtotal, tax, discount, rounding, grand total) are calculated server-side.

**POST `/api/documents/:id/status`**
```json
{
  "status": "SENT"
}
```
- Server validates the transition is allowed (state machine).
- Records status change in document history.

**POST `/api/documents/:id/convert`**
```json
{
  "targetType": "INVOICE"
}
```
- Creates a new document of `targetType` with line items copied from source.
- Sets `parentDocumentId` on the new document.
- Changes source document status to `CONVERTED`.
- Returns the new document.

**GET `/api/documents/:id/pdf`**
- Returns: PDF file (`Content-Type: application/pdf`)
- If PDF is already cached and document hasn't changed, serves cached version.
- If not cached or document was edited, regenerates PDF.

---

### Payments

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/documents/:id/payments` | Admin, Manager | List payments for invoice |
| POST | `/api/documents/:id/payments` | Admin, Manager | Record payment |
| DELETE | `/api/documents/:id/payments/:paymentId` | Admin | Delete payment record |

**POST `/api/documents/:id/payments`**
```json
{
  "amountSen": 250000,
  "paymentDate": "2026-03-16",
  "method": "BANK_TRANSFER",
  "referenceNumber": "FPX-123456",
  "notes": "Partial payment — 50%"
}
```
- Auto-updates invoice status:
  - If total payments >= grand total → `PAID`
  - If total payments > 0 but < grand total → `PARTIALLY_PAID`
- Records payment in document history.

---

### Reports

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/reports/aging` | Admin, Manager, Viewer | Aging report |
| GET | `/api/reports/revenue` | Admin, Manager, Viewer | Revenue summary |
| GET | `/api/reports/sst` | Admin, Manager, Viewer | SST summary |
| GET | `/api/reports/export/:type` | Admin, Manager, Viewer | Export report as CSV |

**GET `/api/reports/aging`**
- Returns invoices grouped by aging buckets: Current, 1-30 days, 31-60 days, 61-90 days, 90+ days
- Each bucket: list of invoices with client name, number, amount, outstanding

**GET `/api/reports/revenue` Query Params:**
- `period` — `monthly` or `yearly`
- `year` — e.g., `2026`
- `month` — e.g., `3` (for monthly detail)

**GET `/api/reports/sst` Query Params:**
- `period` — SST filing period, e.g., `2026-01` (Jan-Feb), `2026-03` (Mar-Apr)

---

### Templates

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/templates` | Admin | List templates |
| POST | `/api/templates` | Admin | Create template |
| GET | `/api/templates/:id` | Admin | Get template with content |
| PATCH | `/api/templates/:id` | Admin | Update template |
| DELETE | `/api/templates/:id` | Admin | Delete template |
| GET | `/api/templates/:id/preview` | Admin | Preview template with sample data |

---

### Dashboard

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/dashboard/summary` | All | Summary cards data |
| GET | `/api/dashboard/recent` | Scoped by role | Recent documents |
| GET | `/api/dashboard/overdue` | Admin, Manager | Overdue invoices |
| GET | `/api/dashboard/expiring` | Admin, Manager | Quotations expiring soon |

**GET `/api/dashboard/summary`**
```json
{
  "success": true,
  "data": {
    "thisMonth": {
      "quotedSen": 5000000,
      "invoicedSen": 3500000,
      "collectedSen": 2000000,
      "outstandingSen": 1500000
    },
    "thisYear": {
      "quotedSen": 25000000,
      "invoicedSen": 18000000,
      "collectedSen": 15000000,
      "outstandingSen": 3000000
    },
    "counts": {
      "draftDocuments": 5,
      "overdueInvoices": 3,
      "expiringQuotations": 2
    }
  }
}
```

---

### Activity Log

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/audit-log` | Admin | List activity logs |

**GET `/api/audit-log` Query Params:**
- `userId` — Filter by user
- `entityType` — Filter by entity type
- `dateFrom`, `dateTo`
- `page`, `pageSize`

## Server Actions (Used Instead of API for Forms)

These are Next.js Server Actions used directly by form components. They follow the same auth and role checks.

```typescript
// Documents
createDocument(formData: DocumentFormData): Promise<ActionResult<Document>>
updateDocument(id: string, formData: DocumentFormData): Promise<ActionResult<Document>>
changeDocumentStatus(id: string, status: DocStatus): Promise<ActionResult<Document>>
convertDocument(id: string, targetType: DocType): Promise<ActionResult<Document>>
duplicateDocument(id: string): Promise<ActionResult<Document>>

// Clients
createClient(formData: ClientFormData): Promise<ActionResult<Client>>
updateClient(id: string, formData: ClientFormData): Promise<ActionResult<Client>>

// Suppliers
createSupplier(formData: SupplierFormData): Promise<ActionResult<Supplier>>
updateSupplier(id: string, formData: SupplierFormData): Promise<ActionResult<Supplier>>

// Products
createProduct(formData: ProductFormData): Promise<ActionResult<Product>>
updateProduct(id: string, formData: ProductFormData): Promise<ActionResult<Product>>

// Payments
recordPayment(documentId: string, formData: PaymentFormData): Promise<ActionResult<Payment>>

// Settings
updateCompanySettings(formData: CompanyFormData): Promise<ActionResult<CompanySettings>>
uploadLogo(formData: FormData): Promise<ActionResult<{ logoUrl: string }>>

// Users
createUser(formData: UserFormData): Promise<ActionResult<User>>
updateUser(id: string, formData: UserFormData): Promise<ActionResult<User>>
changePassword(id: string, formData: PasswordFormData): Promise<ActionResult<void>>
```
