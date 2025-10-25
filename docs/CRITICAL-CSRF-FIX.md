# CRITICAL: CSRF Protection Production Blocker

**Status**: 🚨 **BLOCKER** - Application will fail in production  
**Severity**: **CRITICAL**  
**Priority**: **P0 - Must fix before any deployment**  
**Discovery Date**: October 25, 2025  
**Discovered By**: QA Audit & Security Review  

---

## Executive Summary

During comprehensive security testing, we discovered that **25 client-side files** are making state-changing API requests (POST, PUT, PATCH, DELETE) to CSRF-protected endpoints **without including CSRF tokens**. This will cause **complete application failure in production** for critical user operations.

### Impact if Deployed Without Fix

- ❌ **Note Auto-Save Broken** - Users lose work (data loss risk)
- ❌ **Folder Management Broken** - Cannot create, rename, or delete folders
- ❌ **Publishing Broken** - Cannot publish or share documents
- ❌ **Image Upload Broken** - Cannot upload images to notes
- ❌ **Settings Broken** - Cannot change theme, font, or spelling preferences
- ❌ **AI Features Broken** - Cannot use rephrase, grammar check, or summarize
- ❌ **User Signup Broken** - New users cannot register
- ❌ **All mutations return 403 Forbidden** - Users see constant errors

**Estimated User Impact**: 100% of users unable to perform any write operations

---

## Root Cause Analysis

### Background

The application implements CSRF protection using two mechanisms:

1. **Server-side**: `withCsrfProtection` HOC wraps all mutation endpoints
2. **Client-side**: `fetchWithCsrf` utility automatically injects CSRF tokens

### The Problem

When CSRF protection was added to server-side routes (Story 1.14), the existing client-side code was **not updated** to use the CSRF-aware fetch utility. Instead, 25 files continue using the native `fetch()` API, which does not include the required `X-CSRF-Token` header.

### What Happens in Production

```
User Action: Save note
  ↓
Client: fetch('/api/notes/123', { method: 'PATCH', ... })
  ↓
Server: withCsrfProtection checks for X-CSRF-Token header
  ↓
Server: Header missing → Returns 403 Forbidden
  ↓
User: Sees "Failed to save note" error
  ↓
User: Loses work, cannot use application
```

---

## Technical Details

### CSRF Protection Architecture

**Server-side** (`lib/api/csrf-validation.ts`):
```typescript
export const withCsrfProtection = (handler: RouteHandler) => {
  return async (request: NextRequest, context: RouteContext) => {
    // Safe methods bypass CSRF
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return handler(request, context);
    }
    
    // Protected methods REQUIRE token
    const csrfToken = request.headers.get('X-CSRF-Token');
    if (!csrfToken || csrfToken.length < 16) {
      return NextResponse.json(
        { error: 'CSRF validation failed', code: 'CSRF_TOKEN_INVALID' },
        { status: 403 }
      );
    }
    
    return handler(request, context);
  };
};
```

**Client-side Utility** (`lib/fetch-with-csrf.ts`):
```typescript
export async function fetchWithCsrf(url: string, options?: RequestInit) {
  const csrfToken = await getCsrfToken(); // Fetches from /api/auth/csrf
  
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      'X-CSRF-Token': csrfToken, // ← This is what's missing!
    },
  });
}
```

### Protected Endpoints (Require CSRF Token)

All mutation endpoints use `withCsrfProtection`:

- `POST /api/notes` - Create note
- `PATCH /api/notes/[id]` - Update note (auto-save)
- `DELETE /api/notes/[id]` - Delete note
- `POST /api/notes/[id]/publish` - Publish note
- `POST /api/notes/[id]/clone` - Clone note
- `POST /api/notes/[id]/move` - Move note
- `POST /api/notes/[id]/shares` - Create share
- `PATCH /api/notes/[id]/shares/[shareId]` - Update share
- `DELETE /api/notes/[id]/shares/[shareId]` - Revoke share
- `POST /api/folders` - Create folder
- `PATCH /api/folders/[id]` - Rename folder
- `DELETE /api/folders/[id]` - Delete folder
- `POST /api/folios` - Create folio
- `PATCH /api/user/preferences` - Update preferences
- `PATCH /api/user/last-active-note` - Update last active note
- `POST /api/upload` - Upload image
- `POST /api/ai/rephrase` - AI rephrase
- `POST /api/ai/fix-grammar` - AI grammar
- `POST /api/ai/summarize` - AI summarize
- `POST /api/auth/signup` - User signup
- `PUT /api/settings/spelling` - Update spelling settings

