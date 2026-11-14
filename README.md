# JalGyan (WaterWise India)
> **Digital Knowledge Sharing Platform for Water-Efficient Techniques and Minimizing Water Scarcity**  
> *Domain: Clean & Green Technology (Software) • Ministry of Jal Shakti • Bureau of Water Use Efficiency*
> *College Major Project — Integrated Implementation*

---

## 🌊 Overview & Problem Statement

The absence of a centralized, accessible digital knowledge repository significantly hampers the adoption of water-saving agricultural and domestic practices across India. Despite proven interventions—such as micro-drip irrigation, rooftop rainwater harvesting, and municipal greywater reuse—the lack of accessible localized data and calculation tools leads to severe over-extraction of groundwater.

**JalGyan** bridges this critical gap through a unified, full-stack three-module web application:
- **Module A (Person 1) — Knowledge Management**: Peer-reviewed technical articles on conservation, dynamic category indexing, curated video manuals, author submission consoles, and full-text search.
- **Module B (Person 2) — Community & Discussion**: Citizen problem-sharing forum, threaded peer discussions, upvote/downvote scoring, bookmarking, and community reporting.
- **Module C (Person 3) — Platform Administration & Water Conservation Calculator**: Role-based administrative dashboard, article editorial reviews, user lifecycle governance, report moderation, immutable audit logging, and a suite of 4 scientific water conservation calculators.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies & Tools |
|---|---|
| **Frontend** | React 18, React Router v6, Vite 6, Lucide React icons, Native Fetch (`apiRequest` wrapper) |
| **Styling** | Custom Responsive Design System CSS (`src/styles.css` & `src/admin.css`) |
| **Backend** | Node.js (ESM), Express.js, RESTful API architecture |
| **ORM & Database**| Prisma ORM 7, PostgreSQL, CUID primary keys, Decimal metrics |
| **Security & Auth**| JWT Bearer Authentication, BCrypt password hashing ($2b$10$), RBAC middleware (`requireAuth`, `requireAdmin`, `optionalAuth`) |
| **Testing** | Automated Node.js integration test suites with zero external test runners |

---

## 💧 Module C: Water Conservation Calculators (Person 3)

The platform provides 4 scientific calculators accessible to guests and registered users at `/calculator`:

### 1. Agriculture Water Requirement Calculator
- **Inputs**: Land area (acres or hectares), Crop type (Paddy, Wheat, Sugarcane, Cotton, Maize, Pulses, Vegetables, Millets, Custom), Irrigation method (Surface/Flood, Sprinkler, Micro-Drip), Seasons per year.
- **Formulas**:
  $$\text{Area}_{\text{m}^2} = \begin{cases} \text{Area} \times 4046.86 & \text{if acres} \\ \text{Area} \times 10000 & \text{if hectares} \end{cases}$$
  $$\text{Net Water (L)} = \text{Area}_{\text{m}^2} \times \text{Crop Depth (mm)}$$
  $$\text{Gross Seasonal Water (L)} = \frac{\text{Net Water}}{\text{Method Efficiency}}$$
  $$\text{Daily Requirement (L/day)} = \frac{\text{Gross Seasonal Water}}{\text{Crop Duration (days)}}$$
- **Assumptions**: Flood efficiency (45%), Sprinkler (75%), Micro-Drip (90%). Crop water depths derived from regional ICAR / Ministry of Jal Shakti benchmarks.

### 2. Drip Irrigation Savings Calculator
- **Inputs**: Land area, Current irrigation method (Surface Flood or Sprinkler), Target Drip efficiency (default 90%), Cropping seasons per year.
- **Formulas**:
  $$\text{Drip Consumption (L)} = \text{Current Usage} \times \left(\frac{\text{Current Efficiency}}{\text{Drip Efficiency}}\right)$$
  $$\text{Water Saved (L)} = \text{Current Consumption} - \text{Drip Consumption}$$
  $$\text{Savings Percentage} = \left(\frac{\text{Water Saved}}{\text{Current Consumption}}\right) \times 100\%$$
- **Assumptions**: Shifting from flood to micro-drip yields approximately 50% net water conservation per cropping season.

### 3. Rooftop Rainwater Harvesting Calculator
- **Inputs**: Rooftop catchment area ($m^2$), Average annual rainfall ($mm$), Runoff collection efficiency ($10\% - 95\%$, default $80\%$).
- **Formula**:
  $$\text{Annual Harvested Water (Litres)} = \text{Roof Area } (m^2) \times \text{Annual Rainfall } (mm) \times \text{Collection Efficiency}$$
  $$\text{Monthly Average (L/month)} = \frac{\text{Annual Harvested Water}}{12}$$
