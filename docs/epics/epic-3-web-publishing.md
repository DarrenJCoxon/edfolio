# Epic 3: Web Publishing Feature

**Status:** Post-MVP
**Epic Goal:** To enable users to publish individual folio pages as public, shareable web pages with professional formatting, similar to Notion's "Share to Web" feature, while maintaining GDPR compliance and UK/EU data residency.

---

## Overview

This epic transforms Edfolio from a private note-taking and editing tool into a platform for public content sharing. Users will be able to selectively publish folio pages as clean, professional web pages accessible via public URLs. This feature is essential for students showcasing portfolios, teachers sharing resources, and professionals publishing documentation.

The publishing system will maintain the formatting and styling from the editor while providing an optimized, distraction-free reading experience for visitors. All published content remains under the user's control, with the ability to unpublish at any time.

---

## User Value Proposition

**For Students:** Showcase coursework, portfolios, and projects to potential employers, universities, or peers with professional, shareable links.

**For Teachers:** Share lesson materials, assignment briefs, and resources with students and parents without requiring authentication or platform access.

**For Professionals:** Publish documentation, articles, and guides with clean, SEO-friendly URLs that can be shared broadly.

**For Institutions:** Provide students and staff with a GDPR-compliant publishing platform that keeps all data in UK/EU, avoiding concerns with US-based services like Medium or Notion.

---

## Technical Architecture Overview

### Core Components

#### 1. Publishing Service (`app/api/publish/`)
- **Purpose:** Manage page publishing lifecycle and public page rendering
- **Endpoints:**
  - `POST /api/publish/[pageId]` - Publish a page
  - `PUT /api/publish/[pageId]` - Update published page settings
  - `DELETE /api/publish/[pageId]` - Unpublish a page
  - `GET /api/publish/[pageId]/status` - Get publication status
  - `GET /api/publish/[pageId]/analytics` - Get view stats (future)

#### 2. Public Page Rendering (`app/public/[slug]/`)
- **Purpose:** Serve published pages to anonymous visitors
- **Features:**
  - Server-side rendering (SSR) for SEO
  - No authentication required
  - Clean, distraction-free layout
  - Social media preview metadata
  - Mobile-responsive design

#### 3. Slug Management Service
- **Purpose:** Generate and manage SEO-friendly URLs
- **Features:**
  - Auto-generate slugs from page titles
  - Handle slug conflicts with numeric suffixes
  - Support custom slug editing
  - Validate slug uniqueness across platform

#### 4. Caching Layer
- **Purpose:** Optimize performance for public pages
- **Implementation:**
  - Next.js ISR (Incremental Static Regeneration)
  - Revalidate on content updates
  - Cache social preview images
  - CDN integration (future)

---

## Database Schema Extensions

```prisma
// Add to existing schema.prisma

model PublishedPage {
  id              String    @id @default(cuid())
  pageId          String    @unique
  page            Page      @relation(fields: [pageId], references: [id], onDelete: Cascade)
  slug            String    @unique
  customSlug      Boolean   @default(false)

  // Publishing settings
  isPublished     Boolean   @default(true)
  publishedAt     DateTime  @default(now())
  lastUpdated     DateTime  @updatedAt

  // SEO metadata
  metaTitle       String?   @db.Text
  metaDescription String?   @db.Text
  ogImage         String?   // Open Graph image URL

  // Analytics (future)
  viewCount       Int       @default(0)
  lastViewed      DateTime?

  // Access control (future)
  requirePassword Boolean   @default(false)
  password        String?   // Hashed password for protected pages

  @@index([slug])
  @@index([pageId])
  @@index([publishedAt])
}

// Extend existing Page model
model Page {
  id              String          @id @default(cuid())
  title           String
  content         String          @db.Text
  folioId         String
  folio           Folio           @relation(fields: [folioId], references: [id], onDelete: Cascade)
  published       PublishedPage?  // NEW: Link to published version
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([folioId])
}
```

---

## Frontend Components

### Component Structure

```
components/
├── publish/
│   ├── PublishButton.tsx           # Publish/Unpublish toggle in editor
│   ├── PublishModal.tsx            # Publishing settings modal
│   ├── PublishSettings.tsx         # SEO and visibility settings
│   ├── ShareLinkDisplay.tsx        # Copy link, social share buttons
│   ├── PublishStatusIndicator.tsx  # Visual indicator of publish state
│   └── UnpublishConfirmDialog.tsx  # Confirmation before unpublish
├── public-page/
│   ├── PublicPageLayout.tsx        # Clean layout for published pages
│   ├── PublicPageHeader.tsx        # Minimal header with logo
│   ├── PublicPageFooter.tsx        # "Powered by Edfolio" footer
│   ├── PublicPageContent.tsx       # Rendered page content
│   └── PublicPageMeta.tsx          # SEO meta tags component
└── shared/
    └── SlugEditor.tsx              # Inline slug editing component
```

