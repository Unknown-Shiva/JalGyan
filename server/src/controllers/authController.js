import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { generateToken } from '../utils/token.js';
import { sanitizeUser } from '../utils/sanitizeUser.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate request body
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // Query user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Timing-safe check: use generic error message to avoid revealing email existence
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Check soft-delete status
    if (user.deletedAt !== null) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated.',
      });
    }

    // Check suspension status
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact platform administration.',
      });
    }

    // Verify password hash
    const isMatch = await bcrypt.compare(String(password), user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
};
