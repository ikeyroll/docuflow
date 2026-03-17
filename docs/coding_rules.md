# CODING_RULES.md — Coding Standards

## General Principles

1. **Readability over cleverness.** Write code a junior developer can follow.
2. **Explicit over implicit.** Name things clearly. Avoid abbreviations except common ones (id, url, pdf, etc.).
3. **Colocate related code.** Keep components, their types, and their server actions close together.
4. **Delete dead code.** Do not comment out code "for later." Git has history.
5. **Small functions.** If a function exceeds 50 lines, split it.

## TypeScript

### Strict Mode
`tsconfig.json` must have `"strict": true`. No `any` types unless absolutely unavoidable (and add a `// eslint-disable-next-line` comment explaining why).

### Type Definitions
- Shared types go in `src/types/`.
- Component-specific types live in the component file.
- Prisma-generated types are the source of truth for database models. Extend them; don't duplicate.
- Use `interface` for object shapes, `type` for unions and intersections.

```typescript
// Good — extending Prisma types
import type { Document, DocumentLineItem } from "@prisma/client";

interface DocumentWithLineItems extends Document {
  lineItems: DocumentLineItem[];
}

// Good — form data types using Zod inference
import type { z } from "zod";
import { documentFormSchema } from "@/lib/validations/document";

type DocumentFormData = z.infer<typeof documentFormSchema>;
```

### Enums
Use Prisma enums for database values. For UI-only enums, use `as const` objects:

```typescript
// Database enums — from Prisma
import { DocType, DocStatus } from "@prisma/client";

// UI-only constants
const PAYMENT_TERM_OPTIONS = [
  { value: 7, label: "Net 7" },
  { value: 14, label: "Net 14" },
  { value: 30, label: "Net 30" },
  { value: 60, label: "Net 60" },
] as const;
```

## React / Next.js

### Server vs Client Components
- **Default to Server Components.** Only add `"use client"` when you need:
  - Event handlers (onClick, onChange, onSubmit)
  - React hooks (useState, useEffect, useRef)
  - Browser-only APIs (window, localStorage)
- **Never** put `"use client"` on a layout or page component. Extract the interactive part into a child component.

```typescript
// Good — page is a Server Component, form is a Client Component
// app/(dashboard)/quotations/new/page.tsx
import { getClients } from "@/lib/data/clients";
import { getProducts } from "@/lib/data/products";
import { QuotationForm } from "@/components/forms/quotation-form";

export default async function NewQuotationPage() {
  const clients = await getClients();
  const products = await getProducts();

  return (
    <div>
      <h1>New Quotation</h1>
      <QuotationForm clients={clients} products={products} />
    </div>
  );
}
```

### Server Actions
Prefer Server Actions over API routes for form submissions.

```typescript
// src/lib/actions/documents.ts
"use server";

import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/auth-helpers";
import { documentFormSchema } from "@/lib/validations/document";
import { db } from "@/lib/db";

export async function createDocument(formData: DocumentFormData) {
  const session = await auth();
  requireRole(session, ["ADMIN", "MANAGER", "STAFF"]);

  const validated = documentFormSchema.safeParse(formData);
  if (!validated.success) {
    return { success: false, error: validated.error.flatten().fieldErrors };
  }

  try {
    const document = await db.document.create({ ... });
    return { success: true, data: document };
  } catch (error) {
    console.error("Failed to create document:", error);
    return { success: false, error: "Failed to create document" };
  }
}
```

### Component Structure
```typescript
// Standard component structure
"use client"; // Only if needed

import { ... } from "react";                     // React imports
import { ... } from "next/...";                    // Next.js imports
import { ... } from "@/components/ui/...";         // UI components
import { ... } from "@/lib/...";                   // Lib imports
import type { ... } from "@/types/...";            // Type imports

interface ComponentProps {
  // Props interface
}

export function ComponentName({ prop1, prop2 }: ComponentProps) {
  // Hooks first
  // Derived state / computed values
  // Handler functions
  // Render
}
```

### Forms
- Use `react-hook-form` with Zod resolver for all forms.
- Use shadcn/ui form components for consistent styling.
- Show validation errors inline.
- Disable submit button while submitting.
- Show success/error toast after submission.

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientFormSchema, type ClientFormData } from "@/lib/validations/client";

export function ClientForm() {
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: { ... },
  });

  async function onSubmit(data: ClientFormData) {
    const result = await createClient(data);
    if (result.success) {
      toast.success("Client created");
      router.push("/clients");
    } else {
      toast.error(result.error);
    }
  }

  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>;
}
```

## Validation (Zod)

All input validation uses Zod schemas. Schemas are defined in `src/lib/validations/`.

```typescript
// src/lib/validations/document.ts
import { z } from "zod";
import { DocType } from "@prisma/client";

export const lineItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
  unit: z.string().default("unit"),
  unitPriceSen: z.number().int().nonnegative("Price cannot be negative"),
  discountType: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  discountValue: z.number().int().nonnegative().default(0),
  taxRate: z.number().int().nonnegative().default(600),
  sortOrder: z.number().int().default(0),
});