---

## User Experience Flow

### Publishing Flow

1. **User clicks "Publish" in page menu**
   - Opens PublishModal with publishing options
   - Shows auto-generated slug (editable)
   - Displays preview of public URL

2. **User configures settings (optional)**
   - Edit custom slug
   - Add meta title and description
   - Upload custom Open Graph image (future)
   - Set password protection (future)

3. **User confirms publication**
   - Page is published
   - Public URL is generated
   - ShareLinkDisplay appears with:
     - Copy link button
     - Social media share buttons (Twitter, LinkedIn, Facebook)
     - QR code (future)

4. **Published indicator appears**
   - Visual indicator in page list
   - "Published" badge in editor
   - View count (future)

### Unpublishing Flow

1. **User clicks "Unpublish"**
   - Confirmation dialog appears
   - Warns that public link will become inaccessible
   - Option to preserve slug for future use

2. **User confirms unpublish**
   - Page becomes private
   - Public URL returns 404 or redirect to homepage
   - Published metadata retained (can re-publish with same slug)

---

## Story Breakdown

### Story 3.1: Basic Page Publishing
**Goal:** Enable users to publish individual pages as public web pages

**Scope:**
- Publish/unpublish functionality
- Auto-generated SEO-friendly slugs
- Public page rendering with clean layout
- Database schema for published pages
- Publishing status indicators

**Key Files:**
- `app/api/publish/[pageId]/route.ts` (POST, DELETE)
- `app/public/[slug]/page.tsx` (public page view)
- `components/publish/PublishButton.tsx`
- `components/publish/PublishModal.tsx`
- `components/public-page/PublicPageLayout.tsx`
- Prisma schema migration

**Acceptance Criteria:**
- [ ] User can publish a page from the editor
- [ ] System generates unique, SEO-friendly slug from page title
- [ ] Published page accessible via `/public/[slug]` URL
- [ ] Published page renders with clean, distraction-free layout
- [ ] Page maintains formatting from editor (headings, lists, bold, italic)
- [ ] User can unpublish a page
- [ ] Unpublished pages return 404 to anonymous visitors
- [ ] Published status indicator appears in editor
- [ ] Published pages list in user's pages shows publication status
- [ ] All operations scoped to authenticated page owner

---

### Story 3.2: Custom Slugs and SEO Metadata
**Goal:** Allow users to customize public URLs and add SEO metadata

**Scope:**
- Custom slug editing with validation
- Slug conflict detection and resolution
- Meta title and description fields
- OpenGraph meta tags for social sharing
- Slug uniqueness enforcement

**Key Files:**
- `app/api/publish/[pageId]/route.ts` (PUT endpoint)
- `components/publish/PublishSettings.tsx`
- `components/shared/SlugEditor.tsx`
- `components/public-page/PublicPageMeta.tsx`
- `lib/slug-generator.ts`

**Technical Decisions:**
- **Slug Format:** Lowercase, alphanumeric + hyphens only
- **Slug Length:** 3-100 characters
- **Conflict Resolution:** Append numeric suffix (-2, -3, etc.)
- **Reserved Slugs:** Block common routes (api, auth, admin, etc.)

**Acceptance Criteria:**
- [ ] User can edit custom slug in publish settings
- [ ] System validates slug format (lowercase, alphanumeric, hyphens)
- [ ] System prevents duplicate slugs across all published pages
- [ ] Conflicting slugs auto-append numeric suffix
- [ ] Reserved slugs (api, auth, etc.) are blocked
- [ ] User can add custom meta title (max 60 chars recommended)
- [ ] User can add meta description (max 160 chars recommended)
- [ ] Published page includes Open Graph meta tags
- [ ] Social media previews show correct title, description, image
- [ ] Preview of social share appearance in publish settings

---

### Story 3.3: Share Links and Analytics
**Goal:** Provide easy link sharing and basic view analytics

**Scope:**
- Shareable link display with copy functionality
- Social media share buttons (Twitter, LinkedIn, Email)
- Basic view tracking (count and last viewed)
- View analytics in publish settings
- "Powered by Edfolio" branding on public pages

**Key Files:**
- `components/publish/ShareLinkDisplay.tsx`
- `app/api/publish/[pageId]/analytics/route.ts`
- `app/public/[slug]/page.tsx` (add view tracking)
- `components/public-page/PublicPageFooter.tsx`

**Analytics Implementation:**
- Track page views without cookies (GDPR-friendly)
- Store view count and last viewed timestamp
- No personally identifiable information collected
- Future: Referrer tracking, geographic data (aggregated)

