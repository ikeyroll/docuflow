# ARCHITECTURE.md — System Architecture

## Overview

DocuFlow is a single-tenant web application deployed per company. Each deployment is an independent Next.js application with its own PostgreSQL database.

```
┌─────────────────────────────────────────────────┐
│                   Client Browser                │
│          (Next.js SSR + React Client)           │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│              Next.js Application                │
│  ┌──────────────────────────────────────────┐   │
│  │  App Router                              │   │
│  │  ├── (auth)/ — Login, Forgot Password    │   │
│  │  ├── (dashboard)/ — All protected pages  │   │
│  │  └── api/ — REST endpoints               │   │
│  ├──────────────────────────────────────────┤   │
│  │  Middleware                               │   │
│  │  ├── Auth check (NextAuth session)       │   │
│  │  └── Role-based route protection         │   │
│  ├──────────────────────────────────────────┤   │
│  │  Business Logic Layer                    │   │
│  │  ├── Document Engine (create, calc, convert)│ │
│  │  ├── Numbering Engine (sequential gen)   │   │
│  │  ├── State Machine (status transitions)  │   │
│  │  ├── PDF Pipeline (HTML → Puppeteer → PDF)│  │
│  │  └── Calculation Engine (tax, rounding)  │   │
│  ├──────────────────────────────────────────┤   │
│  │  Data Layer (Prisma ORM)                 │   │
│  │  └── PostgreSQL                          │   │
│  ├──────────────────────────────────────────┤   │
│  │  File Storage                            │   │
│  │  └── Local /uploads (MVP) → S3 (later)   │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Application Layers

### 1. Presentation Layer (Next.js App Router)

**Server Components (default):** All pages render on the server. Data fetching happens in the component via Prisma queries or server actions. No client-side data fetching libraries needed for most pages.

**Client Components (opt-in):** Used only when interactivity is required — forms with dynamic line items, modals, dropdowns, PDF preview, dashboard charts.

**Layout structure:**
```
app/
├── layout.tsx                          # Root layout (providers, fonts)
├── (auth)/
│   ├── layout.tsx                      # Auth layout (centered card, no sidebar)
│   ├── login/page.tsx
│   └── forgot-password/page.tsx
├── (dashboard)/
│   ├── layout.tsx                      # Dashboard layout (sidebar + header + main)
│   ├── page.tsx                        # Dashboard home
│   ├── quotations/
│   │   ├── page.tsx                    # List view
│   │   ├── new/page.tsx                # Create form
│   │   └── [id]/
│   │       ├── page.tsx                # Detail view
│   │       └── edit/page.tsx           # Edit form
│   ├── invoices/                       # Same pattern as quotations
│   ├── purchase-orders/                # Same pattern
│   ├── credit-notes/                   # Same pattern
│   ├── clients/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx              # Detail with transaction history
│   ├── suppliers/                      # Same pattern as clients
│   ├── products/
│   │   ├── page.tsx
│   │   └── new/page.tsx
│   ├── reports/
│   │   ├── page.tsx                    # Report selection
│   │   ├── aging/page.tsx
│   │   ├── revenue/page.tsx
│   │   └── sst/page.tsx
│   ├── settings/
│   │   ├── company/page.tsx            # Admin only
│   │   ├── users/page.tsx              # Admin only
│   │   ├── templates/page.tsx          # Admin only
│   │   ├── numbering/page.tsx          # Admin only
│   │   └── bank-accounts/page.tsx      # Admin only
│   └── audit-log/page.tsx              # Admin only
└── api/
    ├── auth/[...nextauth]/route.ts
    ├── documents/
    │   ├── route.ts                    # GET list, POST create
    │   ├── [id]/route.ts              # GET, PATCH, DELETE
    │   ├── [id]/pdf/route.ts          # GET generate PDF
    │   ├── [id]/send/route.ts         # POST send via email
    │   ├── [id]/convert/route.ts      # POST convert to another type
    │   ├── [id]/payments/route.ts     # GET, POST payments
    │   └── [id]/history/route.ts      # GET version history
    ├── clients/route.ts
    ├── suppliers/route.ts
    ├── products/route.ts
    ├── reports/
    │   ├── aging/route.ts
    │   ├── revenue/route.ts
    │   └── sst/route.ts
    └── settings/
        ├── company/route.ts
        └── numbering/route.ts
