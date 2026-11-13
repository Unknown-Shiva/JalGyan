import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Droplets } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const safeError = (error) => {
  if (error?.status === 409) return 'An account with this email already exists. Try signing in instead.'
  if (error?.status === 400) return error.message || 'Check your details and try again.'
  if (error instanceof TypeError) return 'Unable to connect. Check your internet connection and try again.'
  return 'We could not create your account right now. Please try again.'
}

export default function Register() {
  const { register } = useAuth(), navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', location: '' })
  const [error, setError] = useState(''), [success, setSuccess] = useState(''), [submitting, setSubmitting] = useState(false)
  const change = e => setForm(current => ({ ...current, [e.target.name]: e.target.value }))
  const submit = async e => {
    e.preventDefault(); setError(''); setSuccess('')
    const name = form.name.trim(), email = form.email.trim(), location = form.location.trim()
    if (!name) return setError('Enter your name.')
    if (!emailPattern.test(email)) return setError('Enter a valid email address.')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    if (new TextEncoder().encode(form.password).length > 72) return setError('Password must be no more than 72 UTF-8 bytes.')
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.')
    if (location.length > 120) return setError('Location must be 120 characters or fewer.')
    setSubmitting(true)
    try {
      await register({ name, email, password: form.password, location })
      setSuccess('Your account is ready. Taking you to the community…')
      navigate('/forum')
    } catch (err) { setError(safeError(err)) } finally { setSubmitting(false) }
  }
  return <div className="auth-page"><div className="auth-visual"><div className="auth-visual-content"><span className="auth-kicker"><Droplets size={16}/> WATERWISE INDIA</span><h1>Local action.<br/>Collective<br/><em>impact.</em></h1><p>Connect with people working on water conservation in homes, farms and communities.</p></div><div className="auth-watermark">EVERY DROP HAS A PURPOSE</div></div><div className="auth-panel"><div className="auth-form-wrap"><span className="eyebrow">JOIN THE COMMUNITY</span><h2>Create your account</h2><p className="muted">A few details to get started.</p><form onSubmit={submit} className="auth-form" noValidate>
    <label>Full name<input name="name" value={form.name} onChange={change} placeholder="Your name" autoComplete="name" required maxLength={100}/></label>
    <label>Email address<input name="email" type="email" value={form.email} onChange={change} placeholder="you@example.com" autoComplete="email" required/></label>
    <label>Location <span className="optional">(optional)</span><input name="location" value={form.location} onChange={change} placeholder="City, State" maxLength={120}/></label>
    <label>Password<input name="password" type="password" value={form.password} onChange={change} placeholder="At least 8 characters" autoComplete="new-password" required/></label>
    <label>Confirm password<input name="confirmPassword" type="password" value={form.confirmPassword} onChange={change} placeholder="Re-enter your password" autoComplete="new-password" required/></label>
    {error && <div className="alert-error" role="alert">{error}</div>}{success && <div className="alert-success" role="status">{success}</div>}
    <button className="button button-primary button-wide" disabled={submitting}>{submitting ? 'Creating account…' : <>Create account <ArrowRight size={16}/></>}</button>
  </form><p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p><p className="auth-legal">Your details are used to support your community profile.</p></div></div></div>
}
