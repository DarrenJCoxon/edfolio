# Epic 4: Custom AI Chatbots

**Status:** Post-MVP
**Epic Goal:** To empower users to create personalized, knowledge-aware AI chatbots that can engage in contextual conversations grounded in user-uploaded documents.

---

## Overview

This epic builds upon the foundation of AI integration established in Epic 2, extending beyond simple text transformation to enable full conversational AI experiences. Users will be able to create custom chatbots with specific behavioral characteristics and associate them with private knowledge bases, enabling contextual, document-grounded conversations.

---

## User Value Proposition

**For Teachers:** Create subject-specific teaching assistants that can answer student questions based on course materials, textbooks, and teaching resources.

**For Students:** Build study companions that help them understand and explore their course content through conversational interaction.

**For Educational Institutions:** Provide a safe, GDPR-compliant environment for AI-enhanced learning without data leaving the UK/EU.

---

## Technical Architecture Overview

### Backend Components

#### 1. Chatbot Service (`app/api/chatbots/`)
- **Purpose:** Manage chatbot lifecycle (CRUD operations)
- **Endpoints:**
  - `POST /api/chatbots` - Create new chatbot
  - `GET /api/chatbots` - List user's chatbots
  - `GET /api/chatbots/[id]` - Get chatbot details
  - `PUT /api/chatbots/[id]` - Update chatbot configuration
  - `DELETE /api/chatbots/[id]` - Delete chatbot
- **Data Model:** See Prisma schema below

#### 2. Knowledge Base Service (`app/api/knowledge/`)
- **Purpose:** Handle document upload, processing, and vectorization
- **Endpoints:**
  - `POST /api/knowledge/upload` - Upload documents to chatbot
  - `GET /api/knowledge/[chatbotId]` - List chatbot's documents
  - `DELETE /api/knowledge/[documentId]` - Remove document
- **Processing Pipeline:**
  1. Document upload (PDF, DOCX, TXT, MD)
  2. Text extraction
  3. Chunking (1000 tokens with 200 token overlap)
  4. Embedding generation via Scaleway Embedding API
  5. Vector storage in PostgreSQL (pgvector extension)

#### 3. Chat Service (`app/api/chat/`)
- **Purpose:** Handle real-time chat interactions with RAG
- **Endpoints:**
  - `POST /api/chat/[chatbotId]` - Send message and receive response
  - `GET /api/chat/[chatbotId]/history` - Retrieve chat history
- **RAG Pipeline:**
  1. Receive user message
  2. Generate embedding for query
  3. Vector similarity search in knowledge base
  4. Retrieve top K relevant chunks (K=5)
  5. Construct prompt with context
  6. Call Scaleway Inference API
  7. Stream response to client

#### 4. AI Integration Layer
- **Provider:** Scaleway Managed Inference (EU region)
- **Models:**
  - **Chat Model:** `llama-3.1-70b-instruct` (primary)
  - **Embedding Model:** `sentence-transformers/all-MiniLM-L6-v2`
- **Configuration:** Centralized in `lib/scaleway.ts`

---

## Database Schema Extensions

```prisma
// Add to existing schema.prisma

model Chatbot {
  id              String    @id @default(cuid())
  name            String
  systemPrompt    String    @db.Text
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  knowledgeBase   Document[]
  chatSessions    ChatSession[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([userId])
}

model Document {
  id              String    @id @default(cuid())
  filename        String
  fileType        String
  fileSize        Int
  chatbotId       String
  chatbot         Chatbot   @relation(fields: [chatbotId], references: [id], onDelete: Cascade)
  chunks          DocumentChunk[]
  uploadedAt      DateTime  @default(now())

  @@index([chatbotId])
}

model DocumentChunk {
  id              String    @id @default(cuid())
  documentId      String
  document        Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  content         String    @db.Text
  embedding       Float[]   // Stored as array, indexed with pgvector
  chunkIndex      Int
  tokenCount      Int

  @@index([documentId])
}

model ChatSession {
  id              String    @id @default(cuid())
  chatbotId       String
  chatbot         Chatbot   @relation(fields: [chatbotId], references: [id], onDelete: Cascade)
  messages        ChatMessage[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([chatbotId])
}

model ChatMessage {
  id              String      @id @default(cuid())
  sessionId       String
  session         ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  role            String      // 'user' or 'assistant'
  content         String      @db.Text
  timestamp       DateTime    @default(now())

  @@index([sessionId])
}
```

### PostgreSQL Extensions Required

```sql
-- Enable pgvector for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create index for efficient vector search
CREATE INDEX ON "DocumentChunk" USING ivfflat (embedding vector_cosine_ops);
```