export const documentFormSchema = z.object({
  docType: z.nativeEnum(DocType),
  clientId: z.string().optional(),
  supplierId: z.string().optional(),
  issueDate: z.string().or(z.date()),
  dueDate: z.string().or(z.date()).optional(),
  validUntil: z.string().or(z.date()).optional(),
  notes: z.string().default(""),
  terms: z.string().default(""),
  templateId: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

export type DocumentFormData = z.infer<typeof documentFormSchema>;
```

## Money Handling

**CRITICAL: All money values are integers in sen. Never use floating point.**

```typescript
// src/lib/utils/money.ts

/** Convert ringgit string to sen integer */
export function ringgitToSen(ringgit: string | number): number {
  const num = typeof ringgit === "string" ? parseFloat(ringgit) : ringgit;
  return Math.round(num * 100);
}

/** Convert sen integer to display string */
export function formatMoney(sen: number, currency = "MYR"): string {
  const ringgit = sen / 100;
  return `${currency === "MYR" ? "RM" : currency} ${ringgit.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Bank Negara rounding to nearest 5 sen */
export function roundTo5Sen(sen: number): number {
  return Math.round(sen / 5) * 5;
}

/** Calculate rounding adjustment */
export function calculateRoundingAdj(totalSen: number): number {
  const rounded = roundTo5Sen(totalSen);
  return rounded - totalSen;
}

/** Calculate line item total */
export function calculateLineTotal(
  quantity: number, // × 100
  unitPriceSen: number,
  discountType: "PERCENTAGE" | "FIXED",
  discountValue: number
): number {
  const grossSen = Math.round((quantity * unitPriceSen) / 100);
  if (discountType === "PERCENTAGE") {
    return grossSen - Math.round((grossSen * discountValue) / 10000);
  }
  return grossSen - discountValue;
}
```

## Database Queries

### Always use Prisma
```typescript
// Good
const clients = await db.client.findMany({
  where: { isActive: true },
  orderBy: { companyName: "asc" },
});

// Bad — raw SQL
const clients = await db.$queryRaw`SELECT * FROM clients WHERE is_active = true`;
```

### Select only what you need
```typescript
// Good — for a dropdown
const clients = await db.client.findMany({
  select: { id: true, companyName: true, name: true },
  where: { isActive: true },
});

// Avoid — fetching everything for a dropdown
const clients = await db.client.findMany({ where: { isActive: true } });
```

### Use transactions for multi-step operations
```typescript
// Creating a document with line items
const result = await db.$transaction(async (tx) => {
  const docNumber = await generateNextNumber(tx, DocType.QUOTATION);

  const document = await tx.document.create({
    data: {
      docType: "QUOTATION",
      documentNumber: docNumber,
      ...documentData,
      lineItems: { create: lineItemsData },
    },
    include: { lineItems: true },
  });

  await tx.documentHistory.create({
    data: {
      documentId: document.id,
      action: "CREATED",
      description: `Quotation ${docNumber} created`,
      snapshotJson: document,
      changedById: session.user.id,
    },
  });

  return document;
});
```

## Error Handling

### Server Actions & API Routes
```typescript
// Consistent return type
interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Server Action pattern
export async function doSomething(): Promise<ActionResult<SomeType>> {
  try {
    const session = await auth();
    requireRole(session, ["ADMIN"]);
    // ... logic
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: "Unauthorized" };
    }
    console.error("doSomething failed:", error);
    return { success: false, error: "Something went wrong" };
  }
}
```

### API Route pattern
```typescript
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    // ... logic
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("GET /api/... failed:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
```

## Styling

### Tailwind Only
No CSS modules, no styled-components, no CSS-in-JS. Use Tailwind utility classes exclusively.

### shadcn/ui Components
Use shadcn/ui for all UI primitives (Button, Input, Select, Dialog, Table, Card, Toast, etc.). Install components as needed:
```bash
pnpm dlx shadcn@latest add button input select dialog table card toast
```

### Responsive Design
- Mobile-first approach
- Dashboard sidebar collapses on mobile
- Document forms are single-column on mobile
- Data tables scroll horizontally on mobile

### Colour Conventions
Use Tailwind's semantic colours via shadcn/ui CSS variables:
- `primary` — Main brand action (buttons, links)
- `destructive` — Delete, void, cancel actions
- `muted` — Secondary text, backgrounds
- Status badges: `bg-green-100 text-green-800` (paid), `bg-yellow-100 text-yellow-800` (pending), `bg-red-100 text-red-800` (overdue), `bg-gray-100 text-gray-800` (draft)

## Testing (When Added)

- Unit tests for business logic (calculation engine, state machine, numbering)
- Integration tests for server actions (with test database)
- No unit tests for UI components in MVP — add later

## Git Conventions

- Branch naming: `feature/module-name`, `fix/bug-description`
- Commit messages: Conventional Commits (`feat: add quotation form`, `fix: rounding calculation`)
- One feature per branch, squash merge to main
