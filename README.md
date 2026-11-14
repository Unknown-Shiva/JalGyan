# JalGyan (WaterWise India)
> **Digital Knowledge Sharing Platform for Water-Efficient Techniques and Minimizing Water Scarcity**  
> *Domain: Clean & Green Technology (Software) &bull; Ministry of Jal Shakti &bull; Bureau of Water Use Efficiency*

---

## 🌊 Overview & Problem Statement
The absence of a centralized knowledge-sharing platform like wikis significantly hampers the dissemination of water-efficient techniques, which could mitigate water scarcity. Despite the existence of various methods to conserve water, especially in agriculture, the lack of awareness and accessibility to this information perpetuates inefficient water use. This gap in knowledge sharing contributes to the overuse of water resources and exacerbates water stress, particularly in regions where agriculture is heavily dependent on irrigation.

**JalGyan** addresses this challenge through a three-module ecosystem:
- **Module A (Person 1) — Knowledge Management**: Dedicated wiki-style repository of peer-reviewed articles on water-saving techniques, category indexing, multimedia video/resource library, author workspace, and full-text search.
- **Module B (Person 2) — Community & Engagement**: Interactive forum for sharing localized water problems, threaded comments, voting, bookmarks, and user profiles.
- **Module C (Person 3) — Platform Administration & Calculator**: Administrative governance, article review workflows, moderation, platform metrics, and water-saving estimation tools.

---

## 🚀 Module A: Knowledge Management (Person 1) Deliverables

### Frontend
- **Knowledge Library Page (`/knowledge` or `/articles`)**: Category chips with article counts, search input, sort dropdown, and article cards with bookmark action.
- **Article Details Page (`/articles/:slug`)**: Full wiki view with rich markdown formatting, author bio, read time, view counter, bookmark status, and attached downloadable resources.
- **Submit Article Page (`/articles/submit`)**: Contributor form with live markdown preview, category selection, and dynamic resource builder.
- **Edit Article Page (`/articles/edit/:id`)**: Pre-populated editor with permission enforcement, reviewer feedback view for rejected submissions, and re-submission workflow.
- **Video & Resource Library (`/resources`)**: Curated multimedia hub for educational videos, technical manuals (PDFs), and datasets with an interactive video player modal.
- **Author Dashboard (`/my-articles`)**: Author-specific console with status metrics (published, pending, draft, rejected, reads) and quick actions.

### Backend APIs
- `GET /api/categories` — List categories with active published article count
- `GET /api/categories/:slug` — Retrieve category details and its published articles
- `POST /api/categories` — Create category (Admin only)
- `GET /api/articles` — Paginated list of published articles with search, category, and sort filters
- `GET /api/articles/my` — Author-specific article list across all review statuses
- `GET /api/articles/:slugOrId` — Article details with view count increment and resource bundling
- `POST /api/articles` — Create article with auto-generated slug and nested resources
- `PUT /api/articles/:id` — Update article and sync resources (author/admin only)
- `PATCH /api/articles/:id/submit` — Move draft or rejected article to review queue
- `DELETE /api/articles/:id` — Soft-delete an article
- `GET /api/resources` — Aggregated educational resources and video library
- `POST /api/articles/:id/resources` — Attach resource to an article
- `DELETE /api/articles/:id/resources/:resourceId` — Remove resource from an article

---

## 🛠️ Tech Stack
- **Frontend**: React 18, React Router v6, Vite, Lucide Icons, Custom Design System CSS
- **Backend**: Node.js, Express, Prisma 7, PostgreSQL, JWT Authentication, BCrypt
- **Testing**: Native Node.js HTTP Test Suite with stubbed database delegates

---

## 📋 Quick Start Guide

### 1. Install Dependencies
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd server && npm install && cd ..
```

### 2. Generate Prisma Client
```bash
cd server
npx prisma generate
cd ..
```

### 3. Run Backend Integration Tests
```bash
node server/test_article_crud.js
```

### 4. Build Frontend for Production
```bash
npm run build
```

### 5. Start Development Servers
```bash
# Start backend server
cd server && npm run dev

# In another terminal, start frontend
npm run dev
```
