import { prisma } from '../config/db.js';

const TARGET_TYPES = new Set(['POST', 'COMMENT', 'ARTICLE', 'USER']);
const REPORT_REASONS = new Set(['SPAM', 'HARASSMENT', 'MISINFORMATION', 'INAPPROPRIATE', 'OTHER']);
const TARGET_FIELDS = {
  POST: 'postId',
  COMMENT: 'commentId',
  ARTICLE: 'articleId',
  USER: 'targetUserId',
};
const TARGET_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_DESCRIPTION_LENGTH = 2000;

function validateRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Provide a valid report object.' };
  }

  const allowedFields = ['targetType', 'targetId', 'reason', 'description'];
  const unsupported = Object.keys(body).find(field => !allowedFields.includes(field));
  if (unsupported) return { error: `Unsupported field: ${unsupported}.` };
  if (typeof body.targetType !== 'string' || !TARGET_TYPES.has(body.targetType)) {
    return { error: 'targetType must be POST, COMMENT, ARTICLE, or USER.' };
  }
  if (typeof body.targetId !== 'string' || !TARGET_ID_PATTERN.test(body.targetId.trim())) {
    return { error: 'targetId must be a valid content ID.' };
  }
  if (typeof body.reason !== 'string' || !REPORT_REASONS.has(body.reason)) {
    return { error: 'reason must be a supported report reason.' };
  }

  let description = null;
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string' || body.description.trim().length > MAX_DESCRIPTION_LENGTH) {
      return { error: `description must be a string of no more than ${MAX_DESCRIPTION_LENGTH} characters.` };
    }
    description = body.description.trim() || null;
  }

  return { data: { targetType: body.targetType, targetId: body.targetId.trim(), reason: body.reason, description } };
}

async function findEligibleTarget(targetType, targetId) {
  switch (targetType) {
    case 'POST':
      return prisma.forumPost.findFirst({
        where: { id: targetId, deletedAt: null, author: { deletedAt: null, status: 'ACTIVE' } },
        select: { id: true },
      });
    case 'COMMENT':
      return prisma.comment.findFirst({
        where: {
          id: targetId,
          deletedAt: null,
          author: { deletedAt: null, status: 'ACTIVE' },
          post: { deletedAt: null, author: { deletedAt: null, status: 'ACTIVE' } },
        },
        select: { id: true },
      });
    case 'ARTICLE':
      return prisma.article.findFirst({
        where: {
          id: targetId,
          status: 'PUBLISHED',
          deletedAt: null,
          author: { deletedAt: null, status: 'ACTIVE' },
        },
        select: { id: true },
      });
    case 'USER':
      return prisma.user.findFirst({
        where: { id: targetId, deletedAt: null, status: 'ACTIVE' },
        select: { id: true },
      });
    default:
      return null;
  }
}

export async function submitReport(req, res, next) {
  const { data, error } = validateRequest(req.body);
  if (error) return res.status(400).json({ success: false, message: error });

  if (data.targetType === 'USER' && data.targetId === req.user.id) {
    return res.status(400).json({ success: false, message: 'You cannot report your own account.' });
  }

  try {
    const target = await findEligibleTarget(data.targetType, data.targetId);
    if (!target) return res.status(404).json({ success: false, message: 'The reported target was not found or is unavailable.' });

    const report = await prisma.report.create({
      data: {
        reporterId: req.user.id,
        targetType: data.targetType,
        [TARGET_FIELDS[data.targetType]]: target.id,
        reason: data.reason,
        description: data.description,
      },
      select: { id: true, targetType: true, reason: true, description: true, status: true, createdAt: true },
    });

    return res.status(201).json({
      success: true,
      message: 'Report submitted.',
      data: { report: { ...report, targetId: target.id } },
    });
  } catch (error) {
    if (error?.code) return res.status(500).json({ success: false, message: 'Could not submit this report right now.' });
    return next(error);
  }
}
