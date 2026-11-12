import { prisma } from '../config/db.js';

/**
 * Standard admin user projection excluding sensitive fields (password, tokens, etc.)
 */
const adminSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
};

/**
 * GET /api/admin/activity
 * Paginated list of administrative actions with filtering and sorting
 */
export const listActivities = async (req, res, next) => {
  try {
    const rawPage = req.query.page;
    const rawLimit = req.query.limit;
    const {
      actionType,
      targetEntity,
      adminId,
      targetId,
      startDate,
      endDate,
      sortOrder = 'desc',
    } = req.query;

    // Validate page
    const page = rawPage !== undefined ? parseInt(rawPage, 10) : 1;
    if (isNaN(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page must be a positive integer greater than or equal to 1.',
      });
    }

    // Validate limit
    const limit = rawLimit !== undefined ? parseInt(rawLimit, 10) : 20;
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be an integer between 1 and 100.',
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

    // Validate startDate
    let parsedStartDate = null;
    if (startDate) {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid startDate format. Please provide a valid ISO date string.',
        });
      }
    }

    // Validate endDate
    let parsedEndDate = null;
    if (endDate) {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid endDate format. Please provide a valid ISO date string.',
        });
      }
    }

    // Validate date range order
    if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate cannot be after endDate.',
      });
    }

    const skip = (page - 1) * limit;

    // Construct Prisma where filter
    const where = {
      ...(actionType && { actionType: String(actionType).trim() }),
      ...(targetEntity && { targetEntity: String(targetEntity).trim() }),
      ...(adminId && { adminId: String(adminId).trim() }),
      ...(targetId && { targetId: String(targetId).trim() }),
      ...((parsedStartDate || parsedEndDate) && {
        createdAt: {
          ...(parsedStartDate && { gte: parsedStartDate }),
          ...(parsedEndDate && { lte: parsedEndDate }),
        },
      }),
    };

    const [total, rawActions] = await Promise.all([
      prisma.adminAction.count({ where }),
      prisma.adminAction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: normalizedSortOrder },
        include: {
          admin: {
            select: adminSelect,
          },
        },
      }),
    ]);

    const actions = rawActions.map((action) => ({
      id: action.id,
      actionType: action.actionType,
      targetEntity: action.targetEntity,
      targetId: action.targetId,
      details: action.details,
      createdAt: action.createdAt,
      admin: action.admin
        ? {
            id: action.admin.id,
            name: action.admin.name,
            email: action.admin.email,
            role: action.admin.role,
          }
        : null,
    }));

    res.status(200).json({
      success: true,
      data: {
        actions,
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
 * GET /api/admin/activity/summary
 * Aggregate audit activity statistics (totals, grouped breakdowns, date ranges, top admins)
 */
export const getActivitySummary = async (req, res, next) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalActions,
      last7Days,
      last30Days,
      byActionTypeGroup,
      byTargetEntityGroup,
      topAdminsGroup,
    ] = await Promise.all([
      prisma.adminAction.count(),
      prisma.adminAction.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.adminAction.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.adminAction.groupBy({
        by: ['actionType'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.adminAction.groupBy({
        by: ['targetEntity'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.adminAction.groupBy({
        by: ['adminId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    // Format grouped breakdowns into easy-to-use dictionary structures and lists
    const byActionType = {};
    for (const g of byActionTypeGroup) {
      byActionType[g.actionType] = g._count.id;
    }

    const byTargetEntity = {};
    for (const g of byTargetEntityGroup) {
      byTargetEntity[g.targetEntity] = g._count.id;
    }

    // Resolve top administrator identities safely without leaking passwords
    const adminIds = topAdminsGroup.map((g) => g.adminId);
    const admins = await prisma.user.findMany({
      where: { id: { in: adminIds } },
      select: adminSelect,
    });
    const adminMap = new Map(admins.map((a) => [a.id, a]));

    const topAdministrators = topAdminsGroup.map((g) => {
      const admin = adminMap.get(g.adminId);
      return {
        adminId: g.adminId,
        actionCount: g._count.id,
        admin: admin
          ? {
              id: admin.id,
              name: admin.name,
              email: admin.email,
              role: admin.role,
            }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        totalActions,
        activityLast7Days: last7Days,
        activityLast30Days: last30Days,
        byActionType,
        byTargetEntity,
        topAdministrators,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/activity/:id
 * Detailed view of one administrative action record
 */
export const getActivityById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid activity action ID provided.',
      });
    }

    const action = await prisma.adminAction.findUnique({
      where: { id },
      include: {
        admin: {
          select: adminSelect,
        },
      },
    });

    if (!action) {
      return res.status(404).json({
        success: false,
        message: 'Admin action not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        action: {
          id: action.id,
          actionType: action.actionType,
          targetEntity: action.targetEntity,
          targetId: action.targetId,
          details: action.details,
          createdAt: action.createdAt,
          admin: action.admin
            ? {
                id: action.admin.id,
                name: action.admin.name,
                email: action.admin.email,
                role: action.admin.role,
              }
            : null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
