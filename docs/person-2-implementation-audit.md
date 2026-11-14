# Person 2 implementation audit

Audit date: 2026-11-13

> The initial findings below record the pre-implementation baseline. The “Final integration status and setup” section at the end supersedes those findings for the current checkout.

## Scope and current state

Person 2 owns authentication/session integration, user profiles, community discussions, comments/replies, post voting, article bookmarks, and user-side reporting. This audit records the current integration baseline. No business features or schema changes were made for this audit.

The working tree was clean before this document was added. The only change in this task is this audit file.

## Findings

### 1. Functionality connected to real APIs

- The shared `apiRequest` helper in `src/services/api.js` calls the configured API base URL (`VITE_API_BASE_URL`, defaulting to `http://localhost:5001/api`), attaches the stored bearer token, serializes JSON bodies, unwraps `{ data }` responses, and surfaces HTTP errors. It clears locally stored credentials after a 401 on non-login routes.
- Login is connected end to end: `Login.jsx` calls `AuthContext.login`, `authService.login` posts to `POST /api/auth/login`, and `authController.login` checks the user/password and account status, creates a JWT, and returns a sanitized user.
- Session verification is connected end to end: `AuthProvider` calls `GET /api/auth/me` on load when a token exists; `requireAuth` re-reads and validates the active user from PostgreSQL and attaches a sanitized user to the request.
- Admin report moderation is connected to real APIs. `adminService` calls the `/api/admin/reports` endpoints for list/detail/resolve/dismiss, and the backend routes are protected by `requireAuth` and `requireAdmin`. This is Person 3's moderation functionality, not user-side report submission.
- Admin user management can expose aggregate post/comment/report counts, but its endpoints are admin-only and should not be used as a profile API.

### 2. Demo data or local-only state

- Registration is only wired on the frontend. `Register.jsx` calls `AuthContext.register`, and `authService.register` posts to `/auth/register`, but no backend registration route/controller exists. As a result, registration cannot complete against this backend.
- `AuthContext` stores the token and a cached user in `localStorage` (`ww_token`, `ww_user`). Login and registration update React state; logout clears it. `updateUser` only updates React/local storage and does not persist profile changes.
- `forumService` imports `demoPosts` and serves a module-level in-memory copy. List, detail, create, vote, and comment operations do not call the backend; created posts/comments and votes are lost on reload. Its vote method only increments a local count and does not represent user-specific vote state.
- `bookmarkService` imports `demoArticles` and holds saved IDs in a module-level array initialized with sample IDs. List/toggle/has are local-only. `Forum.jsx` also initializes local saved IDs to sample values and wires save controls to this service.
- The forum landing page includes static community statistics and popular-topic counts. These are presentation values, not API data.
- `Profile.jsx` displays fixed member-since, discussion, vote, and saved-resource values. Its edit form only updates local auth context/local storage. It does not fetch a profile, persist edits, or load real activity counts.
- `PostDetails.jsx` and the forum components render data through the local `forumService`; comments/replies are not persisted. `CommentSection` can display a replies array but offers no reply-to-comment action. There is no report action in the user-facing forum/profile UI.
- `src/data/demoData.js` supplies the current demo article/post content. Person 2 API work should remove service reliance on its demo data only when real matching endpoints are ready.

### 3. Missing backend endpoints

The mounted API router in `server/src/routes/index.js` currently mounts only `/health`, `/auth`, and `/admin`. `authRoutes.js` contains login and `GET /me` only. There are no user-facing community or article routes.

Missing endpoints for the current UI/responsibilities:

