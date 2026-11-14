import { apiRequest } from './api'

export const bookmarkService = {
  async list() {
    const result = await apiRequest('/bookmarks')
    return Array.isArray(result?.bookmarks) ? result.bookmarks : []
  },

  async add(articleId) {
    return apiRequest(`/bookmarks/${encodeURIComponent(articleId)}`, { method: 'POST' })
  },

  async remove(articleId) {
    return apiRequest(`/bookmarks/${encodeURIComponent(articleId)}`, { method: 'DELETE' })
  },
}
