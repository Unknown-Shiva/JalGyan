import { ArrowUp, ArrowDown, MessageCircle, MapPin, Clock3, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import Avatar from '../common/Avatar'

function initials(name = '') { return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() }
function formatDate(value) {
  if (!value) return 'Recently'
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? 'Recently' : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export default function PostCard({ post, onVote, busy = false }) {
  const score = post.netVoteScore ?? ((post.upvotesCount || 0) - (post.downvotesCount || 0))
  return (
    <article className="post-card">
      <div className="post-main">
        <div className="post-author-row">
          <Avatar initials={initials(post.author?.name)}/>
          <div className="author-meta"><strong>{post.author?.name || 'Community member'}</strong><span><Clock3 size={12}/> {formatDate(post.createdAt)} <span className="meta-dot">·</span> <MapPin size={12}/> {post.author?.location || 'Location not added'}</span></div>
          <span className="category-pill">{post.category}</span>
        </div>
        <Link to={`/forum/${post.id}`} className="post-title">{post.title}</Link>
        <p className="post-excerpt">{post.body}</p>
        <div className="tag-row">{(post.tags || []).map(tag => <span className="tag" key={tag}>#{tag.replaceAll(' ', '')}</span>)}</div>
        <div className="post-actions">
          <button className={`post-action ${post.currentUserVote === 'UPVOTE' ? 'saved' : ''}`} aria-pressed={post.currentUserVote === 'UPVOTE'} disabled={busy} onClick={() => onVote(post.id, 'UPVOTE')}><ArrowUp size={17}/><b>{score}</b><span>Helpful</span></button>
          <button className={`post-action ${post.currentUserVote === 'DOWNVOTE' ? 'saved' : ''}`} aria-pressed={post.currentUserVote === 'DOWNVOTE'} disabled={busy} onClick={() => onVote(post.id, 'DOWNVOTE')}><ArrowDown size={16}/><span>Not helpful</span></button>
          <Link className="post-action" to={`/forum/${post.id}`}><MessageCircle size={17}/> <b>{post.commentsCount ?? 0}</b> <span>Comments</span></Link>
          <Link to={`/forum/${post.id}`} className="post-open">View discussion <ArrowUpRight size={15}/></Link>
        </div>
      </div>
    </article>
  )
}
