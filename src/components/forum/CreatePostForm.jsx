import { useState } from 'react'
import { ImagePlus, MapPin, Send, X } from 'lucide-react'

export default function CreatePostForm({ onSubmit, onClose }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('Community')
  const [error, setError] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (title.trim().length < 8 || body.trim().length < 20) { setError('Add a descriptive title and at least 20 characters of context.'); return }
    onSubmit({ title: title.trim(), body: body.trim(), category, tags: [] })
  }
  return (
    <form className="create-post-form" onSubmit={submit}>
      <div className="form-heading"><div><span className="eyebrow">START A CONVERSATION</span><h3>Share with the community</h3></div><button type="button" className="icon-button" onClick={onClose}><X size={19}/></button></div>
      <label>Discussion title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="What would you like to discuss?" maxLength={120}/></label>
      <label>Details<textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Share the context, what you have tried, or what you want to learn..." rows={4}/></label>
      <div className="form-bottom">
        <label className="select-label">Topic<select value={category} onChange={e=>setCategory(e.target.value)}><option>Community</option><option>Agriculture</option><option>Rainwater</option><option>Household</option><option>Groundwater</option></select></label>
        <div className="form-submit-area">{error && <span className="form-error">{error}</span>}<button className="button button-primary" type="submit"><Send size={15}/> Publish discussion</button></div>
      </div>
    </form>
  )
}
