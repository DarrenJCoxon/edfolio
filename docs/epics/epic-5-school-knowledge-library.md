# Epic 5: School-Wide Knowledge Library

**Status:** Post-MVP (Requires Epic 4)
**Epic Goal:** To enable educational institutions to create a centralized, curated library of vectorized documents that teachers can leverage across all their chatbots, ensuring consistent, authoritative information sources.

---

## Overview

This epic extends the personalized chatbot functionality of Epic 4 to an institutional level, allowing schools to maintain a shared knowledge repository. School administrators can upload and manage official documents, course materials, and policies, which teachers can then link to their chatbots. This creates a single source of truth for institutional knowledge while maintaining the flexibility of personal chatbot customization.

---

## User Value Proposition

**For School Administrators:** Centrally manage and distribute official curriculum materials, policies, and resources to ensure consistency and accuracy across all AI-enhanced learning experiences.

**For Teachers:** Access a curated library of school-approved materials for their chatbots without needing to upload the same documents repeatedly, while maintaining the ability to add personal supplementary materials.

**For Students:** Receive consistent, school-approved information regardless of which teacher's chatbot they interact with, ensuring alignment with official curriculum.

**For Educational Institutions:** Maintain control over the knowledge base used in AI interactions, ensuring compliance with educational standards and institutional policies.

---

## Technical Architecture Overview

### Multi-Tenancy Model

This epic introduces a multi-tenancy architecture to support school-level organization:

- **School:** Top-level tenant organization
- **Admin:** Users with elevated permissions within a school
- **Teacher:** Regular users belonging to a school
- **Student:** Read-only users (future consideration)

### Backend Components

#### 1. School Management Service (`app/api/schools/`)
- **Purpose:** Manage school organization and membership
- **Endpoints:**
  - `POST /api/schools` - Create new school (super admin only)
  - `GET /api/schools/[id]` - Get school details
  - `PUT /api/schools/[id]` - Update school settings
  - `GET /api/schools/[id]/members` - List school members
  - `POST /api/schools/[id]/invite` - Invite user to school
  - `PUT /api/schools/[id]/members/[userId]` - Update member role
  - `DELETE /api/schools/[id]/members/[userId]` - Remove member

#### 2. School Library Service (`app/api/school-library/`)
- **Purpose:** Manage school-wide document repository
- **Endpoints:**
  - `POST /api/school-library/[schoolId]/upload` - Upload document (admin only)
  - `GET /api/school-library/[schoolId]` - List library documents
  - `GET /api/school-library/[schoolId]/documents/[docId]` - Get document details
  - `PUT /api/school-library/[schoolId]/documents/[docId]` - Update metadata (admin)
  - `DELETE /api/school-library/[schoolId]/documents/[docId]` - Delete document (admin)
  - `POST /api/school-library/[schoolId]/documents/[docId]/link` - Link to chatbot (teacher)
  - `DELETE /api/school-library/[schoolId]/documents/[docId]/unlink` - Unlink from chatbot

#### 3. Enhanced Chat Service
- **Purpose:** Extend RAG to search across both personal and school knowledge
- **Changes to Existing:**
  - Modify vector search to query both personal and linked school documents
  - Implement weighted search (personal knowledge vs school library)
  - Add source attribution (personal vs institutional)

#### 4. Permission & Access Control Layer
- **Purpose:** Enforce role-based access control (RBAC)
- **Implementation:**
  - Middleware for permission checking
  - Role hierarchy: SuperAdmin > SchoolAdmin > Teacher > Student
  - Resource-level permissions (document visibility, edit rights)

---

## Database Schema Extensions

