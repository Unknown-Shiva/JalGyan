import { useState } from 'react'
import { CornerDownRight, Send } from 'lucide-react'
import Avatar from '../common/Avatar'

export default function CommentSection({ comments = [], onComment }) {
  const [text, setText] = useState('')
  const submit = e => { e.preventDefault(); if (!text.trim()) return; onComment(text.trim()); setText('') }
  return (
    <section className="comments-section">
      <h3>Community responses <span className="count-badge">{comments.length}</span></h3>
      <form className="comment-compose" onSubmit={submit}><input value={text} onChange={e=>setText(e.target.value)} placeholder="Add a thoughtful response..." /><button className="button button-primary button-small"><Send size={14}/> Reply</button></form>
      <div className="comment-list">
        {comments.length ? comments.map(comment => <div className="comment" key={comment.id}>
          <Avatar initials={comment.initials} size="small"/>
          <div className="comment-content"><div className="comment-heading"><strong>{comment.author}</strong><span>{comment.time}</span></div><p>{comment.text}</p>
            {(comment.replies || []).map(reply => <div className="reply" key={reply.id}><CornerDownRight size={15}/><Avatar initials={reply.initials} size="tiny"/><div><strong>{reply.author}</strong><p>{reply.text}</p></div></div>)}
          </div>
        </div>) : <div className="empty-state compact"><p>No responses yet. Start the discussion.</p></div>}
      </div>
    </section>
  )
}
