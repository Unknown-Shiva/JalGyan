import { prisma } from '../config/db.js';
import { sanitizeUser } from '../utils/sanitizeUser.js';

const POST_CATEGORIES = ['Community', 'Agriculture', 'Rainwater', 'Household', 'Groundwater'];
const POST_EDITABLE_FIELDS = ['title', 'body', 'category', 'tags'];

function validatePostChanges(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length === 0) {
    return { error: 'Provide at least one discussion field to update.' };
  }
  const unsupported = Object.keys(body).find(key => !POST_EDITABLE_FIELDS.includes(key));
  if (unsupported) return { error: `Unsupported field: ${unsupported}.` };
  const data = {};
  if (Object.hasOwn(body, 'title')) {
    if (typeof body.title !== 'string' || body.title.trim().length < 8 || body.title.trim().length > 120) return { error: 'Title must be between 8 and 120 characters.' };
    data.title = body.title.trim();
  }
  if (Object.hasOwn(body, 'body')) {
    if (typeof body.body !== 'string' || body.body.trim().length < 20 || body.body.trim().length > 5000) return { error: 'Discussion details must be between 20 and 5,000 characters.' };
    data.body = body.body.trim();
  }
  if (Object.hasOwn(body, 'category')) {
    if (typeof body.category !== 'string' || !POST_CATEGORIES.includes(body.category.trim())) return { error: `Category must be one of: ${POST_CATEGORIES.join(', ')}.` };
    data.category = body.category.trim();
  }
  if (Object.hasOwn(body, 'tags')) {
    if (!Array.isArray(body.tags) || body.tags.length > 10 || body.tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.trim().length > 40)) return { error: 'Tags must be an array of up to 10 non-empty strings, each no more than 40 characters.' };
    data.tags = body.tags.map(tag => tag.trim());
  }
  return { data };
}

const postResponseSelect = {
  id: true, title: true, body: true, category: true, tags: true,
  upvotesCount: true, downvotesCount: true, netVoteScore: true, commentsCount: true,
  createdAt: true, updatedAt: true,
  author: { select: { id: true, name: true, location: true } },
};

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
    let voteByPost = new Map();
    if (req.user?.id && posts.length) {
      const votes = await prisma.vote.findMany({
        where: { userId: req.user.id, postId: { in: posts.map(post => post.id) } },
        select: { postId: true, type: true },
      });
      voteByPost = new Map(votes.map(vote => [vote.postId, vote.type]));
    }
    const personalizedPosts = posts.map(post => ({ ...post, currentUserVote: voteByPost.get(post.id) ?? null }));
    const totalPages = Math.ceil(total / limit);
    return res.json({ success: true, data: {
      posts: personalizedPosts,
      pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 && total > 0 },
    } });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ success: false, message: error.message });
    return next(error);
  }
};

export const getForumPost = async (req, res, next) => {
  try {
    const post = await prisma.forumPost.findFirst({
      where: { id: req.params.id, deletedAt: null, author: { deletedAt: null, status: 'ACTIVE' } },
      select: {
        id: true, title: true, body: true, category: true, tags: true,
        upvotesCount: true, downvotesCount: true, netVoteScore: true, commentsCount: true,
        createdAt: true, updatedAt: true,
        author: { select: { id: true, name: true, location: true } },
        comments: {
          where: { parentId: null, deletedAt: null, author: { deletedAt: null, status: 'ACTIVE' } },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true, text: true, postId: true, parentId: true, createdAt: true,
            author: { select: { id: true, name: true, location: true } },
            replies: {
              where: { postId: req.params.id, deletedAt: null, author: { deletedAt: null, status: 'ACTIVE' } },
              orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
              select: {
                id: true, text: true, postId: true, parentId: true, createdAt: true,
                author: { select: { id: true, name: true, location: true } },
              },
            },
          },
        },
      },
    });
    if (!post) return res.status(404).json({ success: false, message: 'Discussion not found.' });
    const currentVote = req.user?.id
      ? await prisma.vote.findUnique({ where: { userId_postId: { userId: req.user.id, postId: post.id } }, select: { type: true } })
      : null;
    const { upvotesCount, downvotesCount, netVoteScore, ...details } = post;
    return res.json({ success: true, data: { post: {
      ...details,
      currentUserVote: currentVote?.type ?? null,
      votes: { upvotes: upvotesCount, downvotes: downvotesCount, score: netVoteScore },
    } } });
  } catch (error) { return next(error); }
};

export const createForumPost = async (req, res, next) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ success: false, message: 'Provide a valid discussion object.' });
    }
    const allowed = ['title', 'body', 'category', 'tags'];
    const unsupported = Object.keys(body).find(key => !allowed.includes(key));
    if (unsupported) return res.status(400).json({ success: false, message: `Unsupported field: ${unsupported}.` });
    if (typeof body.title !== 'string' || body.title.trim().length < 8 || body.title.trim().length > 120) {
      return res.status(400).json({ success: false, message: 'Title must be between 8 and 120 characters.' });
    }
    if (typeof body.body !== 'string' || body.body.trim().length < 20 || body.body.trim().length > 5000) {
      return res.status(400).json({ success: false, message: 'Discussion details must be between 20 and 5,000 characters.' });
    }
    if (typeof body.category !== 'string' || !POST_CATEGORIES.includes(body.category.trim())) {
      return res.status(400).json({ success: false, message: `Category must be one of: ${POST_CATEGORIES.join(', ')}.` });
    }
    const tags = body.tags ?? [];
    if (!Array.isArray(tags) || tags.length > 10 || tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.trim().length > 40)) {
      return res.status(400).json({ success: false, message: 'Tags must be an array of up to 10 non-empty strings, each no more than 40 characters.' });
    }
    const post = await prisma.forumPost.create({
      data: {
        title: body.title.trim(), body: body.body.trim(), category: body.category.trim(),
        tags: tags.map(tag => tag.trim()), authorId: req.user.id,
      },
      select: {
        id: true, title: true, body: true, category: true, tags: true,
        upvotesCount: true, downvotesCount: true, netVoteScore: true, commentsCount: true,
        createdAt: true, updatedAt: true,
        author: { select: { id: true, name: true, location: true } },
      },
    });
    return res.status(201).json({ success: true, message: 'Discussion created.', data: { post: { ...post, author: sanitizeUser(post.author) } } });
  } catch (error) {
    // Keep database implementation details out of client responses.
    if (error?.code) return res.status(500).json({ success: false, message: 'Could not create discussion right now.' });
    return next(error);
  }
};

export const updateForumPost = async (req, res, next) => {
  try {
    const { data, error } = validatePostChanges(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    const result = await prisma.forumPost.updateMany({
      where: { id: req.params.id, authorId: req.user.id, deletedAt: null },
      data,
    });
    if (result.count === 0) return res.status(404).json({ success: false, message: 'Discussion not found.' });
    const post = await prisma.forumPost.findFirst({
      where: { id: req.params.id, authorId: req.user.id, deletedAt: null, author: { deletedAt: null, status: 'ACTIVE' } },
      select: postResponseSelect,
    });
    if (!post) return res.status(404).json({ success: false, message: 'Discussion not found.' });
    return res.json({ success: true, message: 'Discussion updated.', data: { post } });
  } catch (error) { return next(error); }
};

export const deleteForumPost = async (req, res, next) => {
  try {
    const result = await prisma.forumPost.updateMany({
      where: { id: req.params.id, authorId: req.user.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0) return res.status(404).json({ success: false, message: 'Discussion not found.' });
    return res.json({ success: true, message: 'Discussion deleted.', data: { id: req.params.id } });
  } catch (error) { return next(error); }
};
