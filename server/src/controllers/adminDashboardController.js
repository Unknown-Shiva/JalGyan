import { prisma } from '../config/db.js';

/**
 * Controller to fetch aggregated platform statistics for Admin Dashboard
 * Endpoint: GET /api/admin/dashboard/stats
 * Access: Admin only (protected by requireAuth + requireAdmin)
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Run independent database queries concurrently using Promise.all
    const [
      // 1. User stats
      totalUsers,
      activeUsers,
      suspendedUsers,
      newUsersLast7Days,

      // 2. Article stats
      totalArticles,
      publishedArticles,
      pendingArticles,
      rejectedArticles,
      draftArticles,

      // 3. Community stats
      totalPosts,
      totalComments,
      totalVotes,

      // 4. Report stats
      totalReports,
      pendingReports,
      resolvedReports,
      dismissedReports,

      // 5. Water conservation stats
      waterAggregates,
      waterTypeCounts,

      // 6. Recent admin activity
      recentActions,
    ] = await Promise.all([
      // 1. User counts (excluding soft-deleted)
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      prisma.user.count({ where: { status: 'SUSPENDED', deletedAt: null } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo }, deletedAt: null } }),

      // 2. Article counts (excluding soft-deleted)
      prisma.article.count({ where: { deletedAt: null } }),
      prisma.article.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
      prisma.article.count({ where: { status: 'PENDING_REVIEW', deletedAt: null } }),
      prisma.article.count({ where: { status: 'REJECTED', deletedAt: null } }),
      prisma.article.count({ where: { status: 'DRAFT', deletedAt: null } }),

      // 3. Community counts (excluding soft-deleted)
      prisma.forumPost.count({ where: { deletedAt: null } }),
      prisma.comment.count({ where: { deletedAt: null } }),
      prisma.vote.count(),

      // 4. Report counts
      prisma.report.count(),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.report.count({ where: { status: 'RESOLVED' } }),
      prisma.report.count({ where: { status: 'DISMISSED' } }),

      // 5. Water conservation aggregation (using normalized annual metrics)
      prisma.waterCalculation.aggregate({
        _sum: {
          annualWaterSavedLiters: true,
          annualWaterHarvestedLiters: true,
        },
        _count: {
          id: true,
        },
      }),
      prisma.waterCalculation.groupBy({
        by: ['calculationType'],
        _count: {
          id: true,
        },
      }),

      // 6. Latest 10 Admin actions
      prisma.adminAction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          actionType: true,
          targetEntity: true,
          targetId: true,
          details: true,
          createdAt: true,
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    // Format calculation breakdown by type with fallback zeroes
    const calculationBreakdown = {
      AGRICULTURE: 0,
      DRIP_IRRIGATION: 0,
      RAINWATER_HARVESTING: 0,
      HOUSEHOLD: 0,
    };
    waterTypeCounts.forEach((item) => {
      if (item.calculationType in calculationBreakdown) {
        calculationBreakdown[item.calculationType] = item._count.id;
      }
    });

    // Safely serialize Decimal values to Number
    const annualWaterSaved = waterAggregates._sum.annualWaterSavedLiters
      ? Number(waterAggregates._sum.annualWaterSavedLiters)
      : 0;
    const annualWaterHarvested = waterAggregates._sum.annualWaterHarvestedLiters
      ? Number(waterAggregates._sum.annualWaterHarvestedLiters)
      : 0;

    // Sanitize recent admin activity list
    const formattedRecentActivity = recentActions.map((action) => ({
      id: action.id,
      actionType: action.actionType,
      targetEntity: action.targetEntity,
      targetId: action.targetId,
      details: action.details,
      timestamp: action.createdAt,
      admin: {
        id: action.admin?.id,
        name: action.admin?.name,
        email: action.admin?.email,
      },
    }));

    // Return structured payload
    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          suspended: suspendedUsers,
          newInLast7Days: newUsersLast7Days,
        },
        articles: {
          total: totalArticles,
          published: publishedArticles,
          pendingReview: pendingArticles,
          rejected: rejectedArticles,
          draft: draftArticles,
        },
        community: {
          totalPosts,
          totalComments,
          totalVotes,
        },
        reports: {
          total: totalReports,
          pending: pendingReports,
          resolved: resolvedReports,
          dismissed: dismissedReports,
        },
        waterConservation: {
          totalAnnualWaterSavedLiters: annualWaterSaved,
          totalAnnualWaterHarvestedLiters: annualWaterHarvested,
          totalCalculations: waterAggregates._count.id || 0,
          breakdownByType: calculationBreakdown,
        },
        recentAdminActivity: formattedRecentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
};
