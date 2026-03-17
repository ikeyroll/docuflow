# TASKS.md — Build Tasks for Claude Code

## How to Use This File

Work through tasks in order. Each task is a self-contained unit. Complete one before starting the next. After each task, verify it works before moving on.

Reference the other docs:
- `claude.md` — AI behaviour rules, tech stack, file conventions
- `project.md` — Product requirements, role permissions
- `architecture.md` — System design, page structure
- `database.md` — Prisma schema, data design decisions
- `api.md` — Endpoints and server actions
- `coding_rules.md` — Code standards, patterns, examples

---

## TASK 1: Project Scaffolding

**Goal:** Set up the Next.js project with all dependencies and configuration.

**Steps:**
1. Initialize Next.js 14+ project with App Router, TypeScript, Tailwind CSS, ESLint
   ```bash
   pnpm create next-app@latest docuflow --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
   ```
2. Install core dependencies:
   ```bash
   pnpm add prisma @prisma/client next-auth@5 zod react-hook-form @hookform/resolvers bcryptjs
   pnpm add -D @types/bcryptjs
   ```
3. Install shadcn/ui and initialize:
   ```bash
   pnpm dlx shadcn@latest init
   ```
4. Install shadcn/ui components needed for MVP:
   ```bash
   pnpm dlx shadcn@latest add button input label select textarea card table dialog alert-description badge dropdown-menu separator sheet tabs toast form popover command calendar
   ```
5. Create folder structure as defined in `architecture.md`
6. Set up Prisma with PostgreSQL:
   ```bash
   pnpm prisma init
   ```
7. Configure `tsconfig.json` with strict mode and path aliases
8. Create `.env.example` with all required env vars:
   ```
   DATABASE_URL=postgresql://user:pass@localhost:5432/docuflow
   NEXTAUTH_SECRET=your-secret-here
   NEXTAUTH_URL=http://localhost:3000
   ```
9. Create `src/lib/db.ts` — Prisma client singleton

**Verify:** `pnpm dev` starts without errors. Folder structure exists.

---

## TASK 2: Database Schema & Seed

**Goal:** Create the Prisma schema and seed data.

**Steps:**
1. Copy the full Prisma schema from `database.md` into `prisma/schema.prisma`
2. Run migration:
   ```bash
   pnpm prisma migrate dev --name init
   ```
3. Create `prisma/seed.ts` with:
   - Default admin user (email: `admin@docuflow.com`, password: `changeme123`, role: ADMIN)
   - Empty CompanySettings row with `isSetupComplete: false`
   - Default NumberingConfig rows (QT, INV, PO, CN)
   - Default Templates (one per doc type — simple clean HTML)
4. Add seed script to `package.json`:
   ```json
   "prisma": { "seed": "tsx prisma/seed.ts" }
   ```
5. Run seed: `pnpm prisma db seed`

**Verify:** `pnpm prisma studio` shows seeded data. All tables exist.

---

## TASK 3: Authentication System

**Goal:** Working login page with NextAuth.js, role-based session, and route protection.

**Steps:**
1. Set up NextAuth.js v5 with Credentials provider in `src/lib/auth.ts`
   - Validate email + password against `users` table
   - Hash passwords with bcryptjs
   - JWT session with: `userId`, `email`, `name`, `role`
2. Create auth middleware in `src/middleware.ts`
   - Protect all `/dashboard/*` routes
   - Redirect unauthenticated users to `/login`
   - Allow `/login` and `/api/auth/*` without auth
3. Create `src/lib/auth-helpers.ts`
   - `requireRole(session, roles[])` — throws if unauthorized
   - `getCurrentUser()` — returns session user or null
4. Create login page at `src/app/(auth)/login/page.tsx`
   - Email + password form
   - Error display for invalid credentials
   - Redirect to `/dashboard` on success
5. Create auth layout at `src/app/(auth)/layout.tsx`
   - Centered card layout, no sidebar

**Verify:** Can login as admin. Unauthenticated users get redirected. Session contains role.

---

## TASK 4: Dashboard Layout

**Goal:** Protected dashboard layout with sidebar navigation, header with user info, and responsive design.

