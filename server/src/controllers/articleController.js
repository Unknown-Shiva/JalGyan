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

/**
 * Helper to compute reading time estimate
 */
const estimateReadTime = (text) => {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
};

/**
 * Helper to generate a unique article slug
 */
const generateUniqueSlug = async (title) => {
  let baseSlug = slugify(title);
  if (!baseSlug) baseSlug = 'article';
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) return slug;
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
};

/**
 * POST /api/articles
 * Create a new water conservation article (authenticated)
 */
export const createArticle = async (req, res, next) => {
  try {
    const authorId = req.user.id;
    const {
      title,
      summary,
      content,
      categoryId,
      coverImage,
      readTime,
      status = 'PENDING_REVIEW',
      resources = [],
    } = req.body || {};

    if (!title || typeof title !== 'string' || title.trim().length < 8 || title.trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Title must be between 8 and 150 characters.',
      });
    }

    if (!summary || typeof summary !== 'string' || summary.trim().length < 20 || summary.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Summary must be between 20 and 500 characters.',
      });
    }

    if (!content || typeof content !== 'string' || content.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Article content must be at least 50 characters long.',
      });
    }

    if (!categoryId || typeof categoryId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'A valid category ID is required.',
      });
    }

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId.trim() },
    });
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Specified category does not exist.',
      });
    }

    // Validate status
    const targetStatus = status === 'DRAFT' ? 'DRAFT' : 'PENDING_REVIEW';

    // Validate resources if provided
    const validResourceTypes = ['PDF', 'LINK', 'DATASET', 'VIDEO'];
    const cleanResources = [];
    if (Array.isArray(resources)) {
      for (const resItem of resources) {
        if (resItem && typeof resItem.title === 'string' && typeof resItem.url === 'string') {
          const resTitle = resItem.title.trim();
          const resUrl = resItem.url.trim();
          const resType = String(resItem.type || 'LINK').toUpperCase().trim();
          if (resTitle && resUrl) {
            cleanResources.push({
              title: resTitle,
              url: resUrl,
              type: validResourceTypes.includes(resType) ? resType : 'LINK',
            });
          }
        }
      }
    }

    const slug = await generateUniqueSlug(title.trim());
    const finalReadTime = (readTime && typeof readTime === 'string' && readTime.trim())
      ? readTime.trim()
      : estimateReadTime(content);

    const article = await prisma.article.create({
      data: {
        title: title.trim(),
        slug,
        summary: summary.trim(),
        content: content.trim(),
        readTime: finalReadTime,
        coverImage: coverImage && typeof coverImage === 'string' ? coverImage.trim() : null,
        status: targetStatus,
        authorId,
        categoryId: category.id,
        resources: cleanResources.length > 0 ? {
          create: cleanResources,
        } : undefined,
      },
      include: {
        category: true,
        resources: true,
        author: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: targetStatus === 'DRAFT'
        ? 'Article draft saved successfully.'
        : 'Article submitted successfully and queued for review.',
      data: { article },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/articles/:id
 * Update an existing article (author or admin only)
 */
export const updateArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid article ID provided.',
      });
    }

    const article = await prisma.article.findFirst({
      where: { id: id.trim(), deletedAt: null },
      include: { resources: true },
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found.',
      });
    }

    // Permission check
    const isAuthor = article.authorId === currentUserId;
    const isAdmin = currentUserRole === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this article.',
      });
    }

    const {
      title,
      summary,
      content,
      categoryId,
      coverImage,
      readTime,
      status,
      submitForReview,
      resources,
    } = req.body || {};

    const updateData = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 8 || title.trim().length > 150) {
        return res.status(400).json({
          success: false,
          message: 'Title must be between 8 and 150 characters.',
        });
      }
      updateData.title = title.trim();
      // If title changed, update slug
      if (title.trim() !== article.title) {
        updateData.slug = await generateUniqueSlug(title.trim());
      }
    }

    if (summary !== undefined) {
      if (typeof summary !== 'string' || summary.trim().length < 20 || summary.trim().length > 500) {
        return res.status(400).json({
          success: false,
          message: 'Summary must be between 20 and 500 characters.',
        });
      }
      updateData.summary = summary.trim();
    }

    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length < 50) {
        return res.status(400).json({
          success: false,
          message: 'Article content must be at least 50 characters long.',
        });
      }
      updateData.content = content.trim();
    }

    if (categoryId !== undefined) {
      const category = await prisma.category.findUnique({
        where: { id: String(categoryId).trim() },
      });
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Specified category does not exist.',
        });
      }
      updateData.categoryId = category.id;
    }

    if (coverImage !== undefined) {
      updateData.coverImage = coverImage && typeof coverImage === 'string' ? coverImage.trim() : null;
    }

    if (readTime !== undefined) {
      updateData.readTime = readTime && typeof readTime === 'string' ? readTime.trim() : estimateReadTime(content || article.content);
    } else if (content) {
      updateData.readTime = estimateReadTime(content);
    }

    // Status workflow
    if (submitForReview || status === 'PENDING_REVIEW') {
      updateData.status = 'PENDING_REVIEW';
      updateData.rejectionReason = null; // Clear previous rejection reason
    } else if (status === 'DRAFT') {
      updateData.status = 'DRAFT';
    } else if (isAdmin && status) {
      updateData.status = status;
    } else if (article.status === 'REJECTED' && (content || title || summary)) {
      // If author edited a rejected article, default to PENDING_REVIEW
      updateData.status = 'PENDING_REVIEW';
      updateData.rejectionReason = null;
    }

    // Execute update and resources sync in transaction
    const updatedArticle = await prisma.$transaction(async (tx) => {
      // Synchronize resources if provided
      if (Array.isArray(resources)) {
        await tx.articleResource.deleteMany({
          where: { articleId: article.id },
        });

        const validResourceTypes = ['PDF', 'LINK', 'DATASET', 'VIDEO'];
        const cleanResources = [];
        for (const resItem of resources) {
          if (resItem && typeof resItem.title === 'string' && typeof resItem.url === 'string') {
            const resTitle = resItem.title.trim();
            const resUrl = resItem.url.trim();
            const resType = String(resItem.type || 'LINK').toUpperCase().trim();
            if (resTitle && resUrl) {
              cleanResources.push({
                articleId: article.id,
                title: resTitle,
                url: resUrl,
                type: validResourceTypes.includes(resType) ? resType : 'LINK',
              });
            }
          }
        }

        if (cleanResources.length > 0) {
          await tx.articleResource.createMany({
            data: cleanResources,
          });
        }
      }

      return tx.article.update({
        where: { id: article.id },
        data: updateData,
        include: {
          category: true,
          resources: true,
          author: {
            select: {
              id: true,
              name: true,
              location: true,
            },
          },
        },
      });
    });

    res.status(200).json({
      success: true,
      message: 'Article updated successfully.',
      data: { article: updatedArticle },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/articles/:id
 * Soft delete an article (author or admin only)
 */
export const deleteArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid article ID provided.',
      });
    }

    const article = await prisma.article.findFirst({
      where: { id: id.trim(), deletedAt: null },
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found.',
      });
    }

    const isAuthor = article.authorId === currentUserId;
    const isAdmin = currentUserRole === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this article.',
      });
    }

    await prisma.article.update({
      where: { id: article.id },
      data: { deletedAt: new Date() },
    });

    res.status(200).json({
      success: true,
      message: 'Article deleted successfully.',
      data: { id: article.id },
    });
  } catch (error) {
    next(error);
  }
};
