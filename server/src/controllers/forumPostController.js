import { prisma } from '../config/db.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const SORTS = {
  recent: [{ createdAt: 'desc' }, { id: 'asc' }],
  oldest: [{ createdAt: 'asc' }, { id: 'asc' }],
  popular: [{ netVoteScore: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
};

export const listForumPosts = async (req, res, next) => {
  try {
    const parsePositiveInt = (value, fallback, label, max = Number.MAX_SAFE_INTEGER) => {
      if (value === undefined) return fallback;
      if (!/^\d+$/.test(String(value))) throw Object.assign(new Error(`${label} must be a positive integer.`), { status: 400 });
      const parsed = Number(value);
      if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
        throw Object.assign(new Error(`${label} must be between 1 and ${max}.`), { status: 400 });
      }
      return parsed;
    };
    const page = parsePositiveInt(req.query.page, 1, 'page');
    const limit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT, 'limit', MAX_LIMIT);
    const sort = req.query.sort ?? 'recent';
    if (!Object.hasOwn(SORTS, sort)) return res.status(400).json({ success: false, message: 'sort must be recent, oldest, or popular.' });
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    if (search.length > 100) return res.status(400).json({ success: false, message: 'search must be 100 characters or fewer.' });
    if (category.length > 80) return res.status(400).json({ success: false, message: 'category must be 80 characters or fewer.' });
    if (req.query.search !== undefined && typeof req.query.search !== 'string') return res.status(400).json({ success: false, message: 'search must be a string.' });
    if (req.query.category !== undefined && typeof req.query.category !== 'string') return res.status(400).json({ success: false, message: 'category must be a string.' });

    const where = {
      deletedAt: null,
      author: { deletedAt: null, status: 'ACTIVE' },
      ...(category ? { category } : {}),
      ...(search ? { OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
      ] } : {}),
    };
    const [total, posts] = await Promise.all([
      prisma.forumPost.count({ where }),
      prisma.forumPost.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: SORTS[sort],
        select: {
          id: true, title: true, body: true, category: true, tags: true,
          upvotesCount: true, downvotesCount: true, netVoteScore: true, commentsCount: true,
          createdAt: true, updatedAt: true,
          author: { select: { id: true, name: true, location: true } },
        },
      }),
    ]);
    const totalPages = Math.ceil(total / limit);
    return res.json({ success: true, data: {
      posts,
      pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 && total > 0 },
    } });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ success: false, message: error.message });
    return next(error);
  }
};