**Steps:**
1. Create `src/app/(dashboard)/layout.tsx` — dashboard shell
2. Create `src/components/layout/sidebar.tsx`
   - Navigation links: Dashboard, Quotations, Invoices, Purchase Orders, Credit Notes, Clients, Suppliers, Products, Reports, Settings, Audit Log
   - Role-based visibility (hide Settings and Audit Log from non-admins)
   - Active link highlighting
   - Collapsible on mobile (Sheet component)
   - DocuFlow logo at top
3. Create `src/components/layout/header.tsx`
   - Company name display
   - User avatar/name with dropdown: Profile, Logout
   - Breadcrumb (optional — nice to have)
4. Create `src/app/(dashboard)/page.tsx` — empty dashboard home (placeholder)

**Verify:** Sidebar shows, navigation works, responsive on mobile, logout works.

---

## TASK 5: Company Setup Wizard

**Goal:** First-time setup wizard that guides admin through company configuration.

**Steps:**
1. Create setup check — if `CompanySettings.isSetupComplete` is false, redirect admin to `/setup`
2. Create `src/app/(dashboard)/setup/page.tsx` — multi-step wizard:
   - **Step 1: Company Info** — Name, SSM number, SST number, address, phone, email, website
   - **Step 2: Logo Upload** — Upload company logo (image, max 2MB)
   - **Step 3: Bank Accounts** — Add one or more bank accounts
   - **Step 4: Defaults** — Default currency, payment terms, tax rate
   - **Step 5: Document Numbering** — Configure prefix and format for each doc type
   - **Step 6: Review & Complete** — Summary of all entered info, confirm button
3. Create server actions for each step
4. On completion, set `isSetupComplete: true`
5. After setup, redirect to dashboard

**Verify:** New deployment shows setup wizard. After completing, goes to dashboard. Revisiting setup shows settings page instead.

---

## TASK 6: Company Settings Pages

**Goal:** Admin settings pages for editing company info, users, templates, numbering, bank accounts.

**Steps:**
1. Create `src/app/(dashboard)/settings/company/page.tsx` — edit company profile
2. Create `src/app/(dashboard)/settings/users/page.tsx` — user list + create/edit user dialog
3. Create `src/app/(dashboard)/settings/bank-accounts/page.tsx` — manage bank accounts
4. Create `src/app/(dashboard)/settings/numbering/page.tsx` — edit numbering config per doc type
5. Create `src/app/(dashboard)/settings/templates/page.tsx` — list templates, edit HTML/CSS content
6. All pages: Admin role check. Show 403 for non-admins.
7. Create server actions for all CRUD operations with validation.

**Verify:** Admin can update company info, create users, manage bank accounts, edit numbering. Non-admin gets 403.

---

## TASK 7: Client & Supplier Directory

**Goal:** CRUD for clients and suppliers with search and transaction history.

**Steps:**
1. Create `src/app/(dashboard)/clients/page.tsx` — searchable data table with columns: Company, Contact, Email, Phone, Status, Actions
2. Create `src/app/(dashboard)/clients/new/page.tsx` — create client form
3. Create `src/app/(dashboard)/clients/[id]/page.tsx` — client detail with edit form + transaction history (list of related documents)
4. Repeat same pattern for suppliers at `src/app/(dashboard)/suppliers/`
5. Create shared data table component `src/components/shared/data-table.tsx` — reusable with sorting, search, pagination
6. Create server actions: `createClient`, `updateClient`, `createSupplier`, `updateSupplier`
7. Role enforcement: Staff can only add. Manager/Admin can edit/delete.

**Verify:** Can create client, edit, search. Transaction history shows related documents (empty for now). Same for suppliers.

---

## TASK 8: Product / Service Catalogue

**Goal:** CRUD for products/services that can be reused in documents.

**Steps:**
1. Create `src/app/(dashboard)/products/page.tsx` — searchable data table with columns: Name, Price, Unit, Tax Category, Category, Status
2. Create `src/app/(dashboard)/products/new/page.tsx` — create product form
3. Product form fields: name, description, default price (RM input → stored as sen), unit dropdown, tax category dropdown, category text input
4. Create server actions with validation
5. Display price as `RM X.XX` in the table

**Verify:** Can create product with price, view in table with formatted price, edit, deactivate.