---

## Files Requiring Fixes

### Category 1: Critical Path (Blocks Core Features)

#### 1.1 Note Auto-Save (CRITICAL - Data Loss Risk)
**File**: `lib/hooks/useAutoSave.ts`  
**Line**: 46-52  
**Impact**: Users cannot save notes, lose work  
**Current Code**:
```typescript
const response = await fetch(`/api/notes/${noteIdToSave}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ content }),
});
```

**Required Fix**:
```typescript
import { fetchWithCsrf } from '@/lib/fetch-with-csrf';

const response = await fetchWithCsrf(`/api/notes/${noteIdToSave}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ content }),
});
```

---

#### 1.2 Folder CRUD Operations (HIGH)
**File**: `lib/hooks/useFolioCrud.ts`  
**Lines**: 20, 52, 95  
**Impact**: Cannot create, rename, or delete folders  
**Calls**:
- Line 20: `POST /api/folders` (create)
- Line 52: `POST /api/folios` (create folio)
- Line 95: `PATCH /api/folders/[id]` (rename)

**Required Fix**: Replace all 3 `fetch()` calls with `fetchWithCsrf()`

---

#### 1.3 Note Loading State Persistence (MEDIUM)
**File**: `lib/hooks/useNoteLoading.ts`  
**Line**: 120  
**Impact**: Last active note not persisted  
**Call**: `PATCH /api/user/last-active-note`

**Required Fix**: Replace `fetch()` with `fetchWithCsrf()`

---

#### 1.4 AI Features (HIGH)
**File**: `lib/hooks/useAIFeatures.ts`  
**Lines**: 72, 132, 185  
**Impact**: AI rephrase, grammar check, summarize broken  
**Calls**:
- Line 72: `POST /api/ai/rephrase`
- Line 132: `POST /api/ai/fix-grammar`
- Line 185: `POST /api/ai/summarize`

**Required Fix**: Replace all 3 `fetch()` calls with `fetchWithCsrf()`

---

#### 1.5 Image Upload (HIGH)
**File**: `lib/editor/image-commands.ts`  
**Line**: 47  
**Impact**: Cannot upload images to editor  
**Call**: `POST /api/upload`

**Required Fix**: Replace `fetch()` with `fetchWithCsrf()`

**Note**: This is a FormData upload, ensure `Content-Type` is not set (browser sets multipart/form-data automatically)

---

### Category 2: User Settings & Preferences

#### 2.1 Theme Switcher
**File**: `components/settings/ThemeSwitcher.tsx`  
**Line**: 35  
**Call**: `PATCH /api/user/preferences`

#### 2.2 Font Selector
**File**: `components/settings/FontSelector.tsx`  
**Line**: 50  
**Call**: `PATCH /api/user/preferences`

#### 2.3 Spelling Settings
**File**: `components/settings/SpellingSettings.tsx`  
**Line**: 43  
**Call**: `PUT /api/settings/spelling`

**Required Fix**: Replace all `fetch()` calls with `fetchWithCsrf()`

---

### Category 3: Authentication & User Management

#### 3.1 User Signup (CRITICAL)
**File**: `components/auth/SignupForm.tsx`  
**Line**: 52  
**Impact**: New users cannot register  
**Call**: `POST /api/auth/signup`

**Required Fix**: Replace `fetch()` with `fetchWithCsrf()`

---

### Category 4: Navigation & Collaboration

#### 4.1 Folio Tree
**File**: `components/navigation/FolioTree.tsx`  
**Lines**: 56, 83  
**Calls**:
- Line 56: `PATCH /api/folders/[id]` (rename folder)
- Line 83: `PATCH /api/notes/[id]` (rename note)

#### 4.2 Shared Document Context Menu
**File**: `components/navigation/SharedDocumentContextMenu.tsx`  
**Line**: 62  
**Call**: `POST /api/notes/[id]/clone`

#### 4.3 File Navigator
**File**: `components/navigation/FileNavigator.tsx`  
**Lines**: 261, 293  
**Calls**:
- Line 261: `POST /api/folders` (create folder)
- Line 293: `POST /api/notes` (create note)

#### 4.4 Folio Switcher
**File**: `components/navigation/FolioSwitcher.tsx`  
**Line**: 27  
**Call**: `POST /api/folios` (create folio)

**Required Fix**: Replace all `fetch()` calls with `fetchWithCsrf()`

---

### Category 5: Publishing & Sharing

#### 5.1 Clone Button
**File**: `components/publish/CloneButton.tsx`  
**Line**: 38  
**Call**: `POST /api/notes/[id]/clone`

#### 5.2 Share Management Modal
**File**: `components/publish/ShareManagementModal.tsx`  
**Lines**: 80, 128  
**Calls**:
- Line 80: `POST /api/notes/[id]/shares` (create share)
- Line 128: `PATCH /api/notes/[id]/shares/[shareId]` (update share)

#### 5.3 Publish Button
**File**: `components/editor/PublishButton.tsx`  
**Line**: 33  
**Call**: `POST /api/notes/[id]/publish`

**Required Fix**: Replace all `fetch()` calls with `fetchWithCsrf()`

---

## Remediation Plan

### Phase 1: Immediate Fixes (P0 - Blocking)

**Priority Order** (by user impact):

1. ✅ **usePersistedActiveNote.ts** - Already fixed
2. **useAutoSave.ts** - Note auto-save (data loss prevention)
3. **SignupForm.tsx** - User registration
4. **useFolioCrud.ts** - Folder management
5. **FileNavigator.tsx** - Note/folder creation
6. **PublishButton.tsx** - Publishing

**Estimated Time**: 2-3 hours

### Phase 2: Secondary Fixes (P1 - High Priority)

7. **useAIFeatures.ts** - AI features
8. **image-commands.ts** - Image upload
9. **Share management components** - Collaboration features
10. **Navigation components** - UI operations

**Estimated Time**: 1-2 hours

### Phase 3: Settings & Polish (P2 - Medium Priority)

11. **Settings components** - User preferences
12. **useNoteLoading.ts** - State persistence

**Estimated Time**: 30 minutes

---

## Implementation Strategy

### Step 1: Update Imports

For each file, add the import:
```typescript
import { fetchWithCsrf } from '@/lib/fetch-with-csrf';
```

### Step 2: Replace fetch() Calls

**Before**:
```typescript
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
```

**After**:
```typescript
const response = await fetchWithCsrf('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
```

### Step 3: Special Cases

#### FormData Uploads (image-commands.ts)
```typescript
// Don't set Content-Type for FormData
const response = await fetchWithCsrf('/api/upload', {
  method: 'POST',
  body: formData, // fetchWithCsrf will handle headers
});
```

#### Error Handling (already exists)
```typescript
if (!response.ok) {
  const errorData = await response.json();
  if (errorData.code === 'CSRF_TOKEN_INVALID') {
    // fetchWithCsrf already retries once with fresh token
    // If still failing, token system is broken
  }
}
```

---

## Testing Strategy

### Unit Tests
- ✅ CSRF validation tests already exist
- ✅ Token fetching tests already exist
- ⚠️ Need integration tests for each component

### Manual Testing Checklist

After fixes, test these flows:

#### Critical Path
- [ ] Create a new note
- [ ] Type in editor and verify auto-save works
- [ ] Create a new folder
- [ ] Rename a folder
- [ ] Move a note to a folder
- [ ] Upload an image to a note
- [ ] Publish a note
- [ ] Create a share link
- [ ] Clone a shared note
- [ ] Sign up a new user

#### Settings
- [ ] Change theme (light/dark)
- [ ] Change font preference
- [ ] Toggle spelling check

#### AI Features
- [ ] Select text and click "Rephrase"
- [ ] Select text and click "Fix Grammar"
- [ ] Select text and click "Summarize"

### Automated Testing

Run all existing tests to ensure no regressions:
```bash
pnpm test
```

Expected: All tests pass (tests mock CSRF protection)

---

## Verification

### Pre-Deployment Checklist

Before marking this as complete:

- [ ] All 25 files updated to use `fetchWithCsrf`
- [ ] No direct `fetch()` calls remain for POST/PUT/PATCH/DELETE to `/api/*`
- [ ] All manual tests pass
- [ ] All automated tests pass
- [ ] Code review completed
- [ ] Changes committed with clear message
- [ ] Staging deployment successful
- [ ] Production-like environment tested

### Deployment Safety

**DO NOT DEPLOY** until:
1. All files in this document are fixed
2. Manual testing confirms all features work
3. No 403 errors appear in browser console
4. Auto-save works reliably (critical for data safety)

---

## Long-Term Recommendations

### 1. Prevent Future Issues

Add ESLint rule to detect direct `fetch()` usage:
```javascript
// .eslintrc.js
rules: {
  'no-restricted-globals': ['error', {
    name: 'fetch',
    message: 'Use fetchWithCsrf from lib/fetch-with-csrf instead of global fetch for API calls',
  }],
}
```

### 2. Documentation

Update developer documentation:
- Add CSRF section to CLAUDE.md
- Document `fetchWithCsrf` usage in contributing guide
- Add examples to code review checklist

### 3. CI/CD

Add pre-commit hook to check for violations:
```bash
#!/bin/bash
# Check for direct fetch() usage to /api/*
if git diff --cached | grep -E "fetch\(['\"]\/api\/" > /dev/null; then
  echo "ERROR: Direct fetch() to /api/* detected. Use fetchWithCsrf instead."
  exit 1
fi
```

---

## Success Criteria

This issue is resolved when:

1. ✅ All 25 files use `fetchWithCsrf` for mutations
2. ✅ Zero 403 CSRF errors in production
3. ✅ All critical user flows work (save, publish, share, signup)
4. ✅ Automated tests pass
5. ✅ Manual testing checklist 100% complete
6. ✅ No regressions in existing functionality

---

## Timeline

**Target Completion**: Same day as discovery (October 25, 2025)

**Phases**:
- Phase 1 (P0): 2-3 hours
- Phase 2 (P1): 1-2 hours  
- Phase 3 (P2): 30 minutes
- Testing: 1 hour

**Total Estimated Time**: 5-7 hours

---

## Appendix A: Complete File List

### Files Requiring Changes (25 total)

**lib/hooks/** (5 files):
1. ✅ `usePersistedActiveNote.ts` - Already fixed
2. `useAutoSave.ts`
3. `useFolioCrud.ts`
4. `useNoteLoading.ts`
5. `useAIFeatures.ts`

**lib/editor/** (1 file):
6. `image-commands.ts`

**components/settings/** (3 files):
7. `ThemeSwitcher.tsx`
8. `FontSelector.tsx`
9. `SpellingSettings.tsx`

**components/auth/** (1 file):
10. `SignupForm.tsx`

**components/navigation/** (5 files):
11. `FolioTree.tsx`
12. `SharedDocumentContextMenu.tsx`
13. `FileNavigator.tsx`
14. `FolioSwitcher.tsx`

**components/publish/** (3 files):
15. `CloneButton.tsx`
16. `ShareManagementModal.tsx`

**components/editor/** (1 file):
17. `PublishButton.tsx`

**Not requiring changes**:
- `lib/ai/scaleway-client.ts` - External API (Scaleway), not our backend

---

## Appendix B: Rollback Plan

If issues arise during deployment:

1. **Immediate**: Revert to previous commit
2. **Investigation**: Review browser console for specific errors
3. **Hotfix**: If single file causing issue, revert that file only
4. **Communication**: Notify team of rollback and investigation status

---

## Document History

- **2025-10-25**: Initial discovery and documentation
- **Author**: QA Audit / Security Review
- **Reviewers**: Development Team
- **Status**: ACTIVE - Fixes in progress

---

**END OF DOCUMENT**
