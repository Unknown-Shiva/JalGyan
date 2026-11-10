import { ArrowUp, MessageCircle, MapPin, Clock3, Bookmark, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import Avatar from '../common/Avatar'

export default function PostCard({ post, onVote, onBookmark, bookmarked }) {
  return (
    <article className="post-card">
      <div className="post-main">
        <div className="post-author-row">
          <Avatar initials={post.initials}/>
          <div className="author-meta"><strong>{post.author}</strong><span><Clock3 size={12}/> {post.time} <span className="meta-dot">·</span> <MapPin size={12}/> {post.location}</span></div>
          <span className="category-pill">{post.category}</span>
        </div>
        <Link to={`/forum/${post.id}`} className="post-title">{post.title}</Link>
        <p className="post-excerpt">{post.body}</p>
        <div className="tag-row">{(post.tags || []).map(tag => <span className="tag" key={tag}>#{tag.replaceAll(' ', '')}</span>)}</div>
        <div className="post-actions">
          <button className="post-action" onClick={() => onVote(post.id)}><ArrowUp size={17}/> <b>{post.votes}</b> <span>Helpful</span></button>
          <Link className="post-action" to={`/forum/${post.id}`}><MessageCircle size={17}/> <b>{post.comments}</b> <span>Comments</span></Link>
          <button className={`post-action save-action ${bookmarked ? 'saved' : ''}`} onClick={() => onBookmark(post.id)}><Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'}/> <span>{bookmarked ? 'Saved' : 'Save'}</span></button>
          <Link to={`/forum/${post.id}`} className="post-open">View discussion <ArrowUpRight size={15}/></Link>
        </div>
      </div>
    </article>
  )
}
