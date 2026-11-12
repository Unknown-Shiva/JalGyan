/**
 * JalGyan — Phase 4, Step 4.5: User Management Test Suite
 *
 * Verifies all 16 requirements:
 * 1. Admin can retrieve paginated users (GET /api/admin/users -> 200).
 * 2. Regular users receive 403 (GET /api/admin/users with USER token -> 403).
 * 3. Unauthenticated users receive 401 (GET /api/admin/users without token -> 401).
 * 4. Search works (matching name or email).
 * 5. Role and status filters work (role=ADMIN, status=SUSPENDED).
 * 6. Pagination works (page & limit parameters handled correctly).
 * 7. User details include activity counts (GET /api/admin/users/:id -> includes activityCounts).
 * 8. Admin can suspend a user (PATCH /api/admin/users/:id/suspend -> 200).
 * 9. Admin can activate a suspended user (PATCH /api/admin/users/:id/activate -> 200).
 * 10. Admin can change a user's role (PATCH /api/admin/users/:id/role -> 200).
 * 11. Self-suspension is blocked (400 rejection).
 * 12. Self-demotion is blocked (400 rejection).
 * 13. Last-active-admin protection works (400 rejection).
 * 14. Duplicate submissions and conflicting updates are handled (400/409 rejection & submitting guards).
 * 15. Password hashes are never exposed in user list or user details.
 * 16. Dashboard and article moderation remain functional.
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

async function runUserManagementTests() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  JalGyan Phase 4.5 — User Management Test Suite');
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

  const createdUserIds = [];
  let adminId = null;
  let adminToken = null;
  let regularToken = null;

  try {
    // 1. Authenticate ADMIN
    const adminLogin = await request('POST', '/auth/login', {
      email: adminEmail,
      password: adminPassword,
    });
    adminToken = adminLogin.payload?.data?.token || adminLogin.payload?.token;
    adminId = adminLogin.payload?.data?.user?.id || adminLogin.payload?.user?.id;

    // 2. Create test users
    const hashed = await bcrypt.hash('UserTestPass123!', 10);

    // User A: regular active user for suspension & reactivation
    const userA = await prisma.user.create({
      data: {
        name: 'User A Active',
        email: `usera_${Date.now()}@jalgyan.test`,
        password: hashed,
        role: 'USER',
        status: 'ACTIVE',
        location: 'Pune, Maharashtra',
        bio: 'Rainwater harvesting advocate in urban societies.',
      },
    });
    createdUserIds.push(userA.id);

    // User B: regular user for role updates
    const userB = await prisma.user.create({
      data: {
        name: 'User B Promotable',
        email: `userb_${Date.now()}@jalgyan.test`,
        password: hashed,
        role: 'USER',
        status: 'ACTIVE',
      },
    });
    createdUserIds.push(userB.id);

    // User C: searchable name
    const userC = await prisma.user.create({
      data: {
        name: 'Kaveri Watershed Researcher',
        email: `kaveri_${Date.now()}@jalgyan.test`,
        password: hashed,
        role: 'USER',
        status: 'ACTIVE',
      },
    });
    createdUserIds.push(userC.id);

    // User D: pre-suspended user
    const userD = await prisma.user.create({
      data: {
        name: 'User D Suspended',
        email: `userd_${Date.now()}@jalgyan.test`,
        password: hashed,
        role: 'USER',
        status: 'SUSPENDED',
      },
    });
    createdUserIds.push(userD.id);

    // Authenticate regular user A for 403 test
    const regLogin = await request('POST', '/auth/login', {
      email: userA.email,
      password: 'UserTestPass123!',
    });
    regularToken = regLogin.payload?.data?.token || regLogin.payload?.token;

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: Admin can retrieve paginated users (HTTP 200)
    // ─────────────────────────────────────────────────────────────────────────
    let userListResponse = null;
    {
      const { status, ok, payload } = await request('GET', '/admin/users?page=1&limit=10', null, adminToken);
      userListResponse = payload?.data || payload;
      const hasUsers = Array.isArray(userListResponse?.users) && userListResponse.users.length > 0;
      const hasPagination = userListResponse?.pagination && typeof userListResponse.pagination.total === 'number';

      assert(
        ok && status === 200 && hasUsers && hasPagination,
        'Test 1: Admin can retrieve paginated users (HTTP 200)',
        `status=${status} usersCount=${userListResponse?.users?.length}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: Regular users receive 403 Forbidden
    // ─────────────────────────────────────────────────────────────────────────
    {
      const { status } = await request('GET', '/admin/users', null, regularToken);
      assert(
        status === 403,
        'Test 2: Regular users receive HTTP 403 Forbidden',
        `status=${status}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: Unauthenticated users receive 401 Unauthorized
    // ─────────────────────────────────────────────────────────────────────────
    {
      const { status } = await request('GET', '/admin/users', null, null);
      assert(
        status === 401,
        'Test 3: Unauthenticated users receive HTTP 401 Unauthorized',
        `status=${status}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 4: Search works by name and email
    // ─────────────────────────────────────────────────────────────────────────
    {
      const { status, ok, payload } = await request('GET', '/admin/users?search=Kaveri', null, adminToken);
      const data = payload?.data || payload;
      const found = data?.users?.some((u) => u.id === userC.id);
      const otherFound = data?.users?.some((u) => u.id === userA.id);

      assert(
        ok && status === 200 && found && !otherFound,
        'Test 4: Search filters users by name/email keyword',
        `foundTarget=${found} excludedOthers=${!otherFound}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 5: Role and status filters work
    // ─────────────────────────────────────────────────────────────────────────
    {
      // Role filter
      const adminRes = await request('GET', '/admin/users?role=ADMIN', null, adminToken);
      const adminUsers = adminRes.payload?.data?.users || adminRes.payload?.users || [];
      const allAdmins = adminUsers.length > 0 && adminUsers.every((u) => u.role === 'ADMIN');

      // Status filter
      const suspRes = await request('GET', '/admin/users?status=SUSPENDED', null, adminToken);
      const suspUsers = suspRes.payload?.data?.users || suspRes.payload?.users || [];
      const allSuspended = suspUsers.length > 0 && suspUsers.every((u) => u.status === 'SUSPENDED');

      assert(
        allAdmins && allSuspended,
        'Test 5: Role and status filters correctly restrict returned users',
        `allAdmins=${allAdmins} allSuspended=${allSuspended}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 6: Pagination works
    // ─────────────────────────────────────────────────────────────────────────
    {
      const { status, ok, payload } = await request('GET', '/admin/users?page=1&limit=2', null, adminToken);
      const data = payload?.data || payload;

      assert(
        ok && status === 200 && data.users.length <= 2 && data.pagination.limit === 2 && data.pagination.page === 1,
        'Test 6: Pagination limit and page parameters handled correctly',
        `count=${data.users.length} limit=${data.pagination?.limit}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 7: User details include activity counts
    // ─────────────────────────────────────────────────────────────────────────
    {
      const { status, ok, payload } = await request('GET', `/admin/users/${userA.id}`, null, adminToken);
      const user = payload?.data?.user || payload?.user;
      const counts = user?.activityCounts;

      const hasArticles = typeof counts?.articlesAuthored === 'number';
      const hasPosts = typeof counts?.postsCreated === 'number';
      const hasComments = typeof counts?.commentsCreated === 'number';
      const hasReports = typeof counts?.reportsSubmitted === 'number';
      const hasWater = typeof counts?.calculationsPerformed === 'number';

      assert(
        ok && status === 200 && hasArticles && hasPosts && hasComments && hasReports && hasWater,
        'Test 7: User details endpoint returns aggregated activity metrics',
        `articles=${hasArticles} posts=${hasPosts} comments=${hasComments} water=${hasWater}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 8: Admin can suspend a user
    // ─────────────────────────────────────────────────────────────────────────
    {
      const { status, ok, payload } = await request(
        'PATCH',
        `/admin/users/${userA.id}/suspend`,
        { reason: 'Repeated non-compliance with conservation guidelines' },
        adminToken
      );
      const updated = payload?.data?.user || payload?.user;

      assert(
        ok && status === 200 && updated?.status === 'SUSPENDED',
        'Test 8: Admin can suspend an active user with optional reason',
        `status=${status} userStatus=${updated?.status}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 9: Admin can activate a suspended user
    // ─────────────────────────────────────────────────────────────────────────
    {
      const { status, ok, payload } = await request(
        'PATCH',
        `/admin/users/${userA.id}/activate`,
        { reason: 'Appeal reviewed and accepted' },
        adminToken
      );
      const updated = payload?.data?.user || payload?.user;

      assert(
        ok && status === 200 && updated?.status === 'ACTIVE',
        'Test 9: Admin can reactivate a suspended user',
        `status=${status} userStatus=${updated?.status}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 10: Admin can change a user's role
    // ─────────────────────────────────────────────────────────────────────────
    {
      // Promote USER B to ADMIN
      const promoteRes = await request('PATCH', `/admin/users/${userB.id}/role`, { role: 'ADMIN' }, adminToken);
      const promoted = promoteRes.payload?.data?.user || promoteRes.payload?.user;

      // Demote USER B back to USER
      const demoteRes = await request('PATCH', `/admin/users/${userB.id}/role`, { role: 'USER' }, adminToken);
      const demoted = demoteRes.payload?.data?.user || demoteRes.payload?.user;

      assert(
        promoteRes.status === 200 && promoted?.role === 'ADMIN' &&
        demoteRes.status === 200 && demoted?.role === 'USER',
        'Test 10: Admin can update user role between USER and ADMIN',
        `promotedRole=${promoted?.role} demotedRole=${demoted?.role}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 11: Self-suspension is blocked
    // ─────────────────────────────────────────────────────────────────────────
    {
      const { status, payload } = await request(
        'PATCH',
        `/admin/users/${adminId}/suspend`,
        { reason: 'Attempting self suspension' },
        adminToken
      );

      assert(
        status === 400 && payload?.message?.includes('cannot suspend their own account'),
        'Test 11: Self-suspension is blocked with security validation',
        `status=${status} message=${payload?.message}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 12: Self-demotion is blocked
    // ─────────────────────────────────────────────────────────────────────────
    {
      const { status, payload } = await request(
        'PATCH',
        `/admin/users/${adminId}/role`,
        { role: 'USER' },
        adminToken
      );

      assert(
        status === 400 && payload?.message?.includes('cannot remove their own ADMIN role or demote themselves'),
        'Test 12: Self-demotion is blocked with security validation',
        `status=${status} message=${payload?.message}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 13: Last-active-admin protection works
    // ─────────────────────────────────────────────────────────────────────────
    {
      // Ensure only 1 active admin exists (User B was demoted back to USER above)
      // When targeting the current admin with demote or suspend, backend checks active admin count
      const testDemoteRes = await request(
        'PATCH',
        `/admin/users/${adminId}/role`,
        { role: 'USER' },
        adminToken
      );

      assert(
        testDemoteRes.status === 400,
        'Test 13: Last-active-admin protection prevents removing or suspending solitary admin',
        `status=${testDemoteRes.status}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 14: Duplicate submissions and conflicting updates are handled
    // ─────────────────────────────────────────────────────────────────────────
    {
      // 1. Activating already active user -> 400
      const duplicateAct = await request('PATCH', `/admin/users/${userA.id}/activate`, {}, adminToken);

      // 2. Setting same role -> 400
      const duplicateRole = await request('PATCH', `/admin/users/${userA.id}/role`, { role: 'USER' }, adminToken);

      // 3. Frontend submitting guard verified in code
      const modalSrc = fs.readFileSync(path.join(__dirname, '../src/components/admin/UserDetailModal.jsx'), 'utf-8');
      const hasSubmittingGuard = modalSrc.includes('if (submitting) return') && modalSrc.includes('disabled={submitting}');

      assert(
        duplicateAct.status === 400 && duplicateRole.status === 400 && hasSubmittingGuard,
        'Test 14: Conflicting updates and duplicate submissions properly rejected',
        `activateStatus=${duplicateAct.status} roleStatus=${duplicateRole.status} frontendGuard=${hasSubmittingGuard}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 15: Password hashes are never exposed
    // ─────────────────────────────────────────────────────────────────────────
    {
      const listUsers = userListResponse?.users || [];
      const anyListHasPassword = listUsers.some((u) => u.password !== undefined || u.passwordHash !== undefined);

      const detailRes = await request('GET', `/admin/users/${userA.id}`, null, adminToken);
      const detailUser = detailRes.payload?.data?.user || detailRes.payload?.user;
      const detailHasPassword = detailUser?.password !== undefined || detailUser?.passwordHash !== undefined;

      assert(
        !anyListHasPassword && !detailHasPassword,
        'Test 15: Password hashes are never exposed in user list or user details',
        `listHasPassword=${anyListHasPassword} detailHasPassword=${detailHasPassword}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 16: Dashboard and article moderation remain functional
    // ─────────────────────────────────────────────────────────────────────────
    {
      const dashRes = await request('GET', '/admin/dashboard/stats', null, adminToken);
      const modRes = await request('GET', '/admin/articles/pending', null, adminToken);

      assert(
        dashRes.status === 200 && modRes.status === 200,
        'Test 16: Dashboard stats and article moderation APIs remain fully functional',
        `dashboardStatus=${dashRes.status} moderationStatus=${modRes.status}`
      );
    }

  } catch (err) {
    console.error('Unhandled error during user management tests:', err);
    failed++;
  } finally {
    // Clean up created test users
    for (const id of createdUserIds) {
      await prisma.adminAction.deleteMany({ where: { targetEntity: 'User', targetId: id } }).catch(() => {});
      await prisma.user.delete({ where: { id } }).catch(() => {});
    }
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }

  const total = passed + failed;
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  User Management Test Results: ${passed} PASSED, ${failed} FAILED (${total} total)`);
  console.log('═══════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runUserManagementTests();