- `POST /api/auth/register` (or another agreed registration route), including safe validation, password hashing, and sanitized response.
- `PATCH /api/auth/me` or `PATCH /api/users/me` to persist editable profile fields. `GET /api/auth/me` already exists for the authenticated current user.
- Forum feed/detail endpoints, e.g. `GET /api/posts`, `GET /api/posts/:id`, and create/update/delete endpoints with ownership checks.
- Comment and reply endpoints, e.g. `POST /api/posts/:id/comments`, `POST /api/comments/:id/replies`, and any needed list/edit/delete operations with ownership checks.
- Post vote endpoint(s), e.g. `PUT`/`DELETE /api/posts/:id/vote`, handling the unique user/post vote and vote counts transactionally.
- User bookmark endpoints for listing and adding/removing saved published articles, scoped to the authenticated user.
- User report submission endpoint, e.g. `POST /api/reports`, validating target type, target existence, and reason. The existing report endpoints are admin moderation endpoints only.
- A user profile/activity summary endpoint (optional if profile counts can be included in `GET /api/auth/me` or composed from other scoped endpoints). Current profile metrics are static.

No current backend endpoint serves the forum feed, post details, comments, votes, user bookmarks, or public/current-user profile edits. No article browse/detail API is mounted in the current route index either; article publishing and moderation data belongs to Person 1/3.

### 4. Existing shared APIs and models to reuse

- Reuse `apiRequest` for new frontend service calls so bearer-token handling and response/error behavior stay consistent. Reuse the existing `authService.me()` and `/api/auth/me` for session refresh/current-user retrieval.
- Reuse the existing `requireAuth` middleware for user-owned operations. It validates JWTs against the current database user and excludes suspended/deleted accounts. Never trust client-supplied user IDs for authorship, votes, bookmarks, or reports; use `req.user.id`.
- Reuse `sanitizeUser` (or explicit Prisma `select`s) for responses. `User.password` is a hash and must never appear in API output.
- Reuse the Person 2 models already present in the shared schema: `User`, `ForumPost`, `Comment`, `Vote`, `Bookmark`, and `Report`; enums include `VoteType`, `ReportReason`, and `ReportTargetType`.
- Existing relationships support user-authored posts/comments, nested comment replies (`Comment.parentId`), one vote per user per post (`Vote @@unique([userId, postId])`), one bookmark per user/article (`Bookmark @@unique([userId, articleId])`), and report targets for post/comment/article/user with snapshots.
- Article bookmarks reference the shared `Article` model. Bookmark listing should select only eligible/published, non-deleted articles and should return a safe article projection. Person 1's article data and endpoints should be consumed, not rewritten.
- Reuse the established response envelope `{ success, data, message? }`, centralized `errorHandler`, existing PostgreSQL Prisma client, and admin report moderation's report-target conventions where appropriate. Do not reuse admin-only routes for user actions.
- The current `adminService`/admin report controller can inform report enum and data shape compatibility, but user submission needs a separate authenticated route/controller and must not accept reporter identity from the request body.

### 5. Ownership boundaries: files to leave unchanged

Treat these as Person 1's article/knowledge implementation and do not modify them as part of Person 2 work:

- Article/category/resource schema and any Person 1-owned article pages, components, services, controllers, routes, tests, and seed data if/when added. In the current checkout, the unified schema's `Category`, `Article`, and `ArticleResource` models are shared schema with Person 1 ownership of the knowledge domain.
- There are no separately mounted Person 1 article API routes or article frontend pages/services in the current file inventory. `src/data/demoData.js` is shared demo content; avoid changing Person 1 article fixtures when replacing Person 2 post fixtures.

Treat these as Person 3's admin/calculator implementation and do not modify them:

- `src/pages/admin/**`, `src/components/admin/**`, `src/admin.css`, `src/services/adminService.js`.
- `server/src/controllers/adminDashboardController.js`, `articleReviewController.js`, `adminActivityController.js`, `reportModerationController.js`, `userManagementController.js`.
- `server/src/routes/adminRoutes.js`, `server/src/middleware/adminMiddleware.js`.
- Unified-schema `ArticleReview`, `AdminAction`, and `WaterCalculation` models and their migrations/tests.

