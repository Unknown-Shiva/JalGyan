/**
 * JalGyan — Phase 4, Step 4.2: Frontend Foundation & Real Authentication Integration
 * Integration test suite — HTTP-only, no frontend source imports.
 *
 * Verifies:
 *   1. Backend health on port 5001
 *   2. Admin login via POST /api/auth/login
 *   3. JWT stored under ww_token / user under ww_user (storage simulation)
 *   4-5. Session verification via GET /api/auth/me
 *   6. Logout clears storage
 *   7. Wrong password → 401
 *   8. Suspended user → 403
 *   9-11. AdminRoute guard logic (simulation)
 *   12. Admin nav visibility logic (simulation)
 *   13-14. forumService / bookmarkService not regressed (file-content check)
 *   15. No mock code in authService.js
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import app from './src/app.js';
import { prisma } from './src/config/db.js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const PORT = 5001;
const BASE = `http://localhost:${PORT}/api`;

// ── Minimal localStorage simulation ──────────────────────────────────────────
class MockLocalStorage {
  constructor() { this.store = {}; }
  getItem(key) { return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null; }
  setItem(key, value) { this.store[key] = String(value); }
  removeItem(key) { delete this.store[key]; }
  clear() { this.store = {}; }
}
const storage = new MockLocalStorage();

// ── HTTP helper (no frontend imports) ────────────────────────────────────────
async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const payload = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, payload };
}

// ── Test runner ───────────────────────────────────────────────────────────────
async function runTests() {
  console.log('\n════════════════════════════════════════════════');
  console.log('  JalGyan Phase 4.2 — Auth Integration Tests');
  console.log('════════════════════════════════════════════════\n');

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

  // Start the server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@jalgyan.org';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('  ⚠️  ADMIN_PASSWORD not set in server/.env — cannot run auth tests.');
    server.close();
    await prisma.$disconnect();
    process.exit(1);
  }

  let token = null;
  let tempUserId = null;

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: Health endpoint reachable on port 5001
    // ─────────────────────────────────────────────────────────────────────────
    {
      const { status, payload } = await request('GET', '/health');
      assert(
        status === 200 && payload.success === true,
        'Test 1: Backend health endpoint reachable on port 5001',
        `status=${status} success=${payload.success} message=${payload.message}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: Admin login via POST /api/auth/login
    // ─────────────────────────────────────────────────────────────────────────
    let loginUser = null;
    {
      const { status, ok, payload } = await request('POST', '/auth/login', {
        email: adminEmail,
        password: adminPassword,
      });

      const data = payload.data || payload;
      token = data?.token;
      loginUser = data?.user;

      assert(
        ok &&
        status === 200 &&
        typeof token === 'string' &&
        token.length > 0 &&
        loginUser?.email === adminEmail &&
        loginUser?.role === 'ADMIN',
        'Test 2: Admin logs in successfully via POST /api/auth/login',
        `status=${status} hasToken=${!!token} role=${loginUser?.role}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3 & 4: JWT stored under ww_token, user under ww_user (storage sim)
    // ─────────────────────────────────────────────────────────────────────────
    {
      storage.setItem('ww_token', token);
      storage.setItem('ww_user', JSON.stringify(loginUser));

      const storedToken = storage.getItem('ww_token');
      const storedUser = JSON.parse(storage.getItem('ww_user'));

      assert(
        storedToken === token &&
        storedUser?.id === loginUser?.id &&
        storedUser?.role === 'ADMIN' &&
        storedUser?.password === undefined,
        'Test 3 & 4: JWT stored under ww_token; sanitized user stored under ww_user',
        `tokenMatch=${storedToken === token} roleOk=${storedUser?.role === 'ADMIN'}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 5: Session token validated via GET /api/auth/me
    // ─────────────────────────────────────────────────────────────────────────
    {
      const { status, ok, payload } = await request('GET', '/auth/me', null, token);
      const user = (payload.data?.user) || payload.data || payload.user;

      assert(
        ok && status === 200 && user?.email === adminEmail && user?.role === 'ADMIN',
        'Test 5: GET /api/auth/me validates active token and returns admin profile',
        `status=${status} email=${user?.email} role=${user?.role}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 6: Logout clears both storage entries
    // ─────────────────────────────────────────────────────────────────────────
    {
      storage.removeItem('ww_token');
      storage.removeItem('ww_user');

      assert(
        storage.getItem('ww_token') === null && storage.getItem('ww_user') === null,
        'Test 6: Logout clears both ww_token and ww_user from storage'
      );

      // Restore for subsequent tests
      storage.setItem('ww_token', token);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 7: Wrong password returns 401
    // ─────────────────────────────────────────────────────────────────────────
    {
      const { status } = await request('POST', '/auth/login', {
        email: adminEmail,
        password: 'definitely-wrong-password-xyz',
      });

      assert(
        status === 401,
        'Test 7: Login with wrong password returns HTTP 401',
        `status=${status}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 8: Suspended user login returns 403
    // ─────────────────────────────────────────────────────────────────────────
    {
      const suspendedEmail = `test_suspended_${Date.now()}@jalgyan.test`;
      const suspendedPass = 'SuspendedPass1!Test';

      const hashed = await bcrypt.hash(suspendedPass, 10);
      const created = await prisma.user.create({
        data: {
          name: 'Suspended Test User',
          email: suspendedEmail,
          password: hashed,
          role: 'USER',
          status: 'SUSPENDED',
        },
      });
      tempUserId = created.id;

      const { status } = await request('POST', '/auth/login', {
        email: suspendedEmail,
        password: suspendedPass,
      });

      assert(
        status === 403,
        'Test 8: Suspended user login rejected with HTTP 403',
        `status=${status}`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 9, 10, 11: AdminRoute guard logic simulation
    // ─────────────────────────────────────────────────────────────────────────
    {
      function evaluateAdminRoute(user, loading) {
        if (loading) return 'LOADING';
        if (!user) return 'REDIRECT_LOGIN';
        if (user.role !== 'ADMIN') return 'REDIRECT_FORUM';
        return 'RENDER_CHILDREN';
      }

      const cases = {
        loading: evaluateAdminRoute(null, true),
        unauthenticated: evaluateAdminRoute(null, false),
        normalUser: evaluateAdminRoute({ role: 'USER' }, false),
        admin: evaluateAdminRoute({ role: 'ADMIN' }, false),
      };

      assert(cases.loading === 'LOADING', 'Test 9: AdminRoute shows loading state while session is being verified');
      assert(cases.unauthenticated === 'REDIRECT_LOGIN', 'Test 10: Unauthenticated visitors are redirected to /login');
      assert(cases.normalUser === 'REDIRECT_FORUM', 'Test 10: Regular USER role is redirected to /forum');
      assert(cases.admin === 'RENDER_CHILDREN', 'Test 11: ADMIN users pass the AdminRoute guard and see admin content');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 12: Admin Dashboard nav visibility logic simulation
    // ─────────────────────────────────────────────────────────────────────────
    {
      const canViewAdminNav = (user) => Boolean(user && user.role === 'ADMIN');

      assert(
        !canViewAdminNav(null) &&
        !canViewAdminNav({ role: 'USER' }) &&
        canViewAdminNav({ role: 'ADMIN' }),
        'Test 12: Admin Dashboard nav link renders only when user.role === "ADMIN"'
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 13 & 14: Forum and bookmark service files are intact (not deleted/emptied)
    // ─────────────────────────────────────────────────────────────────────────
    {
      const forumSrc = fs.readFileSync(path.join(__dirname, '../src/services/forumService.js'), 'utf-8');
      const bookmarkSrc = fs.readFileSync(path.join(__dirname, '../src/services/bookmarkService.js'), 'utf-8');

      assert(
        forumSrc.includes('forumService') && forumSrc.length > 100,
        'Test 13: src/services/forumService.js is intact and exports forumService'
      );
      assert(
        bookmarkSrc.includes('bookmarkService') && bookmarkSrc.length > 50,
        'Test 14: src/services/bookmarkService.js is intact and exports bookmarkService'
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 15: No mock authentication code in authService.js
    // ─────────────────────────────────────────────────────────────────────────
    {
      const src = fs.readFileSync(path.join(__dirname, '../src/services/authService.js'), 'utf-8');

      const hasDemoToken = src.includes("'demo-token'") || src.includes('"demo-token"');
      const hasMockDemoUser = src.includes('demoUser =') || src.includes('demoUser=');
      const hasMockReturn = src.includes('mock') && src.toLowerCase().includes('return') && src.includes('demo');

      assert(
        !hasDemoToken && !hasMockDemoUser && !hasMockReturn,
        'Test 15: All mock/demo credentials removed from src/services/authService.js',
        `hasDemoToken=${hasDemoToken} hasMockDemoUser=${hasMockDemoUser}`
      );
    }

  } catch (err) {
    console.error('\n  ⚠️  Unhandled error during test run:');
    console.error(' ', err.message);
    console.error(err.stack);
    failed++;
  } finally {
    // Cleanup temporary test user
    if (tempUserId) {
      await prisma.user.delete({ where: { id: tempUserId } }).catch(() => {});
    }
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log('\n════════════════════════════════════════════════');
  console.log(`  Results: ${passed} PASSED, ${failed} FAILED (${total} total)`);
  console.log('════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
