/** HTTP tests for authenticated bookmark add/remove with mocked Prisma. */
import assert from 'node:assert/strict';
import http from 'node:http';
import app from './src/app.js';
import { prisma } from './src/config/db.js';
import { generateToken } from './src/utils/token.js';

const users = new Map(['user-a','user-b'].map(id => [id, { id, name: id, email: `${id}@test.invalid`, password: 'hidden', role: 'USER', status: 'ACTIVE', deletedAt: null }]));
const articles = new Map([
  ['article-1',{ id:'article-1',status:'PUBLISHED',deletedAt:null }],
  ['draft-1',{ id:'draft-1',status:'DRAFT',deletedAt:null }],
  ['deleted-1',{ id:'deleted-1',status:'PUBLISHED',deletedAt:new Date() }],
]);
const bookmarks = new Map(); let sequence=0, conflictNextCreate=false, listCalls=0;
const key=(userId,articleId)=>`${userId}:${articleId}`;
const originals={ user:prisma.user.findUnique, article:prisma.article.findFirst, list:prisma.bookmark.findMany, create:prisma.bookmark.create, find:prisma.bookmark.findUnique, remove:prisma.bookmark.deleteMany };
const server=http.createServer(app);

try {
  prisma.user.findUnique=async ({where})=>users.get(where.id)||null;
  prisma.article.findFirst=async ({where})=>{ const a=articles.get(where.id); return a&&a.status===where.status&&a.deletedAt===null?{id:a.id}:null; };
  prisma.bookmark.findMany=async ({where})=>{ listCalls++; return [...bookmarks.values()].filter(b=>b.userId===where.userId).map(b=>({id:b.id,createdAt:b.createdAt,article:{id:b.articleId,title:b.articleId,category:{name:'Water'}}})); };
  prisma.bookmark.create=async ({data})=>{
    const k=key(data.userId,data.articleId);
    if(conflictNextCreate){conflictNextCreate=false; bookmarks.set(k,{id:`bm${++sequence}`,...data,createdAt:new Date()}); throw Object.assign(new Error('unique conflict'),{code:'P2002'});}
    if(bookmarks.has(k)) throw Object.assign(new Error('unique conflict'),{code:'P2002'});
    const record={id:`bm${++sequence}`,...data,createdAt:new Date()}; bookmarks.set(k,record); return record;
  };
  prisma.bookmark.findUnique=async ({where})=>bookmarks.get(key(where.userId_articleId.userId,where.userId_articleId.articleId))||null;
  prisma.bookmark.deleteMany=async ({where})=>{const k=key(where.userId,where.articleId);const existed=bookmarks.delete(k);return {count:existed?1:0};};
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}/api/bookmarks`;
  const token=id=>generateToken({id,role:'USER'});
  const call=async(method,id,userId,body)=>{const response=await fetch(`${base}/${id}`,{method,headers:{...(userId?{Authorization:`Bearer ${token(userId)}`}:{ }),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()};};

  assert.equal((await call('POST','article-1',null)).status,401);
  const added=await call('POST','article-1','user-a'); assert.equal(added.status,201); assert.equal(added.body.data.created,true); assert.equal(added.body.data.bookmark.articleId,'article-1');
  const duplicate=await call('POST','article-1','user-a'); assert.equal(duplicate.status,200); assert.equal(duplicate.body.data.created,false); assert.equal(bookmarks.size,1);
  conflictNextCreate=true;
  const concurrent=await call('POST','article-1','user-b'); assert.equal(concurrent.status,200); assert.equal(concurrent.body.data.created,false); assert.ok(bookmarks.has(key('user-b','article-1')));
  assert.equal((await call('POST','missing','user-a')).status,404);
  assert.equal((await call('POST','draft-1','user-a')).status,404);
  assert.equal((await call('POST','deleted-1','user-a')).status,404);
  assert.equal((await call('POST','bad.id','user-a')).status,400);
  assert.equal((await call('POST','article-1','user-a',{userId:'user-b',articleId:'draft-1'})).status,400);
  assert.equal((await call('DELETE','article-1',null)).status,401);
  const removedOther=await call('DELETE','article-1','user-a'); assert.equal(removedOther.body.data.removed,true); assert.equal(bookmarks.has(key('user-b','article-1')),true);
  const absent=await call('DELETE','article-1','user-a'); assert.deepEqual(absent.body.data,{articleId:'article-1',removed:false});
  assert.equal((await call('DELETE','bad.id','user-a')).status,400);
  const list=await fetch(base,{headers:{Authorization:`Bearer ${token('user-b')}`}}); const listed=await list.json(); assert.equal(list.status,200); assert.equal(listed.data.bookmarks.length,1); assert.equal(listCalls,1);
  assert.equal(JSON.stringify(added.body).includes('hidden'),false);
  console.log('Bookmark mutation HTTP tests passed.');
} finally {
  prisma.user.findUnique=originals.user;prisma.article.findFirst=originals.article;prisma.bookmark.findMany=originals.list;
  prisma.bookmark.create=originals.create;prisma.bookmark.findUnique=originals.find;prisma.bookmark.deleteMany=originals.remove;
  await new Promise(resolve=>server.close(resolve));await prisma.$disconnect();
}
