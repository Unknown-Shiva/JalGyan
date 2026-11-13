import { prisma } from '../config/db.js';

const VOTE_TYPES = ['UPVOTE', 'DOWNVOTE'];

async function applyVote(postId, userId, requestedType) {
  return prisma.$transaction(async tx => {
    const post = await tx.forumPost.findFirst({
      where: { id: postId, deletedAt: null, author: { deletedAt: null, status: 'ACTIVE' } },
      select: { id: true },
    });
    if (!post) return { notFound: true };

    const existing = await tx.vote.findUnique({ where: { userId_postId: { userId, postId } } });
    let voteType = requestedType;
    if (!existing) {
      await tx.vote.create({ data: { userId, postId, type: requestedType } });
    } else if (existing.type === requestedType) {
      await tx.vote.delete({ where: { userId_postId: { userId, postId } } });
      voteType = null;
    } else {
      await tx.vote.update({ where: { userId_postId: { userId, postId } }, data: { type: requestedType } });
    }

    const [upvotes, downvotes] = await Promise.all([
      tx.vote.count({ where: { postId, type: 'UPVOTE' } }),
      tx.vote.count({ where: { postId, type: 'DOWNVOTE' } }),
    ]);
    const score = upvotes - downvotes;
    await tx.forumPost.update({ where: { id: postId }, data: { upvotesCount: upvotes, downvotesCount: downvotes, netVoteScore: score } });
    return { active: voteType !== null, voteType, upvotes, downvotes, score };
  }, { isolationLevel: 'Serializable' });
}

export async function togglePostVote(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ success: false, message: 'Provide a valid vote object.' });
  }
  const unsupported = Object.keys(body).find(key => key !== 'type');
  if (unsupported) return res.status(400).json({ success: false, message: `Unsupported field: ${unsupported}.` });
  if (!VOTE_TYPES.includes(body.type)) return res.status(400).json({ success: false, message: 'type must be UPVOTE or DOWNVOTE.' });

  try {
    let result;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        result = await applyVote(req.params.id, req.user.id, body.type);
        break;
      } catch (error) {
        const retryable = error?.code === 'P2002' || error?.code === 'P2034';
        if (!retryable || attempt === 1) throw error;
      }
    }
    if (result?.notFound) return res.status(404).json({ success: false, message: 'Discussion not found.' });
    return res.json({ success: true, data: { vote: {
      active: result.active, type: result.voteType,
      upvotes: result.upvotes, downvotes: result.downvotes, score: result.score,
    } } });
  } catch (error) { return next(error); }
}