---

## Frontend Components

### Component Structure

```
components/
├── chat/
│   ├── ChatWindow.tsx           # Main chat interface
│   ├── ChatBubble.tsx           # Individual message display
│   ├── ChatInput.tsx            # Message input field
│   ├── ChatHeader.tsx           # Chatbot name and controls
│   └── FloatingChatButton.tsx   # FAB to open chat
├── chatbot/
│   ├── ChatbotCreationModal.tsx # Create/edit chatbot form
│   ├── ChatbotList.tsx          # List of user's chatbots
│   ├── ChatbotCard.tsx          # Single chatbot preview
│   └── KnowledgeBaseManager.tsx # Upload and manage documents
└── shared/
    └── FileUpload.tsx           # Reusable file upload component
```

---

## Story Breakdown

### Story 4.1: Chatbot UI Foundation
**Goal:** Create the visual interface for chatbot interaction

**Scope:**
- Floating Action Button (FAB) in bottom-right corner
- Expandable chat window (slide-up animation)
- Chat message list with user/assistant styling
- Message input field with send button
- No actual AI connection (placeholder responses)

**Key Files:**
- `components/chat/FloatingChatButton.tsx`
- `components/chat/ChatWindow.tsx`
- `components/chat/ChatBubble.tsx`
- `components/chat/ChatInput.tsx`

**Acceptance Criteria:**
- [ ] FAB appears in bottom-right of main editor view
- [ ] Clicking FAB opens chat window with smooth animation
- [ ] Chat window displays placeholder messages
- [ ] User can type and "send" messages (stored locally)
- [ ] Chat window can be minimized/closed

---

### Story 4.2: Chatbot Creation & Configuration
**Goal:** Enable users to create and configure chatbots

**Scope:**
- Backend API for chatbot CRUD operations
- Frontend modal for chatbot creation
- Chatbot list view
- System prompt configuration

**Key Files:**
- `app/api/chatbots/route.ts` (POST, GET)
- `app/api/chatbots/[id]/route.ts` (GET, PUT, DELETE)
- `components/chatbot/ChatbotCreationModal.tsx`
- `components/chatbot/ChatbotList.tsx`
- `lib/prisma.ts` (Prisma schema updates)

**Acceptance Criteria:**
- [ ] User can create a new chatbot with name and system prompt
- [ ] User can view list of their chatbots
- [ ] User can edit chatbot configuration
- [ ] User can delete a chatbot
- [ ] All operations are scoped to authenticated user
- [ ] Chatbot selection updates active chat window

---

### Story 4.3: Private Knowledge Base Upload
**Goal:** Allow users to upload documents to enhance chatbot knowledge

**Scope:**
- Document upload API with file validation
- Text extraction from PDF, DOCX, TXT, MD
- Document chunking strategy
- Embedding generation via Scaleway
- Vector storage in PostgreSQL with pgvector
- Knowledge base management UI

**Key Files:**
- `app/api/knowledge/upload/route.ts`
- `app/api/knowledge/[chatbotId]/route.ts`
- `app/api/knowledge/[documentId]/route.ts`
- `lib/document-processor.ts` (text extraction, chunking)
- `lib/embeddings.ts` (Scaleway embedding integration)
- `components/chatbot/KnowledgeBaseManager.tsx`

