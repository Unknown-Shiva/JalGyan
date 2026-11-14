/** HTTP coverage for GET /api/auth/me/activity; Prisma is stubbed, no database used. */
import assert from 'node:assert/strict';
import http from 'node:http';
import app from './src/app.js';
import { prisma } from './src/config/db.js';
import { generateToken } from './src/utils/token.js';

const users = new Map([
  ['user-a', { id: 'user-a', email: 'a@test.invalid', name: 'A', role: 'USER', status: 'ACTIVE', deletedAt: null }],
  ['user-b', { id: 'user-b', email: 'b@test.invalid', name: 'B', role: 'USER', status: 'ACTIVE', deletedAt: null }],
]);
const posts = [
  { authorId: 'user-a', deletedAt: null }, { authorId: 'user-a', deletedAt: null },
  { authorId: 'user-a', deletedAt: new Date() }, { authorId: 'user-b', deletedAt: null },
];
const comments = [
  { authorId: 'user-a', postDeleted: false, postAuthorVisible: true, deletedAt: null, parentId: null },
  { authorId: 'user-a', postDeleted: false, postAuthorVisible: true, deletedAt: null, parentId: 'comment-1' }, // nested reply
  { authorId: 'user-a', postDeleted: false, postAuthorVisible: false, deletedAt: null, parentId: null }, // invisible post by suspended/deleted author
  { authorId: 'user-a', postDeleted: false, postAuthorVisible: true, deletedAt: new Date(), parentId: null },
  { authorId: 'user-a', postDeleted: true, postAuthorVisible: true, deletedAt: null, parentId: null },
  { authorId: 'user-b', postDeleted: false, postAuthorVisible: true, deletedAt: null, parentId: null },
];
const bookmarks = [
  { userId: 'user-a', status: 'PUBLISHED', articleDeleted: false },
  { userId: 'user-a', status: 'DRAFT', articleDeleted: false },
  { userId: 'user-a', status: 'PUBLISHED', articleDeleted: true },
  { userId: 'user-b', status: 'PUBLISHED', articleDeleted: false },
];
const votes = [
  { userId: 'user-a', postDeleted: false, postAuthorVisible: true },
  { userId: 'user-a', postDeleted: false, postAuthorVisible: false }, // vote on invisible post
  { userId: 'user-a', postDeleted: true, postAuthorVisible: true },
  { userId: 'user-b', postDeleted: false, postAuthorVisible: true },
];
const delegates = [
  ['user', 'findUnique'], ['forumPost', 'count'], ['comment', 'count'], ['bookmark', 'count'], ['vote', 'count'],
];
const originals = delegates.map(([model, method]) => [model, method, prisma[model][method]]);
const server = http.createServer(app);
async function request(base, token) {
  const response = await fetch(`${base}/auth/me/activity`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return { status: response.status, body: await response.json() };
}

try {
  prisma.user.findUnique = async ({ where }) => users.get(where.id) || null;
  prisma.forumPost.count = async ({ where }) => {
    assert.deepEqual(where.author, { deletedAt: null, status: 'ACTIVE' });
    return posts.filter(p => p.authorId === where.authorId && (where.deletedAt === undefined || p.deletedAt === where.deletedAt)).length;
  };
  prisma.comment.count = async ({ where }) => {
    assert.deepEqual(where.post.author, { deletedAt: null, status: 'ACTIVE' });
    return comments.filter(c => c.authorId === where.authorId && c.deletedAt === null && !c.postDeleted && c.postAuthorVisible).length;
  };
  prisma.bookmark.count = async ({ where }) => bookmarks.filter(b => b.userId === where.userId && b.status === where.article.status && !b.articleDeleted).length;
  prisma.vote.count = async ({ where }) => {
    assert.deepEqual(where.post.author, { deletedAt: null, status: 'ACTIVE' });
    return votes.filter(v => v.userId === where.userId && !v.postDeleted && v.postAuthorVisible).length;
  };

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const tokenA = generateToken({ id: 'user-a', role: 'USER' });
  const resultA = await request(base, tokenA);
  assert.equal(resultA.status, 200);
  assert.deepEqual(resultA.body.data.activity, { postsCount: 2, commentsCount: 2, bookmarksCount: 1, votesCount: 1 });
  assert.equal((await request(base)).status, 401);
  assert.equal((await request(base, 'invalid.token')).status, 401);
  const resultB = await request(base, generateToken({ id: 'user-b', role: 'USER' }));
  assert.deepEqual(resultB.body.data.activity, { postsCount: 1, commentsCount: 1, bookmarksCount: 1, votesCount: 1 });
  const empty = await request(base, generateToken({ id: 'empty-user', role: 'USER' }));
  assert.equal(empty.status, 401, 'unknown user session is rejected by requireAuth');
  users.set('empty-user', { id: 'empty-user', email: 'empty@test.invalid', role: 'USER', status: 'ACTIVE', deletedAt: null });
  assert.deepEqual((await request(base, generateToken({ id: 'empty-user', role: 'USER' }))).body.data.activity, { postsCount: 0, commentsCount: 0, bookmarksCount: 0, votesCount: 0 });
  console.log('Profile activity HTTP tests passed (authenticated counts, isolation, empty state, visibility filters, replies, and auth rejection).');
} finally {
  for (const [model, method, original] of originals) prisma[model][method] = original;
  await new Promise(resolve => server.close(resolve));
  await prisma.$disconnect();
}
