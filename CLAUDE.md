# CLAUDE.md - Non-Negotiable Development Standards

**Version:** 1.1
**Last Updated:** October 21, 2025
**Applies To:** All AI Agents (Scrum Master, Developer, QA)

---

## 🚨 ABSOLUTE NON-NEGOTIABLES

Every agent working on this project **MUST** read and follow these standards. Failure to comply will result in story rejection during QA.

---

## 1. Architecture & Structure Standards

### 1.1 Monorepo Structure
- All code lives in a single repository
- Use npm workspaces for package management
- No code duplication between frontend and backend

### 1.2 File Organization
```
kanvas/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth route group
│   ├── (main)/              # Main app route group
│   ├── api/                 # API routes
│   ├── globals.css          # Global styles only
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── editor/              # Editor-specific components
│   ├── navigation/          # Navigation components
│   └── shared/              # Shared components
├── lib/                     # Utility functions
│   ├── prisma.ts            # Prisma client singleton
│   ├── auth.ts              # Auth utilities
│   ├── constants.ts         # App-wide constants
│   └── utils.ts             # Utility functions
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Database migrations
├── public/                  # Static assets
├── docs/                    # Project documentation
│   ├── epics/
│   └── stories/
└── types/                   # TypeScript type definitions
```

### 1.3 Component Structure
- **Maximum file length:** 250 lines per component file
- **If exceeded:** Split into sub-components or extract logic to hooks/utilities
- One component per file
- Co-locate test files with components: `Button.tsx` + `Button.test.tsx`

---

## 2. Styling Standards

### 2.1 CSS Variables & Theme System
**CRITICAL:** All colors, spacing, and design tokens MUST be defined in CSS variables in `app/globals.css`

```css
:root {
  /* Colors - Light Theme */
  --background: #FFFFFF;
  --foreground: #1A1A1A;
  --muted: #6B7280;
  --border: #E5E7EB;
  --accent: #3B82F6;

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-serif: Georgia, 'Times New Roman', serif;
  --font-mono: 'Monaco', 'Courier New', monospace;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #1A1A1A;
    --foreground: #F3F4F6;
    --muted: #9CA3AF;
    --border: #374151;
  }
}
```

### 2.2 Tailwind Usage
- **NEVER hardcode colors:** Use CSS variables via Tailwind's arbitrary values
  - ❌ `className="bg-white text-gray-900"`
  - ✅ `className="bg-[var(--background)] text-[var(--foreground)]"`
- **NEVER hardcode spacing values:** Use CSS variables
  - ❌ `className="p-4 m-8"`
  - ✅ `className="p-[var(--spacing-md)] m-[var(--spacing-lg)]"`
- Use Tailwind's utility classes for layout, flexbox, grid
- For complex styles, create reusable component classes

### 2.3 Component Styling
- Use `cn()` utility from `lib/utils.ts` for conditional classes
- Keep className strings readable (max 3 utilities per line)
- Extract repeated className patterns into constants

---

## 3. TypeScript Standards

### 3.1 Type Safety
- **NEVER use `any`** - Use `unknown` if type is truly unknown
- All function parameters and return types must be explicitly typed
- Use Prisma's generated types for database models
- Define interfaces for component props

### 3.2 Type Organization
```typescript
// types/index.ts
export interface User {
  id: string;
  email: string;
  vaults: Vault[];
}

export interface Vault {
  id: string;
  name: string;
  ownerId: string;
}

// Use Prisma types when possible
import { User as PrismaUser } from '@prisma/client';
```

### 3.3 File Length Standards
- **React Components:** Max 250 lines
- **Utility Functions:** Max 150 lines
- **API Routes:** Max 200 lines
- **Type Definition Files:** Max 300 lines

---

## 4. Database & Prisma Standards

### 🔴 CRITICAL: Database Migration Workflow
**ALL AGENTS MUST READ `/docs/MIGRATION-WORKFLOW.md` BEFORE ANY DATABASE WORK**

**⚠️ RECENT CRITICAL ISSUE DISCOVERED:**
Previous developers violated migration rules by:
1. Editing migration files after they were applied
2. Adding fields to schema.prisma without generating migrations
3. Causing "migration drift" that would break production

**THIS MUST NEVER HAPPEN AGAIN.**

### 4.1 Schema Modifications
**CRITICAL:** All database changes MUST follow this process:

1. **Modify** `prisma/schema.prisma`
2. **Generate** migration: `npx prisma migrate dev --name descriptive-name`
3. **Test** migration locally
4. **Commit** both schema.prisma AND migration files
5. **NEVER** manually edit migration files after creation
6. **NEVER** add fields to schema without migrations
7. **NEVER** modify existing migration SQL files

