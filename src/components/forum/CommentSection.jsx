import { useState } from 'react'
import { CornerDownRight, Send } from 'lucide-react'
import Avatar from '../common/Avatar'

function initials(name = '') { return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() }
function dateLabel(value) {
  if (!value) return 'Recently'
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? 'Recently' : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export default function CommentSection({ comments = [], onComment }) {
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
    } catch (err) { setError(err.message || 'Could not send your response.') }
    finally { setSubmitting(false) }
  }
  return (
    <section className="comments-section">
      <h3>Community responses <span className="count-badge">{comments.length}</span></h3>
      <form className="comment-compose" onSubmit={event => submit(event)}><input value={text} onChange={event => setText(event.target.value)} placeholder="Add a thoughtful response..." maxLength={2000}/><button className="button button-primary button-small" disabled={submitting || !text.trim()}><Send size={14}/> Reply</button></form>
      {error && <div className="alert-error" role="alert">{error}</div>}
      <div className="comment-list">
        {comments.length ? comments.map(comment => <div className="comment" key={comment.id}>
          <Avatar initials={initials(comment.author?.name)} size="small"/>
          <div className="comment-content"><div className="comment-heading"><strong>{comment.author?.name || 'Community member'}</strong><span>{dateLabel(comment.createdAt)}</span></div><p>{comment.text}</p>
            {(comment.replies || []).map(reply => <div className="reply" key={reply.id}><CornerDownRight size={15}/><Avatar initials={initials(reply.author?.name)} size="tiny"/><div><strong>{reply.author?.name || 'Community member'}</strong><p>{reply.text}</p><small>{dateLabel(reply.createdAt)}</small></div></div>)}
            {replyParent === comment.id ? <form className="comment-compose reply-compose" onSubmit={event => submit(event, comment.id)}><input value={replyText} onChange={event => setReplyText(event.target.value)} placeholder="Write a reply…" maxLength={2000}/><button className="button button-primary button-small" disabled={submitting || !replyText.trim()}><Send size={14}/>{submitting ? 'Sending…' : 'Send'}</button><button className="button button-outline button-small" type="button" onClick={() => { setReplyParent(null); setReplyText('') }}>Cancel</button></form> : <button className="text-button comment-reply-button" onClick={() => { setReplyParent(comment.id); setError('') }}>Reply</button>}
          </div>
        </div>) : <div className="empty-state compact"><p>No responses yet. Start the discussion.</p></div>}
      </div>
    </section>
  )
}
