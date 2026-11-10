import { apiRequest } from './api'

const demoUser = { id: 'u1', name: 'Aarav Kulkarni', email: 'aarav@example.com', location: 'Pune, Maharashtra', bio: 'Interested in practical water conservation and sustainable communities.' }

export const authService = {
  async login(credentials) {
    // Demo mode: replace with apiRequest('/auth/login', ...) when backend is ready.
    if (!credentials.email || !credentials.password) throw new Error('Enter your email and password.')
    return { user: { ...demoUser, name: credentials.email.split('@')[0].replace(/[._]/g, ' ') }, token: 'demo-token' }
  },
  async register(payload) {
    if (!payload.name || !payload.email || !payload.password) throw new Error('Complete all required fields.')
    return { user: { ...demoUser, name: payload.name, email: payload.email }, token: 'demo-token' }
  },
  me: () => apiRequest('/auth/me')
}
