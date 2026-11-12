import { apiRequest } from './api'

/**
 * Administrative API service for Module C administration endpoints.
 * Wraps native fetch calls through apiRequest to ensure proper headers,
 * JWT authentication, and standardized error handling.
 */
export const adminService = {
  // ── Article Moderation Methods ─────────────────────────────────────────────

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

  // ── User Management Methods ────────────────────────────────────────────────

  /**
   * Fetch paginated list of users with search, role/status filtering, and sorting
   * @param {{ page?: number, limit?: number, search?: string, role?: string, status?: string, sortBy?: string, sortOrder?: string }} params
   * @returns {Promise<{ users: Array, pagination: { page: number, limit: number, total: number, totalPages: number } }>}
   */
  async getUsers({
    page = 1,
    limit = 10,
    search,
    role,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) {
    const params = new URLSearchParams()
    if (page) params.append('page', String(page))
    if (limit) params.append('limit', String(limit))
    if (search && String(search).trim()) params.append('search', String(search).trim())
    if (role && role !== 'ALL') params.append('role', role)
    if (status && status !== 'ALL') params.append('status', status)
    if (sortBy) params.append('sortBy', sortBy)
    if (sortOrder) params.append('sortOrder', sortOrder)

    return apiRequest(`/admin/users?${params.toString()}`)
  },

  /**
   * Fetch complete user details including aggregated platform activity counts
   * @param {string} id
   * @returns {Promise<{ user: object }>}
   */
  async getUserById(id) {
    if (!id) throw new Error('User ID is required.')
    return apiRequest(`/admin/users/${id}`)
  },

  /**
   * Suspend an active user account
   * @param {string} id
   * @param {object|string} payload Optional reason or object { reason }
   * @returns {Promise<{ user: object }>}
   */
  async suspendUser(id, payload = {}) {
    if (!id) throw new Error('User ID is required.')
    const body = typeof payload === 'string' ? { reason: payload } : (payload || {})
    return apiRequest(`/admin/users/${id}/suspend`, {
      method: 'PATCH',
      body,
    })
  },

  /**
   * Reactivate a suspended user account
   * @param {string} id
   * @param {object|string} payload Optional reason or object { reason }
   * @returns {Promise<{ user: object }>}
   */
  async activateUser(id, payload = {}) {
    if (!id) throw new Error('User ID is required.')
    const body = typeof payload === 'string' ? { reason: payload } : (payload || {})
    return apiRequest(`/admin/users/${id}/activate`, {
      method: 'PATCH',
      body,
    })
  },

  /**
   * Change user role (USER or ADMIN)
   * @param {string} id
   * @param {object|string} payload Role string or object { role }
   * @returns {Promise<{ user: object }>}
   */
  async updateUserRole(id, payload) {
    if (!id) throw new Error('User ID is required.')
    const role = typeof payload === 'string' ? payload : payload?.role
    if (!role || !['USER', 'ADMIN'].includes(role)) {
      throw new Error("Invalid role provided. Role must be 'USER' or 'ADMIN'.")
    }
    return apiRequest(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: { role },
    })
  },
}
