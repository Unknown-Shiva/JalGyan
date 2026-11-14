import { apiRequest } from './api';
import { INITIAL_ARTICLES } from '../data/initialKnowledgeData';

export const resourceService = {
  async list(params = {}) {
    try {
      const searchParams = new URLSearchParams();
      if (params.type) searchParams.set('type', params.type);
      if (params.category) searchParams.set('category', params.category);
      if (params.search || params.q) searchParams.set('search', params.search || params.q);

      const qs = searchParams.toString();
      const path = `/resources${qs ? `?${qs}` : ''}`;
      const result = await apiRequest(path);

      if (Array.isArray(result?.resources)) {
        return {
          resources: result.resources,
          counts: result.counts || {},
        };
      }
      return this._fallbackList(params);
    } catch (error) {
      console.warn('Backend resources unavailable, falling back to built-in resources:', error);
      return this._fallbackList(params);
    }
  },

  async addToArticle(articleId, data) {
    return apiRequest(`/articles/${encodeURIComponent(articleId)}/resources`, {
      method: 'POST',
      body: data,
    });
  },

  async removeFromArticle(articleId, resourceId) {
    return apiRequest(
      `/articles/${encodeURIComponent(articleId)}/resources/${encodeURIComponent(resourceId)}`,
      {
        method: 'DELETE',
      }
    );
  },

  _fallbackList(params) {
    let resources = [];
    for (const art of INITIAL_ARTICLES) {
      if (Array.isArray(art.resources)) {
        for (const res of art.resources) {
          resources.push({
            id: res.id,
            title: res.title,
            url: res.url,
            type: res.type,
            createdAt: art.publishedAt,
            article: {
              id: art.id,
              title: art.title,
              slug: art.slug,
              coverImage: art.coverImage,
              category: art.category,
            },
          });
        }
      }
    }

    if (params.type && params.type !== 'ALL') {
      resources = resources.filter((r) => r.type === params.type.toUpperCase());
    }

    if (params.category) {
      resources = resources.filter(
        (r) =>
          r.article?.category?.slug === params.category ||
          r.article?.category?.id === params.category
      );
    }

    if (params.search) {
      const term = params.search.toLowerCase();
      resources = resources.filter(
        (r) =>
          r.title.toLowerCase().includes(term) ||
          r.article?.title.toLowerCase().includes(term)
      );
    }

    const counts = {
      ALL: resources.length,
      VIDEO: resources.filter((r) => r.type === 'VIDEO').length,
      PDF: resources.filter((r) => r.type === 'PDF').length,
      DATASET: resources.filter((r) => r.type === 'DATASET').length,
      LINK: resources.filter((r) => r.type === 'LINK').length,
    };

    return { resources, counts };
  },
};