**Acceptance Criteria:**
- [ ] Published pages display "Share" button in editor
- [ ] Share modal shows public URL with copy button
- [ ] Copy button provides visual feedback (checkmark animation)
- [ ] Share buttons for Twitter, LinkedIn, Email
- [ ] Twitter share pre-populates title and URL
- [ ] LinkedIn share pre-populates title and URL
- [ ] Email share opens mail client with subject and body
- [ ] System tracks view count for published pages
- [ ] System records last viewed timestamp
- [ ] User can view analytics (total views, last viewed)
- [ ] Public pages display "Powered by Edfolio" footer
- [ ] Footer includes link to Edfolio homepage
- [ ] View tracking respects GDPR (no cookies, no PII)

---

## Security & Privacy Considerations

### GDPR Compliance
- **Data Residency:** All published content stored in UK/EU (Railway Europe region)
- **No Tracking Cookies:** View analytics without cookies or client-side tracking
- **User Control:** Users can unpublish at any time, removing public access
- **No Third-Party Scripts:** No Google Analytics, Facebook Pixel, etc.
- **Data Minimization:** Only store essential metadata (view count, timestamps)

### Access Control
- **Publishing Permissions:** Only page owner can publish/unpublish
- **Authentication Required:** Publish actions require valid session
- **Public Access Validation:** Verify page is published before rendering
- **No Directory Listing:** No public index of all published pages

### Content Security
- **XSS Prevention:** Sanitize all user-generated content in public view
- **HTML Injection:** Use Next.js safe rendering, no `dangerouslySetInnerHTML` for untrusted content
- **Rate Limiting:** Prevent abuse of publishing endpoints (future)
- **CAPTCHA:** Add CAPTCHA for high-frequency publishing (future)

---

## Performance Considerations

### Caching Strategy

**Next.js ISR (Incremental Static Regeneration):**
- Statically generate published pages at build time
- Revalidate on-demand when page content changes
- Set revalidation period (e.g., 60 seconds)
- Benefits: Fast page loads, SEO-friendly, low server load

**Cache Invalidation:**
- On publish: Generate static page
- On content update: Trigger ISR revalidation
- On unpublish: Remove from cache, return 404

**CDN Integration (Future):**
- Use Vercel Edge Network or Cloudflare
- Cache static assets (images, CSS, fonts)
- Serve from nearest geographic location

### Database Optimization

- **Index on slug:** Fast lookup for public page requests
- **Separate reads/writes:** Published pages are read-heavy
- **Denormalize metadata:** Store rendered HTML (future)

---

## SEO Optimization

### Server-Side Rendering
- All published pages rendered on server (not client)
- Search engines can crawl and index content
- Meta tags present in HTML source

### Meta Tags Required
```html
<head>
  <title>{metaTitle || pageTitle}</title>
  <meta name="description" content="{metaDescription || excerpt}">

  <!-- Open Graph -->
  <meta property="og:title" content="{metaTitle || pageTitle}">
  <meta property="og:description" content="{metaDescription}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="{publicUrl}">
  <meta property="og:image" content="{ogImage || defaultImage}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{metaTitle || pageTitle}">
  <meta name="twitter:description" content="{metaDescription}">
  <meta name="twitter:image" content="{ogImage || defaultImage}">

  <!-- Canonical URL -->
  <link rel="canonical" href="{publicUrl}">
</head>
```

### Structured Data (Future)
- JSON-LD schema for articles
- Author information
- Published date
- Breadcrumbs

### Sitemap Generation (Future)
- Auto-generate sitemap.xml with all published pages
- Submit to Google Search Console
- Update on publish/unpublish events

---

## Design & Styling

### Public Page Layout

**Header:**
- Minimal branding (Edfolio logo, left-aligned)
- Clean, unobtrusive
- No navigation (single-page view)

**Content Area:**
- Max width: 700px (optimal reading width)
- Centered layout
- Generous line height (1.6-1.8)
- Professional typography (system fonts)
- Responsive: Adapts to mobile, tablet, desktop

