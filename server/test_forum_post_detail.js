/** HTTP route tests for GET /api/posts/:id with stubbed Prisma. */
import assert from 'node:assert/strict';
import http from 'node:http';
import app from './src/app.js';
import { prisma } from './src/config/db.js';

const author = { id: 'u1', name: 'Author', location: 'Pune' };
const commenter = { id: 'u2', name: 'Commenter', location: null };
const reply = { id: 'r1', text: 'Nested reply', postId: 'p1', parentId: 'c1', createdAt: new Date('2026-01-02'), author: commenter };
const comment = { id: 'c1', text: 'Top level', postId: 'p1', parentId: null, createdAt: new Date('2026-01-01'), author: commenter, replies: [reply] };
const post = { id: 'p1', title: 'Title', body: 'Details', category: 'Community', tags: ['water'], upvotesCount: 3, downvotesCount: 1, netVoteScore: 2, commentsCount: 2, createdAt: new Date(), updatedAt: new Date(), author, comments: [comment] };
const original = prisma.forumPost.findFirst;
const server = http.createServer(app);

try {
  prisma.forumPost.findFirst = async ({ where, select }) => {
    assert.equal(where.deletedAt, null);
    assert.deepEqual(where.author, { deletedAt: null, status: 'ACTIVE' });
    assert.equal(select.author.select.password, undefined);
    assert.equal(select.comments.where.parentId, null);
    if (where.id === 'p1') {
      assert.equal(select.comments.select.replies.where.postId, 'p1');
      assert.equal(select.comments.select.replies.where.deletedAt, null);
    }
    if (where.id !== 'p1') return null;
    if (where.id === 'deleted' || where.id === 'suspended') return null;
    return post;
  };
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/posts`;
  const get = async id => { const response = await fetch(`${base}/${id}`); return { status: response.status, body: await response.json() }; };
  const success = await get('p1');
  assert.equal(success.status, 200);
  assert.equal(success.body.data.post.title, 'Title');
  assert.deepEqual(success.body.data.post.votes, { upvotes: 3, downvotes: 1, score: 2 });
  assert.equal(success.body.data.post.comments[0].text, 'Top level');
  assert.equal(success.body.data.post.comments[0].replies[0].parentId, 'c1');
  assert.equal('password' in success.body.data.post.author, false);
  assert.equal('password' in success.body.data.post.comments[0].author, false);
  assert.equal('password' in success.body.data.post.comments[0].replies[0].author, false);
  for (const id of ['missing', 'deleted', 'suspended']) assert.equal((await get(id)).status, 404);
  console.log('Forum post detail HTTP tests passed.');
} finally {
  prisma.forumPost.findFirst = original;
  await new Promise(resolve => server.close(resolve));
  await prisma.$disconnect();
}
