import { prisma } from '../config/db.js';

/**
 * Target inclusion configuration ensuring sensitive credentials (e.g., password hashes)
 * are never fetched or leaked across any reported target entity.
 */
const targetIncludes = {
  reporter: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      deletedAt: true,
    },
  },
  moderator: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  post: {
    select: {
      id: true,
      title: true,
      body: true,
      category: true,
      tags: true,
      upvotesCount: true,
      downvotesCount: true,
      commentsCount: true,
      deletedAt: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  },
  comment: {
    select: {
      id: true,
      text: true,
      postId: true,
      deletedAt: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  },
  article: {
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      status: true,
      viewsCount: true,
      deletedAt: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  },
  targetUser: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      deletedAt: true,
      createdAt: true,
    },
  },
};

/**
 * Helper to structure report entity response uniformly, preserving target content
 * via live relations or falling back to targetSnapshot when original content is deleted.
 */
export function formatReport(report) {
  let target = null;
  let targetId = null;
  let isAvailable = false;

  if (report.targetType === 'POST') {
    targetId = report.postId;
    if (report.post) {
      isAvailable = report.post.deletedAt === null;
      target = {
        id: report.post.id,
        title: report.post.title,
        body: report.post.body,
        category: report.post.category,
        tags: report.post.tags,
        upvotesCount: report.post.upvotesCount,
        downvotesCount: report.post.downvotesCount,
        commentsCount: report.post.commentsCount,
        author: report.post.author || null,
        deletedAt: report.post.deletedAt,
        createdAt: report.post.createdAt,
      };
    }
  } else if (report.targetType === 'COMMENT') {
    targetId = report.commentId;
    if (report.comment) {
      isAvailable = report.comment.deletedAt === null;
      target = {
        id: report.comment.id,
        text: report.comment.text,
        postId: report.comment.postId,
        author: report.comment.author || null,
        deletedAt: report.comment.deletedAt,
        createdAt: report.comment.createdAt,
      };
    }
  } else if (report.targetType === 'ARTICLE') {
    targetId = report.articleId;
    if (report.article) {
      isAvailable = report.article.deletedAt === null;
      target = {
        id: report.article.id,
        title: report.article.title,
        slug: report.article.slug,
        summary: report.article.summary,
        status: report.article.status,
        viewsCount: report.article.viewsCount,
        author: report.article.author || null,
        deletedAt: report.article.deletedAt,
        createdAt: report.article.createdAt,
      };
    }
  } else if (report.targetType === 'USER') {
    targetId = report.targetUserId;
    if (report.targetUser) {
      isAvailable = report.targetUser.deletedAt === null;
      target = {
        id: report.targetUser.id,
        name: report.targetUser.name,
        email: report.targetUser.email,
        role: report.targetUser.role,
        status: report.targetUser.status,
        deletedAt: report.targetUser.deletedAt,
        createdAt: report.targetUser.createdAt,
      };
    }
  }

  // Fall back to targetSnapshot when live entity is missing or permanently purged
  const resolvedTarget = target || report.targetSnapshot || null;

  return {
    id: report.id,
    targetType: report.targetType,
    targetId,
    reason: report.reason,
    status: report.status,
    description: report.description,
    actionTaken: report.actionTaken,
    createdAt: report.createdAt,
    updatedAt: report.resolvedAt || report.createdAt,
    resolvedAt: report.resolvedAt,
    reporter: report.reporter
      ? {
          id: report.reporter.id,
          name: report.reporter.name,
          email: report.reporter.email,
        }
      : null,
    moderator: report.moderator
      ? {
          id: report.moderator.id,
          name: report.moderator.name,
          email: report.moderator.email,
        }
      : null,
    target: resolvedTarget,
    targetSnapshot: report.targetSnapshot,
    isTargetAvailable: isAvailable,
  };
}

/**
 * Allowed enum values for validation
 */
const ALLOWED_STATUSES = ['PENDING', 'RESOLVED', 'DISMISSED'];
const ALLOWED_REASONS = ['SPAM', 'HARASSMENT', 'MISINFORMATION', 'INAPPROPRIATE', 'OTHER'];
const ALLOWED_TARGET_TYPES = ['POST', 'COMMENT', 'ARTICLE', 'USER'];

/**
 * GET /api/admin/reports
 * Paginated reports queue with filtering by status, reason, targetType, and sort order.
 */
