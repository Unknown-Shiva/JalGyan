import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Droplets, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from 'react-i18next'

export default function Login() {
  const { login } = useAuth(), navigate = useNavigate()
  const { t } = useTranslation()
  const [email,setEmail] = useState(''), [password,setPassword] = useState(''), [show,setShow] = useState(false), [error,setError] = useState('')
  const submit = async e => { e.preventDefault(); setError(''); try { await login({email,password}); navigate('/forum') } catch(err) { setError(err?.status === 401 ? t('auth.loginInvalid') : err instanceof TypeError ? t('auth.networkError') : t('auth.loginFailed')) } }
  return <div className="auth-page"><div className="auth-visual"><div className="auth-visual-content"><span className="auth-kicker"><Droplets size={16}/> WATERWISE INDIA</span><h1>{t('auth.visualLoginTitle')}</h1><p>{t('auth.visualLoginBody')}</p><div className="auth-stat-row"><div><strong>{t('auth.community')}</strong><span>{t('auth.localKnowledge')}</span></div><div><strong>{t('auth.knowledge')}</strong><span>{t('auth.sharedSolutions')}</span></div></div></div><div className="auth-watermark">{t('auth.loginWatermark')}</div></div>
    <div className="auth-panel"><div className="auth-form-wrap"><span className="eyebrow">{t('auth.welcome')}</span><h2>{t('auth.signInTitle')}</h2><p className="muted">{t('auth.loginIntro')}</p><form onSubmit={submit} className="auth-form"><label>{t('auth.email')}<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={t('auth.emailPlaceholder')} required/></label><label>{t('auth.password')}<div className="password-field"><input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={t('auth.passwordPlaceholder')} required/><button type="button" onClick={()=>setShow(!show)} aria-label={show ? t('common.hidePassword') : t('common.showPassword')}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>{error && <div className="alert-error" role="alert">{error}</div>}<button className="button button-primary button-wide">{t('nav.signIn')} <ArrowRight size={16}/></button></form><p className="auth-switch">{t('auth.newTo')} <Link to="/register">{t('auth.createAccount')}</Link></p><p className="auth-legal">{t('auth.legal')}</p></div></div></div>
}
