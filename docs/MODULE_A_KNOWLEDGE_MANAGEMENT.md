# JalGyan (WaterWise) — Module A: Knowledge Management
**National Water Knowledge Sharing Wiki & Educational Repository**  
*Bureau of Water Use Efficiency, National Water Mission — Ministry of Jal Shakti*

---

## 1. Executive Summary & Objective

In accordance with the Ministry of Jal Shakti problem statement:
> *"The absence of a centralized knowledge-sharing platform like wikis significantly hampers the dissemination of water-efficient techniques, which could mitigate water scarcity. Despite the existence of various methods to conserve water, especially in agriculture, the lack of awareness and accessibility to this information perpetuates inefficient water use."*

**Module A (Person 1 — Knowledge Management)** establishes a dedicated, peer-reviewed, digital knowledge-sharing wiki platform. It enables farmers, hydrologists, urban planners, and citizens to discover, contribute, and manage verified water-efficient techniques, technical schematics, calculation formulas, multimedia video tutorials, and hydrological datasets.

---

## 2. Deliverables & Features Implemented

### Frontend (User Interface)
| Component / Page | Route | Description |
| :--- | :--- | :--- |
| **Knowledge Library Page** | `/knowledge` or `/articles` | Hero header with stats, full-text live search bar, interactive category chip filters, sort controls (recent, popular, read time), and responsive card grid with bookmarks. |
| **Article Details Page** | `/articles/:slug` | Wiki layout with Markdown formatting, author bio card, reading time, view counter, bookmark actions, social sharing, attached downloadable resources (PDFs, datasets), and video tutorials. |
| **Submit Article Page** | `/articles/submit` | Contributor workspace with form validation, category picker, live Markdown preview toggle, dynamic resource builder, and dual action ("Submit for Review" vs "Save as Draft"). |
| **Edit Article Page** | `/articles/edit/:id` | Pre-populated editor with permission enforcement, resource sync, reviewer feedback display for `REJECTED` articles, and re-submission workflow. |
| **Video & Resource Hub** | `/resources` | Dedicated multimedia center filterable by media type (`VIDEO`, `PDF`, `DATASET`, `LINK`), category, and search query, featuring an embedded video modal player. |
| **Author Dashboard** | `/my-articles` | Author-specific console displaying submission metrics (total, published, pending, drafts, rejected, views), status filter tabs, reviewer feedback callouts, and quick actions. |

### Backend (RESTful APIs)
| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/categories` | Public | List all water conservation categories with published article counts |
| `GET` | `/api/categories/:slug` | Public | Retrieve category details and its published articles |
| `POST` | `/api/categories` | Admin Only | Create a new category with slug generation |
| `GET` | `/api/articles` | Public | Paginated list of published articles with search, category, and sort filters |
| `GET` | `/api/articles/my` | Authenticated | List all articles authored by current user across all statuses with statistics |
| `GET` | `/api/articles/:slugOrId` | Public / Author | Detailed article by slug or ID with view counter increment and resource bundling |
| `POST` | `/api/articles` | Authenticated | Submit or draft new article with automatic slug generation and resources |
| `PUT` | `/api/articles/:id` | Author / Admin | Update article content, categories, resources, and reset review status |
| `PATCH` | `/api/articles/:id/submit` | Author / Admin | Move draft or rejected article to `PENDING_REVIEW` |
| `DELETE` | `/api/articles/:id` | Author / Admin | Soft delete an article (`deletedAt = now()`) |
| `GET` | `/api/resources` | Public | Aggregated educational resources and videos across published articles |
| `POST` | `/api/articles/:id/resources` | Author / Admin | Attach resource (PDF, Video, Dataset) to an article |
| `DELETE` | `/api/articles/:id/resources/:resId` | Author / Admin | Remove attached resource from article |

---

## 3. Database Schema (Prisma PostgreSQL)

### `Category`
```prisma
model Category {
  id          String    @id @default(cuid())
  name        String    @unique
  slug        String    @unique
  description String?   @db.Text
  articles    Article[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### `Article`
```prisma
model Article {
  id              String            @id @default(cuid())
  title           String
  slug            String            @unique
  summary         String            @db.Text
  content         String            @db.Text
  readTime        String?           // e.g. "7 min read"
  coverImage      String?
  status          ArticleStatus     @default(DRAFT)
  rejectionReason String?           @db.Text
  viewsCount      Int               @default(0)
  authorId        String
  author          User              @relation(fields: [authorId], references: [id], onDelete: Restrict)
  categoryId      String
  category        Category          @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  resources       ArticleResource[]
  reviews         ArticleReview[]   // Module C review audit trail
  bookmarks       Bookmark[]        // Module B bookmarks
  reports         Report[]          // Moderation reports
  publishedAt     DateTime?
  deletedAt       DateTime?         // Soft deletion support
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([status, categoryId])
  @@index([status, createdAt])
  @@index([authorId])
  @@index([deletedAt])
}
```

### `ArticleResource`
```prisma
model ArticleResource {
  id        String   @id @default(cuid())
  articleId String
  article   Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)
  title     String
  url       String
  type      String   // "PDF", "LINK", "DATASET", "VIDEO"
  createdAt DateTime @default(now())

  @@index([articleId])
  @@index([type])
}
```

---

## 4. Test Suite Execution

Run the automated integration test suite from the repository root:
```bash
node server/test_article_crud.js
```

All 13 integration test scenarios pass with zero mock failures:
1. Category listing endpoint (`GET /api/categories -> 200`)
2. Category detail by slug (`GET /api/categories/:slug -> 200, 404`)
3. Category creation authorization (`Admin -> 201, User -> 403, Duplicate -> 409`)
4. Article creation & validation (`POST /api/articles -> 201, Invalid -> 400`)
5. Article public listing & search (`GET /api/articles -> 200`)
6. Article details & view counter (`GET /api/articles/:slug -> 200`)
7. Draft & pending article access control (`Draft hidden from non-author -> 404`)
8. Article update authorization (`Author -> 200, Non-author -> 403`)
9. Author-specific management endpoint (`GET /api/articles/my -> 200`)
10. Author quick resubmit for review (`PATCH /api/articles/:id/submit -> 200`)
11. Educational resource & video library API (`GET /api/resources -> 200`)
12. Resource attachment subroutes (`POST/DELETE /api/articles/:id/resources`)
13. Article soft deletion (`DELETE /api/articles/:id -> 200`)

---

## 5. Frontend Production Build Verification

```bash
npm run build
```
Result:
```text
✓ 1626 modules transformed.
dist/index.html                   0.76 kB │ gzip:   0.42 kB
dist/assets/index-T7zt-pMl.css   74.88 kB │ gzip:  15.45 kB
dist/assets/index-BOnMcPNN.js   404.62 kB │ gzip: 106.85 kB
✓ built in 890ms
```
