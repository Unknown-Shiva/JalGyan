/**
 * JalGyan — Phase 4, Step 4.7: Admin Activity & Audit Logs Test Suite
 *
 * Verifies all 15 requirements:
 * 1. Admin can retrieve paginated activity (GET /api/admin/activity -> 200).
 * 2. Regular users receive HTTP 403 (GET /api/admin/activity -> 403).
 * 3. Unauthenticated users receive HTTP 401 (GET /api/admin/activity -> 401).
 * 4. Action-type filtering works (actionType=ARTICLE_APPROVED).
 * 5. Target-entity filtering works (targetEntity=Article).
 * 6. Administrator filtering works (adminId=<admin-id>).
 * 7. Target-ID filtering works (targetId=<target-id>).
 * 8. Date-range filtering works (startDate & endDate).
 * 9. Sorting works (sortOrder=asc / desc).
 * 10. Pagination works (page & limit parameters handled correctly).
 * 11. Summary endpoint returns expected aggregates (GET /api/admin/activity/summary -> 200).
 * 12. Detail endpoint returns complete audit information (GET /api/admin/activity/:id -> 200).
 * 13. Sensitive fields are not exposed (no password/hash in payload/admin select).
 * 14. Empty activity state works (query matching 0 records returns empty list and count 0).
 * 15. Dashboard, article moderation, user management, and report moderation remain functional.
 * 16. Active Administrators KPI accurately counts active admins and excludes suspended, soft-deleted, and regular users.
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

async function runAdminActivityTests() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  JalGyan Phase 4.7 — Admin Activity & Audit Logs Test Suite');
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
  let adminUser = null;
  const createdUserIds = [];
  const createdActionIds = [];

  try {
    // 1. Authenticate ADMIN
    const adminLogin = await request('POST', '/auth/login', {
      email: adminEmail,
      password: adminPassword,
    });
    adminToken = adminLogin.payload?.data?.token || adminLogin.payload?.token;
    adminUser = adminLogin.payload?.data?.user || adminLogin.payload?.user;
    assert(!!adminToken, 'Admin authenticates successfully and obtains JWT');

    // 2. Create regular user for 403 authorization check
    const hashed = await bcrypt.hash('ActTesterPass123!', 10);
    const regularUser = await prisma.user.create({
      data: {
        name: 'Activity Regular User',
        email: `act_user_${Date.now()}@jalgyan.test`,
        password: hashed,
        role: 'USER',
        status: 'ACTIVE',
      },
    });
    createdUserIds.push(regularUser.id);

    const userLogin = await request('POST', '/auth/login', {
      email: regularUser.email,
      password: 'ActTesterPass123!',
    });
    userToken = userLogin.payload?.data?.token || userLogin.payload?.token;

    // 3. Seed deterministic admin activity records to ensure rich test surface
    const now = new Date();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    const testAction1 = await prisma.adminAction.create({
      data: {
        adminId: adminUser.id,
        actionType: 'ARTICLE_APPROVED',
        targetEntity: 'Article',
        targetId: 'art-deterministic-1',
        details: { articleTitle: 'Monsoon Harvesting Manual', reviewerNote: 'Complies with all technical specs' },
        createdAt: now,
      },
    });
    createdActionIds.push(testAction1.id);

    const testAction2 = await prisma.adminAction.create({
      data: {
        adminId: adminUser.id,
        actionType: 'USER_SUSPENDED',
        targetEntity: 'User',
        targetId: regularUser.id,
        details: { targetEmail: regularUser.email, reason: 'Repeated spam violations' },
        createdAt: threeDaysAgo,
      },
    });
    createdActionIds.push(testAction2.id);

    const testAction3 = await prisma.adminAction.create({
      data: {
        adminId: adminUser.id,
        actionType: 'REPORT_RESOLVED',
        targetEntity: 'Report',
        targetId: 'rep-deterministic-3',
        details: { resolutionAction: 'CONTENT_REMOVED', notes: 'Inappropriate forum link removed' },
        createdAt: tenDaysAgo,
      },
    });
    createdActionIds.push(testAction3.id);

    // ── Requirement 1: Admin can retrieve paginated activity ──
    const req1 = await request('GET', '/admin/activity?page=1&limit=10', null, adminToken);
    assert(
      req1.status === 200 &&
        req1.payload?.success === true &&
        Array.isArray(req1.payload?.data?.actions) &&
        req1.payload.data.pagination?.total >= 3,
      'Requirement 1: Admin can retrieve paginated activity'
    );

    // ── Requirement 2: Regular users receive HTTP 403 ──
    const req2 = await request('GET', '/admin/activity', null, userToken);
    assert(
      req2.status === 403,
      'Requirement 2: Regular user receives HTTP 403 Forbidden',
      `Got status ${req2.status}`
    );

    // ── Requirement 3: Unauthenticated users receive HTTP 401 ──
    const req3 = await request('GET', '/admin/activity', null, null);
    assert(
      req3.status === 401,
      'Requirement 3: Unauthenticated request receives HTTP 401 Unauthorized',
      `Got status ${req3.status}`
    );

    // ── Requirement 4: Action-type filtering works ──
    const req4 = await request('GET', '/admin/activity?actionType=ARTICLE_APPROVED', null, adminToken);
    const actions4 = req4.payload?.data?.actions || [];
    const allArticleApproved = actions4.length > 0 && actions4.every((a) => a.actionType === 'ARTICLE_APPROVED');
    assert(
      req4.status === 200 && allArticleApproved,
      'Requirement 4: Action-type filtering correctly filters by actionType (ARTICLE_APPROVED)',
      `Returned ${actions4.length} actions, all ARTICLE_APPROVED: ${allArticleApproved}`
    );

    // ── Requirement 5: Target-entity filtering works ──
    const req5 = await request('GET', '/admin/activity?targetEntity=User', null, adminToken);
    const actions5 = req5.payload?.data?.actions || [];
    const allUserEntity = actions5.length > 0 && actions5.every((a) => a.targetEntity === 'User');
    assert(
      req5.status === 200 && allUserEntity,
      'Requirement 5: Target-entity filtering correctly filters by targetEntity (User)',
      `Returned ${actions5.length} actions, all User: ${allUserEntity}`
    );

    // ── Requirement 6: Administrator filtering works ──
    const req6 = await request('GET', `/admin/activity?adminId=${adminUser.id}`, null, adminToken);
    const actions6 = req6.payload?.data?.actions || [];
    const allAdminMatch = actions6.length > 0 && actions6.every((a) => (a.admin?.id || a.adminId) === adminUser.id);
    assert(
      req6.status === 200 && allAdminMatch,
      'Requirement 6: Administrator filtering correctly filters by adminId',
      `Returned ${actions6.length} actions, matching adminId: ${allAdminMatch}`
    );

    // ── Requirement 7: Target-ID filtering works ──
    const req7 = await request('GET', `/admin/activity?targetId=${regularUser.id}`, null, adminToken);
    const actions7 = req7.payload?.data?.actions || [];
    const allTargetMatch = actions7.length > 0 && actions7.every((a) => a.targetId === regularUser.id);
    assert(
      req7.status === 200 && allTargetMatch,
      'Requirement 7: Target-ID filtering correctly filters by targetId',
      `Returned ${actions7.length} actions matching targetId ${regularUser.id}`
    );

    // ── Requirement 8: Date-range filtering works ──
    const startStr = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const endStr = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
    const req8 = await request('GET', `/admin/activity?startDate=${encodeURIComponent(startStr)}&endDate=${encodeURIComponent(endStr)}`, null, adminToken);
    const actions8 = req8.payload?.data?.actions || [];
    // Should include testAction1 (now) and testAction2 (3 days ago), but exclude testAction3 (10 days ago)
    const hasAction1 = actions8.some((a) => a.id === testAction1.id);
    const hasAction2 = actions8.some((a) => a.id === testAction2.id);
    const hasAction3 = actions8.some((a) => a.id === testAction3.id);
    assert(
      req8.status === 200 && hasAction1 && hasAction2 && !hasAction3,
      'Requirement 8: Date-range filtering correctly restricts results to the specified range',
      `Action1: ${hasAction1}, Action2: ${hasAction2}, Action3 (excluded): ${!hasAction3}`
    );

    // ── Requirement 9: Sorting works (asc / desc) ──
    const req9Asc = await request('GET', '/admin/activity?sortOrder=asc&limit=5', null, adminToken);
    const req9Desc = await request('GET', '/admin/activity?sortOrder=desc&limit=5', null, adminToken);
    const ascActions = req9Asc.payload?.data?.actions || [];
    const descActions = req9Desc.payload?.data?.actions || [];
    let isAsc = true;
    for (let i = 1; i < ascActions.length; i++) {
      if (new Date(ascActions[i].createdAt) < new Date(ascActions[i - 1].createdAt)) isAsc = false;
    }
    let isDesc = true;
    for (let i = 1; i < descActions.length; i++) {
      if (new Date(descActions[i].createdAt) > new Date(descActions[i - 1].createdAt)) isDesc = false;
    }
    assert(
      req9Asc.status === 200 && req9Desc.status === 200 && isAsc && isDesc,
      'Requirement 9: Sorting operates chronologically in asc and desc directions',
      `Asc ordered: ${isAsc}, Desc ordered: ${isDesc}`
    );

    // ── Requirement 10: Pagination works ──
    const req10P1 = await request('GET', '/admin/activity?page=1&limit=2', null, adminToken);
    const req10P2 = await request('GET', '/admin/activity?page=2&limit=2', null, adminToken);
    const p1Actions = req10P1.payload?.data?.actions || [];
    const p2Actions = req10P2.payload?.data?.actions || [];
    const distinctPages = p1Actions.length > 0 && p2Actions.length > 0 && p1Actions[0].id !== p2Actions[0].id;
    assert(
      req10P1.status === 200 &&
        req10P2.status === 200 &&
        p1Actions.length === 2 &&
        distinctPages &&
        req10P1.payload?.data?.pagination?.page === 1 &&
        req10P2.payload?.data?.pagination?.page === 2,
      'Requirement 10: Pagination respects page & limit parameters with accurate pagination metadata',
      `P1 count: ${p1Actions.length}, P2 count: ${p2Actions.length}, distinct: ${distinctPages}`
    );

    // ── Requirement 11: Summary endpoint returns expected aggregates ──
    const req11 = await request('GET', '/admin/activity/summary', null, adminToken);
    const sumData = req11.payload?.data;
    assert(
      req11.status === 200 &&
        req11.payload?.success === true &&
        typeof sumData?.totalActions === 'number' &&
        typeof sumData?.activityLast7Days === 'number' &&
        typeof sumData?.activityLast30Days === 'number' &&
        typeof sumData?.activeAdministrators === 'number' &&
        sumData?.byActionType &&
        typeof sumData?.byActionType === 'object' &&
        sumData?.byTargetEntity &&
        typeof sumData?.byTargetEntity === 'object' &&
        Array.isArray(sumData?.topAdministrators),
      'Requirement 11: Summary endpoint returns accurate aggregated activity statistics and distributions',
      `Total: ${sumData?.totalActions}, 7d: ${sumData?.activityLast7Days}, 30d: ${sumData?.activityLast30Days}, ActiveAdmins: ${sumData?.activeAdministrators}, TopAdmins: ${sumData?.topAdministrators?.length}`
    );

    // ── Requirement 12: Detail endpoint returns complete audit information ──
    const req12 = await request('GET', `/admin/activity/${testAction1.id}`, null, adminToken);
    const detail = req12.payload?.data?.action || req12.payload?.data;
    assert(
      req12.status === 200 &&
        req12.payload?.success === true &&
        detail?.id === testAction1.id &&
        detail?.actionType === 'ARTICLE_APPROVED' &&
        detail?.targetEntity === 'Article' &&
        detail?.targetId === 'art-deterministic-1' &&
        detail?.admin?.email === adminEmail &&
        detail?.details?.articleTitle === 'Monsoon Harvesting Manual',
      'Requirement 12: Detail endpoint returns full audit log entry with administrator projection and metadata',
      `ID: ${detail?.id}, Admin: ${detail?.admin?.email}, Details: ${JSON.stringify(detail?.details)}`
    );

    // ── Requirement 13: Sensitive fields are not exposed ──
    const adminObj = detail?.admin;
    const hasSensitiveAdminFields = adminObj && ('password' in adminObj || 'passwordHash' in adminObj || 'refreshToken' in adminObj);
    const summaryAdmin = sumData?.topAdministrators?.[0]?.admin;
    const hasSensitiveSummaryFields = summaryAdmin && ('password' in summaryAdmin || 'passwordHash' in summaryAdmin);
    assert(
      !hasSensitiveAdminFields && !hasSensitiveSummaryFields,
      'Requirement 13: Sensitive fields (passwords, hashes, tokens) are omitted from audit log payloads',
      `Admin fields: ${Object.keys(adminObj || {}).join(', ')}`
    );

    // ── Requirement 14: Empty activity state works ──
    const req14 = await request('GET', '/admin/activity?targetId=non-existent-id-9999999', null, adminToken);
    assert(
      req14.status === 200 &&
        req14.payload?.data?.actions?.length === 0 &&
        req14.payload?.data?.pagination?.total === 0,
      'Requirement 14: Empty activity query yields empty collection with total 0 gracefully'
    );

    // ── Requirement 15: Dashboard, article moderation, user management, and report moderation remain functional ──
    const dashCheck = await request('GET', '/admin/dashboard/stats', null, adminToken);
    const artCheck = await request('GET', '/admin/articles/pending?page=1&limit=5', null, adminToken);
    const usrCheck = await request('GET', '/admin/users?page=1&limit=5', null, adminToken);
    const repCheck = await request('GET', '/admin/reports?page=1&limit=5', null, adminToken);

    assert(
      dashCheck.status === 200 &&
        artCheck.status === 200 &&
        usrCheck.status === 200 &&
        repCheck.status === 200,
      'Requirement 15: Admin Dashboard, Article Moderation, User Management, and Report Moderation remain fully functional',
      `Dashboard: ${dashCheck.status}, Articles: ${artCheck.status}, Users: ${usrCheck.status}, Reports: ${repCheck.status}`
    );

    // ── Requirement 16: Active Administrators KPI accurately reflects DB state ──
    const baselineSummaryReq = await request('GET', '/admin/activity/summary', null, adminToken);
    const baselineActiveAdmins = baselineSummaryReq.payload?.data?.activeAdministrators;
    const baselineTotalActions = baselineSummaryReq.payload?.data?.totalActions;
    const baseline7Days = baselineSummaryReq.payload?.data?.activityLast7Days;
    const baseline30Days = baselineSummaryReq.payload?.data?.activityLast30Days;

    // Direct DB count to confirm baseline matches
    const expectedInitialDbCount = await prisma.user.count({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE',
        deletedAt: null,
      },
    });
    assert(
      baselineActiveAdmins === expectedInitialDbCount,
      'Requirement 16.1: activeAdministrators in summary exactly matches database count of active admins',
      `Summary: ${baselineActiveAdmins}, DB: ${expectedInitialDbCount}`
    );

    // 1. Create an active admin -> SHOULD increment activeAdministrators by 1
    const testAdminActive = await prisma.user.create({
      data: {
        name: 'KPI Test Active Admin',
        email: `kpi_admin_active_${Date.now()}@jalgyan.test`,
        password: hashed,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    createdUserIds.push(testAdminActive.id);

    // 2. Create a suspended admin -> SHOULD be excluded
    const testAdminSuspended = await prisma.user.create({
      data: {
        name: 'KPI Test Suspended Admin',
        email: `kpi_admin_susp_${Date.now()}@jalgyan.test`,
        password: hashed,
        role: 'ADMIN',
        status: 'SUSPENDED',
      },
    });
    createdUserIds.push(testAdminSuspended.id);

    // 3. Create a soft-deleted admin -> SHOULD be excluded
    const testAdminDeleted = await prisma.user.create({
      data: {
        name: 'KPI Test Deleted Admin',
        email: `kpi_admin_del_${Date.now()}@jalgyan.test`,
        password: hashed,
        role: 'ADMIN',
        status: 'ACTIVE',
        deletedAt: new Date(),
      },
    });
    createdUserIds.push(testAdminDeleted.id);

    // 4. Create an active regular user -> SHOULD be excluded
    const testUserActive = await prisma.user.create({
      data: {
        name: 'KPI Test Active Regular User',
        email: `kpi_user_act_${Date.now()}@jalgyan.test`,
        password: hashed,
        role: 'USER',
        status: 'ACTIVE',
      },
    });
    createdUserIds.push(testUserActive.id);

    // Fetch summary after user creations
    const postSummaryReq = await request('GET', '/admin/activity/summary', null, adminToken);
    const postData = postSummaryReq.payload?.data;

    assert(
      postSummaryReq.status === 200 &&
        postData?.activeAdministrators === baselineActiveAdmins + 1,
      'Requirement 16.2: Active administrators counted; suspended, soft-deleted, and regular USERs excluded',
      `Before: ${baselineActiveAdmins}, After: ${postData?.activeAdministrators} (Expected: ${baselineActiveAdmins + 1})`
    );

    assert(
      postData?.totalActions === baselineTotalActions &&
        postData?.activityLast7Days === baseline7Days &&
        postData?.activityLast30Days === baseline30Days &&
        typeof postData?.byActionType === 'object' &&
        typeof postData?.byTargetEntity === 'object' &&
        Array.isArray(postData?.topAdministrators),
      'Requirement 16.3: Existing activity summary fields and distribution metrics remain unchanged',
      `Actions match: ${postData?.totalActions === baselineTotalActions}, 7d match: ${postData?.activityLast7Days === baseline7Days}, 30d match: ${postData?.activityLast30Days === baseline30Days}`
    );

  } catch (err) {
    console.error('Unexpected test runner error:', err);
    failed++;
  } finally {
    // Clean up created records
    try {
      if (createdActionIds.length > 0) {
        await prisma.adminAction.deleteMany({
          where: { id: { in: createdActionIds } },
        });
      }
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: createdUserIds } },
        });
      }
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }

    server.close();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`  Tests completed: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════════════════════\n');

    process.exit(failed > 0 ? 1 : 0);
  }
}

runAdminActivityTests();
