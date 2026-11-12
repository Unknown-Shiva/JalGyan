import { verifyToken } from '../utils/token.js';
import { prisma } from '../config/db.js';
import { sanitizeUser } from '../utils/sanitizeUser.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session token. Please sign in again.',
      });
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload.',
      });
    }

    // Fetch user from database to ensure fresh state and active status
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists.',
      });
    }

    // Reject soft-deleted accounts
    if (user.deletedAt !== null) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated.',
      });
    }

    // Reject suspended accounts
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact platform administration.',
      });
    }

    // Attach sanitized user to request
    req.user = sanitizeUser(user);
    next();
  } catch (error) {
    next(error);
  }
};
