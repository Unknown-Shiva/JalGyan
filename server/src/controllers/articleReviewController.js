import { prisma } from '../config/db.js';

/**
 * GET /api/admin/articles/pending
 * Retrieve paginated list of articles pending review
 */
export const getPendingArticles = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const where = {
      status: 'PENDING_REVIEW',
      deletedAt: null,
    };

    const [total, articles] = await Promise.all([
      prisma.article.count({ where }),
      prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          coverImage: true,
          status: true,
          readTime: true,
          createdAt: true,
          updatedAt: true,
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
              email: true,
            },
          },
        },
      }),
    ]);

    // Format fields cleanly
    const formatted = articles.map((art) => ({
      id: art.id,
      title: art.title,
      slug: art.slug,
      summary: art.summary,
      coverImage: art.coverImage,
      readTime: art.readTime,
      category: art.category,
      author: art.author,
      submissionDate: art.createdAt,
      updatedDate: art.updatedAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        articles: formatted,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/articles/:id
 * Retrieve complete article details including author, category, resources, and review history
 */
export const getArticleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid article ID provided.',
      });
    }

    const article = await prisma.article.findFirst({
      where: {
        id,
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
            email: true,
            location: true,
            bio: true,
          },
        },
        resources: {
          select: {
            id: true,
            title: true,
            url: true,
            type: true,
            createdAt: true,
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            previousStatus: true,
            newStatus: true,
            feedback: true,
            createdAt: true,
            reviewer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
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

    res.status(200).json({
      success: true,
      data: {
        article,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/articles/:id/approve
 * Approve a pending article and publish it inside a Prisma transaction
 */
export const approveArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body || {};

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid article ID provided.',
      });
    }

    const reviewerId = req.user.id;
    const cleanFeedback = feedback && String(feedback).trim() ? String(feedback).trim() : null;

    // Execute approval, review logging, and admin action atomically
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current article state
      const article = await tx.article.findUnique({
        where: { id },
      });

      if (!article || article.deletedAt !== null) {
        const error = new Error('Article not found.');
        error.statusCode = 404;
        throw error;
      }

      // 2. Validate current status is PENDING_REVIEW
      if (article.status !== 'PENDING_REVIEW') {
        const error = new Error(
          `Cannot approve article: status is currently "${article.status}". Only articles in "PENDING_REVIEW" status can be approved.`
        );
        error.statusCode = 400;
        throw error;
      }

      // 3. Atomically update status with guard against concurrent reviews
      const updateResult = await tx.article.updateMany({
        where: {
          id,
          status: 'PENDING_REVIEW',
          deletedAt: null,
        },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          rejectionReason: null,
        },
      });

      if (updateResult.count === 0) {
        const error = new Error(
          'Conflict: The article has already been reviewed or updated by another administrator.'
        );
        error.statusCode = 409;
        throw error;
      }

      // 4. Record ArticleReview audit history
      const review = await tx.articleReview.create({
        data: {
          articleId: id,
          reviewerId,
          previousStatus: article.status,
          newStatus: 'PUBLISHED',
          feedback: cleanFeedback,
        },
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // 5. Record AdminAction audit history
      await tx.adminAction.create({
        data: {
          adminId: reviewerId,
          actionType: 'ARTICLE_APPROVED',
          targetEntity: 'Article',
          targetId: id,
          details: {
            previousStatus: article.status,
            newStatus: 'PUBLISHED',
            feedback: cleanFeedback,
            articleTitle: article.title,
          },
        },
      });

      // 6. Fetch updated article with relations for response
      const updatedArticle = await tx.article.findUnique({
        where: { id },
        include: {
          category: true,
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return { article: updatedArticle, review };
    });

    res.status(200).json({
      success: true,
      message: 'Article approved and published successfully.',
      data: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * PATCH /api/admin/articles/:id/reject
 * Reject a pending article with mandatory reason inside a Prisma transaction
 */
export const rejectArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reason = req.body?.reason || req.body?.feedback || req.body?.rejectionReason;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid article ID provided.',
      });
    }

    // Mandatory rejection reason validation
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A rejection reason is required and cannot be empty.',
      });
    }

    const cleanReason = reason.trim();
    const reviewerId = req.user.id;

    // Execute rejection, review logging, and admin action atomically
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current article state
      const article = await tx.article.findUnique({
        where: { id },
      });

      if (!article || article.deletedAt !== null) {
        const error = new Error('Article not found.');
        error.statusCode = 404;
        throw error;
      }

      // 2. Validate current status is PENDING_REVIEW
      if (article.status !== 'PENDING_REVIEW') {
        const error = new Error(
          `Cannot reject article: status is currently "${article.status}". Only articles in "PENDING_REVIEW" status can be rejected.`
        );
        error.statusCode = 400;
        throw error;
      }

      // 3. Atomically update status with guard against concurrent reviews
      const updateResult = await tx.article.updateMany({
        where: {
          id,
          status: 'PENDING_REVIEW',
          deletedAt: null,
        },
        data: {
          status: 'REJECTED',
          rejectionReason: cleanReason,
        },
      });

      if (updateResult.count === 0) {
        const error = new Error(
          'Conflict: The article has already been reviewed or updated by another administrator.'
        );
        error.statusCode = 409;
        throw error;
      }

      // 4. Record ArticleReview audit history
      const review = await tx.articleReview.create({
        data: {
          articleId: id,
          reviewerId,
          previousStatus: article.status,
          newStatus: 'REJECTED',
          feedback: cleanReason,
        },
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // 5. Record AdminAction audit history
      await tx.adminAction.create({
        data: {
          adminId: reviewerId,
          actionType: 'ARTICLE_REJECTED',
          targetEntity: 'Article',
          targetId: id,
          details: {
            previousStatus: article.status,
            newStatus: 'REJECTED',
            rejectionReason: cleanReason,
            articleTitle: article.title,
          },
        },
      });

      // 6. Fetch updated article with relations for response
      const updatedArticle = await tx.article.findUnique({
        where: { id },
        include: {
          category: true,
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return { article: updatedArticle, review };
    });

    res.status(200).json({
      success: true,
      message: 'Article rejected successfully.',
      data: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * GET /api/admin/articles/:id/reviews
 * Retrieve the chronological review audit trail for an article (newest first)
 */
export const getArticleReviews = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid article ID provided.',
      });
    }

    // Verify article exists and is not soft-deleted
    const article = await prisma.article.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: { id: true, title: true, status: true },
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found.',
      });
    }

    const reviews = await prisma.articleReview.findMany({
      where: { articleId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        previousStatus: true,
        newStatus: true,
        feedback: true,
        createdAt: true,
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        articleId: article.id,
        articleTitle: article.title,
        currentStatus: article.status,
        reviews,
      },
    });
  } catch (error) {
    next(error);
  }
};
