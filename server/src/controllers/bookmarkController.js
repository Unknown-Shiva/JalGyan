import { prisma } from '../config/db.js';

const ARTICLE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function validArticleId(articleId) {
  return typeof articleId === 'string' && ARTICLE_ID_PATTERN.test(articleId);
}

export async function listBookmarks(req, res, next) {
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId: req.user.id,
        article: { status: 'PUBLISHED', deletedAt: null },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        createdAt: true,
        article: {
          select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            readTime: true,
            coverImage: true,
            publishedAt: true,
            createdAt: true,
            category: { select: { name: true } },
          },
        },
      },
    });
    return res.status(200).json({ success: true, data: { bookmarks } });
  } catch (error) {
    return next(error);
  }
}

export async function addBookmark(req, res, next) {
  const articleId = req.params.articleId;
  if (!validArticleId(articleId)) return res.status(400).json({ success: false, message: 'Invalid article ID.' });
  if (req.body && (typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length)) {
    return res.status(400).json({ success: false, message: 'Bookmark requests do not accept a request body.' });
  }
  try {
    const article = await prisma.article.findFirst({
      where: { id: articleId, status: 'PUBLISHED', deletedAt: null },
      select: { id: true },
    });
    if (!article) return res.status(404).json({ success: false, message: 'Published article not found.' });

    try {
      const bookmark = await prisma.bookmark.create({
        data: { userId: req.user.id, articleId: article.id },
        select: { id: true, articleId: true, createdAt: true },
      });
      return res.status(201).json({ success: true, data: { bookmark, created: true } });
    } catch (error) {
      if (error?.code !== 'P2002') throw error;
      const bookmark = await prisma.bookmark.findUnique({
        where: { userId_articleId: { userId: req.user.id, articleId: article.id } },
        select: { id: true, articleId: true, createdAt: true },
      });
      if (bookmark) return res.status(200).json({ success: true, data: { bookmark, created: false } });
      throw error;
    }
  } catch (error) {
    if (error?.code) return res.status(500).json({ success: false, message: 'Could not save this bookmark right now.' });
    return next(error);
  }
}

export async function removeBookmark(req, res, next) {
  const articleId = req.params.articleId;
  if (!validArticleId(articleId)) return res.status(400).json({ success: false, message: 'Invalid article ID.' });
  if (req.body && (typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length)) {
    return res.status(400).json({ success: false, message: 'Bookmark requests do not accept a request body.' });
  }
  try {
    const result = await prisma.bookmark.deleteMany({ where: { userId: req.user.id, articleId } });
    return res.status(200).json({ success: true, data: { articleId, removed: result.count > 0 } });
  } catch (error) {
    return next(error);
  }
}
