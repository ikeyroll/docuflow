# PROJECT.md — Product Definition

## Product Name

**DocuFlow** — Document Automation for Malaysian SMEs

## Problem

Malaysian SMEs waste hours every week manually creating quotations, invoices, and purchase orders in Word/Excel. They copy-paste company headers, recalculate totals, track versions in folder names like "Invoice_v3_FINAL_FINAL.xlsx", and lose track of what's been paid.

## Solution

A web-based system where a company fills in their info once, sets up their branded templates, and then generates professional quotations, invoices, and POs in seconds. Full history, status tracking, payment recording, and PDF generation — all in one place.

## Target Market

- Malaysian SMEs (Sdn. Bhd., PLT, sole proprietors)
- 1–50 employees
- Industries: IT services, construction, trading, professional services, F&B supply
- Currently using Excel/Word/Google Docs for documentation

## Deployment Model

**Single-tenant, per-company deployment.** Each company gets their own instance with their own database. FACEZ SDN. BHD. deploys and maintains each instance.

This is NOT a multi-tenant SaaS with shared infrastructure. Each deployment is isolated.

## Core Modules (MVP — Phase 1)

### 1. Company Setup
- Company profile: name, SSM number, SST registration, logo, address, phone, email, website
- Bank accounts (multiple): bank name, account number, account holder name
- Default settings: currency (MYR default), payment terms, tax rate
- Document numbering configuration per document type

### 2. User Management
- Four roles: Admin, Manager, Staff, Viewer
- Admin creates and manages user accounts
- Email-based login with password
- Role-based access control enforced server-side

### 3. Client Directory
- Client profiles: company name, contact person, email, phone, billing address, shipping address
- Default payment terms per client
- Notes field
- Transaction history view (all documents for this client)

### 4. Supplier Directory
- Supplier profiles: company name, contact person, email, phone, address
- Notes field
- PO history view

### 5. Product / Service Catalogue
- Reusable items: name, description, default unit price, unit of measurement
- Tax category: SST taxable (6% service / 10% sales) or exempt
- Categories for organization
- Active/inactive toggle

### 6. Quotation Module
- Auto-generated sequential number (configurable format)
- Select client, add line items (from catalogue or custom)
- Auto-calculate: subtotal, discount, SST, rounding adjustment, grand total
- Notes and terms section
- Validity period (default 30 days)
- Version tracking (v1, v2, v3 of same quotation)
- Status flow: Draft → Sent → Accepted → Rejected → Expired → Converted
- Convert to Invoice or PO with one click

### 7. Invoice Module
- Auto-generated sequential number (mandatory sequential for SST compliance)
- Create standalone or convert from quotation
- Tax invoice format with SST breakdown
- Payment terms display
- Status flow: Draft → Sent → Partially Paid → Paid → Overdue → Void
- Partial payment support
- Overdue auto-detection based on due date
- Credit note support

### 8. Purchase Order Module
- Auto-generated PO number
- Select supplier, add line items
- Expected delivery date
- Status flow: Draft → Sent → Acknowledged → Partially Received → Fulfilled → Cancelled

### 9. PDF Generation
- Generate professional PDF from any document
- Uses company-branded HTML templates
- Preview before generating
- Download and email delivery
- Stored for history

### 10. Payment Tracking
- Record payments against invoices (partial or full)
- Payment method: bank transfer, cash, cheque, e-wallet
- Reference number and notes
- Auto-update invoice status based on payments received
- Outstanding balance calculation

### 11. Dashboard
- Summary cards: total quoted, invoiced, collected (this month / this year)
- Recent documents list
- Overdue invoices alert
- Quotations expiring soon
- Quick action buttons

### 12. History & Audit
- Full version history per document
- JSON snapshot on each save
- Activity log: who did what, when
- Edit diff view between versions

### 13. Reports
- Aging report (outstanding receivables by 30/60/90 days)
- Monthly/yearly revenue summary
- SST summary for filing period (bi-monthly)
- Export to CSV/Excel

## Phase 2 Features (Build Later)

- Email delivery with PDF attachment
- WhatsApp integration for document delivery
- Recurring invoices
- Approval workflows (staff submits → manager approves)
- Debit note support
- Goods received tracking for POs
- Multi-currency with exchange rates
- Bulk actions (send multiple invoices, export batch)

## Phase 3 Features (Future)

- LHDN e-Invoice integration (MyInvois API)
- Custom template editor (drag-and-drop)
- Client portal (clients view their own documents)
- Mobile app
- Accounting software integration (SQL Accounting, AutoCount)
- API for third-party integration
- E-signature

## Malaysia-Specific Requirements

### SST Compliance
- SST registration number must appear on tax invoices
- Tax amount must be shown separately
- Invoice numbering must be sequential (RMCD requirement)
- Bi-monthly filing periods: Jan-Feb, Mar-Apr, May-Jun, Jul-Aug, Sep-Oct, Nov-Dec

### Currency
- Default MYR
- Bank Negara rounding: round to nearest 5 sen for cash transactions
- Rounding adjustment line on documents

### Business Registration
- SSM number format: company number (e.g., 202401012345 or 12345-X for old format)
- SST number format: e.g., B16-1234-56789012

### Document Language
- Bilingual support: English primary, Bahasa Malaysia secondary
- Common to have both languages on same document

## User Role Permissions

| Feature | Admin | Manager | Staff | Viewer |
|---|---|---|---|---|
| Company profile setup/edit | ✅ | ❌ | ❌ | ❌ |
| Template management | ✅ | ❌ | ❌ | ❌ |
| User management | ✅ | ❌ | ❌ | ❌ |
| System settings | ✅ | ❌ | ❌ | ❌ |
| Create documents | ✅ | ✅ | ✅ | ❌ |
| Edit any document | ✅ | ✅ | Own only | ❌ |
| Approve & send documents | ✅ | ✅ | ❌ | ❌ |
| Delete/void documents | ✅ | ✅ | ❌ | ❌ |
| Record payments | ✅ | ✅ | ❌ | ❌ |
| View all documents | ✅ | ✅ | Own only | ✅ |
| Download PDFs | ✅ | ✅ | ✅ | ✅ |
| Client/supplier management | ✅ | ✅ | Add only | ❌ |
| Product catalogue | ✅ | ✅ | View only | ❌ |
| Dashboard | ✅ | ✅ | Limited | ✅ |
| Reports & export | ✅ | ✅ | ❌ | ✅ |
| Audit log | ✅ | ❌ | ❌ | ❌ |
