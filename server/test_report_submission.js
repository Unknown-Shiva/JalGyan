/** HTTP route tests for authenticated user-side report submission with mocked Prisma. */
import assert from 'node:assert/strict';
import http from 'node:http';
import app from './src/app.js';
import { prisma } from './src/config/db.js';
import { generateToken } from './src/utils/token.js';

const users = new Map([
  ['reporter', { id: 'reporter', name: 'Reporter', email: 'reporter@test.invalid', password: 'private-hash', role: 'USER', status: 'ACTIVE', deletedAt: null }],
  ['target-user', { id: 'target-user', name: 'Target', email: 'target@test.invalid', password: 'private-target-hash', role: 'USER', status: 'ACTIVE', deletedAt: null }],
  ['suspended-user', { id: 'suspended-user', name: 'Suspended', email: 'suspended@test.invalid', password: 'hidden', role: 'USER', status: 'SUSPENDED', deletedAt: null }],
  ['deleted-user', { id: 'deleted-user', name: 'Deleted', email: 'deleted@test.invalid', password: 'hidden', role: 'USER', status: 'ACTIVE', deletedAt: new Date() }],
]);
const posts = new Map([
  ['post-1', { id: 'post-1', authorId: 'target-user', deletedAt: null }],
  ['post-deleted', { id: 'post-deleted', authorId: 'target-user', deletedAt: new Date() }],
  ['post-hidden-author', { id: 'post-hidden-author', authorId: 'suspended-user', deletedAt: null }],
]);
const comments = new Map([
  ['comment-1', { id: 'comment-1', authorId: 'target-user', postId: 'post-1', deletedAt: null }],
  ['comment-deleted', { id: 'comment-deleted', authorId: 'target-user', postId: 'post-1', deletedAt: new Date() }],
  ['comment-on-deleted-post', { id: 'comment-on-deleted-post', authorId: 'target-user', postId: 'post-deleted', deletedAt: null }],
]);
const articles = new Map([
  ['article-1', { id: 'article-1', authorId: 'target-user', status: 'PUBLISHED', deletedAt: null }],
  ['article-draft', { id: 'article-draft', authorId: 'target-user', status: 'DRAFT', deletedAt: null }],
  ['article-deleted', { id: 'article-deleted', authorId: 'target-user', status: 'PUBLISHED', deletedAt: new Date() }],
  ['article-hidden-author', { id: 'article-hidden-author', authorId: 'suspended-user', status: 'PUBLISHED', deletedAt: null }],
]);

const originals = {
  userUnique: prisma.user.findUnique,
  userFirst: prisma.user.findFirst,
  postFirst: prisma.forumPost.findFirst,
  commentFirst: prisma.comment.findFirst,
  articleFirst: prisma.article.findFirst,
  reportCreate: prisma.report.create,
};
const server = http.createServer(app);
const reporterId = 'reporter';
let createdReports = [];

function visibleUser(id) {
  const user = users.get(id);
  return Boolean(user && !user.deletedAt && user.status === 'ACTIVE');
}

