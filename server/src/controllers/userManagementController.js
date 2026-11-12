import { prisma } from '../config/db.js';

/**
 * GET /api/admin/users
 * Paginated list of users with search, role/status filtering, and sorting
 */
export const listUsers = async (req, res, next) => {
  try {
    const rawPage = req.query.page;
    const rawLimit = req.query.limit;
    const { search, role, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

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

    // Validate role filter if provided
    if (role && !['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role filter. Allowed values: 'USER', 'ADMIN'.",
      });
    }

    // Validate status filter if provided
    if (status && !['ACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status filter. Allowed values: 'ACTIVE', 'SUSPENDED'.",
      });
    }

    // Validate sortBy
    if (!['createdAt', 'name'].includes(sortBy)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sortBy parameter. Allowed values: 'createdAt', 'name'.",
      });
    }

    // Validate sortOrder
    const normalizedOrder = String(sortOrder).toLowerCase();
    if (!['asc', 'desc'].includes(normalizedOrder)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sortOrder parameter. Allowed values: 'asc', 'desc'.",
      });
    }

    const skip = (page - 1) * limit;

    // Build Prisma where clause (always exclude soft-deleted users)
    const where = {
      deletedAt: null,
      ...(role && { role }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: String(search).trim(), mode: 'insensitive' } },
          { email: { contains: String(search).trim(), mode: 'insensitive' } },
        ],
      }),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: normalizedOrder },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          location: true,
          bio: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
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
 * GET /api/admin/users/:id
 * Detailed user information including aggregated activity metrics
 */
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID provided.',
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        location: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            articles: { where: { deletedAt: null } },
            posts: { where: { deletedAt: null } },
            comments: { where: { deletedAt: null } },
            reportsFiled: true,
            calculations: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          location: user.location,
          bio: user.bio,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          activityCounts: {
            articlesAuthored: user._count.articles,
            postsCreated: user._count.posts,
            commentsCreated: user._count.comments,
            reportsSubmitted: user._count.reportsFiled,
            calculationsPerformed: user._count.calculations,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/users/:id/suspend
 * Suspend an active user with audit logging and self/last-admin protection
 */
export const suspendUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID provided.',
      });
    }

    // Prevent self-suspension
    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: 'Administrators cannot suspend their own account.',
      });
    }

    const cleanReason = reason && String(reason).trim() ? String(reason).trim() : null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current target user state
      const target = await tx.user.findUnique({
        where: { id },
      });

      if (!target || target.deletedAt !== null) {
        const error = new Error('User not found.');
        error.statusCode = 404;
        throw error;
      }

      if (target.status === 'SUSPENDED') {
        const error = new Error('User is already suspended.');
        error.statusCode = 400;
        throw error;
      }

      // 2. Protect last active administrator
      if (target.role === 'ADMIN') {
        const activeAdmins = await tx.user.count({
          where: {
            role: 'ADMIN',
            status: 'ACTIVE',
            deletedAt: null,
          },
        });

        if (activeAdmins <= 1) {
          const error = new Error('Cannot suspend the last active administrator account.');
          error.statusCode = 400;
          throw error;
        }
      }

      // 3. Conditional atomic update
      const updateResult = await tx.user.updateMany({
        where: {
          id,
          status: 'ACTIVE',
          deletedAt: null,
        },
        data: {
          status: 'SUSPENDED',
        },
      });

      if (updateResult.count === 0) {
        const error = new Error(
          'Conflict: User status was modified concurrently by another administrator.'
        );
        error.statusCode = 409;
        throw error;
      }

      // 4. Create AdminAction audit log
      await tx.adminAction.create({
        data: {
          adminId: req.user.id,
          actionType: 'USER_SUSPENDED',
          targetEntity: 'User',
          targetId: id,
          details: {
            previousStatus: 'ACTIVE',
            newStatus: 'SUSPENDED',
            targetUserEmail: target.email,
            reason: cleanReason,
          },
        },
      });

      // 5. Return updated user
      const updatedUser = await tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          location: true,
          bio: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedUser;
    });

    res.status(200).json({
      success: true,
      message: 'User suspended successfully.',
      data: {
        user: result,
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
 * PATCH /api/admin/users/:id/activate
 * Reactivate a suspended user with audit logging
 */
export const activateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID provided.',
      });
    }

    const cleanReason = reason && String(reason).trim() ? String(reason).trim() : null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current target user state
      const target = await tx.user.findUnique({
        where: { id },
      });

      if (!target || target.deletedAt !== null) {
        const error = new Error('User not found.');
        error.statusCode = 404;
        throw error;
      }

      if (target.status === 'ACTIVE') {
        const error = new Error('User is already active.');
        error.statusCode = 400;
        throw error;
      }

      // 2. Conditional atomic update
      const updateResult = await tx.user.updateMany({
        where: {
          id,
          status: 'SUSPENDED',
          deletedAt: null,
        },
        data: {
          status: 'ACTIVE',
        },
      });

      if (updateResult.count === 0) {
        const error = new Error(
          'Conflict: User status was modified concurrently by another administrator.'
        );
        error.statusCode = 409;
        throw error;
      }

      // 3. Create AdminAction audit log
      await tx.adminAction.create({
        data: {
          adminId: req.user.id,
          actionType: 'USER_ACTIVATED',
          targetEntity: 'User',
          targetId: id,
          details: {
            previousStatus: 'SUSPENDED',
            newStatus: 'ACTIVE',
            targetUserEmail: target.email,
            reason: cleanReason,
          },
        },
      });

      // 4. Return updated user
      const updatedUser = await tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          location: true,
          bio: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedUser;
    });

    res.status(200).json({
      success: true,
      message: 'User reactivated successfully.',
      data: {
        user: result,
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
 * PATCH /api/admin/users/:id/role
 * Change user role with audit logging and self/last-admin protection
 */
export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID provided.',
      });
    }

    // Validate new role
    if (!role || !['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role provided. Role must be either 'USER' or 'ADMIN'.",
      });
    }

    // Prevent self-demotion
    if (req.user.id === id && role !== 'ADMIN') {
      return res.status(400).json({
        success: false,
        message: 'Administrators cannot remove their own ADMIN role or demote themselves.',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current target user state
      const target = await tx.user.findUnique({
        where: { id },
      });

      if (!target || target.deletedAt !== null) {
        const error = new Error('User not found.');
        error.statusCode = 404;
        throw error;
      }

      if (target.role === role) {
        const error = new Error(`User already has the role "${role}".`);
        error.statusCode = 400;
        throw error;
      }

      // 2. Protect last active administrator from demotion
      if (target.role === 'ADMIN' && role === 'USER') {
        const activeAdmins = await tx.user.count({
          where: {
            role: 'ADMIN',
            status: 'ACTIVE',
            deletedAt: null,
          },
        });

        if (activeAdmins <= 1) {
          const error = new Error('Cannot demote the last active administrator account.');
          error.statusCode = 400;
          throw error;
        }
      }

      // 3. Conditional atomic update
      const updateResult = await tx.user.updateMany({
        where: {
          id,
          role: target.role,
          deletedAt: null,
        },
        data: {
          role,
        },
      });

      if (updateResult.count === 0) {
        const error = new Error(
          'Conflict: User role was modified concurrently by another administrator.'
        );
        error.statusCode = 409;
        throw error;
      }

      // 4. Create AdminAction audit log
      await tx.adminAction.create({
        data: {
          adminId: req.user.id,
          actionType: 'USER_ROLE_CHANGED',
          targetEntity: 'User',
          targetId: id,
          details: {
            previousRole: target.role,
            newRole: role,
            targetUserEmail: target.email,
          },
        },
      });

      // 5. Return updated user
      const updatedUser = await tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          location: true,
          bio: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedUser;
    });

    res.status(200).json({
      success: true,
      message: 'User role updated successfully.',
      data: {
        user: result,
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