Shared integration surfaces need narrowly scoped edits only when required: `server/prisma/schema.prisma` (shared; this task must not change it), `server/src/routes/index.js`, common auth middleware/controller/routes, `src/App.jsx`, `src/context/AuthContext.jsx`, `src/services/api.js`, `src/styles.css`, and shared `User` model fields/relations. Coordinate before changing shared schema or another person's module. Existing report moderation controller is owned by Person 3 and should remain untouched when adding user report submission.

## Proposed 20-commit implementation map

This is a suggested sequencing map for future Person 2 implementation commits, not a record of commits already made. Keep each commit focused and avoid folding Person 1/3 work into it.

| # | Commit focus | Existing codebase touchpoints | Integration boundary |
|---:|---|---|---|
| 1 | Add backend registration | `server/src/controllers/authController.js`, `server/src/routes/authRoutes.js`, existing auth tests | Reuse `User`, bcrypt, JWT and `sanitizeUser`; no schema change expected. |
| 2 | Complete auth form validation/feedback | `src/pages/Register.jsx`, `src/services/authService.js` | Match backend validation and response envelope. |
| 3 | Harden auth context/session lifecycle | `src/context/AuthContext.jsx`, `src/hooks/useAuth.js`, auth tests | Preserve token keys and existing `GET /auth/me`; avoid leaking password data. |
| 4 | Persist current-user profile edits | Auth/user controller and routes, `src/services/authService.js` or a focused profile service, `src/pages/Profile.jsx` | Update only allowlisted profile fields for `req.user.id`. |
| 5 | Return real profile activity metrics | Profile controller/route and `src/pages/Profile.jsx` | Aggregate from existing Person 2 relations; replace hard-coded values. |
| 6 | Add paginated/filterable forum feed API | New Person 2 post controller/routes; `server/src/routes/index.js`; `src/services/forumService.js` | Use `ForumPost`; select safe author fields; exclude soft-deleted posts/users. |
| 7 | Add forum post detail API | Post controller/routes; `src/services/forumService.js`; `src/pages/PostDetails.jsx` | Return comments/replies and aggregate fields from existing relations. |
| 8 | Create discussions through API | Post controller/routes; `src/services/forumService.js`; `CreatePostForm.jsx`, `Forum.jsx` | Set author from `req.user.id`, validate/sanitize fields. |
| 9 | Edit/delete own discussions | Post controller/routes; `PostCard.jsx`, detail UI | Enforce backend ownership and soft-delete behavior. |
| 10 | Add comments and nested replies | Comment controller/routes; `CommentSection.jsx`, `PostDetails.jsx`, forum service | Use `Comment.parentId`; enforce post/parent consistency and ownership. |
| 11 | Add post voting API | Vote controller/routes; forum service; `PostCard.jsx`, `PostDetails.jsx` | Use unique `[userId, postId]`; calculate counts/score safely. |
| 12 | Expose current vote state in feed/detail | Post read controller and Person 2 UI/service | Derive per-user state only for authenticated user; retain safe guest reads if desired. |
| 13 | Add article bookmark list API | Bookmark controller/routes; `src/services/bookmarkService.js`; `src/pages/Bookmarks.jsx` | Join existing `Bookmark` and Person 1 `Article`, filter published/non-deleted. |
| 14 | Add bookmark add/remove API | Bookmark controller/routes; bookmark service; article bookmark UI integration | Scope mutations to `req.user.id`, rely on unique constraint/idempotent behavior. |
| 15 | Replace forum demo service with API service | `src/services/forumService.js`, `src/pages/Forum.jsx`, `src/pages/PostDetails.jsx` | Remove module-level in-memory production behavior once API is available. |
| 16 | Replace bookmark demo/local state | `src/services/bookmarkService.js`, `src/pages/Bookmarks.jsx`, forum/article bookmark controls | Remove sample IDs and use authenticated persisted state. |
| 17 | Add user-side report submission | New Person 2 report controller/routes; `server/src/routes/index.js`; forum UI | Create `Report` with reporter from `req.user.id`; preserve admin moderation API ownership. |
| 18 | Add report affordances and feedback | Person 2 post/comment/article UI components | Use valid schema enums and submit only target/reason/description. |
| 19 | Add authorization, validation, and API regression coverage | Focused Person 2 backend/frontend tests | Exercise ownership, invalid payloads, missing/suspended users, and secret exclusion. |
| 20 | Integration cleanup and end-to-end verification | Person 2 services/pages/routes/tests and this audit | Remove remaining Person 2 demo paths, confirm app build and API contracts; no Person 1/3 changes. |