---

## TASK 9: Document Engine — Core Business Logic

**Goal:** Build the business logic layer for documents before building the UI. This is the most critical task.

**Steps:**
1. Create `src/lib/documents/calculator.ts` — all calculation functions:
   - `calculateLineTotal(quantity, unitPriceSen, discountType, discountValue)`
   - `calculateDocumentTotals(lineItems[])` → returns subtotal, discountTotal, taxTotal, grandTotal
   - `calculateRoundingAdj(totalSen)` — Bank Negara 5 sen rule
   - All integer math, no floating point
2. Create `src/lib/documents/state-machine.ts`:
   - Define valid transitions per DocType
   - `canTransition(docType, currentStatus, targetStatus)` → boolean
   - `getAvailableTransitions(docType, currentStatus)` → DocStatus[]
3. Create `src/lib/documents/numbering.ts`:
   - `generateNextNumber(tx, docType)` — atomic increment using Prisma transaction
   - Format pattern replacement: `{PREFIX}`, `{YYYY}`, `{MM}`, `{SEQ:N}`
   - Handle yearly reset
4. Create `src/lib/documents/engine.ts`:
   - `createDocument(data, userId)` — creates doc with line items, calculates totals, generates number
   - `updateDocument(id, data, userId)` — updates doc, recalculates, records history
   - `convertDocument(sourceId, targetType, userId)` — copies to new doc type
   - `duplicateDocument(sourceId, userId)` — creates new draft copy
5. Write unit tests for calculator and state machine (optional but strongly recommended)

**Verify:** Calculator correctly handles all edge cases (zero discount, percentage vs fixed, rounding). State machine rejects invalid transitions. Numbering generates sequential numbers.

---

## TASK 10: Quotation Module — Full CRUD

**Goal:** Complete quotation workflow: create, edit, list, view, status changes.

**Steps:**
1. Create `src/app/(dashboard)/quotations/page.tsx` — data table with columns: Number, Client, Date, Valid Until, Amount, Status, Actions
2. Create `src/app/(dashboard)/quotations/new/page.tsx` — quotation form:
   - Client selector (searchable dropdown from client directory)
   - Issue date picker, validity date picker
   - Dynamic line items (add/remove rows):
     - Product selector (searchable, fills description + price + tax) OR manual entry
     - Quantity, unit, unit price, discount, tax rate per line
     - Line total auto-calculated
   - Running totals at bottom: Subtotal, Discount, Tax (SST), Rounding, Grand Total
   - Notes and terms text areas
   - Save as Draft or Save & Send buttons
3. Create `src/app/(dashboard)/quotations/[id]/page.tsx` — detail view:
   - Full document display (read-only formatted view)
   - Status badge
   - Action buttons based on status: Edit, Send, Mark as Accepted/Rejected, Convert to Invoice, Convert to PO, Duplicate, Download PDF
   - Version history timeline
   - Status change actions (with state machine validation)
4. Create `src/app/(dashboard)/quotations/[id]/edit/page.tsx` — edit form (reuse form component)
5. Create server actions using the document engine from Task 9

**Verify:** Full quotation lifecycle works: Create draft → Edit → Send → Accept → Convert to Invoice. Totals calculate correctly. History records all changes. Status transitions enforce state machine.

---

## TASK 11: Invoice Module — Full CRUD

**Goal:** Complete invoice workflow including payment tracking.

**Steps:**
1. Create `src/app/(dashboard)/invoices/page.tsx` — data table similar to quotations
2. Create `src/app/(dashboard)/invoices/new/page.tsx` — invoice form (reuse document form component from quotation, configure for invoice)
3. Create `src/app/(dashboard)/invoices/[id]/page.tsx` — detail view:
   - Same as quotation detail but with payment section
   - Payment recording form: amount, date, method, reference
   - Payment history table
   - Outstanding balance display
   - Action buttons: Edit (if draft), Send, Record Payment, Void, Download PDF
4. Overdue detection: on page load, check if due date has passed and status is SENT → update to OVERDUE
5. Create server action: `recordPayment` — updates invoice status automatically