**Migration files are IMMUTABLE once created. If you need changes, create a NEW migration.**

### 4.2 Prisma Client Usage
- **ALWAYS** use the singleton client from `lib/prisma.ts`
- **NEVER** instantiate `new PrismaClient()` in multiple files
- Use Prisma's type-safe queries
- Handle database errors gracefully

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### 4.3 Migration Naming Convention
- Use descriptive, kebab-case names
- Examples:
  - `npx prisma migrate dev --name add-user-preferences`
  - `npx prisma migrate dev --name create-notes-table`
  - `npx prisma migrate dev --name add-folder-parent-relation`

---

## 5. API Route Standards

### 5.1 Structure
```typescript
// app/api/notes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 1. Validate authentication
    // 2. Parse and validate input
    // 3. Execute database query
    // 4. Return response
    return NextResponse.json({ data: notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}
```

### 5.2 Error Handling
- **ALWAYS** wrap API logic in try-catch
- Log errors with descriptive messages
- Return appropriate HTTP status codes
- Never expose internal error details to client

### 5.3 Response Format
```typescript
// Success response
{ data: T, message?: string }

// Error response
{ error: string, details?: string }
```

---

## 6. Component Standards

### 6.1 React Best Practices
- Use functional components only (no class components)
- Use React hooks appropriately
- Memoize expensive computations with `useMemo`
- Memoize callback functions with `useCallback`
- Extract complex logic into custom hooks

### 6.2 Component Props
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children
}: ButtonProps) {
  // Implementation
}
```

### 6.3 State Management
- Use Zustand for global state (from tech stack)
- Keep component state local when possible
- Use React Context sparingly (only for theme, auth)

---

## 7. Testing Standards

### 7.1 Test Coverage Requirements
- **All new components:** Unit tests required
- **All API routes:** Integration tests required
- **Critical user flows:** E2E tests required (future)

### 7.2 Test File Organization
```
components/
├── Button.tsx
└── Button.test.tsx

app/api/notes/
├── route.ts
└── route.test.ts
```

### 7.3 Testing Utilities
- Use Jest + React Testing Library
- Mock Prisma client in tests
- Test user interactions, not implementation

---

## 8. Authentication & Security

### 8.1 NextAuth.js Standards
- Configure in `app/api/auth/[...nextauth]/route.ts`
- Use database sessions (via Prisma adapter)
- Store secrets in environment variables
- Never expose API keys in client code

### 8.2 Data Access Control
- **ALWAYS** verify user ownership before CRUD operations
- Check authentication on all protected API routes
- Use Prisma's relation filters for scoped queries

```typescript
// ✅ CORRECT: Filter by user
const notes = await prisma.note.findMany({
  where: {
    vault: {
      ownerId: session.user.id
    }
  }
});

