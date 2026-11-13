/**
 * HTTP tests for POST /api/auth/register and the existing login route.
 * The Prisma user delegate is stubbed so the route/controller behavior can be
 * exercised without a local PostgreSQL instance.
 * Run with: node server/test_registration.js (from the repository root).
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import bcrypt from 'bcryptjs';
import app from './src/app.js';
import { prisma } from './src/config/db.js';

const server = http.createServer(app);
const testUsers = new Map();
const originalFindUnique = prisma.user.findUnique;
const originalCreate = prisma.user.create;

async function request(baseUrl, method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: response.status,
    body: await response.json(),
  };
}

async function run() {
  prisma.user.findUnique = async ({ where }) => testUsers.get(where.email) || null;
  prisma.user.create = async ({ data }) => {
    const now = new Date();
    const user = {
      id: `test_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      role: 'USER',
      status: 'ACTIVE',
      bio: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
      ...data,
    };
    testUsers.set(user.email, user);
    return user;
  };

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;
  const email = `registration_${Date.now()}@jalgyan.test`;
  const password = 'SecurePass123!';

  try {
    const valid = await request(baseUrl, 'POST', '/auth/register', {
      name: '  Registration Tester  ',
      email: `  ${email.toUpperCase()}  `,
      password,
      location: '  Pune, India  ',
      role: 'ADMIN',
    });

    assert.equal(valid.status, 201, 'valid registration returns 201');
    assert.equal(valid.body.success, true);
    assert.equal(valid.body.data.user.name, 'Registration Tester');
    assert.equal(valid.body.data.user.email, email);
    assert.equal(valid.body.data.user.location, 'Pune, India');
    assert.equal(valid.body.data.user.role, 'USER', 'client cannot choose a privileged role');
    assert.equal(typeof valid.body.data.token, 'string');
    assert.equal('password' in valid.body.data.user, false, 'response excludes password hash');

    const storedUser = testUsers.get(email);
    assert.ok(storedUser.password.startsWith('$2'), 'database stores a bcrypt hash');
    assert.notEqual(storedUser.password, password, 'database does not store plaintext password');
    assert.equal(await bcrypt.compare(password, storedUser.password), true, 'stored bcrypt hash verifies');

    const duplicate = await request(baseUrl, 'POST', '/auth/register', {
      name: 'Another User',
      email: email.toUpperCase(),
      password,
    });
    assert.equal(duplicate.status, 409, 'duplicate email returns 409');
    assert.equal(duplicate.body.success, false);
    assert.match(duplicate.body.message, /already exists/i);

    const invalidCases = [
      [{ email, password }, /name is required/i],
      [{ name: 'Missing email', password }, /email is required/i],
      [{ name: 'Missing password', email }, /password is required/i],
      [{ name: 'Bad email', email: 'not-an-email', password }, /valid email/i],
      [{ name: 'Short password', email: `short_${email}`, password: 'short' }, /password must/i],
      [{ name: 'Bad location', email: `location_${email}`, password, location: 42 }, /location must be a string/i],
    ];

    for (const [payload, messagePattern] of invalidCases) {
      const invalid = await request(baseUrl, 'POST', '/auth/register', payload);
      assert.equal(invalid.status, 400, `invalid input returns 400: ${messagePattern}`);
      assert.equal(invalid.body.success, false);
      assert.match(invalid.body.message, messagePattern);
    }

    const login = await request(baseUrl, 'POST', '/auth/login', { email, password });
    assert.equal(login.status, 200, 'new account can use the existing login endpoint');
    assert.equal(login.body.success, true);
    assert.equal(login.body.data.user.email, email);
    assert.equal('password' in login.body.data.user, false, 'login response also excludes password hash');

    console.log('Registration HTTP tests passed.');
  } finally {
    prisma.user.findUnique = originalFindUnique;
    prisma.user.create = originalCreate;
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error('Registration integration tests failed:', error);
  process.exitCode = 1;
});
