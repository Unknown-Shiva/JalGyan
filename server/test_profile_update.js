import assert from 'node:assert/strict';
import http from 'node:http';
import app from './src/app.js';
import { prisma } from './src/config/db.js';
import { generateToken } from './src/utils/token.js';

const users = new Map([
  ['user-a', { id: 'user-a', name: 'A', email: 'a@test.invalid', password: '$2b$hidden', role: 'USER', status: 'ACTIVE', location: null, bio: null, deletedAt: null }],
  ['user-b', { id: 'user-b', name: 'B', email: 'b@test.invalid', password: '$2b$hidden', role: 'USER', status: 'ACTIVE', location: null, bio: null, deletedAt: null }],
]);
const originalFind = prisma.user.findUnique, originalUpdateMany = prisma.user.updateMany;
const server = http.createServer(app);

async function request(base, method, body, token) {
  const response = await fetch(`${base}/auth/me`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}

try {
  prisma.user.findUnique = async ({ where }) => users.get(where.id) || [...users.values()].find(user => user.email === where.email) || null;
  prisma.user.updateMany = async ({ where, data }) => {
    const user = users.get(where.id);
    if (!user || user.deletedAt || user.status !== 'ACTIVE') return { count: 0 };
    Object.assign(user, data);
    return { count: 1 };
  };
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const tokenA = generateToken({ id: 'user-a', email: 'a@test.invalid', role: 'USER' });

  assert.equal((await request(base, 'PATCH', { name: 'Updated A', bio: 'Hello' }, tokenA)).status, 200);
  const updated = users.get('user-a');
  assert.equal(updated.name, 'Updated A');
  assert.equal(updated.bio, 'Hello');
  assert.equal(users.get('user-b').name, 'B');
  const noSecret = await request(base, 'PATCH', { location: 'Pune' }, tokenA);
  assert.equal('password' in noSecret.body.data.user, false);
  assert.equal((await request(base, 'PATCH', { name: 'No token' })).status, 401);
  assert.equal((await request(base, 'PATCH', { name: '' }, tokenA)).status, 400);
  assert.equal((await request(base, 'PATCH', { role: 'ADMIN' }, tokenA)).status, 400);
  assert.equal((await request(base, 'PATCH', { password: 'changed' }, tokenA)).status, 400);
  assert.equal((await request(base, 'PATCH', {}, tokenA)).status, 400);

  users.delete('user-a');
  assert.equal((await request(base, 'PATCH', { name: 'Gone' }, tokenA)).status, 401);
  console.log('Profile update HTTP tests passed.');
} finally {
  prisma.user.findUnique = originalFind;
  prisma.user.updateMany = originalUpdateMany;
  await new Promise(resolve => server.close(resolve));
  await prisma.$disconnect();
}
