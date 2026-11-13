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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;
const BCRYPT_ROUNDS = 12;

export const register = async (req, res, next) => {
  try {
    const { name, email, password, location } = req.body || {};

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required.',
      });
    }

    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.',
      });
    }

    if (typeof password !== 'string' || !password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required.',
      });
    }

    if (location != null && typeof location !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Location must be a string.',
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedLocation = location == null ? null : String(location).trim();

    if (normalizedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Name must be 100 characters or fewer.',
      });
    }

    if (normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid email address.',
      });
    }

    if (password.length < MIN_PASSWORD_LENGTH || Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and no more than 72 bytes.',
      });
    }

    if (typeof location === 'string' && location.trim().length > 120) {
      return res.status(400).json({
        success: false,
        message: 'Location must be 120 characters or fewer.',
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        password: hashedPassword,
        ...(normalizedLocation ? { location: normalizedLocation } : {}),
      },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: {
        token,
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    // The preflight lookup improves the common case; the unique constraint is
    // still authoritative if two requests register the same email at once.
    if (error?.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }
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