**Verify:** Create invoice from scratch and from quotation conversion. Record partial payment → PARTIALLY_PAID. Record remaining → PAID. Overdue detection works.

---

## TASK 12: Purchase Order Module

**Goal:** Complete PO workflow.

**Steps:**
1. Create `src/app/(dashboard)/purchase-orders/page.tsx` — data table
2. Create `src/app/(dashboard)/purchase-orders/new/page.tsx` — PO form:
   - Supplier selector instead of client
   - Expected delivery date instead of payment terms
   - Same line items pattern
3. Create `src/app/(dashboard)/purchase-orders/[id]/page.tsx` — detail view
   - Status actions: Send, Mark Acknowledged, Mark Partially Received, Mark Fulfilled, Cancel
4. Reuse document form and engine from previous tasks

**Verify:** Create PO, move through status flow, download PDF.

---

## TASK 13: Credit Note Module

**Goal:** Issue credit notes against invoices.

**Steps:**
1. Create `src/app/(dashboard)/credit-notes/page.tsx` — data table
2. Create `src/app/(dashboard)/credit-notes/new/page.tsx` — credit note form:
   - Select related invoice (optional)
   - Client auto-filled from invoice
   - Line items for credit amounts
3. Create detail view with Void action
4. Admin and Manager only

**Verify:** Create credit note against an invoice. Void a credit note.

---

## TASK 14: PDF Generation

**Goal:** Generate professional PDFs from any document using company-branded templates.

**Steps:**
1. Install Puppeteer: `pnpm add puppeteer`
2. Create `src/lib/pdf/generator.ts`:
   - Load HTML template from database
   - Replace placeholders with document data using a template engine (Handlebars or simple string replacement)
   - Template variables: company info, document fields, line items loop, totals, bank details
   - Launch Puppeteer, render HTML → PDF
   - Return PDF buffer
3. Create `src/lib/pdf/template-data.ts` — maps document + company data to template variables
4. Create default HTML templates (`prisma/seed.ts` update):
   - Professional layout: company header with logo, document title, recipient info, line items table, totals section, bank details footer, terms
   - Clean CSS with print-friendly styling
   - A4 size (standard in Malaysia)
5. Create API route `GET /api/documents/:id/pdf` — generates and returns PDF
6. Add "Download PDF" button to document detail pages
7. Add "Preview" button that shows PDF in browser (inline Content-Disposition)
8. Cache generated PDFs — store URL in `document.pdfUrl`, invalidate on edit

**Verify:** Generated PDF looks professional with company logo, all data correct, proper A4 layout. Matches Malaysian business document standards.

---

## TASK 15: Dashboard

**Goal:** Functional dashboard with summary cards, recent documents, and alerts.

**Steps:**
1. Create `src/app/(dashboard)/page.tsx` — dashboard home
2. Create `src/lib/data/dashboard.ts` — data fetching functions:
   - `getDashboardSummary()` — total quoted, invoiced, collected this month/year
   - `getRecentDocuments(limit)` — last 10 documents across all types
   - `getOverdueInvoices()` — invoices past due date
   - `getExpiringQuotations()` — quotations expiring within 7 days
3. Dashboard layout:
   - **Summary cards** (top): Total Quoted, Total Invoiced, Total Collected, Outstanding — this month with year comparison
   - **Quick actions**: New Quotation, New Invoice, New PO buttons
   - **Recent Documents** table: Type icon, Number, Client, Amount, Status, Date
   - **Overdue Invoices** alert card (red): Count and total amount
   - **Expiring Quotations** alert card (yellow): Count
4. Role-based: Staff sees only their own documents in recent. Viewer sees all but read-only.

**Verify:** Dashboard loads with real data. Cards show correct totals. Alerts appear when there are overdue/expiring items.

---

## TASK 16: Reports

**Goal:** Aging report, revenue summary, and SST summary with CSV export.

**Steps:**
1. Create `src/app/(dashboard)/reports/page.tsx` — report selection page
2. Create `src/app/(dashboard)/reports/aging/page.tsx`:
   - Table grouped by aging buckets: Current, 1-30, 31-60, 61-90, 90+ days
   - Each row: Client, Invoice Number, Amount, Outstanding, Days Overdue
   - Summary totals per bucket
