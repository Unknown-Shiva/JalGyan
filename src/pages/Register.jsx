import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Droplets } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from 'react-i18next'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export default function Register() {
  const { register } = useAuth(), navigate = useNavigate()
  const { t } = useTranslation()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', location: '' })
  const [error, setError] = useState(''), [success, setSuccess] = useState(''), [submitting, setSubmitting] = useState(false)
  const change = e => setForm(current => ({ ...current, [e.target.name]: e.target.value }))
  const submit = async e => {
    e.preventDefault(); setError(''); setSuccess('')
    const name = form.name.trim(), email = form.email.trim(), location = form.location.trim()
    if (!name) return setError(t('auth.nameRequired'))
    if (!emailPattern.test(email)) return setError(t('auth.validEmail'))
    if (form.password.length < 8) return setError(t('auth.passwordLength'))
    if (new TextEncoder().encode(form.password).length > 72) return setError(t('auth.passwordBytes'))
    if (form.password !== form.confirmPassword) return setError(t('auth.passwordMismatch'))
    if (location.length > 120) return setError(t('auth.locationLength'))
    setSubmitting(true)
    try {
      await register({ name, email, password: form.password, location })
      setSuccess(t('auth.registered'))
      navigate('/forum')
    } catch (err) {
      const message = err?.status === 409 ? t('auth.emailExists') : err?.status === 400 ? t('auth.checkDetails') : err instanceof TypeError ? t('auth.networkError') : t('auth.registerError')
      setError(message)
    } finally { setSubmitting(false) }
  }
  return <div className="auth-page"><div className="auth-visual"><div className="auth-visual-content"><span className="auth-kicker"><Droplets size={16}/> WATERWISE INDIA</span><h1>{t('auth.visualRegisterTitle')}</h1><p>{t('auth.visualRegisterBody')}</p></div><div className="auth-watermark">{t('auth.registerWatermark')}</div></div><div className="auth-panel"><div className="auth-form-wrap"><span className="eyebrow">{t('auth.join')}</span><h2>{t('auth.registerTitle')}</h2><p className="muted">{t('auth.registerIntro')}</p><form onSubmit={submit} className="auth-form" noValidate>
    <label>{t('auth.name')}<input name="name" value={form.name} onChange={change} placeholder={t('auth.namePlaceholder')} autoComplete="name" required maxLength={100}/></label>
    <label>{t('auth.email')}<input name="email" type="email" value={form.email} onChange={change} placeholder={t('auth.emailPlaceholder')} autoComplete="email" required/></label>
    <label>{t('auth.location')} <span className="optional">{t('auth.optional')}</span><input name="location" value={form.location} onChange={change} placeholder={t('auth.locationPlaceholder')} maxLength={120}/></label>
    <label>{t('auth.password')}<input name="password" type="password" value={form.password} onChange={change} placeholder={t('auth.passwordMin')} autoComplete="new-password" required/></label>
    <label>{t('auth.confirmPassword')}<input name="confirmPassword" type="password" value={form.confirmPassword} onChange={change} placeholder={t('auth.confirmPlaceholder')} autoComplete="new-password" required/></label>
    {error && <div className="alert-error" role="alert">{error}</div>}{success && <div className="alert-success" role="status">{success}</div>}
    <button className="button button-primary button-wide" disabled={submitting}>{submitting ? t('auth.creating') : <>{t('auth.createAccount')} <ArrowRight size={16}/></>}</button>
  </form><p className="auth-switch">{t('auth.alreadyRegistered')} <Link to="/login">{t('nav.signIn')}</Link></p><p className="auth-legal">{t('auth.profileLegal')}</p></div></div></div>
}
