/** HTTP regression tests for strict auth and public optional-auth behavior. */
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from './src/app.js';
import { prisma } from './src/config/db.js';
import { config } from './src/config/env.js';
import { generateToken } from './src/utils/token.js';

const users = new Map([
  ['active-user', { id: 'active-user', name: 'Active', email: 'active@test.invalid', password: 'private-hash', role: 'USER', status: 'ACTIVE', deletedAt: null }],
  ['deleted-user', { id: 'deleted-user', name: 'Deleted', email: 'deleted@test.invalid', password: 'private-hash', role: 'USER', status: 'ACTIVE', deletedAt: new Date() }],
  ['suspended-user', { id: 'suspended-user', name: 'Suspended', email: 'suspended@test.invalid', password: 'private-hash', role: 'USER', status: 'SUSPENDED', deletedAt: null }],
]);
const post = {
  id: 'post-1', title: 'Visible discussion', body: 'A discussion body with enough details.', category: 'Community', tags: [],
  upvotesCount: 0, downvotesCount: 0, netVoteScore: 0, commentsCount: 0,
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
  author: { id: 'active-user', name: 'Active', location: null },
};
const originals = {
  user: prisma.user.findUnique,
  postCount: prisma.forumPost.count,
  postList: prisma.forumPost.findMany,
  votes: prisma.vote.findMany,
};
const server = http.createServer(app);

try {
  prisma.user.findUnique = async ({ where }) => users.get(where.id) || null;
  prisma.forumPost.count = async () => 1;
  prisma.forumPost.findMany = async () => [post];
  prisma.vote.findMany = async ({ where }) => {
    assert.equal(where.userId, 'active-user', 'optional personalization uses the authenticated identity');
    return [];
  };

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const expired = jwt.sign({ id: 'active-user', exp: Math.floor(Date.now() / 1000) - 10 }, config.jwtSecret);
  const noId = jwt.sign({ role: 'USER' }, config.jwtSecret, { expiresIn: '1m' });
  const request = async (path, authorization) => {
    const response = await fetch(`${base}${path}`, { headers: authorization ? { Authorization: authorization } : {} });
    return { status: response.status, body: await response.json() };
  };

  assert.equal((await request('/auth/me')).status, 401, 'missing token is rejected on protected route');
  assert.equal((await request('/auth/me', 'Basic abc')).status, 401, 'malformed auth scheme is rejected');
  assert.equal((await request('/auth/me', 'Bearer malformed.token')).status, 401, 'invalid token is rejected');
  assert.equal((await request('/auth/me', `Bearer ${expired}`)).status, 401, 'expired token is rejected');
  assert.equal((await request('/auth/me', `Bearer ${noId}`)).status, 401, 'token without user identity is rejected');
  assert.equal((await request('/auth/me', `Bearer ${generateToken({ id: 'missing-user' })}`)).status, 401, 'deleted account record is rejected');
  assert.equal((await request('/auth/me', `Bearer ${generateToken({ id: 'deleted-user' })}`)).status, 403, 'soft-deleted account is forbidden');
  assert.equal((await request('/auth/me', `Bearer ${generateToken({ id: 'suspended-user' })}`)).status, 403, 'suspended account is forbidden');

  const active = await request('/auth/me', `Bearer ${generateToken({ id: 'active-user' })}`);
  assert.equal(active.status, 200);
  assert.equal(active.body.data.user.id, 'active-user');
  assert.equal(JSON.stringify(active.body).includes('private-hash'), false, 'session response excludes password hash');

  for (const authorization of [undefined, 'Bearer malformed.token', `Bearer ${expired}`]) {
    const publicFeed = await request('/posts', authorization);
    assert.equal(publicFeed.status, 200, 'invalid or missing optional auth preserves public forum access');
    assert.equal(publicFeed.body.data.posts[0].currentUserVote, null);
  }
  const personalized = await request('/posts', `Bearer ${generateToken({ id: 'active-user' })}`);
  assert.equal(personalized.status, 200);
  assert.equal(personalized.body.data.posts[0].currentUserVote, null);

  console.log('Authentication middleware HTTP tests passed.');
} finally {
  prisma.user.findUnique = originals.user;
  prisma.forumPost.count = originals.postCount;
  prisma.forumPost.findMany = originals.postList;
  prisma.vote.findMany = originals.votes;
  await new Promise(resolve => server.close(resolve));
  await prisma.$disconnect();
}
