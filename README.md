# JalGyan (WaterWise India)

JalGyan is a full-stack water-conservation knowledge and community platform. It brings together practical articles and resources, community discussions, water-use calculators, and administrative tools for managing platform content and accounts.

## Contents

- [Features](#features)
- [Technology](#technology)
- [Repository layout](#repository-layout)
- [Requirements](#requirements)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Run the application](#run-the-application)
- [Routes and API](#routes-and-api)
- [Database and seed data](#database-and-seed-data)
- [Tests and checks](#tests-and-checks)
- [Internationalization](#internationalization)
- [Security notes](#security-notes)
- [Project documentation](#project-documentation)

## Features

### Knowledge and resources

- Browse, search, sort, and filter published water-conservation articles.
- Read article detail pages and browse related articles and learning resources.
- Submit, edit, and manage authored articles, including draft and review flows.
- Browse videos, manuals, datasets, and other resources associated with water topics.
- Bookmark articles for later.

### Community

- Browse public community discussions and open discussion details.
- Authenticated users can create, edit, and soft-delete their own posts.
- Add comments and nested replies, with author-only editing and soft deletion.
- Vote on discussions. Each user can upvote or downvote a post; submitting the same vote again removes it.
- View discussion vote totals and the current user's vote state.
- Edit profile details and view activity counts for posts, comments, votes, and bookmarks.
- Submit reports about supported content targets for administrator review.

### Water-use calculators

The calculator page supports four calculation types:

- Agriculture water requirements
- Drip-irrigation savings
- Rooftop rainwater harvesting
- Household water consumption and conservation measures

Calculation requests can be made by guests or signed-in users. Signed-in users can view their own saved calculation history.

### Administration

Administrator-only routes provide:

- Dashboard metrics and water-calculation summaries.
- Article review and approval/rejection workflows.
- User search, role changes, suspension, and reactivation.
- Report review, resolution, and dismissal.
- Administrative activity and audit-log views.

### Multilingual interface

The frontend includes English and eight Indian languages: Hindi, Marathi, Bengali, Telugu, Tamil, Gujarati, Kannada, and Urdu. The navbar selector changes the interface language immediately and saves the selection in browser `localStorage`. Urdu switches the document to right-to-left direction. User-generated posts, comments, and database article content remain in their authored language.

## Technology

| Area | Technologies |
|---|---|
| Frontend | React 18, React Router 6, Vite 6, i18next, react-i18next |
| UI | Project CSS in `src/styles.css` and `src/admin.css`; Lucide React icons |
| Backend | Node.js (ES modules), Express 4 |
| Database | PostgreSQL, Prisma 7, `pg` driver adapter |
| Authentication | JWT bearer tokens, bcryptjs password hashing, role middleware |
| Server tests | Standalone Node.js scripts under `server/test_*.js` |

## Repository layout

```text
.
├── src/
│   ├── components/       # Shared, forum, and admin UI components
│   ├── context/          # Authentication/session context
│   ├── hooks/            # Shared React hooks
│   ├── i18n/              # i18next config and locale JSON files
│   ├── pages/             # Knowledge, community, calculator, and admin pages
│   └── services/          # Frontend API clients
├── server/
│   ├── prisma/            # Shared Prisma schema, migrations, and seed script
│   ├── src/
│   │   ├── config/        # Environment and database setup
│   │   ├── controllers/  # API request handlers
│   │   ├── middleware/   # Authentication, authorization, and error handling
│   │   └── routes/       # Express route definitions
│   └── test_*.js          # Standalone backend test scripts
└── docs/                  # Module and implementation documentation
```

The database schema is shared across the knowledge, community, and administration modules. See `server/prisma/schema.prisma` for the models and relations.

## Requirements

- Node.js **20.19+, 22.12+, or 24+** (required by the installed Prisma 7 version).
- npm.
- PostgreSQL for running the backend and database-backed features.

## Local setup

1. Install frontend and backend dependencies from the repository root:

   ```bash
   npm install
   cd server
   npm install
   cd ..
   ```

2. Create local environment files from the examples:

   ```bash
   cp .env.example .env
   cp server/.env.example server/.env
   ```

3. Edit `server/.env` and set a PostgreSQL connection string, a strong JWT secret, and local administrator credentials. Do not use production or shared database credentials for local development.

4. Create a local development database, then generate the Prisma client and apply the checked-in migrations:

   ```bash
   cd server
   npx prisma generate
   npx prisma migrate deploy
   cd ..
   ```

5. Optionally seed the local development database:

   ```bash
   cd server
   node prisma/seed.js
   cd ..
   ```

The seed script upserts sample conservation categories, articles, resources, and the configured administrator. Run it only against a local development database whose contents you are comfortable updating.

## Environment variables

### Frontend (`.env` in the repository root)

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL used by the frontend API client | `http://localhost:5001/api` |

### Backend (`server/.env`)

| Variable | Purpose | Default / example |
|---|---|---|
| `PORT` | Express server port | `5001` |
| `NODE_ENV` | Runtime mode | `development` |
| `CLIENT_URL` | Allowed browser origin for CORS | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string | Set this for your local database |
| `JWT_SECRET` | Secret used to sign and verify JWTs | Required explicitly in production |
| `JWT_EXPIRES_IN` | JWT lifetime | `7d` |
| `ADMIN_EMAIL` | Administrator email used by the seed script | `admin@jalgyan.org` |
| `ADMIN_PASSWORD` | Administrator password used by the seed script | Set a strong local value |

The backend loads `server/.env`. The root `.env` and `server/.env` files are ignored by Git; keep secrets out of source control.

## Run the application

Start the backend and frontend in separate terminals from the repository root:

```bash
# Terminal 1: Express API
cd server
npm run dev
```

```bash
# Terminal 2: Vite frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The API health endpoint is [http://localhost:5001/api/health](http://localhost:5001/api/health).

Available root scripts:

```bash
npm run dev       # Start Vite development server
npm run build     # Create the production frontend build in dist/
npm run preview   # Preview the production build locally
```

The backend package provides `npm start` and `npm run dev`. It does not define an `npm run seed` script; use the `node prisma/seed.js` command above from `server/`.

## Routes and API

The frontend routes are declared in `src/App.jsx`. Unknown frontend routes redirect to `/knowledge`.

| Frontend path | Access | Purpose |
|---|---|---|
| `/knowledge`, `/articles` | Public | Knowledge library |
| `/articles/:slug` | Public | Article detail |
| `/resources` | Public | Educational resource library |
| `/articles/submit`, `/articles/edit/:id`, `/my-articles` | Signed in | Article author tools |
| `/forum`, `/forum/:id` | Public browsing; signed-in actions | Community discussion feed and details |
| `/profile`, `/bookmarks` | Signed in | Profile, activity, and saved articles |
| `/calculator` | Public | Water-use calculators and signed-in history |
| `/login`, `/register` | Public | Authentication |
| `/admin/*` | Administrator | Administration tools |

The API is mounted under `/api`. Authenticated requests use `Authorization: Bearer <token>`. Responses generally use `{ "success": true, "data": ..., "message?": ... }`; errors use an appropriate HTTP status and an error message.

### Health and authentication

| Method | Endpoint | Access |
|---|---|---|
| `GET` | `/api/health` | Public |
| `POST` | `/api/auth/register` | Public |
| `POST` | `/api/auth/login` | Public |
| `GET` | `/api/auth/me` | Signed in |
| `PATCH` | `/api/auth/me` | Signed in; update own profile |
| `GET` | `/api/auth/me/activity` | Signed in; own activity metrics |

### Knowledge and resources

| Method | Endpoint | Access |
|---|---|---|
| `GET` | `/api/categories`, `/api/categories/:slug` | Public |
| `POST` | `/api/categories` | Administrator |
| `GET` | `/api/articles` | Public; optional authentication |
| `GET` | `/api/articles/my` | Signed in |
| `GET` | `/api/articles/:slugOrId` | Public; optional authentication |
| `POST` | `/api/articles` | Signed in |
| `PUT`, `PATCH` | `/api/articles/:id` | Signed in; ownership is checked |
| `PATCH` | `/api/articles/:id/submit` | Signed in; ownership is checked |
| `DELETE` | `/api/articles/:id` | Signed in; ownership is checked |
| `POST` | `/api/articles/:id/resources` | Signed in; ownership is checked |
| `DELETE` | `/api/articles/:id/resources/:resourceId` | Signed in; ownership is checked |
| `GET` | `/api/resources` | Public |

### Community and bookmarks

| Method | Endpoint | Access |
|---|---|---|
| `GET` | `/api/posts` | Public; optional authentication for vote state |
| `GET` | `/api/posts/:id` | Public; optional authentication for vote state |
| `POST` | `/api/posts` | Signed in |
| `PATCH`, `DELETE` | `/api/posts/:id` | Signed in; author only |
| `POST` | `/api/posts/:id/comments` | Signed in |
| `POST` | `/api/posts/:id/vote` | Signed in |
| `PATCH`, `DELETE` | `/api/comments/:id` | Signed in; comment author only |
| `GET` | `/api/bookmarks` | Signed in; own bookmarks |
| `POST`, `DELETE` | `/api/bookmarks/:articleId` | Signed in; own bookmarks |
| `POST` | `/api/reports` | Signed in; submit a user report |

### Calculator and administration

| Method | Endpoint | Access |
|---|---|---|
| `POST` | `/api/calculator/calculate` | Public; optional authentication associates calculation with user |
| `GET` | `/api/calculator/history` | Signed in; own history |
| `GET` | `/api/calculator/history/:id` | Signed in; own record |
| `GET` | `/api/admin/verify` | Administrator |
| `GET` | `/api/admin/dashboard/stats` | Administrator |
| `GET` | `/api/admin/articles/pending` | Administrator |
| `GET` | `/api/admin/articles/:id` | Administrator |
| `GET` | `/api/admin/articles/:id/reviews` | Administrator |
| `PATCH` | `/api/admin/articles/:id/approve`, `/api/admin/articles/:id/reject` | Administrator |
| `GET` | `/api/admin/users`, `/api/admin/users/:id` | Administrator |
| `PATCH` | `/api/admin/users/:id/suspend`, `/api/admin/users/:id/activate`, `/api/admin/users/:id/role` | Administrator |
| `GET` | `/api/admin/reports`, `/api/admin/reports/:id` | Administrator |
| `PATCH` | `/api/admin/reports/:id/resolve`, `/api/admin/reports/:id/dismiss` | Administrator |
| `GET` | `/api/admin/activity`, `/api/admin/activity/summary`, `/api/admin/activity/:id` | Administrator |

Authorization is enforced by backend middleware and ownership checks. Client-provided user IDs are not the authority for user-owned operations.

## Database and seed data

The PostgreSQL schema is in `server/prisma/schema.prisma`. It defines shared identity and role models, articles and categories, forum posts and nested comments, votes, bookmarks, reports, review/audit records, and water calculations. The migration history is under `server/prisma/migrations/`.

The application uses Prisma with the PostgreSQL driver adapter. To inspect schema changes locally, use Prisma commands from `server/`; do not edit or apply schema changes to a shared database without coordinating with the project owners.

## Tests and checks

There is no root `npm test` script or consolidated test runner. Backend checks are standalone Node scripts in `server/`, including coverage for authentication, profile, forum, comments, voting, bookmarks, reports, article workflows, calculator, and administration.

Examples:

```bash
cd server
node test_registration.js
node test_profile_update.js
node test_profile_activity.js
node test_forum_feed.js
node test_forum_post_detail.js
node test_forum_post_create.js
node test_forum_post_update_delete.js
node test_forum_comments.js
node test_forum_votes.js
node test_forum_vote_state.js
node test_bookmarks_list.js
node test_bookmark_mutations.js
node test_report_submission.js
```

Additional scripts cover admin workflows, article CRUD/moderation, water calculations, auth middleware, and production error/JWT handling. Test setup varies: some scripts stub or replace Prisma operations, while others require a configured database, administrator credentials, or a local API port. Inspect a script before running it. Do not point tests at production or a shared database. This repository currently has no dedicated `TEST_DATABASE_URL`-guarded PostgreSQL integration-test command.

Build the frontend with:

```bash
npm run build
```

## Internationalization

- i18next configuration: `src/i18n/index.js`.
- Locale dictionaries: `src/i18n/locales/{en,hi,mr,bn,te,ta,gu,kn,ur}.json`.
- English is the default and fallback language.
- The navbar selector uses native-script language names.
- The selected code is stored under `jalgyan.language` in `localStorage`.
- Urdu sets `<html dir="rtl">`; other supported languages set `<html dir="ltr">`.
- Dynamic database content and user-generated content are not translated automatically.

When adding a user-facing interface string, add the same key with a non-empty value to every locale file. Keep backend/API enum values and user-generated text unchanged unless the UI explicitly renders a translated display label.

## Security notes

- Never commit `.env` files, database credentials, JWT secrets, or administrator passwords.
- Configure a strong `JWT_SECRET` in production; the server refuses to start in production without one.
- Use a dedicated local development database for migrations, seed data, and tests.
- API handlers should derive user identity from the authenticated request and return sanitized user projections.
- Admin routes require authenticated administrator authorization.

## Project documentation

- [Person 1: Knowledge Management](docs/MODULE_A_KNOWLEDGE_MANAGEMENT.md)
- [Person 2: Implementation audit and commit map](docs/person-2-implementation-audit.md)
