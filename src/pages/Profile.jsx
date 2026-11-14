import { useEffect, useState } from 'react'
import { MapPin, CalendarDays, Edit3, Droplets } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Avatar from '../components/common/Avatar'
import { authService } from '../services/authService'
import { useTranslation } from 'react-i18next'

export default function Profile() {
  const { user, saveProfile } = useAuth()
  const { t, i18n } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: user?.name || '', location: user?.location || '', bio: user?.bio || '' })
  const [saving, setSaving] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [activity, setActivity] = useState(null), [activityError, setActivityError] = useState(false)

  useEffect(() => {
    let active = true
    authService.getMyActivity().then(data => { if (active) setActivity(data) }).catch(() => { if (active) setActivityError(true) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    setForm({ name: user?.name || '', location: user?.location || '', bio: user?.bio || '' })
  }, [user])

  const change = (event) => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const cancel = () => { setForm({ name: user?.name || '', location: user?.location || '', bio: user?.bio || '' }); setEditing(false); setError('') }
  const save = async (event) => {
    event.preventDefault(); setError(''); setNotice('')
    const name = form.name.trim(), location = form.location.trim(), bio = form.bio.trim()
    if (!name || name.length > 100) return setError(t('profile.nameLength'))
    if (location.length > 120) return setError(t('profile.locationLength'))
    if (bio.length > 1000) return setError(t('profile.aboutLength'))
    setSaving(true)
    try {
      await saveProfile({ name, location, bio })
      setNotice(t('profile.saved'))
      setEditing(false)
    } catch (err) { setError(err?.status === 400 ? t('profile.invalid') : t('profile.saveError')) }
    finally { setSaving(false) }
  }
  const initials = user?.name?.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()
  return <div className="profile-page"><div className="profile-cover"></div><section className="profile-card"><div className="profile-top"><Avatar initials={initials} size="large"/><div className="profile-identity"><h1>{user?.name}</h1><span><MapPin size={14}/> {user?.location || t('common.locationMissing')}</span></div><button className="button button-outline edit-profile" onClick={() => { editing ? cancel() : setEditing(true); setNotice('') }} disabled={saving}><Edit3 size={15}/>{editing ? t('common.cancel') : t('profile.edit')}</button></div>
    {error && <div className="alert-error" role="alert">{error}</div>}{notice && <div className="alert-success" role="status">{notice}</div>}
    {editing ? <form className="profile-edit-form" onSubmit={save}><label>{t('profile.name')}<input name="name" value={form.name} onChange={change} maxLength={100} required/></label><label>{t('profile.location')}<input name="location" value={form.location} onChange={change} maxLength={120}/></label><label>{t('profile.about')}<textarea name="bio" rows="3" value={form.bio} onChange={change} maxLength={1000}/></label><button className="button button-primary" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button></form> : <p className="profile-bio">{user?.bio || t('profile.introPlaceholder')}</p>}
    <div className="profile-meta"><span><CalendarDays size={15}/> {t('profile.memberSince')} {user?.createdAt ? new Intl.DateTimeFormat(i18n.resolvedLanguage || 'en', { month: 'long', year: 'numeric' }).format(new Date(user.createdAt)) : '—'}</span><span><Droplets size={15}/> {t('profile.member')}</span></div><div className="profile-metrics" aria-live="polite">{activityError ? <span role="alert">{t('profile.activityUnavailable')}</span> : !activity ? <span>{t('profile.activityLoading')}</span> : <><div><strong>{activity.postsCount ?? 0}</strong><span>{t('profile.discussions')}</span></div><div><strong>{activity.votesCount ?? 0}</strong><span>{t('profile.helpfulVotes')}</span></div><div><strong>{activity.bookmarksCount ?? 0}</strong><span>{t('profile.savedResources')}</span></div></>}</div>{activity && <small className="profile-activity-comments">{t('profile.commentsReplies', { count: activity.commentsCount ?? 0 })}</small>}</section></div>
}
