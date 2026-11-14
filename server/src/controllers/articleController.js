import { prisma } from '../config/db.js';

const slugify = (text) =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const parsePositiveInt = (value, fallback, label, max = Number.MAX_SAFE_INTEGER) => {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(String(value))) {
    const error = new Error(`${label} must be a positive integer.`);
    error.status = 400;
    throw error;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    const error = new Error(`${label} must be between 1 and ${max}.`);
    error.status = 400;
    throw error;
  }
  return parsed;
};

/**
 * GET /api/articles
 * Retrieve paginated public articles with search, multi-facet filtering, and sorting
 */
export const listArticles = async (req, res, next) => {
  try {
    const page = parsePositiveInt(req.query.page, 1, 'page');
    const limit = parsePositiveInt(req.query.limit, 9, 'limit', 50);
    const skip = (page - 1) * limit;

    const { category, search, q, sort, author, resourceType } = req.query;
    const searchTerm = (search || q || '').trim();

    const where = {
      status: 'PUBLISHED',
      deletedAt: null,
    };

    const andConditions = [];

    // Search filter across title, summary, and content
    if (searchTerm) {
      andConditions.push({
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { summary: { contains: searchTerm, mode: 'insensitive' } },
          { content: { contains: searchTerm, mode: 'insensitive' } },
        ],
      });
    }

    // Category filter
    if (category && typeof category === 'string' && category.trim()) {
      const catTrim = category.trim();
      andConditions.push({
        category: {
          OR: [
            { slug: catTrim.toLowerCase() },
            { id: catTrim },
            { name: { equals: catTrim, mode: 'insensitive' } },
          ],
        },
      });
    }

    // Author filter
    if (author && typeof author === 'string' && author.trim()) {
      andConditions.push({
        author: {
          OR: [
            { id: author.trim() },
            { name: { contains: author.trim(), mode: 'insensitive' } },
          ],
        },
      });
    }

    // Resource Type filter (e.g. articles with VIDEO or PDF)
    if (resourceType && typeof resourceType === 'string' && resourceType.trim()) {
      andConditions.push({
        resources: {
          some: {
            type: { equals: resourceType.trim().toUpperCase() },
          },
        },
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    let orderBy = [{ publishedAt: 'desc' }, { createdAt: 'desc' }];
    if (sort === 'popular') {
      orderBy = [{ viewsCount: 'desc' }, { publishedAt: 'desc' }];
    } else if (sort === 'oldest') {
      orderBy = [{ publishedAt: 'asc' }, { createdAt: 'asc' }];
    } else if (sort === 'readTime') {
      orderBy = [{ readTime: 'asc' }, { publishedAt: 'desc' }];
    }

    const [total, articles] = await Promise.all([
      prisma.article.count({ where }),
      prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          coverImage: true,
          readTime: true,
          viewsCount: true,
          status: true,
          publishedAt: true,
          createdAt: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          author: {
            select: {
              id: true,
              name: true,
              location: true,
            },
          },
          _count: {
            select: {
              resources: true,
              bookmarks: true,
            },
          },
        },
      }),
    ]);

    const formatted = articles.map((art) => ({
      id: art.id,
      title: art.title,
      slug: art.slug,
      summary: art.summary,
      coverImage: art.coverImage,
      readTime: art.readTime,
      viewsCount: art.viewsCount,
      publishedAt: art.publishedAt || art.createdAt,
      createdAt: art.createdAt,
      category: art.category,
      author: art.author,
      resourcesCount: art._count?.resources ?? 0,
      bookmarksCount: art._count?.bookmarks ?? 0,
    }));

    res.status(200).json({
      success: true,
      data: {
        articles: formatted,
        filters: {
          search: searchTerm || null,
          category: category || null,
          resourceType: resourceType || null,
          sort: sort || 'recent',
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/articles/:slugOrId
 * Retrieve detailed article by slug or ID with view increment, resources, and bookmark status
 */
export const getArticleBySlugOrId = async (req, res, next) => {
  try {
    const { slugOrId } = req.params;

    if (!slugOrId || typeof slugOrId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid article identifier.',
      });
    }

    const trimmed = slugOrId.trim();
    const currentUserId = req.user?.id || null;
    const currentUserRole = req.user?.role || null;

    // Find article by slug or id
    const article = await prisma.article.findFirst({
      where: {
        OR: [{ slug: trimmed.toLowerCase() }, { id: trimmed }],
        deletedAt: null,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            location: true,
            bio: true,
          },
        },
        resources: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            title: true,
            url: true,
            type: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            bookmarks: true,
          },
        },
      },
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found.',
      });
    }

    // Access control: if not published, only the author or admin can view
    const isAuthor = currentUserId && article.authorId === currentUserId;
    const isAdmin = currentUserRole === 'ADMIN';
    if (article.status !== 'PUBLISHED' && !isAuthor && !isAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Article not found.',
      });
    }

    // Increment viewsCount atomically if article is published
    if (article.status === 'PUBLISHED') {
      try {
        await prisma.article.update({
          where: { id: article.id },
          data: { viewsCount: { increment: 1 } },
        });
        article.viewsCount += 1;
      } catch (e) {
        // Ignore view count failure non-critically
      }
    }

    // Check if authenticated user has bookmarked this article
    let isBookmarked = false;
    if (currentUserId) {
      const bookmark = await prisma.bookmark.findUnique({
        where: {
          userId_articleId: {
            userId: currentUserId,
            articleId: article.id,
          },
        },
        select: { id: true },
      });
      isBookmarked = Boolean(bookmark);
    }

    // Fetch up to 3 related articles in the same category
    const relatedArticles = await prisma.article.findMany({
      where: {
        categoryId: article.categoryId,
        id: { not: article.id },
        status: 'PUBLISHED',
        deletedAt: null,
      },
      take: 3,
      orderBy: { viewsCount: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        readTime: true,
        coverImage: true,
        viewsCount: true,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        article: {
          id: article.id,
          title: article.title,
          slug: article.slug,
          summary: article.summary,
          content: article.content,
          readTime: article.readTime,
          coverImage: article.coverImage,
          viewsCount: article.viewsCount,
          status: article.status,
          rejectionReason: isAuthor || isAdmin ? article.rejectionReason : null,
          publishedAt: article.publishedAt || article.createdAt,
          createdAt: article.createdAt,
          updatedAt: article.updatedAt,
          category: article.category,
          author: article.author,
          resources: article.resources,
          bookmarksCount: article._count?.bookmarks ?? 0,
          isBookmarked,
        },
        relatedArticles,
      },
    });
  } catch (error) {
    next(error);
  }
};
