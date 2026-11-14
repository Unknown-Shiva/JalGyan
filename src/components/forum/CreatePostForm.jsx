import { useState } from 'react'
import { Send, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function CreatePostForm({ onSubmit, onClose, submitting = false }) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('Community')
  const [error, setError] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (title.trim().length < 8 || body.trim().length < 20) { setError(t('forum.titleValidation')); return }
    onSubmit({ title: title.trim(), body: body.trim(), category, tags: [] })
  }
  return (
    <form className="create-post-form" onSubmit={submit}>
      <div className="form-heading"><div><span className="eyebrow">{t('forum.start')}</span><h3>{t('forum.shareExperience')}</h3></div><button type="button" className="icon-button" onClick={onClose} aria-label={t('common.close')}><X size={19}/></button></div>
      <label>{t('forum.postTitle')}<input value={title} onChange={e=>setTitle(e.target.value)} placeholder={t('forum.postTitlePlaceholder')} maxLength={120}/></label>
      <label>{t('forum.details')}<textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={t('forum.detailsPlaceholder')} rows={4}/></label>
      <div className="form-bottom">
        <label className="select-label">{t('forum.topic')}<select value={category} onChange={e=>setCategory(e.target.value)}><option value="Community">{t('forum.community')}</option><option value="Agriculture">{t('forum.agriculture')}</option><option value="Rainwater">{t('forum.rainwater')}</option><option value="Household">{t('forum.household')}</option><option value="Groundwater">{t('forum.groundwater')}</option></select></label>
        <div className="form-submit-area">{error && <span className="form-error">{error}</span>}<button className="button button-primary" type="submit" disabled={submitting}><Send size={15}/> {submitting ? t('forum.publishing') : t('forum.publish')}</button></div>
      </div>
    </form>
  )
}
