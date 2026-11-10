import { useState } from 'react'
import { MapPin, CalendarDays, Edit3, Droplets, MessageCircle, Bookmark } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Avatar from '../components/common/Avatar'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [editing,setEditing] = useState(false), [name,setName] = useState(user?.name||''), [location,setLocation] = useState(user?.location||''), [bio,setBio] = useState(user?.bio||'')
  const save = e => { e.preventDefault(); updateUser({name,location,bio}); setEditing(false) }
  return <div className="profile-page"><div className="profile-cover"></div><section className="profile-card"><div className="profile-top"><Avatar initials={user?.name?.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()} size="large"/><div className="profile-identity"><h1>{user?.name}</h1><span><MapPin size={14}/> {user?.location||'Location not added'}</span></div><button className="button button-outline edit-profile" onClick={()=>setEditing(!editing)}><Edit3 size={15}/>{editing?'Cancel':'Edit profile'}</button></div>
    {editing ? <form className="profile-edit-form" onSubmit={save}><label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Location<input value={location} onChange={e=>setLocation(e.target.value)}/></label><label>About<textarea rows="3" value={bio} onChange={e=>setBio(e.target.value)}/></label><button className="button button-primary">Save changes</button></form> : <p className="profile-bio">{user?.bio||'Add a short introduction to your profile.'}</p>}
    <div className="profile-meta"><span><CalendarDays size={15}/> Member since November 2026</span><span><Droplets size={15}/> WaterWise community member</span></div><div className="profile-metrics"><div><strong>4</strong><span>Discussions</span></div><div><strong>12</strong><span>Helpful votes</span></div><div><strong>2</strong><span>Saved resources</span></div></div></section></div>
}
