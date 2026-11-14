import { useState } from 'react'
import { CornerDownRight, Send } from 'lucide-react'
import Avatar from '../common/Avatar'
import ReportControl from './ReportControl'
import { useTranslation } from 'react-i18next'

function initials(name = '') { return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() }
function dateLabel(value, fallback, locale) {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? fallback : new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export default function CommentSection({ comments = [], onComment }) {
  const { t, i18n } = useTranslation()
  const [text, setText] = useState(''), [replyParent, setReplyParent] = useState(null)
  const [replyText, setReplyText] = useState(''), [submitting, setSubmitting] = useState(false), [error, setError] = useState('')
  const submit = async (event, parentId = null) => {
    event.preventDefault()
    const value = parentId ? replyText.trim() : text.trim()
    if (!value || submitting) return
    setSubmitting(true); setError('')
    try {
      await onComment(value, parentId)
      if (parentId) { setReplyText(''); setReplyParent(null) } else setText('')
    } catch { setError(t('forum.sendError')) }
    finally { setSubmitting(false) }
  }
  return (
    <section className="comments-section">
      <h3>{t('forum.responses')} <span className="count-badge">{comments.length}</span></h3>
      <form className="comment-compose" onSubmit={event => submit(event)}><input value={text} onChange={event => setText(event.target.value)} placeholder={t('forum.addResponse')} maxLength={2000}/><button className="button button-primary button-small" disabled={submitting || !text.trim()}><Send size={14}/> {t('forum.reply')}</button></form>
      {error && <div className="alert-error" role="alert">{error}</div>}
      <div className="comment-list">
        {comments.length ? comments.map(comment => <div className="comment" key={comment.id}>
          <Avatar initials={initials(comment.author?.name)} size="small"/>
          <div className="comment-content"><div className="comment-heading"><strong>{comment.author?.name || t('common.communityMember')}</strong><span>{dateLabel(comment.createdAt, t('common.recently'), i18n.resolvedLanguage)}</span><ReportControl targetType="COMMENT" targetId={comment.id} targetLabel="comment"/></div><p>{comment.text}</p>
            {(comment.replies || []).map(reply => <div className="reply" key={reply.id}><CornerDownRight size={15}/><Avatar initials={initials(reply.author?.name)} size="tiny"/><div className="reply-content"><strong>{reply.author?.name || t('common.communityMember')}</strong><p>{reply.text}</p><small>{dateLabel(reply.createdAt, t('common.recently'), i18n.resolvedLanguage)}</small></div><ReportControl targetType="COMMENT" targetId={reply.id} targetLabel="reply"/></div>)}
            {replyParent === comment.id ? <form className="comment-compose reply-compose" onSubmit={event => submit(event, comment.id)}><input value={replyText} onChange={event => setReplyText(event.target.value)} placeholder={t('forum.replyPlaceholder')} maxLength={2000}/><button className="button button-primary button-small" disabled={submitting || !replyText.trim()}><Send size={14}/>{submitting ? t('forum.sending') : t('forum.send')}</button><button className="button button-outline button-small" type="button" onClick={() => { setReplyParent(null); setReplyText('') }}>{t('forum.cancel')}</button></form> : <button className="text-button comment-reply-button" onClick={() => { setReplyParent(comment.id); setError('') }}>{t('forum.reply')}</button>}
          </div>
        </div>) : <div className="empty-state compact"><p>{t('forum.noResponses')}</p></div>}
      </div>
    </section>
  )
}
