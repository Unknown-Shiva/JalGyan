import { createContext, useEffect, useMemo, useState } from 'react'
import { authService } from '../services/authService'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ww_user')) } catch { return null }
  })

  useEffect(() => {
    if (user) localStorage.setItem('ww_user', JSON.stringify(user))
    else localStorage.removeItem('ww_user')
  }, [user])

  const value = useMemo(() => ({
    user,
    login: async (credentials) => {
      const result = await authService.login(credentials)
      setUser(result.user)
      return result
    },
    register: async (payload) => {
      const result = await authService.register(payload)
      setUser(result.user)
      return result
    },
    logout: () => setUser(null),
    updateUser: (updates) => setUser(current => ({ ...current, ...updates }))
  }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
