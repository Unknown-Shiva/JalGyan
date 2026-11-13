/** HTTP tests for owner-scoped forum post edits and soft deletion. */
import assert from 'node:assert/strict';
import http from 'node:http';
import app from './src/app.js';
import { prisma } from './src/config/db.js';
import { generateToken } from './src/utils/token.js';

const users = new Map(['user-a', 'user-b'].map(id => [id, { id, name: id, email: `${id}@test.invalid`, role: 'USER', status: 'ACTIVE', deletedAt: null }]));
const posts = new Map(['post-a', 'post-b'].map((id, i) => [id, { id, authorId: i ? 'user-b' : 'user-a', title: 'Original title', body: 'Original body with enough context.', category: 'Community', tags: [], deletedAt: null, author: { id: i ? 'user-b' : 'user-a', name: i ? 'user-b' : 'user-a', location: null } }]));
const old = { find: prisma.user.findUnique, update: prisma.forumPost.updateMany, findPost: prisma.forumPost.findFirst };
const server = http.createServer(app);
async function call(base, method, id, token, body) {
  const response = await fetch(`${base}/posts/${id}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}
try {
  prisma.user.findUnique = async ({ where }) => users.get(where.id) || null;
  prisma.forumPost.updateMany = async ({ where, data }) => {
    const p = posts.get(where.id);
    if (!p || p.authorId !== where.authorId || p.deletedAt) return { count: 0 };
    Object.assign(p, data); return { count: 1 };
  };
  prisma.forumPost.findFirst = async ({ where }) => {
    const p = posts.get(where.id);
    return p && !p.deletedAt && p.authorId === where.authorId ? { ...p, upvotesCount: 0, downvotesCount: 0, netVoteScore: 0, commentsCount: 0, createdAt: new Date(), updatedAt: new Date() } : null;
  };
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const a = generateToken({ id: 'user-a', role: 'USER' }), b = generateToken({ id: 'user-b', role: 'USER' });
  assert.equal((await call(base, 'PATCH', 'post-a', a, { title: 'Updated title' })).status, 200);
  assert.equal(posts.get('post-a').title, 'Updated title');
  assert.equal((await call(base, 'PATCH', 'post-b', a, { title: 'Hijacked title' })).status, 404);
  assert.equal(posts.get('post-b').title, 'Original title');
  assert.equal((await call(base, 'DELETE', 'post-b', a)).status, 404);
  assert.equal(posts.get('post-b').deletedAt, null);
  assert.equal((await call(base, 'PATCH', 'post-a', null, { title: 'Unauthenticated' })).status, 401);
  assert.equal((await call(base, 'DELETE', 'post-a', null)).status, 401);
  for (const injected of [{ authorId: 'user-b' }, { upvotesCount: 100 }, { commentsCount: 100 }, { status: 'REMOVED' }, { deletedAt: null }, { role: 'ADMIN' }]) assert.equal((await call(base, 'PATCH', 'post-a', a, injected)).status, 400);
  for (const invalid of [{ title: 'short' }, { body: '  ' }, { category: 'unknown' }, { tags: 'not-array' }]) assert.equal((await call(base, 'PATCH', 'post-a', a, invalid)).status, 400);
  assert.equal((await call(base, 'PATCH', 'missing', a, { title: 'Valid title' })).status, 404);
  const deleted = await call(base, 'DELETE', 'post-a', a);
  assert.equal(deleted.status, 200); assert.ok(posts.get('post-a').deletedAt instanceof Date);
  assert.equal((await call(base, 'DELETE', 'post-a', a)).status, 404);
  console.log('Forum post update/delete HTTP tests passed.');
} finally {
  prisma.user.findUnique = old.find; prisma.forumPost.updateMany = old.update; prisma.forumPost.findFirst = old.findPost;
  await new Promise(resolve => server.close(resolve)); await prisma.$disconnect();
}
