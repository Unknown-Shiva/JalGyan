import { apiRequest } from './api';
import { INITIAL_ARTICLES } from '../data/initialKnowledgeData';

export const articleService = {
  async list(params = {}) {
    try {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set('page', String(params.page));
      if (params.limit) searchParams.set('limit', String(params.limit));
      if (params.category) searchParams.set('category', params.category);
      if (params.search || params.q) searchParams.set('search', params.search || params.q);
      if (params.sort) searchParams.set('sort', params.sort);
      if (params.resourceType) searchParams.set('resourceType', params.resourceType);

      const qs = searchParams.toString();
      const path = `/articles${qs ? `?${qs}` : ''}`;
      const result = await apiRequest(path);

      if (Array.isArray(result?.articles)) {
        return {
          articles: result.articles,
          pagination: result.pagination || { page: 1, limit: 9, total: result.articles.length, totalPages: 1 },
          filters: result.filters || {},
        };
      }
      return this._fallbackList(params);
    } catch (error) {
      console.warn('Backend articles unavailable, falling back to built-in knowledge base:', error);
      return this._fallbackList(params);
    }
  },

  async getBySlug(slugOrId) {
    try {
      const result = await apiRequest(`/articles/${encodeURIComponent(slugOrId)}`);
      if (result?.article) {
        return {
          article: result.article,
          relatedArticles: result.relatedArticles || [],
        };
      }
      return this._fallbackGet(slugOrId);
    } catch (error) {
      const fallback = this._fallbackGet(slugOrId);
      if (fallback) return fallback;
      throw error;
    }
  },

  async create(data) {
    return apiRequest('/articles', {
      method: 'POST',
      body: data,
    });
  },

  async update(id, data) {
    return apiRequest(`/articles/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: data,
    });
  },

  async delete(id) {
    return apiRequest(`/articles/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async getMyArticles(params = {}) {
    try {
      const searchParams = new URLSearchParams();
      if (params.status) searchParams.set('status', params.status);
      const qs = searchParams.toString();
      const result = await apiRequest(`/articles/my${qs ? `?${qs}` : ''}`);
      return {
        articles: Array.isArray(result?.articles) ? result.articles : [],
        stats: result?.stats || { total: 0, published: 0, pending: 0, drafts: 0, rejected: 0, totalViews: 0 },
      };
    } catch (error) {
      console.warn('Failed to load user articles:', error);
      throw error;
    }
  },

  async submitForReview(id) {
    return apiRequest(`/articles/${encodeURIComponent(id)}/submit`, {
      method: 'PATCH',
    });
  },

  _fallbackList(params) {
    let list = [...INITIAL_ARTICLES];
    const category = params.category;
    const search = (params.search || params.q || '').toLowerCase().trim();

    if (category) {
      list = list.filter(
        (a) => a.category?.slug === category || a.category?.name === category || a.category?.id === category
      );
    }
    if (search) {
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(search) ||
          a.summary.toLowerCase().includes(search) ||
          a.content.toLowerCase().includes(search)
      );
    }

    if (params.sort === 'popular') {
      list.sort((a, b) => b.viewsCount - a.viewsCount);
    } else if (params.sort === 'readTime') {
      list.sort((a, b) => (parseInt(a.readTime, 10) || 0) - (parseInt(b.readTime, 10) || 0));
    }

    const page = Math.max(1, parseInt(params.page, 10) || 1);
    const limit = Math.max(1, parseInt(params.limit, 10) || 9);
    const total = list.length;
    const skip = (page - 1) * limit;

    return {
      articles: list.slice(skip, skip + limit),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      filters: params,
    };
  },

  _fallbackGet(slugOrId) {
    const trimmed = String(slugOrId).toLowerCase().trim();
    const article = INITIAL_ARTICLES.find(
      (a) => a.slug === trimmed || a.id.toLowerCase() === trimmed
    );
    if (!article) return null;
    const relatedArticles = INITIAL_ARTICLES.filter(
      (a) => a.id !== article.id && a.category?.slug === article.category?.slug
    ).slice(0, 3);
    return {
      article: { ...article, isBookmarked: false, bookmarksCount: 12 },
      relatedArticles,
    };
  },
};
