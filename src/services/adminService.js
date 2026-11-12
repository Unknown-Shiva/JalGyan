import { apiRequest } from './api'

/**
 * Administrative API service for Module C administration endpoints.
 * Wraps native fetch calls through apiRequest to ensure proper headers,
 * JWT authentication, and standardized error handling.
 */
export const adminService = {
  /**
   * Fetch paginated list of articles pending moderation review
   * @param {{ page?: number, limit?: number }} params
   * @returns {Promise<{ articles: Array, pagination: { page: number, limit: number, total: number, totalPages: number } }>}
   */
  async getPendingArticles({ page = 1, limit = 10 } = {}) {
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    }).toString()
    return apiRequest(`/admin/articles/pending?${query}`)
  },

  /**
   * Fetch complete article details including author, category, resources, and review history
   * @param {string} id
   * @returns {Promise<{ article: object }>}
   */
  async getArticleById(id) {
    if (!id) throw new Error('Article ID is required.')
    return apiRequest(`/admin/articles/${id}`)
  },

  /**
   * Approve a pending article and publish it
   * @param {string} id
   * @param {string|null} feedback Optional reviewer feedback
   * @returns {Promise<{ article: object, review: object }>}
   */
  async approveArticle(id, feedback = null) {
    if (!id) throw new Error('Article ID is required.')
    return apiRequest(`/admin/articles/${id}/approve`, {
      method: 'PATCH',
      body: feedback ? { feedback: String(feedback).trim() } : {},
    })
  },

  /**
   * Reject a pending article with required reason
   * @param {string} id
   * @param {string} reason Required rejection reason
   * @returns {Promise<{ article: object, review: object }>}
   */
  async rejectArticle(id, reason) {
    if (!id) throw new Error('Article ID is required.')
    if (!reason || !String(reason).trim()) {
      throw new Error('A rejection reason is required.')
    }
    return apiRequest(`/admin/articles/${id}/reject`, {
      method: 'PATCH',
      body: { reason: String(reason).trim() },
    })
  },

  /**
   * Fetch chronological review history for an article
   * @param {string} id
   * @returns {Promise<{ articleId: string, articleTitle: string, currentStatus: string, reviews: Array }>}
   */
  async getArticleReviews(id) {
    if (!id) throw new Error('Article ID is required.')
    return apiRequest(`/admin/articles/${id}/reviews`)
  },
}