```prisma
// Add to existing schema.prisma

model School {
  id              String          @id @default(cuid())
  name            String
  domain          String?         @unique  // e.g., "school.edu" for email verification
  settings        Json?                    // School-specific configuration
  members         SchoolMember[]
  library         SchoolDocument[]
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([domain])
}

model SchoolMember {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  schoolId        String
  school          School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  role            String    // 'admin', 'teacher', 'student'
  joinedAt        DateTime  @default(now())

  @@unique([userId, schoolId])
  @@index([schoolId])
  @@index([userId])
}

model SchoolDocument {
  id              String                @id @default(cuid())
  filename        String
  fileType        String
  fileSize        Int
  description     String?               @db.Text
  category        String?               // e.g., "Curriculum", "Policy", "Assessment"
  schoolId        String
  school          School                @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  uploadedById    String
  uploadedBy      User                  @relation(fields: [uploadedById], references: [id])
  chunks          SchoolDocumentChunk[]
  linkedChatbots  ChatbotSchoolDocLink[]
  uploadedAt      DateTime              @default(now())
  updatedAt       DateTime              @updatedAt

  @@index([schoolId])
  @@index([uploadedById])
  @@index([category])
}

model SchoolDocumentChunk {
  id              String         @id @default(cuid())
  documentId      String
  document        SchoolDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  content         String         @db.Text
  embedding       Float[]        // pgvector
  chunkIndex      Int
  tokenCount      Int

  @@index([documentId])
}

model ChatbotSchoolDocLink {
  id              String         @id @default(cuid())
  chatbotId       String
  chatbot         Chatbot        @relation(fields: [chatbotId], references: [id], onDelete: Cascade)
  documentId      String
  document        SchoolDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  linkedAt        DateTime       @default(now())

  @@unique([chatbotId, documentId])
  @@index([chatbotId])
  @@index([documentId])
}

// Extend existing User model
model User {
  id              String         @id @default(cuid())
  email           String?        @unique
  folios          folio[]
  accounts        Account[]
  sessions        Session[]
  chatbots        Chatbot[]
  schoolMemberships SchoolMember[]
  uploadedSchoolDocs SchoolDocument[]
}

// Extend existing Chatbot model
model Chatbot {
  id              String                   @id @default(cuid())
  name            String
  systemPrompt    String                   @db.Text
  userId          String
  user            User                     @relation(fields: [userId], references: [id], onDelete: Cascade)
  knowledgeBase   Document[]
  linkedSchoolDocs ChatbotSchoolDocLink[]  // NEW: Link to school library
  chatSessions    ChatSession[]
  createdAt       DateTime                 @default(now())
  updatedAt       DateTime                 @updatedAt

  @@index([userId])
}
```

---

## Permission System

### Role Definitions

```typescript
// types/permissions.ts

export enum UserRole {
  SUPER_ADMIN = 'super_admin',    // Platform-wide admin
  SCHOOL_ADMIN = 'school_admin',  // School administrator
  TEACHER = 'teacher',             // School teacher
  STUDENT = 'student'              // School student (future)
}

export type Permission =
  | 'school:create'
  | 'school:read'
  | 'school:update'
  | 'school:delete'
  | 'school:invite'
  | 'school:remove_member'
  | 'school_library:upload'
  | 'school_library:read'
  | 'school_library:update'
  | 'school_library:delete'
  | 'school_library:link_chatbot'
  | 'chatbot:create'
  | 'chatbot:read'
  | 'chatbot:update'
  | 'chatbot:delete';

export const RolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [
    'school:create',
    'school:read',
    'school:update',
    'school:delete',
    'school:invite',
    'school:remove_member',
    'school_library:upload',
    'school_library:read',
    'school_library:update',
    'school_library:delete',
    'school_library:link_chatbot',
    'chatbot:create',
    'chatbot:read',
    'chatbot:update',
    'chatbot:delete',
  ],
  [UserRole.SCHOOL_ADMIN]: [
    'school:read',
    'school:update',
    'school:invite',
    'school:remove_member',
    'school_library:upload',
    'school_library:read',
    'school_library:update',
    'school_library:delete',
    'school_library:link_chatbot',
    'chatbot:create',
    'chatbot:read',
    'chatbot:update',
    'chatbot:delete',
  ],
  [UserRole.TEACHER]: [
    'school:read',
    'school_library:read',
    'school_library:link_chatbot',
    'chatbot:create',
    'chatbot:read',
    'chatbot:update',
    'chatbot:delete',
  ],
  [UserRole.STUDENT]: [
    'school:read',
    'school_library:read',
  ],
};
```

### Permission Middleware

```typescript
// lib/middleware/permissions.ts

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { Permission, RolePermissions, UserRole } from '@/types/permissions';

export async function hasPermission(
  userId: string,
  schoolId: string,
  permission: Permission
): Promise<boolean> {
  // Get user's role in the school
  const membership = await prisma.schoolMember.findUnique({
    where: {
      userId_schoolId: {
        userId,
        schoolId,
      },
    },
  });

  if (!membership) {
    return false;
  }

  const userRole = membership.role as UserRole;
  const allowedPermissions = RolePermissions[userRole];

  return allowedPermissions.includes(permission);
}

export async function requirePermission(
  request: NextRequest,
  schoolId: string,
  permission: Permission
) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const hasAccess = await hasPermission(session.user.id, schoolId, permission);

  if (!hasAccess) {
    throw new Error('Forbidden: Insufficient permissions');
  }

  return session.user;
}
```

