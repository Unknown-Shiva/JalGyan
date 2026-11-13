/** HTTP route tests for POST /api/posts/:id/vote using mocked Prisma transactions. */
import assert from 'node:assert/strict';
import http from 'node:http';
import app from './src/app.js';
import { prisma } from './src/config/db.js';
import { generateToken } from './src/utils/token.js';

const users = new Map(['u1', 'u2'].map(id => [id, { id, email: `${id}@test.invalid`, name: id, role: 'USER', status: 'ACTIVE', deletedAt: null }]));
const posts = new Map(['p1', 'p2', 'deleted'].map(id => [id, { id, deletedAt: id === 'deleted' ? new Date() : null, authorId: id === 'p2' ? 'u2' : 'u1', upvotesCount: 0, downvotesCount: 0, netVoteScore: 0 }]));
const votes = new Map();
const originals = { user: prisma.user.findUnique, transaction: prisma.$transaction };
let raceCreate = false;
const key = (userId, postId) => `${userId}:${postId}`;
const server = http.createServer(app);
const transactionClient = {
  forumPost: {
    findFirst: async ({ where }) => {
      const post = posts.get(where.id);
      if (!post || post.deletedAt || users.get(post.authorId)?.status !== where.author.status || users.get(post.authorId)?.deletedAt !== where.author.deletedAt) return null;
      return post;
    },
    update: async ({ where, data }) => Object.assign(posts.get(where.id), data),
  },
  vote: {
    findUnique: async ({ where }) => votes.get(key(where.userId_postId.userId, where.userId_postId.postId)) || null,
    create: async ({ data }) => {
      const k = key(data.userId, data.postId);
      if (raceCreate) { raceCreate = false; votes.set(k, { ...data }); throw Object.assign(new Error('unique conflict'), { code: 'P2002' }); }
      if (votes.has(k)) throw Object.assign(new Error('unique conflict'), { code: 'P2002' });
      votes.set(k, { ...data }); return data;
    },
    update: async ({ where, data }) => Object.assign(votes.get(key(where.userId_postId.userId, where.userId_postId.postId)), data),
    delete: async ({ where }) => votes.delete(key(where.userId_postId.userId, where.userId_postId.postId)),
    count: async ({ where }) => [...votes.values()].filter(v => v.postId === where.postId && v.type === where.type).length,
  },
};

try {
  prisma.user.findUnique = async ({ where }) => users.get(where.id) || null;
  prisma.$transaction = async (callback) => callback(transactionClient);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/posts`;
  const call = async (postId, userId, body) => {
    const response = await fetch(`${base}/${postId}/vote`, { method: 'POST', headers: { ...(userId ? { Authorization: `Bearer ${generateToken({ id: userId, role: 'USER' })}` } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  const up = async id => (await call('p1', 'u1', { type: id })).body.data?.vote;
  assert.equal((await call('p1', null, { type: 'UPVOTE' })).status, 401);
  assert.equal((await call('missing', 'u1', { type: 'UPVOTE' })).status, 404);
  assert.equal((await call('deleted', 'u1', { type: 'UPVOTE' })).status, 404);
  assert.equal((await call('p1', 'u1', { type: 'UP' })).status, 400);
  assert.equal((await call('p1', 'u1', { type: 'UPVOTE', userId: 'u2' })).status, 400);
  assert.deepEqual(await up('UPVOTE'), { active: true, type: 'UPVOTE', upvotes: 1, downvotes: 0, score: 1 });
  assert.deepEqual(await up('DOWNVOTE'), { active: true, type: 'DOWNVOTE', upvotes: 0, downvotes: 1, score: -1 });
  assert.deepEqual(await up('UPVOTE'), { active: true, type: 'UPVOTE', upvotes: 1, downvotes: 0, score: 1 });
  assert.deepEqual(await up('UPVOTE'), { active: false, type: null, upvotes: 0, downvotes: 0, score: 0 });
  assert.deepEqual(await call('p1', 'u2', { type: 'DOWNVOTE' }).then(x => x.body.data.vote), { active: true, type: 'DOWNVOTE', upvotes: 0, downvotes: 1, score: -1 });
  assert.equal(votes.has(key('u1', 'p1')), false, 'one user cannot affect another user\'s vote row');
  await call('p1', 'u2', { type: 'UPVOTE' });
  assert.deepEqual(await call('p1', 'u2', { type: 'DOWNVOTE' }).then(x => x.body.data.vote), { active: true, type: 'DOWNVOTE', upvotes: 0, downvotes: 1, score: -1 });
  await call('p2', 'u1', { type: 'UPVOTE' });
  assert.equal(votes.get(key('u1', 'p2')).type, 'UPVOTE');
  raceCreate = true;
  assert.deepEqual(await call('p1', 'u1', { type: 'UPVOTE' }).then(x => x.body.data.vote), { active: false, type: null, upvotes: 0, downvotes: 1, score: -1 });
  assert.equal(posts.get('p1').upvotesCount, 0); assert.equal(posts.get('p1').downvotesCount, 1);
  console.log('Forum vote HTTP tests passed.');
} finally {
  prisma.user.findUnique = originals.user; prisma.$transaction = originals.transaction;
  await new Promise(resolve => server.close(resolve)); await prisma.$disconnect();
}