3. Create `src/app/(dashboard)/reports/revenue/page.tsx`:
   - Monthly revenue chart/table for selected year
   - Columns: Month, Quoted, Invoiced, Collected
   - Year selector
4. Create `src/app/(dashboard)/reports/sst/page.tsx`:
   - SST summary for bi-monthly filing period
   - Period selector (Jan-Feb, Mar-Apr, etc.)
   - Total taxable amount, tax collected, breakdown by tax type
5. Create CSV export API route: `GET /api/reports/export/:type?params`
   - Returns CSV file download
6. Add "Export CSV" button on each report page

**Verify:** Reports show accurate data. CSV downloads correctly. SST periods align with Malaysian filing schedule.

---

## TASK 17: Audit Log

**Goal:** System-wide activity log for admin oversight.

**Steps:**
1. Create `src/app/(dashboard)/audit-log/page.tsx` — filterable activity table
   - Columns: Timestamp, User, Action, Entity, Details
   - Filters: User, Action type, Date range
   - Pagination
2. Ensure all server actions log to `ActivityLog` table:
   - Document CRUD, status changes
   - Client/supplier CRUD
   - User management
   - Settings changes
   - Login events
3. Admin only access

**Verify:** All actions appear in audit log with correct user attribution and timestamps.

---

## TASK 18: Email Delivery (Optional MVP)

**Goal:** Send documents via email with PDF attachment.

**Steps:**
1. Install Nodemailer: `pnpm add nodemailer` + `pnpm add -D @types/nodemailer`
2. Create `src/lib/email/sender.ts`:
   - Configure SMTP from env vars
   - `sendDocument(recipientEmail, subject, body, pdfBuffer)` — sends email with PDF attachment
3. Create API route `POST /api/documents/:id/send`
   - Generates PDF
   - Sends email to client's email address
   - Updates document status to SENT
   - Records in history
4. Add env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
5. Add "Send via Email" button on document detail page (Admin/Manager only)

**Verify:** Email arrives at client email with PDF attachment. Document status changes to SENT.

---

## TASK 19: Polish & Final Touches

**Goal:** UI polish, error states, loading states, empty states.

**Steps:**
1. Add loading skeletons to all data tables and detail pages
2. Add empty states: "No quotations yet — create your first one"
3. Add error boundaries for unexpected errors
4. Add confirmation dialogs for destructive actions (void, delete, cancel)
5. Add breadcrumb navigation
6. Add keyboard shortcuts (optional): `Ctrl+N` for new document
7. Add favicon and meta tags
8. Test responsive layout on mobile
9. Review all role permissions are enforced server-side
10. Run through complete user journey: Setup → Create Client → Create Product → Create Quotation → Convert to Invoice → Record Payment → Check Reports

**Verify:** Full end-to-end flow works. No broken states. Responsive. Professional appearance.

---

## Build Order Summary

| # | Task | Depends On | Priority |
|---|------|-----------|----------|
| 1 | Project Scaffolding | — | 🔴 Critical |
| 2 | Database Schema & Seed | 1 | 🔴 Critical |
| 3 | Authentication | 1, 2 | 🔴 Critical |
| 4 | Dashboard Layout | 3 | 🔴 Critical |
| 5 | Company Setup Wizard | 4 | 🔴 Critical |
| 6 | Company Settings Pages | 5 | 🟡 High |
| 7 | Client & Supplier Directory | 4 | 🔴 Critical |
| 8 | Product Catalogue | 4 | 🔴 Critical |
| 9 | Document Engine (Core Logic) | 2 | 🔴 Critical |
| 10 | Quotation Module | 7, 8, 9 | 🔴 Critical |
| 11 | Invoice Module | 10 | 🔴 Critical |
| 12 | Purchase Order Module | 10 | 🟡 High |
| 13 | Credit Note Module | 11 | 🟢 Medium |
| 14 | PDF Generation | 10 | 🔴 Critical |
| 15 | Dashboard | 11 | 🟡 High |
| 16 | Reports | 11 | 🟡 High |
| 17 | Audit Log | All | 🟢 Medium |
| 18 | Email Delivery | 14 | 🟢 Medium |
| 19 | Polish & Final Touches | All | 🟡 High |