**Technical Decisions:**
- **File Size Limit:** 10MB per file
- **Supported Formats:** PDF, DOCX, TXT, MD
- **Chunking Strategy:** 1000 tokens per chunk, 200 token overlap
- **Embedding Model:** `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions)
- **Vector Storage:** PostgreSQL with pgvector extension
- **Similarity Metric:** Cosine similarity

**Acceptance Criteria:**
- [ ] User can upload documents to specific chatbot
- [ ] System extracts text from supported file formats
- [ ] Documents are chunked and embedded successfully
- [ ] Vectors are stored in PostgreSQL with pgvector
- [ ] User can view list of uploaded documents
- [ ] User can delete documents from knowledge base
- [ ] Upload progress is displayed to user
- [ ] Appropriate error handling for unsupported files

---

### Story 4.4: Chatbot Interaction with Knowledge
**Goal:** Enable conversational AI with document-grounded responses

**Scope:**
- RAG (Retrieval-Augmented Generation) implementation
- Vector similarity search
- Scaleway chat completion integration
- Streaming response support
- Chat history persistence

**Key Files:**
- `app/api/chat/[chatbotId]/route.ts`
- `app/api/chat/[chatbotId]/history/route.ts`
- `lib/rag.ts` (RAG orchestration)
- `lib/scaleway.ts` (Scaleway API integration)
- Update `components/chat/ChatWindow.tsx` (real API integration)

**RAG Implementation Details:**

1. **Query Processing:**
   - Generate embedding for user query
   - Perform vector similarity search (top 5 chunks)
   - Retrieve source document metadata

2. **Prompt Construction:**
   ```
   System: {chatbot.systemPrompt}

   Context from knowledge base:
   [Chunk 1 content]
   [Chunk 2 content]
   ...

   User: {user_message}
   ```

3. **Response Generation:**
   - Call Scaleway Inference API with constructed prompt
   - Model: `llama-3.1-70b-instruct`
   - Temperature: 0.7
   - Max tokens: 1000
   - Stream response to client

4. **Chat History:**
   - Store user message and assistant response
   - Include last 5 messages in context window
   - Maintain conversation continuity

**Acceptance Criteria:**
- [ ] User can send messages to chatbot
- [ ] System retrieves relevant document chunks via vector search
- [ ] Response is generated with document context
- [ ] Response streams to UI in real-time
- [ ] Chat history is persisted in database
- [ ] Previous messages are loaded when reopening chat
- [ ] System handles API errors gracefully
- [ ] Response time < 3 seconds for typical queries
- [ ] Source attribution displayed (which documents informed response)

---

## Security & Privacy Considerations

### Authentication & Authorization
- All API endpoints require authenticated user session
- Chatbots are private to creating user
- Knowledge bases are private to associated chatbot
- No cross-user data access

### Data Residency
- **Critical:** All data remains in UK/EU
- Scaleway services must use EU region
- PostgreSQL hosted on Railway (Europe region)
- No data transmission to non-EU servers

### File Upload Security
- File type validation (whitelist only)
- File size limits enforced (10MB max)
- Malicious file scanning (future enhancement)
- Virus scanning integration (future enhancement)

---

## Performance Considerations

### Embedding Generation
- **Challenge:** Large documents can take time to process
- **Solution:** Asynchronous processing with job queue
- **User Experience:** Upload returns immediately, processing status available

### Vector Search
- **Challenge:** Large knowledge bases can slow search
- **Solution:**
  - pgvector indexing with IVFFlat
  - Limit search to top K=5 chunks
  - Cache frequently accessed embeddings

### Chat Response Time
- **Target:** < 3 seconds for 95th percentile
- **Strategies:**
  - Streaming responses (perceived performance)
  - Response caching for common queries
  - Rate limiting to prevent abuse

---

## Testing Strategy

### Unit Tests
- Document text extraction
- Chunking algorithm
- Embedding generation
- Vector similarity calculations
- Prompt construction logic

### Integration Tests
- End-to-end RAG pipeline
- Scaleway API integration
- Database operations with pgvector
- File upload and processing

### End-to-End Tests
- Complete chatbot creation flow
- Document upload and knowledge base building
- Full conversation with context retrieval

---

## Deployment Requirements

### Environment Variables
```bash
SCALEWAY_API_KEY=xxx
SCALEWAY_REGION=eu-west-1
SCALEWAY_CHAT_MODEL=llama-3.1-70b-instruct
SCALEWAY_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
MAX_UPLOAD_SIZE_MB=10
VECTOR_SEARCH_TOP_K=5
```

### Database Migration
```bash
# Enable pgvector extension
npx prisma migrate dev --name add-chatbot-schema

# Create vector index
psql $DATABASE_URL -c "CREATE INDEX ON \"DocumentChunk\" USING ivfflat (embedding vector_cosine_ops);"
```

### Railway Configuration
- Increase memory allocation for document processing
- Configure persistent volume for temporary file storage
- Set up file upload limits in reverse proxy

---

## Future Enhancements (Post-Epic 4)

- **Multi-modal Support:** Image and audio document types
- **Advanced RAG:** Re-ranking, query expansion, hybrid search
- **Conversation Analytics:** Usage metrics, popular queries
- **Collaboration:** Share chatbots with other users
- **Voice Interface:** Speech-to-text and text-to-speech
- **Mobile Optimization:** Native mobile app with offline support

---

## Success Metrics

### User Engagement
- Number of chatbots created per user
- Average documents uploaded per chatbot
- Daily active conversations
- Average conversation length

### Technical Performance
- Document processing success rate (target: >95%)
- Vector search latency (target: <100ms)
- Chat response time (target: <3s p95)
- API error rate (target: <1%)

### Business Value
- User retention after chatbot creation
- Feature adoption rate
- User satisfaction scores
- Premium conversion rate (future monetization)

---

**Next Step:** Proceed to Epic 5 or begin Story 4.1 implementation.