- **Storage Sizing**: Recommended storage tank capacity is estimated at 20% of annual harvest or 25–30 days of household buffer.
- **Assumptions**: 1 mm of rainfall over $1\text{ m}^2$ equals exactly 1 Litre of water. Standard $80\%$ efficiency accounts for first-flush rejection and gutter adhesion.

### 4. Household Water Consumption & Efficiency Calculator
- **Inputs**: Number of household members, Daily bathing (L/person), Toilet flushing (L/person), Laundry (L/day), Kitchen (L/day), Other domestic uses (L/day), Selection of conservation measures.
- **Formulas**:
  $$\text{Daily Baseline (L)} = N \times (\text{Bathing} + \text{Toilet}) + \text{Laundry} + \text{Kitchen} + \text{Other}$$
  $$\text{Annual Baseline (L)} = \text{Daily Baseline} \times 365$$
  $$\text{Daily Savings (L)} = \sum \text{Savings from active conservation measures}$$
- **Measures & Savings**:
  - Low-flow showerheads: 35% reduction in bathing water.
  - Dual-flush toilet cisterns: 40% reduction in flush volume.
  - Aerated sink taps: 25% reduction in kitchen/washbasin tap volume.
  - Greywater recycling: 50% reuse of rinse water for flushing and gardens.
- **Benchmark**: Compared against the CPHEEO urban domestic standard of 135 Litres Per Capita per Day (LPCD).

---

## 🛡️ Administrative Governance & Moderation (Person 3)

1. **Dashboard KPIs (`/admin`)**: Real-time platform metrics, user counts, article counts, community totals, water conservation totals (annual water saved, annual rainwater harvested, calculations breakdown), and recent audit log stream.
2. **Article Moderation (`/admin/articles`)**: Editorial approval/rejection queue with review notes, status transitions (`PENDING_REVIEW` $\to$ `PUBLISHED` / `REJECTED`), and review history tracking.
3. **User Management (`/admin/users`)**: Search, role filtering, suspension/reactivation, role elevation/demotion, and atomic last-active-admin protection.
4. **Report Moderation (`/admin/reports`)**: Incident resolution, target snapshot preservation, dismissal/resolution actions, and content takedown.
5. **Activity & Audit Logs (`/admin/activity`)**: Immutable chronological audit trail recording all administrative mutations with sensitive JSON redaction and date range filtering.

---

## 🔌 API Endpoints Summary

### Authentication (`/api/auth`)
- `POST /api/auth/register` — User registration
- `POST /api/auth/login` — Sign in and issue JWT
- `GET /api/auth/me` — Verify active token and profile

### Water Conservation Calculator (`/api/calculator`)
- `POST /api/calculator/calculate` — Execute and persist water calculation (guest & authenticated)
- `GET /api/calculator/history` — Paginated calculation history (authenticated user)
- `GET /api/calculator/history/:id` — Detail view of saved calculation record

### Platform Administration (`/api/admin`)
- `GET /api/admin/dashboard/stats` — Aggregated platform statistics
- `GET /api/admin/articles/pending` — Pending article moderation queue
- `GET /api/admin/articles/:id` — Article moderation details & history
- `PATCH /api/admin/articles/:id/approve` — Approve pending article
- `PATCH /api/admin/articles/:id/reject` — Reject article with feedback
- `GET /api/admin/users` — Paginated user management list
- `GET /api/admin/users/:id` — User profile & engagement counts
- `PATCH /api/admin/users/:id/suspend` — Suspend user account
- `PATCH /api/admin/users/:id/activate` — Reactivate user account
- `PATCH /api/admin/users/:id/role` — Update user role (ADMIN / USER)
- `GET /api/admin/reports` — Paginated report queue
- `GET /api/admin/reports/:id` — Report detail with target snapshot
- `PATCH /api/admin/reports/:id/resolve` — Resolve report
- `PATCH /api/admin/reports/:id/dismiss` — Dismiss report
- `GET /api/admin/activity` — Paginated immutable audit trail
- `GET /api/admin/activity/summary` — Aggregate audit metrics & active admin count
- `GET /api/admin/activity/:id` — Full audit log record

### Knowledge Management (`/api/articles`, `/api/categories`, `/api/resources`)
- `GET /api/categories` — Category list with article counts
- `GET /api/articles` — Published articles with filters
- `POST /api/articles` — Author submit article
- `GET /api/resources` — Video and manual resource catalog