The exact route naming and whether to split profile endpoints from `/auth/me` should be confirmed against the team's API conventions before implementation. Any required schema change must be coordinated because `schema.prisma` is shared.

## Existing route inventory relevant to the audit

- `POST /api/auth/login` — public login.
- `GET /api/auth/me` — authenticated current-user session/profile projection.
- `GET /api/admin/verify` — admin-only authorization check.
- `GET /api/admin/reports`, `GET /api/admin/reports/:id`, `PATCH /api/admin/reports/:id/resolve`, `PATCH /api/admin/reports/:id/dismiss` — admin-only report moderation.
- Other mounted `/api/admin/**` routes cover Person 3 dashboard, article moderation, user management, and admin activity. There are no mounted current-user forum, bookmark, profile-update, or report-submission routes.

## Verification

- Frontend build: run as part of this audit; result is recorded in the task response.
- No backend tests, lint commands, or business-feature tests were run because this task requested an audit and frontend build only.

## Final integration status and setup

Implementation review date: 2026-11-14

### Current Person 2 integration

The frontend uses the shared `apiRequest` client and the mounted backend routes. Protected API calls use the `ww_token` bearer token. Responses use `{ success, data, message? }`; `apiRequest` unwraps `data`.

| Area | Current API integration |
|---|---|
| Authentication | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`; `AuthProvider` validates a stored token on startup and stores the server-returned user. Logout clears `ww_token` and `ww_user` locally; there is no server-side JWT revocation endpoint. |
| Profile | `PATCH /api/auth/me` updates only name, location, and bio. `GET /api/auth/me/activity` returns post, comment/reply, bookmark, and vote counts scoped to the authenticated user. |
| Forum | `GET /api/posts` supports pagination, search, category, and sort; `GET /api/posts/:id` returns details, comments/replies, totals, and current vote state. Create, comment, vote, edit, and soft-delete APIs are mounted. |
| Bookmarks | `GET /api/bookmarks`, `POST /api/bookmarks/:articleId`, and `DELETE /api/bookmarks/:articleId` use the existing Bookmark/Article relations and current authenticated user. The saved-resources page lists and removes bookmarks. |
| Reports | `POST /api/reports` accepts target type/id, schema enum reason, and optional description. User UI currently submits reports for forum posts and comments/replies. |

The original `demoPosts` fixture is no longer imported and has been removed. The Person 1 `demoArticles` fixture remains untouched. The unused cached-user parser in `AuthContext` was removed; cached user data is not used to restore authentication.

### API contracts and remaining integration gaps

- Registration accepts `{ name, email, password, location? }`; login accepts `{ email, password }`. Auth responses include `{ token, user }`; password hashes are omitted.
- Forum creation accepts `{ title, body, category, tags? }`. Comment creation accepts `{ text, parentId? }`; reply targets must be top-level comments, so replies are one level deep.
- Voting accepts `{ type: "UPVOTE" | "DOWNVOTE" }`; repeat same vote toggles it off. Feed/detail return `currentUserVote` as the caller's vote or `null`.
- Report submission accepts `{ targetType, targetId, reason, description? }`; allowed target types are `POST`, `COMMENT`, `ARTICLE`, and `USER`, and reasons are `SPAM`, `HARASSMENT`, `MISINFORMATION`, `INAPPROPRIATE`, and `OTHER`.
- Article bookmark add/remove service methods exist, but this frontend has no article listing/detail page or bookmark button to call them. The saved-resources screen can remove bookmarks.
- Article and user report target types have backend support but no corresponding user-facing article or public profile/author surfaces in this frontend.
- Forum APIs support editing/deleting a user's discussion and the service exposes update/remove methods, but the current forum UI has no edit/delete controls.
- Comment APIs support author-only edit/delete, but the frontend has no comment edit/delete controls or service methods for those actions.
- There is no configured frontend test runner or browser test suite. The production build is the available frontend verification.

### Environment variables

Backend configuration is loaded from `server/.env` (see `server/.env.example`):

- `DATABASE_URL` — PostgreSQL connection string.
- `PORT` — backend HTTP port; defaults to `5001`.
- `NODE_ENV` — set to `production` for production behavior.
- `CLIENT_URL` — allowed frontend CORS origin.
- `JWT_SECRET` — required when `NODE_ENV=production`; use a strong, privately managed random secret. Never use the development fallback in production.
- `JWT_EXPIRES_IN` — JWT expiry duration; defaults to `7d`.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` — seed configuration. Configure a strong secret `ADMIN_PASSWORD` before any production seed run. The current Person 3 config still has a known default-password fallback; see cross-owner issue below.

