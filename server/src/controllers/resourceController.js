import { prisma } from '../config/db.js';

/**
 * GET /api/resources
 * Retrieve educational resources and multimedia across all published knowledge articles
 */
export const listEducationalResources = async (req, res, next) => {
  try {
    const { type, category, search, q } = req.query;
    const searchTerm = (search || q || '').trim();

    const where = {
      article: {
        status: 'PUBLISHED',
        deletedAt: null,
      },
    };

    const andConditions = [];

    if (type && typeof type === 'string' && type.trim()) {
      andConditions.push({
        type: { equals: type.trim().toUpperCase() },
      });
    }

    if (category && typeof category === 'string' && category.trim()) {
      const catTrim = category.trim();
      andConditions.push({
        article: {
          category: {
            OR: [
              { slug: catTrim.toLowerCase() },
              { id: catTrim },
              { name: { equals: catTrim, mode: 'insensitive' } },
            ],
          },
        },
      });
    }

    if (searchTerm) {
      andConditions.push({
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { article: { title: { contains: searchTerm, mode: 'insensitive' } } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const resources = await prisma.articleResource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        url: true,
        type: true,
        createdAt: true,
        article: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImage: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    // Breakdown counts by resource type
    const countsByType = {
      ALL: resources.length,
      VIDEO: resources.filter((r) => r.type === 'VIDEO').length,
      PDF: resources.filter((r) => r.type === 'PDF').length,
      DATASET: resources.filter((r) => r.type === 'DATASET').length,
      LINK: resources.filter((r) => r.type === 'LINK').length,
    };

    res.status(200).json({
      success: true,
      data: {
        resources,
        counts: countsByType,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/articles/:id/resources
 * Add a new resource to an article (author or admin only)
 */
export const addArticleResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, url, type = 'LINK' } = req.body || {};
    const currentUserId = req.user.id;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid article ID.' });
    }

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Resource title is required.' });
    }

    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ success: false, message: 'Valid resource URL is required.' });
    }

    const article = await prisma.article.findFirst({
      where: { id: id.trim(), deletedAt: null },
    });

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found.' });
    }

    if (article.authorId !== currentUserId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }

    const validTypes = ['PDF', 'LINK', 'DATASET', 'VIDEO'];
    const cleanType = validTypes.includes(String(type).toUpperCase().trim())
      ? String(type).toUpperCase().trim()
      : 'LINK';

    const resource = await prisma.articleResource.create({
      data: {
        articleId: article.id,
        title: title.trim(),
        url: url.trim(),
        type: cleanType,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Resource attached to article successfully.',
      data: { resource },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/articles/:id/resources/:resourceId
 * Remove a resource from an article (author or admin only)
 */
export const deleteArticleResource = async (req, res, next) => {
  try {
    const { id, resourceId } = req.params;
    const currentUserId = req.user.id;

    const article = await prisma.article.findFirst({
      where: { id: id.trim(), deletedAt: null },
    });

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found.' });
    }

    if (article.authorId !== currentUserId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }

    await prisma.articleResource.deleteMany({
      where: {
        id: resourceId.trim(),
        articleId: article.id,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Resource removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};
