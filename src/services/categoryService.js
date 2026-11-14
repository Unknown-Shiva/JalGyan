import { apiRequest } from './api';
import { INITIAL_CATEGORIES } from '../data/initialKnowledgeData';

export const categoryService = {
  async list() {
    try {
      const result = await apiRequest('/categories');
      if (Array.isArray(result?.categories)) {
        return result.categories;
      }
      return INITIAL_CATEGORIES;
    } catch (error) {
      console.warn('Backend categories unavailable, falling back to built-in categories:', error);
      return INITIAL_CATEGORIES;
    }
  },

  async getBySlug(slug) {
    try {
      const result = await apiRequest(`/categories/${encodeURIComponent(slug)}`);
      return result?.category || null;
    } catch (error) {
      const fallback = INITIAL_CATEGORIES.find((c) => c.slug === slug);
      if (fallback) return fallback;
      throw error;
    }
  },
};
