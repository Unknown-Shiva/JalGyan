import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { authService } from '../services/authService'

export const AuthContext = createContext(null)

const readToken = () => { try { return localStorage.getItem('ww_token') } catch { return null } }
const clearStoredSession = () => { try { localStorage.removeItem('ww_token'); localStorage.removeItem('ww_user') } catch {} }
const storeSession = (token, user) => {
  if (!token || !user) throw new Error('The authentication response was incomplete. Please try again.')
  localStorage.setItem('ww_token', token)
  localStorage.setItem('ww_user', JSON.stringify(user))
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readToken)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const revision = useRef(0)

  const clearSession = useCallback(() => {
    revision.current += 1
    clearStoredSession()
    setToken(null)
    setUser(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    const startupRevision = revision.current
    const currentToken = readToken()
    if (!currentToken) {
      clearStoredSession()
      setToken(null); setUser(null); setLoading(false)
      return () => { active = false }
    }
    setToken(currentToken)
    authService.me().then(freshUser => {
      if (!active || startupRevision !== revision.current || readToken() !== currentToken) return
      storeSession(currentToken, freshUser)
      setToken(currentToken); setUser(freshUser)
    }).catch(() => {
      if (active && startupRevision === revision.current && readToken() === currentToken) clearSession()
    }).finally(() => {
      if (active && startupRevision === revision.current) setLoading(false)
    })
    return () => { active = false }
  }, [clearSession])

  useEffect(() => {
    const onUnauthorized = () => clearSession()
    window.addEventListener('ww:unauthorized', onUnauthorized)
    return () => window.removeEventListener('ww:unauthorized', onUnauthorized)
  }, [clearSession])

  const authenticate = useCallback(async (method, payload) => {
    const actionRevision = ++revision.current
    const result = await authService[method](payload)
    if (actionRevision !== revision.current) return result
    storeSession(result?.token, result?.user)
    setToken(result.token); setUser(result.user); setLoading(false)
    return result
  }, [])

  const saveProfile = useCallback(async (profile) => {
    const updatedUser = await authService.updateMe(profile)
    setUser(updatedUser)
    try { localStorage.setItem('ww_user', JSON.stringify(updatedUser)) } catch {}
    return updatedUser
  }, [])

  const value = useMemo(() => ({
    user, token, isAuthenticated: Boolean(token && user), loading,
    isAdmin: user?.role === 'ADMIN',
    login: credentials => authenticate('login', credentials),
    register: payload => authenticate('register', payload),
    saveProfile,
    logout: clearSession,
    updateUser: updates => setUser(current => {
      if (!current) return null
      const next = { ...current, ...updates }
      try { localStorage.setItem('ww_user', JSON.stringify(next)) } catch {}
      return next
    }),
  }), [user, token, loading, authenticate, clearSession, saveProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
