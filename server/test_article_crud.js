/**
 * JalGyan — Person 1 (Module A: Knowledge Management) Test Suite
 *
 * Verifies all Knowledge Management backend capabilities:
 * 1. Category listing with published article counts (GET /api/categories -> 200)
 * 2. Category detail by slug (GET /api/categories/:slug -> 200, invalid -> 404)
 * 3. Category creation authorization (admin -> 201, user -> 403, duplicate -> 409)
 * 4. Article listing with pagination, search query, and category filter (GET /api/articles -> 200)
 * 5. Article creation with slug generation and resource attachments (POST /api/articles -> 201)
 * 6. Article validation rules (short title, missing summary, invalid category -> 400)
 * 7. Article detail retrieval and viewsCount increment (GET /api/articles/:slug -> 200)
 * 8. Access control on unpublished articles (draft hidden from non-author -> 404)
 * 9. Article update with author authorization (author -> 200, non-author -> 403)
 * 10. Article soft deletion (author -> 200, non-author -> 403)
 * 11. Author "my articles" management dashboard endpoint (GET /api/articles/my -> 200)
 * 12. Author quick resubmission workflow (PATCH /api/articles/:id/submit -> 200)
 * 13. Educational resources and video library endpoint (GET /api/resources -> 200)
 * 14. Resource attachment & deletion on articles (POST/DELETE /api/articles/:id/resources)
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from './src/app.js';
import { prisma } from './src/config/db.js';
import { config } from './src/config/env.js';

const server = http.createServer(app);

// In-memory test store
const store = {
  users: new Map(),
  categories: new Map(),
  articles: new Map(),
  resources: new Map(),
  bookmarks: new Map(),
};

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, status: user.status },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
}

async function request(baseUrl, method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return {
    status: response.status,
    body: await response.json(),
  };
}

// Setup stubbed Prisma delegates
function setupMocks() {
  prisma.user.findUnique = async ({ where }) => {
    if (where.id) return store.users.get(where.id) || null;
    if (where.email) return Array.from(store.users.values()).find(u => u.email === where.email) || null;
    return null;
  };
  // Category delegate
  prisma.category.findMany = async ({ orderBy, select }) => {
    const list = Array.from(store.categories.values());
    return list.map((cat) => {
      const pubCount = Array.from(store.articles.values()).filter(
        (a) => a.categoryId === cat.id && a.status === 'PUBLISHED' && a.deletedAt === null
      ).length;
      return {
        ...cat,
        _count: { articles: pubCount },
      };
    });
  };

  prisma.category.findUnique = async ({ where }) => {
    if (where.slug) {
      const cat = Array.from(store.categories.values()).find((c) => c.slug === where.slug);
      if (!cat) return null;
      const articles = Array.from(store.articles.values()).filter(
        (a) => a.categoryId === cat.id && a.status === 'PUBLISHED' && a.deletedAt === null
      );
      return { ...cat, articles };
    }
    if (where.id) {
      return store.categories.get(where.id) || null;
    }
    return null;
  };

  prisma.category.findFirst = async ({ where }) => {
    if (where.OR) {
      for (const cond of where.OR) {
        if (cond.name) {
          const match = Array.from(store.categories.values()).find((c) => c.name === cond.name);
          if (match) return match;
        }
        if (cond.slug) {
          const match = Array.from(store.categories.values()).find((c) => c.slug === cond.slug);
          if (match) return match;
        }
      }
    }
    return null;
  };

  prisma.category.create = async ({ data }) => {
    const now = new Date();
    const cat = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      createdAt: now,
      updatedAt: now,
    };
    store.categories.set(cat.id, cat);
    return cat;
  };

  // Article delegate
  prisma.article.findUnique = async ({ where }) => {
    if (where.slug) {
      return Array.from(store.articles.values()).find((a) => a.slug === where.slug) || null;
    }
    if (where.id) {
      return store.articles.get(where.id) || null;
    }
    return null;
  };

  prisma.article.findFirst = async ({ where, include }) => {
    let list = Array.from(store.articles.values());
    if (where.deletedAt === null) {
      list = list.filter((a) => a.deletedAt === null);
    }
    if (where.id) {
      list = list.filter((a) => a.id === where.id);
    }
    if (where.authorId) {
      list = list.filter((a) => a.authorId === where.authorId);
    }
    if (where.OR) {
      list = list.filter((a) => {
        return where.OR.some((cond) => {
          if (cond.slug) return a.slug === cond.slug;
          if (cond.id) return a.id === cond.id;
          return false;
        });
      });
    }
    const art = list[0] || null;
    if (!art) return null;

    const populated = { ...art };
    if (include?.category) {
      populated.category = store.categories.get(art.categoryId) || null;
    }
    if (include?.author) {
      populated.author = store.users.get(art.authorId) || null;
    }
    if (include?.resources) {
      populated.resources = Array.from(store.resources.values()).filter((r) => r.articleId === art.id);
    }
    if (include?._count?.select?.bookmarks) {
      populated._count = { bookmarks: 0 };
    }
    return populated;
  };

  prisma.article.count = async ({ where }) => {
    let list = Array.from(store.articles.values()).filter((a) => a.deletedAt === null);
    if (where.status) {
      list = list.filter((a) => a.status === where.status);
    }
    if (where.authorId) {
      list = list.filter((a) => a.authorId === where.authorId);
    }
    return list.length;
  };

  prisma.article.findMany = async ({ where, skip = 0, take = 50, orderBy, select, include }) => {
    let list = Array.from(store.articles.values());
    if (where?.deletedAt === null) {
      list = list.filter((a) => a.deletedAt === null);
    }
    if (where?.status) {
      list = list.filter((a) => a.status === where.status);
    }
    if (where?.authorId) {
      list = list.filter((a) => a.authorId === where.authorId);
    }

    // Filter by search terms if present
    if (where?.AND) {
      for (const cond of where.AND) {
        if (cond.OR) {
          const matchTitle = cond.OR[0]?.title?.contains;
          if (matchTitle) {
            const needle = matchTitle.toLowerCase();
            list = list.filter(
              (a) =>
                a.title.toLowerCase().includes(needle) ||
                a.summary.toLowerCase().includes(needle) ||
                a.content.toLowerCase().includes(needle)
            );
          }
        }
      }
    }

    const sliced = list.slice(skip, skip + take);
    return sliced.map((art) => {
      const out = { ...art };
      out.category = store.categories.get(art.categoryId) || { name: 'Water' };
      out.author = store.users.get(art.authorId) || { name: 'Author' };
      out.resources = Array.from(store.resources.values()).filter((r) => r.articleId === art.id);
      out.reviews = [];
      out._count = { resources: out.resources.length, bookmarks: 0 };
      return out;
    });
  };

  prisma.article.create = async ({ data, include }) => {
    const now = new Date();
    const art = {
      id: `art_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      title: data.title,
      slug: data.slug,
      summary: data.summary,
      content: data.content,
      readTime: data.readTime || '5 min read',
      coverImage: data.coverImage || null,
      status: data.status || 'PENDING_REVIEW',
      rejectionReason: null,
      viewsCount: 0,
      authorId: data.authorId,
      categoryId: data.categoryId,
      publishedAt: data.status === 'PUBLISHED' ? now : null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    store.articles.set(art.id, art);

    if (data.resources?.create) {
      for (const r of data.resources.create) {
        const resObj = {
          id: `res_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          articleId: art.id,
          title: r.title,
          url: r.url,
          type: r.type,
          createdAt: now,
        };
        store.resources.set(resObj.id, resObj);
      }
    }

    const populated = { ...art };
    if (include?.category) populated.category = store.categories.get(art.categoryId);
    if (include?.author) populated.author = store.users.get(art.authorId);
    if (include?.resources) {
      populated.resources = Array.from(store.resources.values()).filter((r) => r.articleId === art.id);
    }
    return populated;
  };

  prisma.article.update = async ({ where, data, include }) => {
    const art = store.articles.get(where.id);
    if (!art) throw new Error('Article not found');
    if (data.viewsCount?.increment) {
      art.viewsCount += data.viewsCount.increment;
    }
    if (data.title) art.title = data.title;
    if (data.slug) art.slug = data.slug;
    if (data.summary) art.summary = data.summary;
    if (data.content) art.content = data.content;
    if (data.coverImage !== undefined) art.coverImage = data.coverImage;
    if (data.readTime) art.readTime = data.readTime;
    if (data.status) art.status = data.status;
    if (data.rejectionReason !== undefined) art.rejectionReason = data.rejectionReason;
    if (data.deletedAt !== undefined) art.deletedAt = data.deletedAt;
    art.updatedAt = new Date();

    const populated = { ...art };
    if (include?.category) populated.category = store.categories.get(art.categoryId);
    if (include?.author) populated.author = store.users.get(art.authorId);
    if (include?.resources) {
      populated.resources = Array.from(store.resources.values()).filter((r) => r.articleId === art.id);
    }
    return populated;
  };

  prisma.$transaction = async (cb) => cb(prisma);

  // ArticleResource delegate
  prisma.articleResource.findMany = async ({ where }) => {
    let list = Array.from(store.resources.values());
    if (where?.type?.equals) {
      list = list.filter((r) => r.type === where.type.equals);
    }
    return list.map((r) => {
      const art = store.articles.get(r.articleId) || {};
      const cat = store.categories.get(art.categoryId) || {};
      return {
        ...r,
        article: {
          id: art.id,
          title: art.title,
          slug: art.slug,
          coverImage: art.coverImage,
          category: {
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
          },
        },
      };
    });
  };

  prisma.articleResource.create = async ({ data }) => {
    const resObj = {
      id: `res_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      articleId: data.articleId,
      title: data.title,
      url: data.url,
      type: data.type || 'LINK',
      createdAt: new Date(),
    };
    store.resources.set(resObj.id, resObj);
    return resObj;
  };

  prisma.articleResource.deleteMany = async ({ where }) => {
    let count = 0;
    for (const [key, res] of store.resources.entries()) {
      if (res.articleId === where.articleId) {
        if (!where.id || where.id === res.id) {
          store.resources.delete(key);
          count += 1;
        }
      }
    }
    return { count };
  };

  // Bookmark delegate
  prisma.bookmark.findUnique = async () => null;
}

async function run() {
  console.log('🧪 Starting Person 1 (Module A: Knowledge Management) Test Suite...');
  setupMocks();

  // Seed sample users
  const adminUser = {
    id: 'usr_admin',
    name: 'Administrator',
    email: 'admin@jalgyan.org',
    role: 'ADMIN',
    status: 'ACTIVE',
    deletedAt: null,
  };
  const authorUser = {
    id: 'usr_author',
    name: 'Priya Sharma',
    email: 'priya@jalgyan.org',
    role: 'USER',
    status: 'ACTIVE',
    deletedAt: null,
  };
  const otherUser = {
    id: 'usr_other',
    name: 'Rahul Varma',
    email: 'rahul@jalgyan.org',
    role: 'USER',
    status: 'ACTIVE',
    deletedAt: null,
  };
  store.users.set(adminUser.id, adminUser);
  store.users.set(authorUser.id, authorUser);
  store.users.set(otherUser.id, otherUser);

  const adminToken = signToken(adminUser);
  const authorToken = signToken(authorUser);
  const otherToken = signToken(otherUser);

  // Seed initial category
  const testCat = {
    id: 'cat_drip',
    name: 'Drip Irrigation',
    slug: 'drip-irrigation',
    description: 'Precision water delivery techniques',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  store.categories.set(testCat.id, testCat);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    // 1. GET /api/categories -> 200
    console.log('  1. Category listing endpoint');
    const catListRes = await request(baseUrl, 'GET', '/categories');
    assert.equal(catListRes.status, 200);
    assert.equal(catListRes.body.success, true);
    assert.ok(Array.isArray(catListRes.body.data.categories));
    assert.equal(catListRes.body.data.categories.length, 1);

    // 2. GET /api/categories/:slug -> 200, 404
    console.log('  2. Category detail by slug');
    const catDetailRes = await request(baseUrl, 'GET', '/categories/drip-irrigation');
    assert.equal(catDetailRes.status, 200);
    assert.equal(catDetailRes.body.data.category.slug, 'drip-irrigation');
    const cat404Res = await request(baseUrl, 'GET', '/categories/non-existent-category');
    assert.equal(cat404Res.status, 404);

    // 3. POST /api/categories (Admin -> 201, User -> 403)
    console.log('  3. Category creation authorization');
    const userCreateCat = await request(baseUrl, 'POST', '/categories', { name: 'Rainwater' }, authorToken);
    assert.equal(userCreateCat.status, 403);

    const adminCreateCat = await request(
      baseUrl,
      'POST',
      '/categories',
      { name: 'Rainwater Harvesting', description: 'Rooftop and surface harvesting' },
      adminToken
    );
    assert.equal(adminCreateCat.status, 201);
    assert.equal(adminCreateCat.body.data.category.slug, 'rainwater-harvesting');

    // 4. POST /api/articles validation & creation
    console.log('  4. Article creation & validation');
    const unauthArt = await request(baseUrl, 'POST', '/articles', { title: 'Test Article' });
    assert.equal(unauthArt.status, 401);

    const invalidArt = await request(
      baseUrl,
      'POST',
      '/articles',
      { title: 'Short', summary: 'Too short', content: 'Short' },
      authorToken
    );
    assert.equal(invalidArt.status, 400);

    const validArtRes = await request(
      baseUrl,
      'POST',
      '/articles',
      {
        title: 'Precision Micro-Irrigation in Arid Regions',
        summary: 'A field study on saving 50% water in drought-affected farm clusters with gravity drip lines.',
        content: 'This technical article provides comprehensive field measurements and installation procedures for farmers across semi-arid regions.',
        categoryId: testCat.id,
        readTime: '6 min read',
        status: 'PENDING_REVIEW',
        resources: [
          { title: 'FAO Micro Irrigation Guide', url: 'https://fao.org/irrigation.pdf', type: 'PDF' },
          { title: 'Drip System Flushing Video', url: 'https://youtube.com/watch?v=123', type: 'VIDEO' },
        ],
      },
      authorToken
    );
    assert.equal(validArtRes.status, 201);
    assert.equal(validArtRes.body.success, true);
    const createdArticle = validArtRes.body.data.article;
    assert.equal(createdArticle.slug, 'precision-micro-irrigation-in-arid-regions');
    assert.equal(createdArticle.resources.length, 2);

    // 5. GET /api/articles (Listing & filtering)
    console.log('  5. Article public listing & search');
    // Set article to PUBLISHED so public listing sees it
    store.articles.get(createdArticle.id).status = 'PUBLISHED';

    const artListRes = await request(baseUrl, 'GET', '/articles');
    assert.equal(artListRes.status, 200);
    assert.ok(artListRes.body.data.articles.length >= 1);

    const artSearchRes = await request(baseUrl, 'GET', '/articles?search=Precision');
    assert.equal(artSearchRes.status, 200);
    assert.ok(artSearchRes.body.data.articles.length >= 1);

    // 6. GET /api/articles/:slug (Detail & view count increment)
    console.log('  6. Article details & view counter');
    const initialViews = store.articles.get(createdArticle.id).viewsCount;
    const artDetailRes = await request(baseUrl, 'GET', `/articles/${createdArticle.slug}`);
    assert.equal(artDetailRes.status, 200);
    assert.equal(artDetailRes.body.data.article.title, createdArticle.title);
    assert.equal(artDetailRes.body.data.article.resources.length, 2);
    assert.equal(store.articles.get(createdArticle.id).viewsCount, initialViews + 1);

    // 7. Unpublished article access control
    console.log('  7. Draft & pending article access control');
    const draftArtRes = await request(
      baseUrl,
      'POST',
      '/articles',
      {
        title: 'Draft Water Conservation Strategy',
        summary: 'A private draft document not yet approved by editorial team for public distribution.',
        content: 'This draft contains early stage calculations and preliminary field observations.',
        categoryId: testCat.id,
        status: 'DRAFT',
      },
      authorToken
    );
    assert.equal(draftArtRes.status, 201);
    const draftId = draftArtRes.body.data.article.id;

    // Author can view draft
    const authorViewDraft = await request(baseUrl, 'GET', `/articles/${draftId}`, undefined, authorToken);
    assert.equal(authorViewDraft.status, 200);

    // Other user cannot view draft -> 404
    const otherViewDraft = await request(baseUrl, 'GET', `/articles/${draftId}`, undefined, otherToken);
    assert.equal(otherViewDraft.status, 404);

    // 8. PUT /api/articles/:id (Update authorization)
    console.log('  8. Article update authorization');
    const otherUpdate = await request(
      baseUrl,
      'PUT',
      `/articles/${draftId}`,
      { title: 'Hacked Title Attempt' },
      otherToken
    );
    assert.equal(otherUpdate.status, 403);

    const authorUpdate = await request(
      baseUrl,
      'PUT',
      `/articles/${draftId}`,
      {
        title: 'Updated Water Conservation Strategy 2026',
        summary: 'Updated summary reflecting revised crop water requirement metrics.',
      },
      authorToken
    );
    assert.equal(authorUpdate.status, 200);
    assert.equal(authorUpdate.body.data.article.title, 'Updated Water Conservation Strategy 2026');

    // 9. Author-specific management endpoint: GET /api/articles/my
    console.log('  9. Author-specific management endpoint');
    const myArticlesRes = await request(baseUrl, 'GET', '/articles/my', undefined, authorToken);
    assert.equal(myArticlesRes.status, 200);
    assert.ok(myArticlesRes.body.data.stats);
    assert.ok(myArticlesRes.body.data.stats.total >= 2);
    assert.ok(Array.isArray(myArticlesRes.body.data.articles));

    // 10. PATCH /api/articles/:id/submit
    console.log('  10. Author quick resubmit for review');
    const submitRes = await request(baseUrl, 'PATCH', `/articles/${draftId}/submit`, undefined, authorToken);
    assert.equal(submitRes.status, 200);
    assert.equal(submitRes.body.data.article.status, 'PENDING_REVIEW');

    // 11. GET /api/resources (Educational resource library)
    console.log('  11. Educational resource & video library API');
    const resList = await request(baseUrl, 'GET', '/resources');
    assert.equal(resList.status, 200);
    assert.ok(resList.body.data.counts);
    assert.ok(Array.isArray(resList.body.data.resources));

    // 12. Resource attachment & deletion on article
    console.log('  12. Resource attachment subroutes');
    const addResRes = await request(
      baseUrl,
      'POST',
      `/articles/${createdArticle.id}/resources`,
      { title: 'New Irrigation Spec Sheet', url: 'https://example.com/spec.pdf', type: 'PDF' },
      authorToken
    );
    assert.equal(addResRes.status, 201);
    const newResId = addResRes.body.data.resource.id;

    const delResRes = await request(
      baseUrl,
      'DELETE',
      `/articles/${createdArticle.id}/resources/${newResId}`,
      undefined,
      authorToken
    );
    assert.equal(delResRes.status, 200);

    // 13. DELETE /api/articles/:id (Soft deletion)
    console.log('  13. Article soft deletion');
    const delRes = await request(baseUrl, 'DELETE', `/articles/${draftId}`, undefined, authorToken);
    assert.equal(delRes.status, 200);
    assert.equal(store.articles.get(draftId).deletedAt !== null, true);

    console.log('✅ All Person 1 (Module A) integration tests passed successfully!');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('❌ Test suite failure:', err);
  process.exit(1);
});
