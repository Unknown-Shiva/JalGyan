import { apiRequest } from './api'

export const authService = {
  /**
   * Authenticate user with email and password via backend POST /api/auth/login
   * @param {{ email: string, password: string }} credentials
   * @returns {Promise<{ token: string, user: object }>}
   */
  async login(credentials) {
    if (!credentials?.email || !credentials?.password) {
      throw new Error('Enter your email and password.')
    }
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: {
        email: String(credentials.email).trim(),
        password: credentials.password,
      },
    })
    return data
  },

  /**
   * Register a new user account
   * @param {object} payload
   */
  async register(payload) {
    if (!payload?.name || !payload?.email || !payload?.password) {
      throw new Error('Complete all required fields.')
    }
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: payload,
    })
    return data
  },

  /**
   * Retrieve currently authenticated user profile via GET /api/auth/me
   * @returns {Promise<object>}
   */
  async me() {
    const data = await apiRequest('/auth/me')
    return data.user || data
  },
}
