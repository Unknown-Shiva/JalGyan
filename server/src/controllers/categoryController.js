import { prisma } from '../config/db.js';

const slugify = (text) =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

/**
 * GET /api/categories
 * Retrieve all categories with counts of published articles
 */
export const listCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            articles: {
              where: {
                status: 'PUBLISHED',
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    const formatted = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      articlesCount: cat._count?.articles ?? 0,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        categories: formatted,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/categories/:slug
 * Retrieve a specific category by slug with its published articles
 */
export const getCategoryBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid category slug.',
      });
    }

    const category = await prisma.category.findUnique({
      where: { slug: slug.toLowerCase().trim() },
      include: {
        articles: {
          where: {
            status: 'PUBLISHED',
            deletedAt: null,
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            readTime: true,
            coverImage: true,
            viewsCount: true,
            publishedAt: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                name: true,
                location: true,
              },
            },
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          articlesCount: category.articles.length,
          articles: category.articles,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/categories
 * Admin-only: Create a new knowledge category
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 60) {
      return res.status(400).json({
        success: false,
        message: 'Category name must be between 3 and 60 characters.',
      });
    }

    const cleanName = name.trim();
    const cleanDesc = description && typeof description === 'string' ? description.trim() : null;
    const slug = slugify(cleanName);

    const existing = await prisma.category.findFirst({
      where: {
        OR: [{ name: cleanName }, { slug }],
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A category with this name or slug already exists.',
      });
    }

    const category = await prisma.category.create({
      data: {
        name: cleanName,
        slug,
        description: cleanDesc,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};