---

## Enhanced RAG Architecture

### Hybrid Knowledge Search

When a user sends a message to a chatbot that has linked school documents:

1. **Query Embedding:** Generate embedding for user query
2. **Multi-Source Search:** Perform parallel vector searches:
   - Personal knowledge base (from Epic 4)
   - Linked school library documents
3. **Result Merging:** Combine results with weighted scoring:
   - Personal documents: weight 0.6
   - School documents: weight 0.4
   - Can be adjusted per chatbot
4. **Context Construction:** Build prompt with:
   - Top 3 personal document chunks
   - Top 2 school document chunks
   - Clear source attribution
5. **Response Generation:** Generate response with Scaleway
6. **Source Display:** Show which documents informed the response

### Implementation

```typescript
// lib/rag-hybrid.ts

interface RAGResult {
  chunk: string;
  source: 'personal' | 'school';
  documentName: string;
  similarity: number;
}

export async function performHybridSearch(
  chatbotId: string,
  query: string
): Promise<RAGResult[]> {
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Search personal knowledge base
  const personalResults = await searchPersonalKnowledge(
    chatbotId,
    queryEmbedding,
    5
  );

  // Search linked school documents
  const schoolResults = await searchSchoolKnowledge(
    chatbotId,
    queryEmbedding,
    5
  );

  // Merge and weight results
  const merged = mergeResults(personalResults, schoolResults, {
    personalWeight: 0.6,
    schoolWeight: 0.4,
  });

  // Return top 5 chunks
  return merged.slice(0, 5);
}

function mergeResults(
  personal: RAGResult[],
  school: RAGResult[],
  weights: { personalWeight: number; schoolWeight: number }
): RAGResult[] {
  // Apply weights
  personal.forEach((r) => (r.similarity *= weights.personalWeight));
  school.forEach((r) => (r.similarity *= weights.schoolWeight));

  // Combine and sort by weighted similarity
  return [...personal, ...school].sort(
    (a, b) => b.similarity - a.similarity
  );
}
```

---

## Frontend Components

### Component Structure

```
components/
├── school/
│   ├── SchoolAdminPortal.tsx      # Main admin interface
│   ├── SchoolLibraryBrowser.tsx   # Browse school documents
│   ├── SchoolDocumentUpload.tsx   # Upload to school library
│   ├── SchoolDocumentCard.tsx     # Document preview
│   ├── SchoolMemberManagement.tsx # Manage school members
│   └── SchoolSettings.tsx         # School configuration
├── chatbot/
│   ├── SchoolLibraryLinker.tsx    # Link school docs to chatbot
│   ├── LinkedDocumentsList.tsx    # Show linked school docs
│   └── KnowledgeSourceToggle.tsx  # Toggle personal/school priority
└── chat/
    ├── SourceAttribution.tsx       # Display document sources
    └── ChatMessage.tsx             # Updated with source badges
```

---

## Story Breakdown

### Story 5.1: Admin Library Management Portal
**Goal:** Create a secure interface for school administrators to upload and manage institutional documents

**Scope:**
- School creation and configuration
- School member invitation and role management
- Admin-only document upload interface
- Document categorization and metadata
- Document list view with filtering
- Document editing and deletion

**Key Files:**
- `app/api/schools/route.ts`
- `app/api/schools/[id]/route.ts`
- `app/api/schools/[id]/members/route.ts`
- `app/api/school-library/[schoolId]/upload/route.ts`
- `app/api/school-library/[schoolId]/route.ts`
- `lib/middleware/permissions.ts`
- `components/school/SchoolAdminPortal.tsx`
- `components/school/SchoolDocumentUpload.tsx`
- `components/school/SchoolMemberManagement.tsx`

**Permission Requirements:**
- School creation: Super admin only
- Document upload: School admin only
- Member management: School admin only
- View library: All school members

