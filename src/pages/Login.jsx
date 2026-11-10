import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Droplets, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { login } = useAuth(), navigate = useNavigate()
  const [email,setEmail] = useState(''), [password,setPassword] = useState(''), [show,setShow] = useState(false), [error,setError] = useState('')
  const submit = async e => { e.preventDefault(); setError(''); try { await login({email,password}); navigate('/forum') } catch(err) { setError(err.message) } }
  return <div className="auth-page"><div className="auth-visual"><div className="auth-visual-content"><span className="auth-kicker"><Droplets size={16}/> WATERWISE INDIA</span><h1>Better water<br/>habits start<br/><em>together.</em></h1><p>A place to exchange practical ideas, learn from local experience and make every drop count.</p><div className="auth-stat-row"><div><strong>Community</strong><span>Local knowledge</span></div><div><strong>Knowledge</strong><span>Shared solutions</span></div></div></div><div className="auth-watermark">WATER IS A SHARED RESOURCE</div></div>
    <div className="auth-panel"><div className="auth-form-wrap"><span className="eyebrow">WELCOME BACK</span><h2>Sign in to WaterWise</h2><p className="muted">Continue learning and sharing with your community.</p><form onSubmit={submit} className="auth-form"><label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/></label><label>Password<div className="password-field"><input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" required/><button type="button" onClick={()=>setShow(!show)}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>{error && <div className="alert-error">{error}</div>}<button className="button button-primary button-wide">Sign in <ArrowRight size={16}/></button></form><p className="auth-switch">New to WaterWise? <Link to="/register">Create an account</Link></p><p className="auth-legal">By continuing, you agree to use this community respectfully and share reliable information.</p></div></div></div>
}
