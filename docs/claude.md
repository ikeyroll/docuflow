# CLAUDE.md — AI Behaviour Rules

## Identity

You are building **DocuFlow** — a single-tenant document automation system for Malaysian SMEs. You are working for FACEZ SDN. BHD., a Gen Z-owned IT solutions company based in Malaysia.

## Core Principles

1. **Ship working code** — prefer simple, working implementations over clever abstractions.
2. **Single-tenant mindset** — this system is deployed per company. There is no multi-tenant logic, no organization table, no tenant isolation middleware. One database = one company.
3. **Malaysian business context** — SST (not GST), MYR currency, SSM registration numbers, Bank Negara rounding rules, bilingual BM/English support, LHDN e-Invoice readiness.
4. **Progressive enhancement** — build the MVP features first. Do not build features marked as "Phase 2" or "Phase 3" unless explicitly asked.

## Tech Stack (Do Not Deviate)

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js (Credentials provider for MVP, expandable later)
- **PDF Generation**: Puppeteer (HTML template → PDF pipeline)
- **File Storage**: Local filesystem for MVP (`/uploads` directory), S3-compatible later
- **State Management**: React Server Components + Server Actions where possible, zustand only if needed client-side
- **Validation**: Zod for all inputs (API and forms)
- **Email**: Nodemailer for MVP

## Code Style Rules

- Use `pnpm` as the package manager.
- All files use TypeScript. No `.js` files except config files that require it.
- Use path aliases: `@/` maps to project root `src/`.
- Database queries go through Prisma. Never write raw SQL unless Prisma cannot express the query.
- API routes use Next.js Route Handlers (`app/api/.../route.ts`).
- Server Actions are preferred over API routes for form submissions.
- All money values are stored as integers in **sen** (cents). Display conversion happens at the UI layer only.
- Dates are stored as UTC in the database. Display conversion to MYT (UTC+8) happens at the UI layer.
- Use `decimal.js` or integer arithmetic for all money calculations. Never use floating point for money.

## File & Folder Conventions

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── (auth)/             # Auth pages (login, forgot password)
│   ├── (dashboard)/        # Protected dashboard pages
│   ├── api/                # API route handlers
│   └── layout.tsx
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── forms/              # Form components (quotation form, invoice form, etc.)
│   ├── documents/          # Document display components (preview, PDF viewer)
│   ├── layout/             # Sidebar, header, navigation
│   └── shared/             # Reusable components (data tables, status badges, etc.)
├── lib/
│   ├── db.ts               # Prisma client singleton
│   ├── auth.ts             # NextAuth config
│   ├── pdf/                # PDF generation logic
│   ├── documents/          # Document business logic (numbering, calculations, state machine)
│   ├── validations/        # Zod schemas
│   └── utils.ts            # Shared utilities
├── types/                  # TypeScript type definitions
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── public/
    └── templates/          # Default PDF templates (HTML/CSS)
```

## Naming Conventions

- Files & folders: `kebab-case` (e.g., `document-form.tsx`, `create-quotation/`)
- Components: `PascalCase` (e.g., `DocumentForm`, `QuotationList`)
- Functions & variables: `camelCase`
- Database tables: `snake_case` (Prisma handles mapping)
- Constants & enums: `UPPER_SNAKE_CASE` for constants, `PascalCase` for TypeScript enums
- API routes: `kebab-case` in URL path (e.g., `/api/documents/line-items`)

## Error Handling

- All Server Actions return `{ success: boolean; data?: T; error?: string }`.
- API routes return proper HTTP status codes with JSON error bodies.
- Use try/catch at the boundary (route handler / server action). Do not scatter try/catch in utility functions unless recovering from a specific error.
- Log errors server-side with context. Never expose stack traces to the client.

## Security Rules

- All dashboard routes require authentication (middleware check).
- Role-based access is enforced at the Server Action / API route level, not just UI hiding.
- Validate and sanitize all user inputs with Zod before database operations.
- Use parameterized queries (Prisma handles this).
- PDF templates must sanitize user-provided HTML to prevent XSS.
- File uploads: validate MIME type and size. Only allow images (logo) and CSV (import).

## What NOT to Do

- Do not install a CSS-in-JS library. Use Tailwind only.
- Do not create a custom auth system. Use NextAuth.js.
- Do not use MongoDB or any NoSQL database.
- Do not use Redux, MobX, or Recoil. Use zustand only if server components are insufficient.
- Do not add i18n libraries in MVP. Hardcode bilingual strings where needed.
- Do not build a custom WYSIWYG template editor in MVP. Use predefined HTML templates.
- Do not add WebSocket/real-time features in MVP.
- Do not over-engineer. If a simple function works, do not create a class or abstract factory.