The frontend reads `VITE_API_BASE_URL` from the repository-root `.env` (see `.env.example`). Set it to the backend API base, such as `http://localhost:5001/api` for local development.

### Local setup commands

1. Create a PostgreSQL database using a PostgreSQL administration tool. For example, with `psql`:

   ```sql
   CREATE DATABASE jalgyan_db;
   ```

2. Configure `server/.env` from the provided example and set `DATABASE_URL` to the created database. Set `JWT_SECRET` and `ADMIN_PASSWORD` explicitly before production use.
3. Install backend dependencies and apply the committed migration, then generate the Prisma client:

   ```sh
   cd server
   npm install
   npx prisma migrate deploy
   npx prisma generate
   ```

   `migrate deploy` applies migrations already in `server/prisma/migrations`; this setup does not use `db push` or reset migrations.
4. Start the backend from `server/`:

   ```sh
   npm run dev
   ```

   `npm start` runs the same server without nodemon. Run `npm run seed` only when seed data is desired and the admin password risk below has been addressed/configured.
5. In the repository root, install frontend dependencies, copy `.env.example` to `.env`, set `VITE_API_BASE_URL`, and start Vite:

   ```sh
   npm install
   npm run dev
   ```

   Run `npm run build` at the root for a production frontend build.

### Person 2 regression commands

From `server/`, run the standalone HTTP tests (most stub Prisma and do not require PostgreSQL):

```sh
node test_registration.js
node test_auth_middleware.js
node test_production_error_sanitization.js
node test_production_jwt_secret.js
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

The server package does not define an aggregate `test` script. `test_frontend_auth.js` and admin moderation tests use live database/admin credentials and cannot be treated as mocked coverage.

### Cross-owner issues and verification limits

- **Person 3 — `server/src/config/env.js` and `server/prisma/seed.js`:** `config.adminPassword` falls back to a known password, so the seed's `if (!rawAdminPassword)` guard does not protect a fresh database when `ADMIN_PASSWORD` is unset. This can create a default-credential admin account. Set a strong `ADMIN_PASSWORD` before seeding; Person 3 should remove the fallback/require an explicit production value. This implementation task left admin configuration and seed code unchanged.
- **Person 1 — article integration surface:** the current repository has no user-facing article page/card/service integration point. Person 1 should provide or identify one before Person 2 can attach bookmark and ARTICLE-report buttons without changing article ownership files.
- PostgreSQL was unavailable during the final review: the configured database `shivamsirsat` does not exist. Therefore no live persistence or full database-backed end-to-end verification is claimed. The Person 2 HTTP tests use stubbed Prisma.
- `test_frontend_auth.js` could not run its auth integration because `ADMIN_PASSWORD` is absent from `server/.env`. `test_report_moderation.js` failed before creating records because PostgreSQL returned Prisma `P1003` (database does not exist).
- No frontend test runner or browser-level tests are configured. Frontend verification consists of the Vite production build and static review.