```

### 2. Business Logic Layer

All business logic lives in `src/lib/`. These are pure functions and classes — no framework dependencies, fully testable.

#### Document Engine (`src/lib/documents/engine.ts`)
- Creates documents with proper defaults
- Copies line items during quotation → invoice conversion
- Maintains parent-child document chain
- Validates document completeness before status transitions

#### Numbering Engine (`src/lib/documents/numbering.ts`)
- Generates sequential document numbers based on configured format
- Pattern: `{PREFIX}-{YYYY}-{SEQ:4}` → `QT-2026-0001`
- Uses database-level atomic increment to prevent duplicates
- Separate sequence per document type

#### State Machine (`src/lib/documents/state-machine.ts`)
- Enforces valid status transitions per document type
- Example (Quotation): `Draft → Sent → Accepted | Rejected | Expired → Converted`
- Example (Invoice): `Draft → Sent → Partially Paid → Paid | Overdue → Void`
- Returns error if invalid transition attempted
- Logs all transitions in history

#### Calculation Engine (`src/lib/documents/calculator.ts`)
- Line item calculation: `(quantity × unit_price) - discount = line_total`
- Subtotal: sum of all line_totals
- Discount: per-line (% or fixed) and document-level
- SST calculation: 6% service tax or 10% sales tax per line item's tax category
- Rounding: Bank Negara rule — round grand total to nearest 5 sen
- All math uses integer sen values. No floating point.

#### PDF Pipeline (`src/lib/pdf/generator.ts`)
- Loads HTML template from database (or filesystem for defaults)
- Injects document data into template using Handlebars-style placeholders
- Renders HTML string with full CSS
- Puppeteer launches headless Chrome, renders to PDF
- Returns PDF buffer (for download or storage)
- Template variables: `{{company.name}}`, `{{document.number}}`, `{{lineItems}}`, etc.

### 3. Data Layer

**Prisma ORM** connects to PostgreSQL. All database access goes through Prisma client.

**Connection:** Single Prisma client instance (singleton pattern in `src/lib/db.ts`).

**Migrations:** Prisma Migrate for schema changes. All migrations are committed to version control.

**Seeding:** `prisma/seed.ts` creates:
- Default admin user
- Default company settings (empty, to be filled in setup wizard)
- Default document templates (quotation, invoice, PO)
- Default numbering config

### 4. Authentication & Authorization

**NextAuth.js** with Credentials provider:
- Email + password login
- Session stored in JWT (no database sessions for MVP)
- Session includes: `userId`, `email`, `name`, `role`

**Middleware (`src/middleware.ts`):**
- All `/dashboard/*` routes require valid session
- Redirects unauthenticated users to `/login`

**Role enforcement:**
- Server Actions and API routes check `session.user.role` before executing
- Helper: `requireRole(session, ['admin', 'manager'])` — throws if unauthorized
- UI hides elements based on role, but server-side is the real guard

### 5. File Storage

**MVP:** Local filesystem under `public/uploads/`
- `/uploads/logos/` — Company logo
- `/uploads/pdfs/` — Generated PDFs
- Served statically by Next.js

**Later:** Migrate to S3-compatible storage (e.g., MinIO, AWS S3, DigitalOcean Spaces) with signed URLs.

## Key Technical Decisions

### Money as Integers
All monetary values stored as integers in **sen** (1 MYR = 100 sen). This avoids floating-point errors entirely.
- Database: `amount_sen INTEGER`
- Display: `formatMoney(amountSen)` → `"RM 1,234.50"`
- Input: User enters `1234.50`, stored as `123450`

### Document Snapshots
Every time a document is saved or its status changes, a full JSON snapshot is stored in `document_history`. This enables:
- View any past version
- Diff between versions
- Audit trail
- Undo capabilities

### Template System
PDF templates are HTML files with CSS, stored in the database. Handlebars-style placeholders are replaced at render time. This allows:
- Non-developers to modify templates (HTML/CSS only)
- Multiple templates per document type
- Per-company branding

### Atomic Numbering
Document numbers use a PostgreSQL sequence (or a `counter` table with `UPDATE ... RETURNING`) to guarantee uniqueness even under concurrent access. The format is configurable but the sequence is strictly monotonic.

## Deployment Architecture

```
Per-Company Deployment:
┌─────────────────────┐     ┌────────────────────┐
│  Vercel / VPS       │     │  PostgreSQL         │
│  (Next.js App)      │────▶│  (Supabase / RDS /  │
│                     │     │   self-hosted)       │
└─────────────────────┘     └────────────────────┘
         │
         ▼
┌─────────────────────┐
│  File Storage       │
│  (Local / S3)       │
└─────────────────────┘
```

Each company deployment is configured via environment variables:
```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://docuflow.clientname.com
COMPANY_SLUG=clientname
```

## Performance Considerations

- Server Components reduce client-side JS bundle
- Document lists use server-side pagination (cursor-based for large datasets)
- PDF generation is async — show loading state, serve cached PDF if available
- Database indexes on: `document_number`, `status`, `client_id`, `created_at`, `doc_type`
- Generated PDFs are cached — regenerate only when document is edited
