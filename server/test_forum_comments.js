/** HTTP route tests for comment creation, replies, edits, soft deletes, and detail visibility. */
import assert from 'node:assert/strict';
import http from 'node:http';
import app from './src/app.js';
import { prisma } from './src/config/db.js';
import { generateToken } from './src/utils/token.js';

const users = new Map(['u1', 'u2', 'u3'].map(id => [id, { id, name: id, email: `${id}@test.invalid`, location: null, role: 'USER', status: 'ACTIVE', deletedAt: null, password: 'secret' }]));
const posts = new Map([
  ['p1', { id: 'p1', authorId: 'u1', title: 'T', body: 'B', category: 'Community', tags: [], deletedAt: null, createdAt: new Date(), updatedAt: new Date(), upvotesCount: 0, downvotesCount: 0, netVoteScore: 0, commentsCount: 0, author: { id: 'u1', name: 'u1', location: null } }],
  ['p2', { id: 'p2', authorId: 'u2', title: 'T2', body: 'B2', category: 'Community', tags: [], deletedAt: null, createdAt: new Date(), updatedAt: new Date(), upvotesCount: 0, downvotesCount: 0, netVoteScore: 0, commentsCount: 0, author: { id: 'u2', name: 'u2', location: null } }],
  ['gone', { id: 'gone', authorId: 'u1', deletedAt: new Date() }],
]);
const comments = new Map(); let nextId = 1;
const originals = {
  user: prisma.user.findUnique,
  post: prisma.forumPost.findFirst,
  commentFind: prisma.comment.findFirst,
  commentCreate: prisma.comment.create,
  commentUpdate: prisma.comment.updateMany,
};
const server = http.createServer(app);
const publicUser = id => ({ id, name: id, location: null });
const matchesUserFilter = (id, filter) => !filter || (users.get(id)?.status === filter.status && users.get(id)?.deletedAt === filter.deletedAt);

try {
  prisma.user.findUnique = async ({ where }) => users.get(where.id) || null;
  prisma.forumPost.findFirst = async ({ where, select }) => {
    const post = posts.get(where.id);
    if (!post || post.deletedAt || !matchesUserFilter(post.authorId, where.author)) return null;
    if (select?.comments) {
      const visible = [...comments.values()].filter(c => c.postId === post.id && c.parentId === null && !c.deletedAt && matchesUserFilter(c.authorId, select.comments.where.author));
      post.comments = visible.sort((a,b) => a.createdAt-b.createdAt || a.id.localeCompare(b.id)).map(c => ({ ...c, author: publicUser(c.authorId), replies: [...comments.values()].filter(r => r.parentId === c.id && r.postId === post.id && !r.deletedAt && matchesUserFilter(r.authorId, select.comments.select.replies.where.author)).sort((a,b)=>a.createdAt-b.createdAt || a.id.localeCompare(b.id)).map(r=>({...r,author:publicUser(r.authorId)})) }));
    }
    return post;
  };
  prisma.comment.findFirst = async ({ where }) => {
    const c = comments.get(where.id);
    if (!c || c.deletedAt || c.postId !== where.postId && where.postId || Object.hasOwn(where, 'parentId') && c.parentId !== where.parentId) return null;
    if (where.authorId && c.authorId !== where.authorId) return null;
    if (where.post && (posts.get(c.postId)?.deletedAt || !matchesUserFilter(posts.get(c.postId)?.authorId, where.post.author))) return null;
    if (where.author && !matchesUserFilter(c.authorId, where.author)) return null;
    return { ...c, author: publicUser(c.authorId) };
  };
  prisma.comment.create = async ({ data }) => {
    const c = { id: `c${nextId++}`, ...data, deletedAt: null, createdAt: new Date(), updatedAt: new Date() };
    comments.set(c.id, c); return { ...c, author: publicUser(c.authorId) };
  };
  prisma.comment.updateMany = async ({ where, data }) => {
    const c = comments.get(where.id);
    if (!c || c.authorId !== where.authorId || c.deletedAt) return { count: 0 };
    Object.assign(c, data); return { count: 1 };
  };
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const token = id => generateToken({ id, role: 'USER' });
  const call = async (method, path, userId, body) => {
    const response = await fetch(`${base}${path}`, { method, headers: { ...(userId ? { Authorization: `Bearer ${token(userId)}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  };

  assert.equal((await call('POST','/posts/p1/comments',null,{text:'hello world'})).status,401);
  assert.equal((await call('POST','/posts/nope/comments','u1',{text:'hello world'})).status,404);
  assert.equal((await call('POST','/posts/gone/comments','u1',{text:'hello world'})).status,404);
  assert.equal((await call('POST','/posts/p1/comments','u1',{text:'  '})).status,400);
  assert.equal((await call('POST','/posts/p1/comments','u1',{text:'comment text',authorId:'u2'})).status,400);
  const top = await call('POST','/posts/p1/comments','u1',{text:'  top level comment  '});
  assert.equal(top.status,201); assert.equal(top.body.data.comment.text,'top level comment'); assert.equal(top.body.data.comment.author.id,'u1'); assert.equal('password' in top.body.data.comment.author,false);
  const parentId = top.body.data.comment.id;
  const reply = await call('POST','/posts/p1/comments','u2',{text:'nested reply',parentId});
  assert.equal(reply.status,201); assert.equal(reply.body.data.comment.parentId,parentId); assert.equal(reply.body.data.comment.author.id,'u2');
  assert.equal((await call('POST','/posts/p2/comments','u2',{text:'cross-post reply',parentId})).status,400);
  assert.equal((await call('POST','/posts/p1/comments','u2',{text:'reply to reply',parentId:reply.body.data.comment.id})).status,400);
  assert.equal((await call('PATCH',`/comments/${parentId}`,'u2',{text:'take over'})).status,404);
  assert.equal((await call('PATCH',`/comments/${parentId}`,'u1',{text:'edited comment',authorId:'u2'})).status,400);
  const edited = await call('PATCH',`/comments/${parentId}`,'u1',{text:' edited text '});
  assert.equal(edited.status,200,JSON.stringify(edited));
  assert.equal(edited.body.data.comment.text,'edited text');
  assert.equal((await call('DELETE',`/comments/${parentId}`,'u2')).status,404);
  assert.equal((await call('DELETE',`/comments/${parentId}`,'u1')).status,200);
  assert.ok(comments.get(parentId).deletedAt instanceof Date);
  const detail = await call('GET','/posts/p1',null);
  assert.equal(detail.status,200); assert.equal(detail.body.data.post.comments.some(c=>c.id===parentId),false);
  assert.equal(comments.get(reply.body.data.comment.id).deletedAt,null,'soft deletion preserves the reply record');
  assert.equal((await call('DELETE',`/comments/${reply.body.data.comment.id}`,'u2')).status,200);
  assert.equal((await call('PATCH',`/comments/${reply.body.data.comment.id}`,'u2',{text:'after delete'})).status,404);
  console.log('Forum comments HTTP tests passed.');
} finally {
  prisma.user.findUnique=originals.user; prisma.forumPost.findFirst=originals.post;
  prisma.comment.findFirst=originals.commentFind; prisma.comment.create=originals.commentCreate; prisma.comment.updateMany=originals.commentUpdate;
  await new Promise(resolve=>server.close(resolve)); await prisma.$disconnect();
}