try {
  prisma.user.findUnique = async ({ where }) => users.get(where.id) || null;
  prisma.user.findFirst = async ({ where, select }) => {
    assert.deepEqual(select, { id: true });
    const user = users.get(where.id);
    return user && user.deletedAt === where.deletedAt && user.status === where.status ? { id: user.id } : null;
  };
  prisma.forumPost.findFirst = async ({ where, select }) => {
    assert.deepEqual(select, { id: true });
    assert.equal(where.deletedAt, null);
    assert.deepEqual(where.author, { deletedAt: null, status: 'ACTIVE' });
    const post = posts.get(where.id);
    return post && post.deletedAt === null && visibleUser(post.authorId) ? { id: post.id } : null;
  };
  prisma.comment.findFirst = async ({ where, select }) => {
    assert.deepEqual(select, { id: true });
    assert.equal(where.deletedAt, null);
    assert.deepEqual(where.author, { deletedAt: null, status: 'ACTIVE' });
    assert.deepEqual(where.post, { deletedAt: null, author: { deletedAt: null, status: 'ACTIVE' } });
    const comment = comments.get(where.id);
    const post = comment && posts.get(comment.postId);
    return comment && comment.deletedAt === null && visibleUser(comment.authorId) && post && post.deletedAt === null && visibleUser(post.authorId)
      ? { id: comment.id }
      : null;
  };
  prisma.article.findFirst = async ({ where, select }) => {
    assert.deepEqual(select, { id: true });
    assert.deepEqual(where, {
      id: where.id,
      status: 'PUBLISHED',
      deletedAt: null,
      author: { deletedAt: null, status: 'ACTIVE' },
    });
    const article = articles.get(where.id);
    return article && article.status === 'PUBLISHED' && article.deletedAt === null && visibleUser(article.authorId)
      ? { id: article.id }
      : null;
  };
  prisma.report.create = async ({ data, select }) => {
    assert.deepEqual(select, { id: true, targetType: true, reason: true, description: true, status: true, createdAt: true });
    assert.equal(data.reporterId, reporterId, 'reporter comes from req.user.id');
    assert.equal(Object.hasOwn(data, 'status'), false, 'status is set by the schema default');
    assert.equal(Object.hasOwn(data, 'moderatorId'), false);
    const fkFields = ['postId', 'commentId', 'articleId', 'targetUserId'].filter(field => Object.hasOwn(data, field));
    assert.equal(fkFields.length, 1, 'only the appropriate target foreign key is written');
    const report = {
      id: `report-${createdReports.length + 1}`,
      targetType: data.targetType,
      reason: data.reason,
      description: data.description,
      status: 'PENDING',
      createdAt: new Date('2026-11-14T00:00:00.000Z'),
    };
    createdReports.push({ ...data, ...report });
    return report;
  };

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const endpoint = `http://127.0.0.1:${server.address().port}/api/reports`;
  const token = id => generateToken({ id, role: 'USER' });
  const request = async (body, userId = reporterId) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(userId ? { Authorization: `Bearer ${token(userId)}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  };

  assert.equal((await request({ targetType: 'POST', targetId: 'post-1', reason: 'SPAM' }, null)).status, 401);
  assert.equal((await request({ targetType: 'POST', targetId: 'post-1', reason: 'SPAM' }, 'deleted-user')).status, 403);

  const postReport = await request({ targetType: 'POST', targetId: 'post-1', reason: 'SPAM', description: '  suspicious link  ' });
  assert.equal(postReport.status, 201);
  assert.deepEqual(postReport.body.data.report, {
    id: 'report-1', targetType: 'POST', reason: 'SPAM', description: 'suspicious link',
    status: 'PENDING', createdAt: '2026-11-14T00:00:00.000Z', targetId: 'post-1',
  });
  assert.equal(JSON.stringify(postReport.body).includes('password'), false);
  assert.equal(JSON.stringify(postReport.body).includes(reporterId), false);

  const commentReport = await request({ targetType: 'COMMENT', targetId: 'comment-1', reason: 'HARASSMENT' });
  assert.equal(commentReport.status, 201);
  const articleReport = await request({ targetType: 'ARTICLE', targetId: 'article-1', reason: 'MISINFORMATION' });
  assert.equal(articleReport.status, 201);
  const userReport = await request({ targetType: 'USER', targetId: 'target-user', reason: 'INAPPROPRIATE' });
  assert.equal(userReport.status, 201);
  assert.deepEqual(createdReports.slice(0, 4).map(({ reporterId: id, targetType, reason, postId, commentId, articleId, targetUserId }) => ({ id, targetType, reason, postId, commentId, articleId, targetUserId })), [
    { id: reporterId, targetType: 'POST', reason: 'SPAM', postId: 'post-1', commentId: undefined, articleId: undefined, targetUserId: undefined },
    { id: reporterId, targetType: 'COMMENT', reason: 'HARASSMENT', postId: undefined, commentId: 'comment-1', articleId: undefined, targetUserId: undefined },
    { id: reporterId, targetType: 'ARTICLE', reason: 'MISINFORMATION', postId: undefined, commentId: undefined, articleId: 'article-1', targetUserId: undefined },
    { id: reporterId, targetType: 'USER', reason: 'INAPPROPRIATE', postId: undefined, commentId: undefined, articleId: undefined, targetUserId: 'target-user' },
  ]);

  for (const targetId of ['missing', 'post-deleted', 'post-hidden-author']) {
    assert.equal((await request({ targetType: 'POST', targetId, reason: 'SPAM' })).status, 404);
  }
  for (const targetId of ['missing', 'comment-deleted', 'comment-on-deleted-post']) {
    assert.equal((await request({ targetType: 'COMMENT', targetId, reason: 'SPAM' })).status, 404);
  }
  for (const targetId of ['missing', 'article-draft', 'article-deleted', 'article-hidden-author']) {
    assert.equal((await request({ targetType: 'ARTICLE', targetId, reason: 'SPAM' })).status, 404);
  }
  for (const targetId of ['missing', 'suspended-user', 'deleted-user']) {
    assert.equal((await request({ targetType: 'USER', targetId, reason: 'SPAM' })).status, 404);
  }
  assert.equal((await request({ targetType: 'USER', targetId: reporterId, reason: 'SPAM' })).status, 400, 'self-reporting is rejected');

  assert.equal((await request({ targetType: 'VOTE', targetId: 'post-1', reason: 'SPAM' })).status, 400);
  assert.equal((await request({ targetType: 'POST', targetId: 'post-1', reason: 'FAKE' })).status, 400);
  assert.equal((await request({ targetType: 'POST', reason: 'SPAM' })).status, 400);
  assert.equal((await request({ targetType: 'POST', targetId: 'bad.id', reason: 'SPAM' })).status, 400);
  assert.equal((await request({ targetType: 'POST', targetId: 'post-1', reason: 'SPAM', reporterId: 'target-user' })).status, 400);
  assert.equal((await request({ targetType: 'POST', targetId: 'post-1', reason: 'SPAM', status: 'RESOLVED' })).status, 400);
  assert.equal((await request({ targetType: 'POST', targetId: 'post-1', reason: 'SPAM', moderatorId: 'target-user' })).status, 400);
  assert.equal((await request({ targetType: 'POST', targetId: 'post-1', reason: 'SPAM', description: 8 })).status, 400);
  assert.equal((await request({ targetType: 'POST', targetId: 'post-1', reason: 'SPAM', description: 'x'.repeat(2001) })).status, 400);
  assert.equal(createdReports.length, 4, 'invalid or unavailable reports are not created');

  console.log('User report submission HTTP tests passed.');
} finally {
  prisma.user.findUnique = originals.userUnique;
  prisma.user.findFirst = originals.userFirst;
  prisma.forumPost.findFirst = originals.postFirst;
  prisma.comment.findFirst = originals.commentFirst;
  prisma.article.findFirst = originals.articleFirst;
  prisma.report.create = originals.reportCreate;
  await new Promise(resolve => server.close(resolve));
  await prisma.$disconnect();
}