**Acceptance Criteria:**
- [ ] Super admin can create new schools
- [ ] School admin can access admin portal
- [ ] School admin can upload documents to library
- [ ] Documents are categorized (Curriculum, Policy, Assessment, etc.)
- [ ] School admin can add metadata (title, description, category)
- [ ] School admin can invite teachers by email
- [ ] School admin can assign/change member roles
- [ ] School admin can remove members
- [ ] Documents are processed and vectorized like Epic 4
- [ ] School admin can edit document metadata
- [ ] School admin can delete documents
- [ ] All operations enforce permission checks
- [ ] Non-admins cannot access admin functions

---

### Story 5.2: Teacher Access to School Library
**Goal:** Enable teachers to browse and link school library documents to their chatbots

**Scope:**
- Teacher view of school library
- Search and filter school documents
- Link/unlink documents to chatbots
- View linked documents in chatbot configuration
- Knowledge source management (personal vs school)

**Key Files:**
- `app/api/school-library/[schoolId]/route.ts` (updated for teachers)
- `app/api/chatbots/[id]/school-links/route.ts` (new)
- `components/school/SchoolLibraryBrowser.tsx`
- `components/chatbot/SchoolLibraryLinker.tsx`
- `components/chatbot/LinkedDocumentsList.tsx`

**Permission Requirements:**
- View library: All school members (teachers and admins)
- Link documents: Teachers and admins only
- Manage own chatbots: Owner only

**Acceptance Criteria:**
- [ ] Teacher can view all school library documents
- [ ] Teacher can search/filter library by category, title, date
- [ ] Teacher can preview document details without downloading
- [ ] Teacher can link school documents to their chatbots
- [ ] Teacher can unlink school documents from their chatbots
- [ ] Chatbot configuration shows both personal and school documents
- [ ] Teacher can set knowledge source priority (personal/school weight)
- [ ] Linked documents do not count toward personal storage quota
- [ ] Teacher cannot delete or edit school documents
- [ ] Changes to school documents automatically propagate to linked chatbots

---

### Story 5.3: Grounded Chat with School Knowledge
**Goal:** Enable chatbot conversations that draw from both personal and school knowledge bases

**Scope:**
- Hybrid RAG implementation
- Multi-source vector search
- Weighted result merging
- Source attribution in responses
- UI indicators for knowledge sources

**Key Files:**
- `app/api/chat/[chatbotId]/route.ts` (updated)
- `lib/rag-hybrid.ts` (new)
- `lib/vector-search.ts` (updated)
- `components/chat/SourceAttribution.tsx`
- `components/chat/ChatMessage.tsx` (updated)

**Technical Implementation:**
- Parallel vector searches across personal and school chunks
- Configurable weighting (default: 60% personal, 40% school)
- Top 5 chunks total (3 personal, 2 school by default)
- Clear source attribution in prompt and response

**Acceptance Criteria:**
- [ ] Chatbot searches both personal and school knowledge when both are present
- [ ] Search results are weighted appropriately (configurable)
- [ ] Response includes chunks from both sources when relevant
- [ ] UI displays source badges (Personal/School) on messages
- [ ] User can expand to see which specific documents informed response
- [ ] Source attribution includes document name and relevance score
- [ ] If only personal or only school knowledge exists, system uses that exclusively
- [ ] RAG performance remains < 3s response time
- [ ] School document updates are immediately available to all linked chatbots
- [ ] Chat history includes source metadata

---

## Security & Compliance

### Data Isolation
- **School-level isolation:** Schools cannot access other schools' data
- **User-level isolation:** Teachers can only link to their own chatbots
- **Document access:** School documents visible only to school members

### Audit Logging
```typescript
// Track sensitive operations for compliance
model AuditLog {
  id          String   @id @default(cuid())
  userId      String
  action      String   // 'upload', 'delete', 'invite', 'link', etc.
  resourceType String  // 'school_document', 'school_member', etc.
  resourceId  String
  schoolId    String?
  metadata    Json?
  timestamp   DateTime @default(now())

  @@index([userId])
  @@index([schoolId])
  @@index([timestamp])
}
```

### GDPR Compliance
- Right to access: School admins can export all school data
- Right to deletion: Deleting school removes all associated data
- Data portability: Export school library in standard format
- Consent management: Teachers consent to school library access

---

## Performance Considerations

### Document Deduplication
- **Challenge:** Same document uploaded multiple times
- **Solution:** Content-based hashing to detect duplicates
- **UX:** Show "already exists" warning, allow linking to existing

