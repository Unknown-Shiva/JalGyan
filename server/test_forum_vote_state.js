/** Public forum HTTP tests for current-user vote personalization using mocked Prisma. */
import assert from 'node:assert/strict';
import http from 'node:http';
import app from './src/app.js';
import { prisma } from './src/config/db.js';
import { generateToken } from './src/utils/token.js';

const user = { id: 'viewer', name: 'Viewer', email: 'viewer@test.invalid', role: 'USER', status: 'ACTIVE', deletedAt: null, password: 'secret' };
const posts = [
  { id: 'p-up', title: 'Water', body: 'Water content', category: 'Household', tags: [], upvotesCount: 2, downvotesCount: 0, netVoteScore: 2, commentsCount: 0, createdAt: new Date('2026-01-03'), updatedAt: new Date(), author: { id: 'author', name: 'Author', location: null } },
  { id: 'p-down', title: 'Rain', body: 'Rain content', category: 'Rainwater', tags: [], upvotesCount: 0, downvotesCount: 1, netVoteScore: -1, commentsCount: 0, createdAt: new Date('2026-01-02'), updatedAt: new Date(), author: { id: 'author', name: 'Author', location: null } },
  { id: 'p-none', title: 'Ground', body: 'Ground content', category: 'Groundwater', tags: [], upvotesCount: 0, downvotesCount: 0, netVoteScore: 0, commentsCount: 0, createdAt: new Date('2026-01-01'), updatedAt: new Date(), author: { id: 'author', name: 'Author', location: null } },
];
const votes = [
  { postId: 'p-up', userId: 'viewer', type: 'UPVOTE' },
  { postId: 'p-up', userId: 'other', type: 'DOWNVOTE' },
  { postId: 'p-down', userId: 'viewer', type: 'DOWNVOTE' },
];
const original = { user: prisma.user.findUnique, count: prisma.forumPost.count, list: prisma.forumPost.findMany, detail: prisma.forumPost.findFirst, voteList: prisma.vote.findMany, vote: prisma.vote.findUnique };
const server = http.createServer(app);
let batchCalls = 0;
try {
  prisma.user.findUnique = async ({ where }) => where.id === user.id ? user : null;
  prisma.forumPost.count = async ({ where }) => posts.filter(p => (!where.category || p.category === where.category) && (!where.OR || where.OR.some(term => Object.values(term)[0].contains.toLowerCase().split(' ').every(w => `${p.title} ${p.body}`.toLowerCase().includes(w))))).length;
  prisma.forumPost.findMany = async ({ where, skip, take, orderBy }) => {
    let rows = posts.filter(p => (!where.category || p.category === where.category) && (!where.OR || where.OR.some(term => Object.values(term)[0].contains.toLowerCase().split(' ').every(w => `${p.title} ${p.body}`.toLowerCase().includes(w)))));
    if (orderBy[0].createdAt) rows = rows.sort((a,b) => orderBy[0].createdAt === 'desc' ? b.createdAt-a.createdAt : a.createdAt-b.createdAt);
    return rows.slice(skip, skip+take);
  };
  prisma.forumPost.findFirst = async ({ where }) => posts.find(p => p.id === where.id) || null;
  prisma.vote.findMany = async ({ where, select }) => {
    batchCalls++;
    assert.equal(where.userId, 'viewer'); assert.deepEqual(select, { postId: true, type: true });
    return votes.filter(v => v.userId === where.userId && where.postId.in.includes(v.postId)).map(({postId,type}) => ({postId,type}));
  };
  prisma.vote.findUnique = async ({ where, select }) => {
    const pair = where.userId_postId;
    assert.deepEqual(select, { type: true });
    return votes.find(v => v.userId === pair.userId && v.postId === pair.postId) || null;
  };
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/posts`;
  const token = generateToken({ id: user.id, role: 'USER' });
  const get = async (url, auth = false) => { const response = await fetch(`${base}${url}`, { headers: auth ? { Authorization: `Bearer ${token}` } : {} }); return { status: response.status, body: await response.json() }; };

  let result = await get('', true);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.data.posts.map(p => p.currentUserVote), ['UPVOTE','DOWNVOTE',null]);
  assert.equal(batchCalls, 1, 'one batched vote query for the feed page');
  assert.equal(JSON.stringify(result.body).includes('userId'), false);
  assert.equal(JSON.stringify(result.body).includes('other'), false);
  result = await get('?page=1&limit=1&category=Rainwater');
  assert.equal(result.body.data.posts[0].id, 'p-down'); assert.equal(result.body.data.posts[0].currentUserVote, null);
  result = await get('?category=missing', true); assert.equal(result.body.data.posts.length, 0); assert.deepEqual(result.body.data.pagination.total, 0);
  result = await get('/p-up', true); assert.equal(result.body.data.post.currentUserVote, 'UPVOTE');
  assert.equal(JSON.stringify(result.body).includes('userId'), false);
  result = await get('/p-down'); assert.equal(result.body.data.post.currentUserVote, null);
  result = await get('/p-none', true); assert.equal(result.body.data.post.currentUserVote, null);
  console.log('Forum vote state HTTP tests passed.');
} finally {
  prisma.user.findUnique=original.user; prisma.forumPost.count=original.count; prisma.forumPost.findMany=original.list;
  prisma.forumPost.findFirst=original.detail; prisma.vote.findMany=original.voteList; prisma.vote.findUnique=original.vote;
  await new Promise(resolve=>server.close(resolve)); await prisma.$disconnect();
}
