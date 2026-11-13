import { prisma } from '../config/db.js';

const COMMENT_MAX_LENGTH = 2000;
const commentSelect = {
  id: true, text: true, postId: true, parentId: true, createdAt: true, updatedAt: true,
  author: { select: { id: true, name: true, location: true } },
};

function validateText(body, allowedFields) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide a valid comment object.' };
  const unsupported = Object.keys(body).find(key => !allowedFields.includes(key));
  if (unsupported) return { error: `Unsupported field: ${unsupported}.` };
  if (typeof body.text !== 'string' || !body.text.trim() || body.text.trim().length > COMMENT_MAX_LENGTH) {
    return { error: `Comment text must be between 1 and ${COMMENT_MAX_LENGTH} characters.` };
  }
  return { text: body.text.trim() };
}

export async function createPostComment(req, res, next) {
  try {
    const validated = validateText(req.body, ['text', 'parentId']);
    if (validated.error) return res.status(400).json({ success: false, message: validated.error });
    if (req.body.parentId !== undefined && (typeof req.body.parentId !== 'string' || !req.body.parentId.trim())) {
      return res.status(400).json({ success: false, message: 'parentId must be a non-empty string when provided.' });
    }
    const post = await prisma.forumPost.findFirst({
      where: { id: req.params.id, deletedAt: null, author: { deletedAt: null, status: 'ACTIVE' } },
      select: { id: true },
    });
    if (!post) return res.status(404).json({ success: false, message: 'Discussion not found.' });
    const parentId = req.body.parentId?.trim();
    if (parentId) {
      const parent = await prisma.comment.findFirst({
        where: { id: parentId, postId: post.id, parentId: null, deletedAt: null, author: { deletedAt: null, status: 'ACTIVE' } },
        select: { id: true },
      });
      if (!parent) return res.status(400).json({ success: false, message: 'Reply target is not an eligible comment on this discussion.' });
    }
    const comment = await prisma.comment.create({
      data: { text: validated.text, postId: post.id, authorId: req.user.id, parentId: parentId || null },
      select: commentSelect,
    });
    return res.status(201).json({ success: true, message: 'Comment created.', data: { comment } });
  } catch (error) { return next(error); }
}

async function findEditableComment(id, userId) {
  return prisma.comment.findFirst({
    where: {
      id, authorId: userId, deletedAt: null,
      post: { deletedAt: null, author: { deletedAt: null, status: 'ACTIVE' } },
      author: { deletedAt: null, status: 'ACTIVE' },
    },
    select: { id: true, postId: true },
  });
}

export async function updateComment(req, res, next) {
  try {
    const validated = validateText(req.body, ['text']);
    if (validated.error) return res.status(400).json({ success: false, message: validated.error });
    const existing = await findEditableComment(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Comment not found.' });
    const result = await prisma.comment.updateMany({
      where: { id: existing.id, authorId: req.user.id, deletedAt: null },
      data: { text: validated.text },
    });
    if (!result.count) return res.status(404).json({ success: false, message: 'Comment not found.' });
    const comment = await prisma.comment.findFirst({
      where: { id: existing.id, authorId: req.user.id, deletedAt: null },
      select: commentSelect,
    });
    return res.json({ success: true, message: 'Comment updated.', data: { comment } });
  } catch (error) { return next(error); }
}

export async function deleteComment(req, res, next) {
  try {
    const existing = await findEditableComment(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Comment not found.' });
    const result = await prisma.comment.updateMany({
      where: { id: existing.id, authorId: req.user.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (!result.count) return res.status(404).json({ success: false, message: 'Comment not found.' });
    return res.json({ success: true, message: 'Comment deleted.', data: { id: existing.id } });
  } catch (error) { return next(error); }
}
