import { apiRequest } from './api'

export const forumService = {
  async list({ page = 1, limit = 10, search = '', category = '', sort = 'recent' } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), sort })
    if (search.trim()) params.set('search', search.trim())
    if (category && category !== 'All topics') params.set('category', category)
    return apiRequest(`/posts?${params}`)
  },

  async get(id) {
    const data = await apiRequest(`/posts/${encodeURIComponent(id)}`)
    return data.post || data
  },

  async create(payload) {
    const data = await apiRequest('/posts', { method: 'POST', body: {
      title: payload.title, body: payload.body, category: payload.category, tags: payload.tags || [],
    } })
    return data.post || data
  },

  async update(id, payload) {
    const data = await apiRequest(`/posts/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload })
    return data.post || data
  },

  async remove(id) {
    return apiRequest(`/posts/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },

  async comment(id, text, parentId) {
    const data = await apiRequest(`/posts/${encodeURIComponent(id)}/comments`, { method: 'POST', body: {
      text, ...(parentId ? { parentId } : {}),
    } })
    return data.comment || data
  },

  async vote(id, type) {
    const data = await apiRequest(`/posts/${encodeURIComponent(id)}/vote`, { method: 'POST', body: { type } })
    return data.vote || data
  },
}