**Footer:**
- "Powered by Edfolio" with link
- Copyright notice (user's name, if provided)
- No distracting elements

### Typography & Spacing
- Use CSS variables from `app/globals.css`
- Headings: Clear hierarchy (H1, H2, H3)
- Paragraphs: Comfortable spacing (1.5rem margin-bottom)
- Code blocks: Syntax highlighting (future)
- Lists: Proper indentation and spacing

### Color Scheme
- Light theme for public pages (consistent)
- High contrast for readability (WCAG AA)
- Accent color: Matches editor theme
- No dark mode for public pages (v1)

---

## Future Enhancements (Post-Epic 3)

### Advanced Features
- **Custom Domains:** Map published pages to user's domain (e.g., portfolio.student.com)
- **Password Protection:** Restrict access with password
- **Expiry Dates:** Auto-unpublish after specified date
- **Collections:** Group published pages into series or portfolios
- **Themes:** Allow users to choose from predefined design templates
- **Embeds:** Support for embedded videos, tweets, code snippets
- **Comments:** Allow readers to leave comments (moderated)
- **Export:** Download published page as PDF or HTML

### Analytics Enhancements
- **Referrer Tracking:** See where traffic comes from
- **Geographic Data:** Country-level visitor stats (aggregated)
- **Time-Based Charts:** Views over time (last 7 days, 30 days)
- **Popular Pages:** Rank pages by views

### SEO Enhancements
- **Custom OG Images:** Upload custom social preview images
- **Auto-Generated Previews:** Screenshot-based OG images
- **Schema Markup:** Structured data for rich search results
- **RSS Feed:** Auto-generate feed of published pages
- **Multi-Language:** Translate published pages (future)

---

## Testing Strategy

### Unit Tests
- Slug generation algorithm
- Slug conflict resolution
- Metadata validation
- URL sanitization

### Integration Tests
- Publish/unpublish workflow
- Public page rendering
- Cache invalidation
- View tracking accuracy

### End-to-End Tests
- Complete publish flow (create page, publish, view public URL)
- Social sharing functionality
- SEO metadata presence
- Mobile responsiveness
- Unpublish and verify 404

### Performance Tests
- Page load time < 1 second (95th percentile)
- Cache hit rate > 90%
- Handle 1000+ concurrent public page views

---

## Deployment Requirements

### Environment Variables
```bash
# Public URL configuration
NEXT_PUBLIC_BASE_URL=https://edfolio.app
NEXT_PUBLIC_SITE_NAME=Edfolio

# Social sharing defaults
NEXT_PUBLIC_DEFAULT_OG_IMAGE=https://edfolio.app/og-default.png
NEXT_PUBLIC_TWITTER_HANDLE=@edfolio

# ISR revalidation
PUBLISHED_PAGE_REVALIDATE_SECONDS=60

# Future: CDN
CDN_URL=https://cdn.edfolio.app
```

### Database Migration
```bash
# Add published pages schema
npx prisma migrate dev --name add-published-pages

# Create indexes for performance
psql $DATABASE_URL -c "CREATE INDEX idx_published_pages_slug ON \"PublishedPage\" (slug);"
psql $DATABASE_URL -c "CREATE INDEX idx_published_pages_page_id ON \"PublishedPage\" (\"pageId\");"
```

### Next.js Configuration
```javascript
// next.config.js
module.exports = {
  // Enable ISR
  experimental: {
    isrMemoryCacheSize: 50 * 1024 * 1024, // 50MB cache
  },

  // Optimize images
  images: {
    domains: ['edfolio.app'],
    formats: ['image/avif', 'image/webp'],
  },
};
```

---

## Success Metrics

### User Engagement
- Number of pages published per user
- Percentage of active users publishing pages
- Average time between page creation and publishing
- Republish rate (pages unpublished then republished)

### Public Page Performance
- Average page views per published page
- Share button click-through rate
- Most popular published pages
- Bounce rate on public pages

### Technical Performance
- Page load time (target: <1s)
- Cache hit rate (target: >90%)
- Error rate for public page requests (target: <0.1%)
- Uptime for public pages (target: 99.9%)

### SEO Performance
- Number of published pages indexed by Google
- Average organic traffic per published page
- Click-through rate from search results
- Social media referral traffic

### Business Value
- Feature adoption rate
- User retention after first publish
- Conversion from free to paid (future)
- Word-of-mouth referrals (track via share links)

---

## Epic Dependencies

### Prerequisites
- **Epic 1 Complete:** Core editor and page management
- **Stable Page Schema:** Pages must have consistent structure
- **Authentication System:** NextAuth.js for permission checks
- **Deployment on Railway:** Europe region for GDPR compliance

### Parallel Work Possible
- Story 3.1 can begin after Epic 1
- Story 3.2 depends on 3.1 completion
- Story 3.3 depends on 3.1 and 3.2 completion

---

## Migration Path for Existing Users

### No Breaking Changes
- Publishing is opt-in (pages private by default)
- Existing pages unaffected
- No forced migrations

### Onboarding Experience
- First-time publish: Show tutorial/tips
- Highlight SEO best practices
- Suggest adding meta descriptions
- Encourage social sharing

---

**Next Step:** Begin Story 3.1 implementation or proceed to Epic 4 for advanced AI features.