### Community Forum (`/api/posts`, `/api/comments`, `/api/bookmarks`)
- `GET /api/posts` — Forum discussions
- `POST /api/posts` — Create forum post
- `POST /api/comments` — Add comment to discussion
- `GET /api/bookmarks` — User saved articles

---

## 🚀 Setup & Execution Guide

### Prerequisites
- Node.js (v18.0.0 or higher)
- PostgreSQL (v14 or higher)

### 1. Clone & Configure Environment Variables
```bash
# Frontend environment
cp .env.example .env

# Backend environment
cd server
cp .env.example .env
```

Ensure `server/.env` contains your PostgreSQL connection string:
```ini
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/jalgyan_dev?schema=public"
JWT_SECRET="your_jwt_secret_key"
PORT=5001
ADMIN_EMAIL="admin@jalgyan.org"
ADMIN_PASSWORD="YourSecureAdminPassword123!"
```

### 2. Install Dependencies
```bash
# Install frontend packages (root)
npm install

# Install backend packages
cd server
npm install
cd ..
```

### 3. Initialize Database with Prisma
```bash
cd server
npx prisma generate
npx prisma migrate deploy
node prisma/seed.js
cd ..
```

### 4. Run Automated Test Suites
Execute all automated test suites to verify integrity across all modules:
```bash
# Module C & Overall Platform Test Suites
node server/test_water_calculator.js      # 18 tests (Calculator)
node server/test_frontend_auth.js         # 15 tests (Auth & Guards)
node server/test_admin_dashboard.js        # 10 tests (Admin Dashboard)
node server/test_article_moderation.js     # 16 tests (Article Moderation)
node server/test_user_management.js        # 16 tests (User Governance)
node server/test_report_moderation.js      # 16 tests (Report Moderation)
node server/test_admin_activity.js         # 19 tests (Audit Logs & KPI)
```
*Expected: 110 tests passing across all suites.*

### 5. Build Frontend
```bash
npm run build
```

### 6. Start the Servers
```bash
# Terminal 1 — Start Backend API (Port 5001)
cd server
npm run dev

# Terminal 2 — Start Frontend Application (Port 5173)
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your web browser.

---

## 🎬 Suggested 5-Minute College Demonstration Sequence

| Step | Time | Screen & Route | Action / Discussion Point |
|---|---|---|---|
| **1. Overview** | 0:00 – 0:30 | `/knowledge` | Present the JalGyan mission (Ministry of Jal Shakti), clean green/white UI, and the 3-module system. |
| **2. Knowledge Management** | 0:30 – 1:15 | `/knowledge`, `/articles/:slug`, `/resources` | Filter articles by category (Drip, Rainwater), open an article, show view counter, read time, and attached video resources. |
| **3. Community & Forum** | 1:15 – 2:00 | `/forum`, `/forum/:id` | Browse citizen discussions, show voting, comments, and community report filing. |
| **4. Water Conservation Calculator** | 2:00 – 3:15 | `/calculator` | Demonstrate all 4 calculators: <br>• **Agriculture**: 2.5 acres of Wheat $\to$ calculate gross requirement and drip savings.<br>• **Drip Irrigation**: Compare flood vs drip $\to$ highlight 50% savings.<br>• **Rainwater Harvesting**: Select Delhi (790mm), 120m² roof $\to$ highlight annual yield & tank sizing.<br>• **Household**: 4 members with aerators & dual flush $\to$ show annual domestic water saved.<br>• **History Tab**: Show saved calculations recorded live in the database. |
| **5. Admin Dashboard** | 3:15 – 3:45 | `/admin` | Log in as Administrator. Show real-time KPI cards, and point out how the water conservation numbers aggregate calculations from the calculator. |
| **6. Article Moderation** | 3:45 – 4:15 | `/admin/articles` | Inspect a pending article, review submission details, and approve or reject with reviewer feedback. |
| **7. User Management** | 4:15 – 4:35 | `/admin/users` | Demonstrate search, role filter, user suspension, and show that demoting the last active administrator is blocked. |
| **8. Report Moderation** | 4:35 – 4:50 | `/admin/reports` | Inspect a user report, review the preserved target snapshot, and resolve it. |
| **9. Audit Trail & Wrap-up** | 4:50 – 5:00 | `/admin/activity` | Open the audit logs to show that every action performed during the demo was automatically logged into the immutable audit trail. |

---

## ⚖️ License & Attribution
Developed for the JalGyan College Major Project submission. Shared between Module A, Module B, and Module C project team members.