export const listReports = async (req, res, next) => {
  try {
    const rawPage = req.query.page;
    const rawLimit = req.query.limit;
    const { status, reason, targetType, sortOrder = 'desc' } = req.query;

    // Validate page
    const page = rawPage !== undefined ? parseInt(rawPage, 10) : 1;
    if (isNaN(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page must be a positive integer greater than or equal to 1.',
      });
    }

    // Validate limit
    const limit = rawLimit !== undefined ? parseInt(rawLimit, 10) : 10;
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be an integer between 1 and 100.',
      });
    }

    // Validate status filter if provided
    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status filter. Allowed values: ${ALLOWED_STATUSES.join(', ')}.`,
      });
    }

    // Validate reason filter if provided
    if (reason && !ALLOWED_REASONS.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: `Invalid reason filter. Allowed values: ${ALLOWED_REASONS.join(', ')}.`,
      });
    }

    // Validate targetType filter if provided
    if (targetType && !ALLOWED_TARGET_TYPES.includes(targetType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid targetType filter. Allowed values: ${ALLOWED_TARGET_TYPES.join(', ')}.`,
      });
    }

    // Validate sortOrder
    const normalizedSortOrder = String(sortOrder).toLowerCase();
    if (!['asc', 'desc'].includes(normalizedSortOrder)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sortOrder parameter. Allowed values: 'asc', 'desc'.",
      });
    }

    const skip = (page - 1) * limit;

    // Build Prisma where clause
    const where = {
      ...(status && { status }),
      ...(reason && { reason }),
      ...(targetType && { targetType }),
    };

    const [total, rawReports] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: normalizedSortOrder },
        include: targetIncludes,
      }),
    ]);

    const reports = rawReports.map(formatReport);

    res.status(200).json({
      success: true,
      data: {
        reports,
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
 * GET /api/admin/reports/:id
 * Detailed report information with target data, snapshot fallback, and administrative audit trail.
 */
export const getReportById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID provided.',
      });
    }

    const rawReport = await prisma.report.findUnique({
      where: { id },
      include: targetIncludes,
    });

    if (!rawReport) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.',
      });
    }

    // Retrieve corresponding audit history for this report
    const auditActions = await prisma.adminAction.findMany({
      where: {
        targetEntity: 'Report',
        targetId: id,
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const report = formatReport(rawReport);

    res.status(200).json({
      success: true,
      data: {
        report: {
          ...report,
          auditHistory: auditActions.map((action) => ({
            id: action.id,
            actionType: action.actionType,
            admin: action.admin,
            details: action.details,
            createdAt: action.createdAt,
          })),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/reports/:id/resolve
 * Resolve a pending report with atomic status update, concurrency protection, and audit logging.
 */
export const resolveReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const note = body.note || body.moderationNote || body.reason || null;
    const cleanNote = note && String(note).trim() ? String(note).trim() : null;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID provided.',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current report state
      const existing = await tx.report.findUnique({
        where: { id },
      });

      if (!existing) {
        const error = new Error('Report not found.');
        error.statusCode = 404;
        throw error;
      }

      // Check current status
      if (existing.status === 'RESOLVED') {
        const error = new Error('Report has already been resolved.');
        error.statusCode = 409;
        throw error;
      }

      if (existing.status === 'DISMISSED') {
        const error = new Error('Report has already been dismissed.');
        error.statusCode = 409;
        throw error;
      }

      // 2. Atomic conditional update (only updates if status is PENDING)
      const updateResult = await tx.report.updateMany({
        where: {
          id,
          status: 'PENDING',
        },
        data: {
          status: 'RESOLVED',
          moderatorId: req.user.id,
          actionTaken: cleanNote || 'Report resolved by administrator',
          resolvedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        const error = new Error(
          'Conflict: Report was modified concurrently by another administrator.'
        );
        error.statusCode = 409;
        throw error;
      }

      const targetEntityId =
        existing.postId ||
        existing.commentId ||
        existing.articleId ||
        existing.targetUserId ||
        null;

      // 3. Create AdminAction audit log
      await tx.adminAction.create({
        data: {
          adminId: req.user.id,
          actionType: 'REPORT_RESOLVED',
          targetEntity: 'Report',
          targetId: id,
          details: {
            previousStatus: 'PENDING',
            newStatus: 'RESOLVED',
            targetType: existing.targetType,
            targetId: targetEntityId,
            reporterId: existing.reporterId,
            moderationNote: cleanNote,
          },
        },
      });

      // 4. Fetch and return updated report
      const updatedReport = await tx.report.findUnique({
        where: { id },
        include: targetIncludes,
      });

      return formatReport(updatedReport);
    });

    res.status(200).json({
      success: true,
      message: 'Report resolved successfully.',
      data: {
        report: result,
      },
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
 * PATCH /api/admin/reports/:id/dismiss
 * Dismiss a pending report with atomic status update, concurrency protection, and audit logging.
 */
export const dismissReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const note = body.note || body.moderationNote || body.reason || null;
    const cleanNote = note && String(note).trim() ? String(note).trim() : null;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID provided.',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current report state
      const existing = await tx.report.findUnique({
        where: { id },
      });

      if (!existing) {
        const error = new Error('Report not found.');
        error.statusCode = 404;
        throw error;
      }

      // Check current status
      if (existing.status === 'DISMISSED') {
        const error = new Error('Report has already been dismissed.');
        error.statusCode = 409;
        throw error;
      }

      if (existing.status === 'RESOLVED') {
        const error = new Error('Report has already been resolved.');
        error.statusCode = 409;
        throw error;
      }

      // 2. Atomic conditional update (only updates if status is PENDING)
      const updateResult = await tx.report.updateMany({
        where: {
          id,
          status: 'PENDING',
        },
        data: {
          status: 'DISMISSED',
          moderatorId: req.user.id,
          actionTaken: cleanNote || 'Report dismissed by administrator',
          resolvedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        const error = new Error(
          'Conflict: Report was modified concurrently by another administrator.'
        );
        error.statusCode = 409;
        throw error;
      }

      const targetEntityId =
        existing.postId ||
        existing.commentId ||
        existing.articleId ||
        existing.targetUserId ||
        null;

      // 3. Create AdminAction audit log
      await tx.adminAction.create({
        data: {
          adminId: req.user.id,
          actionType: 'REPORT_DISMISSED',
          targetEntity: 'Report',
          targetId: id,
          details: {
            previousStatus: 'PENDING',
            newStatus: 'DISMISSED',
            targetType: existing.targetType,
            targetId: targetEntityId,
            reporterId: existing.reporterId,
            moderationNote: cleanNote,
          },
        },
      });

      // 4. Fetch and return updated report
      const updatedReport = await tx.report.findUnique({
        where: { id },
        include: targetIncludes,
      });

      return formatReport(updatedReport);
    });

    res.status(200).json({
      success: true,
      message: 'Report dismissed successfully.',
      data: {
        report: result,
      },
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