### Cache Strategy
```typescript
// Cache school library listings for performance
interface SchoolLibraryCache {
  schoolId: string;
  documents: SchoolDocument[];
  lastUpdated: Date;
  ttl: number; // Time to live in seconds
}

// Invalidate cache on:
// - New document upload
// - Document deletion
// - Document metadata update
```

### Vector Search Optimization
- **Personal knowledge:** Typically smaller, faster search
- **School library:** Can be large (100+ documents)
- **Solution:**
  - Index optimization with IVFFlat
  - Parallel searches (personal + school)
  - Result streaming to improve perceived performance

---

## Testing Strategy

### Permission Tests
- Verify role-based access control
- Test unauthorized access attempts
- Validate permission inheritance
- Test cross-school access prevention

### Integration Tests
- End-to-end admin workflow (upload to link)
- Teacher workflow (browse to link to chat)
- Hybrid RAG with multiple sources
- Document update propagation

### Performance Tests
- Large school library (1000+ documents)
- High concurrent access (100+ teachers)
- Vector search performance with hybrid sources
- Cache effectiveness

---

## Deployment Requirements

### Database Migration
```bash
# Add school and library tables
npx prisma migrate dev --name add-school-library

# Create additional vector indexes
psql $DATABASE_URL -c "CREATE INDEX ON \"SchoolDocumentChunk\" USING ivfflat (embedding vector_cosine_ops);"

# Set up audit logging
npx prisma migrate dev --name add-audit-log
```

### Environment Variables
```bash
# Existing Scaleway config
SCALEWAY_API_KEY=xxx
SCALEWAY_REGION=eu-west-1

# New school-specific config
MAX_SCHOOL_LIBRARY_SIZE_GB=100
MAX_SCHOOL_MEMBERS=500
SCHOOL_ADMIN_EMAIL_DOMAIN=verify  # Require matching domain
AUDIT_LOG_RETENTION_DAYS=365
```

### Railway Configuration
- Increase PostgreSQL storage for school libraries
- Configure file upload limits per school
- Set up backup strategy for school data
- Enable point-in-time recovery

---

## Migration Path for Existing Users

### Scenario: Teacher Already Has Chatbots

1. **School Creation:** Admin creates school
2. **Teacher Invitation:** Admin invites existing teacher
3. **Account Linking:** Teacher accepts, account linked to school
4. **Chatbot Preservation:** Existing chatbots remain intact
5. **Library Access:** Teacher gains access to school library
6. **Gradual Adoption:** Teacher can optionally link school docs

### Data Transition
- No forced migration of personal knowledge bases
- Teachers maintain full control of personal chatbots
- School library is additive, not replacement

---

## Future Enhancements (Post-Epic 4)

### Multi-School Support
- Users can belong to multiple schools
- Switch between school contexts
- Separate chatbots per school

### Advanced Admin Features
- Usage analytics per teacher
- Popular documents tracking
- Document version control
- Scheduled document updates

### Collaboration Features
- Share chatbots between teachers
- Co-author school documents
- Department-level libraries
- Cross-institutional sharing (district-wide)

### Student Features
- Student-specific chatbots
- Assignment submission integration
- Progress tracking
- Parental oversight

---

## Success Metrics

### Adoption Metrics
- Number of schools onboarded
- Documents uploaded per school
- Teachers linking to school library
- Average linked documents per chatbot

### Usage Metrics
- School document access frequency
- Hybrid RAG utilization rate
- Source attribution click-through rate
- Admin portal usage

### Quality Metrics
- Document update propagation success rate
- Permission violation attempts (security)
- Hybrid search relevance scores
- User satisfaction with institutional knowledge

### Business Metrics
- School retention rate
- Enterprise contract value
- Cost per school (infrastructure)
- Expansion revenue (additional features)

---

## Epic Dependencies

### Prerequisites
- **Epic 4 Complete:** All chatbot and personal knowledge base features
- **PostgreSQL pgvector:** Extension installed and tested
- **Scaleway Integration:** Stable and performant
- **Authentication:** NextAuth.js fully configured

### Parallel Work Possible
- Story 5.1 can begin immediately after Epic 4
- Story 5.2 depends on 5.1 completion
- Story 5.3 depends on 5.2 completion

---

**Next Step:** Begin Story 5.1 implementation or return to Epic 4 if not yet complete.
