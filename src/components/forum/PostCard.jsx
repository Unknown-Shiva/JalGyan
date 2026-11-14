import { ArrowUp, ArrowDown, MessageCircle, MapPin, Clock3, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import Avatar from '../common/Avatar'
import ReportControl from './ReportControl'
import { useTranslation } from 'react-i18next'

function initials(name = '') { return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() }
function formatDate(value, fallback, locale) {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? fallback : new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export default function PostCard({ post, onVote, busy = false }) {
  const { t, i18n } = useTranslation()
  const score = post.netVoteScore ?? ((post.upvotesCount || 0) - (post.downvotesCount || 0))
  return (
    <article className="post-card">
      <div className="post-main">
        <div className="post-author-row">
          <Avatar initials={initials(post.author?.name)}/>
          <div className="author-meta"><strong>{post.author?.name || t('common.communityMember')}</strong><span><Clock3 size={12}/> {formatDate(post.createdAt, t('common.recently'), i18n.resolvedLanguage)} <span className="meta-dot">·</span> <MapPin size={12}/> {post.author?.location || t('common.locationMissing')}</span></div>
          <span className="category-pill">{post.category}</span>
        </div>
        <Link to={`/forum/${post.id}`} className="post-title">{post.title}</Link>
        <p className="post-excerpt">{post.body}</p>
        <div className="tag-row">{(post.tags || []).map(tag => <span className="tag" key={tag}>#{tag.replaceAll(' ', '')}</span>)}</div>
        <div className="post-actions">
          <button className={`post-action ${post.currentUserVote === 'UPVOTE' ? 'saved' : ''}`} aria-pressed={post.currentUserVote === 'UPVOTE'} disabled={busy} onClick={() => onVote(post.id, 'UPVOTE')}><ArrowUp size={17}/><b>{score}</b><span>{t('forum.helpful')}</span></button>
          <button className={`post-action ${post.currentUserVote === 'DOWNVOTE' ? 'saved' : ''}`} aria-pressed={post.currentUserVote === 'DOWNVOTE'} disabled={busy} onClick={() => onVote(post.id, 'DOWNVOTE')}><ArrowDown size={16}/><span>{t('forum.notHelpful')}</span></button>
          <Link className="post-action" to={`/forum/${post.id}`}><MessageCircle size={17}/> <b>{post.commentsCount ?? 0}</b> <span>{t('forum.comments')}</span></Link>
          <ReportControl targetType="POST" targetId={post.id} targetLabel="discussion"/>
          <Link to={`/forum/${post.id}`} className="post-open">{t('forum.viewDiscussion')} <ArrowUpRight size={15}/></Link>
        </div>
      </div>
    </article>
  )
}
