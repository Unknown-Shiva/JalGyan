import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Droplets } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function Register() {
  const { register } = useAuth(), navigate = useNavigate()
  const [form,setForm] = useState({name:'',email:'',password:'',location:''}), [error,setError] = useState('')
  const change = e => setForm({...form,[e.target.name]:e.target.value})
  const submit = async e => { e.preventDefault(); setError(''); try { await register(form); navigate('/forum') } catch(err) { setError(err.message) } }
  return <div className="auth-page"><div className="auth-visual"><div className="auth-visual-content"><span className="auth-kicker"><Droplets size={16}/> WATERWISE INDIA</span><h1>Local action.<br/>Collective<br/><em>impact.</em></h1><p>Connect with people working on water conservation in homes, farms and communities.</p></div><div className="auth-watermark">EVERY DROP HAS A PURPOSE</div></div><div className="auth-panel"><div className="auth-form-wrap"><span className="eyebrow">JOIN THE COMMUNITY</span><h2>Create your account</h2><p className="muted">A few details to get started.</p><form onSubmit={submit} className="auth-form"><label>Full name<input name="name" value={form.name} onChange={change} placeholder="Your name" required/></label><label>Email address<input name="email" type="email" value={form.email} onChange={change} placeholder="you@example.com" required/></label><label>Location <span className="optional">(optional)</span><input name="location" value={form.location} onChange={change} placeholder="City, State"/></label><label>Password<input name="password" type="password" minLength="8" value={form.password} onChange={change} placeholder="At least 8 characters" required/></label>{error && <div className="alert-error">{error}</div>}<button className="button button-primary button-wide">Create account <ArrowRight size={16}/></button></form><p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p><p className="auth-legal">Your details are used to support your community profile.</p></div></div></div>
}