// ❌ WRONG: No user filter
const notes = await prisma.note.findMany();
```

---

## 9. Performance Standards

### 9.1 Bundle Size
- Keep client bundle under 300KB (gzipped)
- Use dynamic imports for heavy components
- Lazy load AI features

### 9.2 Database Queries
- Use Prisma's `select` to fetch only needed fields
- Use `include` sparingly
- Add database indexes for frequently queried fields
- Avoid N+1 queries (use `include` with relations)

### 9.3 Auto-Save Debouncing
- Debounce editor auto-save to 500ms minimum
- Use `lodash.debounce` or custom hook
- Show save indicator to user

---

## 10. Environment & Configuration

### 10.1 Environment Variables
```bash
# .env
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-strong-secret"
SCALEWAY_API_KEY="your-scaleway-api-key"
SCALEWAY_PROJECT_ID="your-scaleway-project-id"
SCALEWAY_REGION="fr-par"
```

### 10.2 Configuration Files
- **NEVER** commit `.env` to git
- Maintain `.env.example` with all required variables
- Document all environment variables

---

## 11. Git & Version Control

### 11.1 Commit Standards
- Write clear, descriptive commit messages
- Prefix with story number: `[1.1] Initialize Next.js project`
- Commit related changes together

### 11.2 Branch Strategy
- `main` branch is production-ready
- Feature branches: `story/1.1-project-setup`
- No direct commits to `main`

---

## 12. Documentation Standards

### 12.1 Code Comments
- Comment complex business logic
- Use JSDoc for utility functions
- Avoid obvious comments ("increments counter")

### 12.2 Story Documentation
- Update story files with implementation details
- Document all file changes in "Dev Agent Record"
- Note any deviations from original plan

---

## 13. GDPR & Data Residency

### 13.1 Critical Requirements
- **ALL data MUST remain in UK/EU**
- Use Scaleway AI (EU-based infrastructure only)
- Railway services must be deployed to Europe region
- No data transmission to US servers

### 13.2 Verification
- Test Scaleway AI endpoints are EU-based before deployment
- Verify Scaleway region is set to EU (fr-par or nl-ams)
- Verify Railway region in dashboard
- Document compliance in architecture docs

---

## 14. AI Integration Standards

### 14.1 API Design
```typescript
// app/api/ai/rephrase/route.ts
export async function POST(request: NextRequest) {
  const { text, userId } = await request.json();

  // 1. Validate authentication
  // 2. Validate input
  // 3. Call Scaleway AI endpoint (EU region)
  // 4. Return result
}
```

### 14.2 Error Handling
- Graceful degradation if AI service is down
- Show user-friendly error messages
- Log AI errors for debugging

---

## 15. Accessibility Standards

### 15.1 WCAG AA Compliance
- All interactive elements must be keyboard accessible
- All images must have alt text
- Color contrast ratios must meet WCAG AA standards
- Use semantic HTML

### 15.2 ARIA Labels
- Add `aria-label` to icon-only buttons
- Use `aria-describedby` for form validation
- Test with screen readers

---

## 16. Code Quality Checklist

Before marking any story as "Review", Developer Agent MUST verify:

- [ ] No hardcoded colors or spacing values
- [ ] All CSS uses variables from `globals.css`
- [ ] No `any` types in TypeScript
- [ ] All components under 250 lines
- [ ] Prisma migrations generated and committed
- [ ] API routes have error handling
- [ ] Components have proper TypeScript interfaces
- [ ] Tests written for new functionality
- [ ] No console.logs in production code (use proper logging)
- [ ] All imports use `@/` alias for consistency
- [ ] Environment variables documented in `.env.example`

---

## 17. Performance Checklist

- [ ] Database queries use `select` for specific fields
- [ ] Heavy components are code-split with dynamic imports
- [ ] Auto-save is debounced (min 500ms)
- [ ] Images are optimized (use Next.js Image component)
- [ ] No unnecessary re-renders (check with React DevTools)

---

## 18. Agent-Specific Requirements

### 18.1 Scrum Master Agent
- MUST synthesize ALL relevant architecture details into Dev Notes
- MUST break stories into tasks under 4 hours each
- MUST specify exact file paths and component names
- MUST include all necessary technical context

### 18.2 Developer Agent
- MUST read this CLAUDE.md file before starting ANY story
- MUST read `/docs/MIGRATION-WORKFLOW.md` before ANY database work
- MUST follow ALL standards without exception
- MUST keep a complete list of changed files
- MUST run tests before marking story as "Review"
- MUST NOT skip any tasks in the checklist
- MUST verify `npx prisma migrate status` shows "up to date" before proceeding

### 18.3 QA Agent
- MUST validate ALL Acceptance Criteria
- MUST check code against ALL standards in this file
- MUST reject stories that violate non-negotiables
- MUST test the application runs without errors
- MUST verify database migrations work correctly

---

## 19. Common Pitfalls to Avoid

### ❌ NEVER DO THIS:
```typescript
// Hardcoded colors
<div className="bg-white text-black">

// Using 'any'
function process(data: any) {

// Multiple PrismaClient instances
const prisma = new PrismaClient();

// No error handling
export async function GET() {
  const data = await prisma.note.findMany();
  return NextResponse.json(data);
}

// Inline styles
<div style={{ color: 'red' }}>
```

### ✅ ALWAYS DO THIS:
```typescript
// CSS variables
<div className="bg-[var(--background)] text-[var(--foreground)]">

// Proper typing
function process(data: unknown) {

// Singleton client
import { prisma } from '@/lib/prisma';

// Error handling
export async function GET() {
  try {
    const data = await prisma.note.findMany();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// Tailwind classes
<div className="text-[var(--accent)]">
```

---

## 20. Questions & Clarifications

If ANY standard is unclear or seems to conflict with a story requirement:

1. STOP implementation immediately
2. Document the specific conflict
3. Request clarification from the orchestrator
4. DO NOT proceed with assumptions

---

**Remember:** These standards exist to ensure we build a high-quality, maintainable, scalable application. Following them is not optional—it's essential for the project's success.

**Last reminder:** Read this file EVERY time you start working on a new story.
