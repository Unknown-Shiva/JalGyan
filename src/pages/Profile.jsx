import { useEffect, useState } from 'react'
import { MapPin, CalendarDays, Edit3, Droplets } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Avatar from '../components/common/Avatar'

export default function Profile() {
  const { user, saveProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: user?.name || '', location: user?.location || '', bio: user?.bio || '' })
  const [saving, setSaving] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')

  useEffect(() => {
    setForm({ name: user?.name || '', location: user?.location || '', bio: user?.bio || '' })
  }, [user])

  const change = (event) => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const cancel = () => { setForm({ name: user?.name || '', location: user?.location || '', bio: user?.bio || '' }); setEditing(false); setError('') }
  const save = async (event) => {
    event.preventDefault(); setError(''); setNotice('')
    const name = form.name.trim(), location = form.location.trim(), bio = form.bio.trim()
    if (!name || name.length > 100) return setError('Name is required and must be 100 characters or fewer.')
    if (location.length > 120) return setError('Location must be 120 characters or fewer.')
    if (bio.length > 1000) return setError('About must be 1,000 characters or fewer.')
    setSaving(true)
    try {
      await saveProfile({ name, location, bio })
      setNotice('Profile changes saved.')
      setEditing(false)
    } catch (err) { setError(err?.status === 400 ? err.message : 'Could not save your profile. Please try again.') }
    finally { setSaving(false) }
  }
  const initials = user?.name?.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()
  return <div className="profile-page"><div className="profile-cover"></div><section className="profile-card"><div className="profile-top"><Avatar initials={initials} size="large"/><div className="profile-identity"><h1>{user?.name}</h1><span><MapPin size={14}/> {user?.location || 'Location not added'}</span></div><button className="button button-outline edit-profile" onClick={() => { editing ? cancel() : setEditing(true); setNotice('') }} disabled={saving}><Edit3 size={15}/>{editing ? 'Cancel' : 'Edit profile'}</button></div>
    {error && <div className="alert-error" role="alert">{error}</div>}{notice && <div className="alert-success" role="status">{notice}</div>}
    {editing ? <form className="profile-edit-form" onSubmit={save}><label>Name<input name="name" value={form.name} onChange={change} maxLength={100} required/></label><label>Location<input name="location" value={form.location} onChange={change} maxLength={120}/></label><label>About<textarea name="bio" rows="3" value={form.bio} onChange={change} maxLength={1000}/></label><button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></form> : <p className="profile-bio">{user?.bio || 'Add a short introduction to your profile.'}</p>}
    <div className="profile-meta"><span><CalendarDays size={15}/> Member since {user?.createdAt ? new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(user.createdAt)) : '—'}</span><span><Droplets size={15}/> WaterWise community member</span></div><div className="profile-metrics"><div><strong>4</strong><span>Discussions</span></div><div><strong>12</strong><span>Helpful votes</span></div><div><strong>2</strong><span>Saved resources</span></div></div></section></div>
}
