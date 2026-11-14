import { prisma } from '../config/db.js';

export async function listBookmarks(req, res, next) {
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId: req.user.id,
        article: { status: 'PUBLISHED', deletedAt: null },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        createdAt: true,
        article: {
          select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            readTime: true,
            coverImage: true,
            publishedAt: true,
            createdAt: true,
            category: { select: { name: true } },
          },
        },
      },
    });
    return res.status(200).json({ success: true, data: { bookmarks } });
  } catch (error) {
    return next(error);
  }
}
