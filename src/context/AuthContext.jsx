import { createContext, useEffect, useMemo, useState } from 'react'
import { authService } from '../services/authService'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ww_user'))
    } catch {
      return null
    }
  })

  // Start in loading state if a token is present to allow background verification
  const [loading, setLoading] = useState(() => {
    try {
      return Boolean(localStorage.getItem('ww_token'))
    } catch {
      return false
    }
  })

  // Verify session on initial application load
  useEffect(() => {
    let isMounted = true

    const verifySession = async () => {
      const token = localStorage.getItem('ww_token')
      if (!token) {
        setUser(null)
        localStorage.removeItem('ww_user')
        if (isMounted) setLoading(false)
        return
      }

      try {
        const freshUser = await authService.me()
        if (isMounted) {
          setUser(freshUser)
          localStorage.setItem('ww_user', JSON.stringify(freshUser))
        }
      } catch (err) {
        // Token invalid, expired, or account suspended
        if (isMounted) {
          localStorage.removeItem('ww_token')
          localStorage.removeItem('ww_user')
          setUser(null)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    verifySession()

    return () => {
      isMounted = false
    }
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    isAdmin: user?.role === 'ADMIN',
    login: async (credentials) => {
      const result = await authService.login(credentials)
      if (result?.token) {
        localStorage.setItem('ww_token', result.token)
      }
      if (result?.user) {
        localStorage.setItem('ww_user', JSON.stringify(result.user))
        setUser(result.user)
      }
      return result
    },
    register: async (payload) => {
      const result = await authService.register(payload)
      if (result?.token) {
        localStorage.setItem('ww_token', result.token)
      }
      if (result?.user) {
        localStorage.setItem('ww_user', JSON.stringify(result.user))
        setUser(result.user)
      }
      return result
    },
    logout: () => {
      localStorage.removeItem('ww_token')
      localStorage.removeItem('ww_user')
      setUser(null)
    },
    updateUser: (updates) => {
      setUser((current) => {
        const next = current ? { ...current, ...updates } : null
        if (next) {
          localStorage.setItem('ww_user', JSON.stringify(next))
        }
        return next
      })
    },
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
