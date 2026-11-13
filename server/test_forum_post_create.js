/** HTTP tests for authenticated POST /api/posts with mocked Prisma. */
import assert from 'node:assert/strict';
import http from 'node:http';
import app from './src/app.js';
import { prisma } from './src/config/db.js';
import { generateToken } from './src/utils/token.js';

const user = { id: 'author-1', name: 'Author', email: 'author@test.invalid', location: 'Pune', role: 'USER', status: 'ACTIVE', deletedAt: null, password: 'never-return' };
const originalFind = prisma.user.findUnique, originalCreate = prisma.forumPost.create;
const server = http.createServer(app);
let captured;
async function request(base, body, token) {
  const response = await fetch(`${base}/posts`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}

try {
  prisma.user.findUnique = async ({ where }) => where.id === user.id ? user : null;
  prisma.forumPost.create = async ({ data, select }) => {
    captured = { data, select };
    return { id: 'post-1', ...data, upvotesCount: 0, downvotesCount: 0, netVoteScore: 0, commentsCount: 0, createdAt: new Date(), updatedAt: new Date(), author: { id: user.id, name: user.name, location: user.location } };
  };
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const token = generateToken({ id: user.id, role: 'USER' });
  const valid = { title: 'A useful title', body: 'This is enough context to describe the discussion.', category: 'Community', tags: ['reuse'] };
  const response = await request(base, { ...valid, authorId: 'attacker', upvotesCount: 500 });
  assert.equal(response.status, 401);
  const created = await request(base, valid, token);
  assert.equal(created.status, 201);
  assert.equal(captured.data.authorId, user.id);
  assert.equal(captured.data.title, valid.title);
  assert.equal('upvotesCount' in captured.data, false);
  assert.equal(created.body.data.post.upvotesCount, 0);
  assert.equal('password' in created.body.data.post.author, false);
  assert.equal((await request(base, { ...valid, title: ' ' }, token)).status, 400);
  assert.equal((await request(base, { ...valid, body: '  ' }, token)).status, 400);
  assert.equal((await request(base, { ...valid, category: 'Unknown' }, token)).status, 400);
  assert.equal((await request(base, { ...valid, tags: 'bad' }, token)).status, 400);
  assert.equal((await request(base, { ...valid, role: 'ADMIN' }, token)).status, 400);
  console.log('Forum post create HTTP tests passed.');
} finally {
  prisma.user.findUnique = originalFind; prisma.forumPost.create = originalCreate;
  await new Promise(resolve => server.close(resolve)); await prisma.$disconnect();
}
