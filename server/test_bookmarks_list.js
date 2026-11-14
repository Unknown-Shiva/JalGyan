/** HTTP tests for GET /api/bookmarks using stubbed Prisma delegates. */
import assert from 'node:assert/strict';
import http from 'node:http';
import app from './src/app.js';
import { prisma } from './src/config/db.js';
import { generateToken } from './src/utils/token.js';

const users = new Map(['user-a', 'user-b'].map(id => [id, { id, name: id, email: `${id}@test.invalid`, password: 'private-hash', role: 'USER', status: 'ACTIVE', deletedAt: null }]));
const bookmarkRows = [
  { id: 'ba1', userId: 'user-a', createdAt: new Date('2026-01-01'), article: { id: 'a1', title: 'First', slug: 'first', summary: 'First summary', readTime: '4 min', coverImage: '/first.png', status: 'PUBLISHED', publishedAt: new Date('2025-12-20'), createdAt: new Date('2025-12-01'), deletedAt: null, category: { name: 'Water' }, author: { email: 'secret@x', password: 'hash' }, rejectionReason: null, viewsCount: 3 } },
  { id: 'ba2', userId: 'user-a', createdAt: new Date('2026-01-03'), article: { id: 'a2', title: 'Second', slug: 'second', summary: 'Second summary', readTime: null, coverImage: null, status: 'PUBLISHED', publishedAt: new Date('2025-12-22'), createdAt: new Date('2025-12-02'), deletedAt: null, category: { name: 'Reuse' }, author: { email: 'secret@x', password: 'hash' }, rejectionReason: null, viewsCount: 9 } },
  { id: 'ba3', userId: 'user-a', createdAt: new Date('2026-01-04'), article: { id: 'draft', title: 'Draft', status: 'DRAFT', deletedAt: null } },
  { id: 'ba4', userId: 'user-a', createdAt: new Date('2026-01-05'), article: { id: 'removed', title: 'Removed', status: 'PUBLISHED', deletedAt: new Date() } },
  { id: 'bb1', userId: 'user-b', createdAt: new Date('2026-01-06'), article: { id: 'b1', title: 'Other user', status: 'PUBLISHED', deletedAt: null } },
];
const original = { user: prisma.user.findUnique, bookmarks: prisma.bookmark.findMany };
const server = http.createServer(app);

try {
  prisma.user.findUnique = async ({ where }) => users.get(where.id) || null;
  prisma.bookmark.findMany = async ({ where, orderBy, select }) => {
    assert.equal(where.userId, 'user-a');
    assert.deepEqual(where.article, { status: 'PUBLISHED', deletedAt: null });
    assert.deepEqual(orderBy, [{ createdAt: 'desc' }, { id: 'desc' }]);
    assert.equal(select.article.select.author, undefined);
    assert.equal(select.article.select.rejectionReason, undefined);
    return bookmarkRows.filter(row => row.userId === where.userId && row.article.status === where.article.status && row.article.deletedAt === null)
      .sort((a,b) => b.createdAt-a.createdAt || b.id.localeCompare(a.id))
      .map(({ id, createdAt, article }) => ({ id, createdAt, article: {
        id: article.id, title: article.title, slug: article.slug, summary: article.summary,
        readTime: article.readTime, coverImage: article.coverImage, publishedAt: article.publishedAt,
        createdAt: article.createdAt, category: article.category,
      } }));
  };
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/bookmarks`;
  const request = async (token, suffix = '') => {
    const response = await fetch(`${url}${suffix}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return { status: response.status, body: await response.json() };
  };
  const tokenA = generateToken({ id: 'user-a', role: 'USER' });
  const tokenB = generateToken({ id: 'user-b', role: 'USER' });
  assert.equal((await request()).status, 401);
  const own = await request(tokenA, '?userId=user-b');
  assert.equal(own.status, 200);
  assert.deepEqual(own.body.data.bookmarks.map(item => item.id), ['ba2', 'ba1']);
  assert.deepEqual(own.body.data.bookmarks.map(item => item.article.id), ['a2', 'a1']);
  assert.equal(JSON.stringify(own.body).includes('private-hash'), false);
  assert.equal(JSON.stringify(own.body).includes('secret@x'), false);
  assert.equal(JSON.stringify(own.body).includes('rejectionReason'), false);
  // The stub verifies the authenticated identity is the sole query filter.
  prisma.bookmark.findMany = async ({ where }) => {
    assert.equal(where.userId, 'user-b');
    assert.deepEqual(where.article, { status: 'PUBLISHED', deletedAt: null });
    return [];
  };
  const other = await request(tokenB);
  assert.deepEqual(other.body.data.bookmarks, []);
  assert.equal((await request('invalid.token')).status, 401);
  console.log('Bookmark list HTTP tests passed.');
} finally {
  prisma.user.findUnique = original.user; prisma.bookmark.findMany = original.bookmarks;
  await new Promise(resolve => server.close(resolve)); await prisma.$disconnect();
}
