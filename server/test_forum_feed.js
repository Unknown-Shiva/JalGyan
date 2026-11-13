/** HTTP route tests for GET /api/posts using stubbed Prisma delegates. */
import assert from 'node:assert/strict';
import http from 'node:http';
import app from './src/app.js';
import { prisma } from './src/config/db.js';

const fixtures = [
  { id: 'a', title: 'Water reuse', body: 'Save water at home', category: 'Household', tags: [], netVoteScore: 2, commentsCount: 1, createdAt: new Date('2026-01-03'), deletedAt: null, author: { id: 'u1', name: 'A', location: 'Pune', status: 'ACTIVE', deletedAt: null, password: 'secret' } },
  { id: 'b', title: 'Rain harvesting', body: 'Roof collection', category: 'Rainwater', tags: [], netVoteScore: 8, commentsCount: 0, createdAt: new Date('2026-01-02'), deletedAt: null, author: { id: 'u2', name: 'B', location: null, status: 'ACTIVE', deletedAt: null, password: 'secret' } },
  { id: 'c', title: 'Deleted', body: 'hidden', category: 'Household', tags: [], netVoteScore: 99, commentsCount: 0, createdAt: new Date('2026-01-04'), deletedAt: new Date(), author: { id: 'u1', name: 'A', status: 'ACTIVE', deletedAt: null } },
  { id: 'd', title: 'Suspended author', body: 'hidden', category: 'Household', tags: [], netVoteScore: 99, commentsCount: 0, createdAt: new Date('2026-01-05'), deletedAt: null, author: { id: 'u3', name: 'C', status: 'SUSPENDED', deletedAt: null } },
  { id: 'e', title: 'Removed author', body: 'hidden', category: 'Household', tags: [], netVoteScore: 99, commentsCount: 0, createdAt: new Date('2026-01-06'), deletedAt: null, author: { id: 'u4', name: 'D', status: 'ACTIVE', deletedAt: new Date() } },
];
const originalCount = prisma.forumPost.count, originalFind = prisma.forumPost.findMany;
const server = http.createServer(app);
const matches = (post, where) => !post.deletedAt && post.author.status === 'ACTIVE' && !post.author.deletedAt && (!where.category || post.category === where.category) && (!where.OR || where.OR.some(condition => Object.values(condition)[0].contains.toLowerCase().split(' ').every(word => `${post.title} ${post.body}`.toLowerCase().includes(word))));

try {
  prisma.forumPost.count = async ({ where }) => fixtures.filter(post => matches(post, where)).length;
  prisma.forumPost.findMany = async ({ where, skip, take, orderBy }) => {
    const rows = fixtures.filter(post => matches(post, where));
    const sort = orderBy[0];
    rows.sort((a, b) => sort.createdAt ? (sort.createdAt === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt) : b.netVoteScore - a.netVoteScore || b.createdAt - a.createdAt);
    return rows.slice(skip, skip + take).map(({ password, author, ...post }) => ({ ...post, author: { id: author.id, name: author.name, location: author.location ?? null } }));
  };
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/posts`;
  const get = async query => { const res = await fetch(`${base}${query}`); return { status: res.status, body: await res.json() }; };

  let response = await get('');
  assert.equal(response.status, 200); assert.deepEqual(response.body.data.pagination, { page: 1, limit: 10, total: 2, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
  assert.equal(response.body.data.posts.length, 2); assert.equal('password' in response.body.data.posts[0].author, false);
  response = await get('?page=2&limit=1'); assert.equal(response.body.data.posts[0].id, 'b'); assert.equal(response.body.data.pagination.hasPreviousPage, true);
  response = await get('?limit=500'); assert.equal(response.status, 400);
  for (const bad of ['?page=0', '?page=-1', '?page=nope', '?limit=0']) assert.equal((await get(bad)).status, 400);
  response = await get('?search=water'); assert.equal(response.body.data.posts.length, 1);
  response = await get('?category=Nope'); assert.equal(response.body.data.pagination.total, 0); assert.equal(response.body.data.pagination.totalPages, 0);
  response = await get('?sort=popular'); assert.equal(response.body.data.posts[0].id, 'b');
  response = await get('?sort=oldest'); assert.equal(response.body.data.posts[0].id, 'b');
  assert.equal((await get('?sort=random')).status, 400);
  assert.equal((await get('?page=1&limit=50')).body.data.pagination.limit, 50);
  console.log('Forum feed HTTP tests passed.');
} finally {
  prisma.forumPost.count = originalCount; prisma.forumPost.findMany = originalFind;
  await new Promise(resolve => server.close(resolve)); await prisma.$disconnect();
}
