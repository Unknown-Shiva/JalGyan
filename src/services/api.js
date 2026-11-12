const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || 'http://localhost:5001/api'

export async function apiRequest(path, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ww_token') : null

  // Format headers
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  // Format body if an object was passed directly
  let body = options.body
  if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
    body = JSON.stringify(body)
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    ...(body ? { body } : {}),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    // If unauthorized on protected routes, purge stale session without causing hard redirects
    if (response.status === 401 && path !== '/auth/login' && typeof window !== 'undefined') {
      localStorage.removeItem('ww_token')
      localStorage.removeItem('ww_user')
    }
    const error = new Error(payload.message || 'Request failed')
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload.data ?? payload
}
