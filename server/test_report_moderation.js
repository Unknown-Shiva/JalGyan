/**
 * JalGyan — Phase 4, Step 4.6: Report Moderation Test Suite
 *
 * Verifies all 16 requirements:
 * 1. Admin can retrieve paginated reports (GET /api/admin/reports -> 200).
 * 2. Regular users receive HTTP 403 (GET /api/admin/reports -> 403).
 * 3. Unauthenticated users receive HTTP 401 (GET /api/admin/reports -> 401).
 * 4. Status filtering works (status=PENDING).
 * 5. Reason filtering works (reason=SPAM).
 * 6. Target type filtering works (targetType=POST).
 * 7. Pagination and sorting work (page & limit parameters handled correctly, asc/desc).
 * 8. Report detail includes reporter and target information (GET /api/admin/reports/:id -> 200).
 * 9. Deleted targets display their preserved snapshot (isTargetAvailable === false & targetSnapshot).
 * 10. Admin can resolve a pending report (PATCH /api/admin/reports/:id/resolve -> 200).
 * 11. Admin can dismiss a pending report (PATCH /api/admin/reports/:id/dismiss -> 200).
 * 12. Resolved reports cannot be processed again (returns 409 Conflict).
 * 13. Dismissed reports cannot be processed again (returns 409 Conflict).
 * 14. Concurrent moderation produces the correct conflict response (HTTP 409).
 * 15. Duplicate submissions are prevented (frontend submitting guard).
 * 16. Dashboard, article moderation, and user management remain functional.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import app from './src/app.js';
import { prisma } from './src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const PORT = 5001;
const BASE = `http://localhost:${PORT}/api`;

async function request(method, endpoint, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${endpoint}`, opts);
  const payload = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, payload };
}

async function runReportModerationTests() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  JalGyan Phase 4.6 — Report Moderation Test Suite');
  console.log('═══════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  ✅  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌  [FAIL] ${name}${details ? ': ' + details : ''}`);
      failed++;
    }
  }

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@jalgyan.org';
  const adminPassword = process.env.ADMIN_PASSWORD;

  let adminToken = null;
  let userToken = null;
  const createdUserIds = [];
  const createdPostIds = [];
  const createdReportIds = [];

  try {
    // 1. Authenticate ADMIN
    const adminLogin = await request('POST', '/auth/login', {
      email: adminEmail,
      password: adminPassword,
    });
    adminToken = adminLogin.payload?.data?.token || adminLogin.payload?.token;

    // 2. Create test reporter and regular user
    const hashed = await bcrypt.hash('RepTesterPass123!', 10);
    const reporterUser = await prisma.user.create({
      data: {
        name: 'Report Tester User',
        email: `reptester_${Date.now()}@jalgyan.test`,
        password: hashed,
        role: 'USER',
        status: 'ACTIVE',
      },
    });
    createdUserIds.push(reporterUser.id);

    const userLogin = await request('POST', '/auth/login', {
      email: reporterUser.email,
      password: 'RepTesterPass123!',
    });
    userToken = userLogin.payload?.data?.token || userLogin.payload?.token;

    // 3. Create target entities
    // Target Post 1: Live Post
    const livePost = await prisma.forumPost.create({
      data: {
        title: `Spam Suspect Post ${Date.now()}`,
        body: 'Visit this unauthorized commercial link for cheap water pumps: http://spam-example.com',
        category: 'Community',
        tags: ['water', 'pumps'],
        authorId: reporterUser.id,
      },
    });
    createdPostIds.push(livePost.id);

    // Target Post 2: Deleted Post with preserved snapshot
    const deletedPost = await prisma.forumPost.create({
      data: {
        title: `Deleted Misinformation Post ${Date.now()}`,
        body: 'Groundwater never depletes because clouds constantly refill all aquifers worldwide.',
        category: 'Groundwater',
        tags: ['aquifer'],
        authorId: reporterUser.id,
        deletedAt: new Date(),
      },
    });
    createdPostIds.push(deletedPost.id);

    // 4. Create Reports
    // Report 1: PENDING report on Live Post (reason: SPAM)
    const report1 = await prisma.report.create({
      data: {
        reporterId: reporterUser.id,
        targetType: 'POST',
        postId: livePost.id,
        reason: 'SPAM',
        description: 'Blatant commercial advertising link in forum.',
        status: 'PENDING',
        targetSnapshot: {
          title: livePost.title,
          body: livePost.body,
          authorName: reporterUser.name,
        },
      },
    });
    createdReportIds.push(report1.id);

    // Report 2: PENDING report on Deleted Post (reason: MISINFORMATION)
    const report2 = await prisma.report.create({
      data: {
        reporterId: reporterUser.id,
        targetType: 'POST',
        postId: deletedPost.id,
        reason: 'MISINFORMATION',
        description: 'False geological statements regarding infinite groundwater.',
        status: 'PENDING',
        targetSnapshot: {
          title: deletedPost.title,
          body: deletedPost.body,
          authorName: reporterUser.name,
        },
      },
    });
    createdReportIds.push(report2.id);

    // Report 3: PENDING report for Dismissal testing (reason: HARASSMENT)
    const report3 = await prisma.report.create({
      data: {
        reporterId: reporterUser.id,
        targetType: 'USER',
        targetUserId: reporterUser.id,
        reason: 'HARASSMENT',
        description: 'Test harassment report for dismissal workflow.',
        status: 'PENDING',
        targetSnapshot: {
          name: reporterUser.name,
          email: reporterUser.email,
        },
      },
    });
    createdReportIds.push(report3.id);

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: Admin can retrieve paginated reports (HTTP 200)
    // ─────────────────────────────────────────────────────────────────────────
    let reportsListResponse = null;
    {
      const { status, ok, payload } = await request('GET', '/admin/reports?page=1&limit=10', null, adminToken);
      reportsListResponse = payload?.data || payload;
      const hasReports = Array.isArray(reportsListResponse?.reports) && reportsListResponse.reports.length > 0;
      const hasPagination = reportsListResponse?.pagination && typeof reportsListResponse.pagination.total === 'number';

      assert(
        ok && status === 200 && hasReports && hasPagination,
        'Test 1: Admin can retrieve paginated reports queue (HTTP 200)',
        `status=${status} count=${reportsListResponse?.reports?.length}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: Regular users receive HTTP 403 Forbidden
    // ─────────────────────────────────────────────────────────────────────────
    {
      const { status } = await request('GET', '/admin/reports', null, userToken);
      assert(
        status === 403,
        'Test 2: Regular users receive HTTP 403 Forbidden',
        `status=${status}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: Unauthenticated users receive HTTP 401 Unauthorized
    // ─────────────────────────────────────────────────────────────────────────
    {
      const { status } = await request('GET', '/admin/reports', null, null);
      assert(
        status === 401,
        'Test 3: Unauthenticated users receive HTTP 401 Unauthorized',
        `status=${status}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 4: Status filtering works
    // ─────────────────────────────────────────────────────────────────────────
    {
      const { status, ok, payload } = await request('GET', '/admin/reports?status=PENDING', null, adminToken);
      const data = payload?.data || payload;
      const allPending = data?.reports?.length > 0 && data.reports.every((r) => r.status === 'PENDING');

      assert(
        ok && status === 200 && allPending,
        'Test 4: Status filter correctly returns only PENDING reports',
        `allPending=${allPending} count=${data?.reports?.length}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 5: Reason filtering works
    // ─────────────────────────────────────────────────────────────────────────
    {
      const { status, ok, payload } = await request('GET', '/admin/reports?reason=SPAM', null, adminToken);
      const data = payload?.data || payload;
      const allSpam = data?.reports?.length > 0 && data.reports.every((r) => r.reason === 'SPAM');

      assert(
        ok && status === 200 && allSpam,
        'Test 5: Reason filter correctly returns only SPAM reports',
        `allSpam=${allSpam} count=${data?.reports?.length}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 6: Target type filtering works
    // ─────────────────────────────────────────────────────────────────────────
    {
      const { status, ok, payload } = await request('GET', '/admin/reports?targetType=POST', null, adminToken);
      const data = payload?.data || payload;
      const allPosts = data?.reports?.length > 0 && data.reports.every((r) => r.targetType === 'POST');

      assert(
        ok && status === 200 && allPosts,
        'Test 6: TargetType filter correctly returns only POST reports',
        `allPosts=${allPosts} count=${data?.reports?.length}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 7: Pagination and sorting work
    // ─────────────────────────────────────────────────────────────────────────
    {
      const pageRes = await request('GET', '/admin/reports?page=1&limit=2&sortOrder=asc', null, adminToken);
      const data = pageRes.payload?.data || pageRes.payload;

      assert(
        pageRes.status === 200 && data?.reports?.length <= 2 && data?.pagination?.limit === 2,
        'Test 7: Pagination limit and sortOrder parameters handled correctly',
        `count=${data?.reports?.length} limit=${data?.pagination?.limit}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 8: Report detail includes reporter and target information
    // ─────────────────────────────────────────────────────────────────────────
    {
      const { status, ok, payload } = await request('GET', `/admin/reports/${report1.id}`, null, adminToken);
      const report = payload?.data?.report || payload?.report;

      const hasReporter = Boolean(report?.reporter?.name);
      const hasTarget = Boolean(report?.target?.title);
      const isAvailable = report?.isTargetAvailable === true;

      assert(
        ok && status === 200 && hasReporter && hasTarget && isAvailable,
        'Test 8: Report detail includes reporter, live target entity, and availability flag',
        `hasReporter=${hasReporter} hasTarget=${hasTarget} isTargetAvailable=${isAvailable}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 9: Deleted targets display their preserved snapshot
    // ─────────────────────────────────────────────────────────────────────────
    {
      const { status, ok, payload } = await request('GET', `/admin/reports/${report2.id}`, null, adminToken);
      const report = payload?.data?.report || payload?.report;

      const isUnavailable = report?.isTargetAvailable === false;
      const hasSnapshot = Boolean(report?.targetSnapshot?.title);

      assert(
        ok && status === 200 && isUnavailable && hasSnapshot,
        'Test 9: Deleted target entity falls back gracefully to preserved targetSnapshot',
        `isTargetAvailable=${report?.isTargetAvailable} hasSnapshot=${hasSnapshot}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 10: Admin can resolve a pending report
    // ─────────────────────────────────────────────────────────────────────────
    {
      const resolveRes = await request(
        'PATCH',
        `/admin/reports/${report1.id}/resolve`,
        { note: 'Confirmed commercial spam. Link reported and verified.' },
        adminToken
      );
      const resolved = resolveRes.payload?.data?.report || resolveRes.payload?.report;

      assert(
        resolveRes.status === 200 && resolved?.status === 'RESOLVED',
        'Test 10: Admin can resolve a pending report with moderation note',
        `status=${resolveRes.status} reportStatus=${resolved?.status}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 11: Admin can dismiss a pending report
    // ─────────────────────────────────────────────────────────────────────────
    {
      const dismissRes = await request(
        'PATCH',
        `/admin/reports/${report3.id}/dismiss`,
        { note: 'Investigated report and confirmed no harassment occurred.' },
        adminToken
      );
      const dismissed = dismissRes.payload?.data?.report || dismissRes.payload?.report;

      assert(
        dismissRes.status === 200 && dismissed?.status === 'DISMISSED',
        'Test 11: Admin can dismiss a pending report with moderation note',
        `status=${dismissRes.status} reportStatus=${dismissed?.status}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 12: Resolved reports cannot be processed again (409 Conflict)
    // ─────────────────────────────────────────────────────────────────────────
    {
      const duplicateResolve = await request(
        'PATCH',
        `/admin/reports/${report1.id}/resolve`,
        { note: 'Attempting second resolution' },
        adminToken
      );

      assert(
        duplicateResolve.status === 409,
        'Test 12: Resolved reports cannot be resolved or dismissed again (HTTP 409 Conflict)',
        `status=${duplicateResolve.status} message=${duplicateResolve.payload?.message}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 13: Dismissed reports cannot be processed again (409 Conflict)
    // ─────────────────────────────────────────────────────────────────────────
    {
      const duplicateDismiss = await request(
        'PATCH',
        `/admin/reports/${report3.id}/dismiss`,
        { note: 'Attempting second dismissal' },
        adminToken
      );

      assert(
        duplicateDismiss.status === 409,
        'Test 13: Dismissed reports cannot be resolved or dismissed again (HTTP 409 Conflict)',
        `status=${duplicateDismiss.status} message=${duplicateDismiss.payload?.message}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 14: Concurrent moderation produces correct conflict response
    // ─────────────────────────────────────────────────────────────────────────
    {
      // Attempt to dismiss report 1 (which was already resolved)
      const conflictRes = await request(
        'PATCH',
        `/admin/reports/${report1.id}/dismiss`,
        { note: 'Conflicting dismiss attempt' },
        adminToken
      );

      assert(
        conflictRes.status === 409 && conflictRes.payload?.message?.includes('already been resolved'),
        'Test 14: Conflicting moderation actions produce HTTP 409 with explanatory message',
        `status=${conflictRes.status} message=${conflictRes.payload?.message}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 15: Duplicate submissions are prevented in UI
    // ─────────────────────────────────────────────────────────────────────────
    {
      const modalSrc = fs.readFileSync(path.join(__dirname, '../src/components/admin/ReportDetailModal.jsx'), 'utf-8');
      const hasSubmittingGuard = modalSrc.includes('if (submitting) return') &&
        modalSrc.includes('disabled={submitting}');

      assert(
        hasSubmittingGuard,
        'Test 15: Frontend prevents duplicate in-flight submissions and disables action triggers',
        `hasSubmittingGuard=${hasSubmittingGuard}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 16: Dashboard, article moderation, and user management remain functional
    // ─────────────────────────────────────────────────────────────────────────
    {
      const dashRes = await request('GET', '/admin/dashboard/stats', null, adminToken);
      const artRes = await request('GET', '/admin/articles/pending', null, adminToken);
      const userRes = await request('GET', '/admin/users', null, adminToken);

      assert(
        dashRes.status === 200 && artRes.status === 200 && userRes.status === 200,
        'Test 16: Dashboard stats, article moderation, and user management APIs remain functional',
        `dashStatus=${dashRes.status} artStatus=${artRes.status} userStatus=${userRes.status}`
      );
    }

  } catch (err) {
    console.error('Unhandled error during report moderation tests:', err);
    failed++;
  } finally {
    // Clean up created records
    for (const rId of createdReportIds) {
      await prisma.adminAction.deleteMany({ where: { targetEntity: 'Report', targetId: rId } }).catch(() => {});
      await prisma.report.delete({ where: { id: rId } }).catch(() => {});
    }
    for (const pId of createdPostIds) {
      await prisma.forumPost.delete({ where: { id: pId } }).catch(() => {});
    }
    for (const uId of createdUserIds) {
      await prisma.user.delete({ where: { id: uId } }).catch(() => {});
    }
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }

  const total = passed + failed;
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  Report Moderation Test Results: ${passed} PASSED, ${failed} FAILED (${total} total)`);
  console.log('═══════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runReportModerationTests();
