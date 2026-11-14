import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUp, ArrowDown, Clock3, MapPin, Share2 } from 'lucide-react'
import Avatar from '../components/common/Avatar'
import CommentSection from '../components/forum/CommentSection'
import ReportControl from '../components/forum/ReportControl'
import { forumService } from '../services/forumService'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from 'react-i18next'

function initials(name = '') { return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() }
function dateLabel(value, fallback, locale) {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? fallback : new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export default function PostDetails() {
  const { id } = useParams(), { user } = useAuth(), navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [post, setPost] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [mutationError, setMutationError] = useState(''), [voting, setVoting] = useState(false)
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setPost(await forumService.get(id)) }
    catch (err) { setPost(null); setError(err.status === 404 ? t('forum.detailMissing') : t('forum.detailError')) }
    finally { setLoading(false) }
  }, [id, t])
  useEffect(() => { load() }, [load])
  const vote = async type => {
    if (!user) { navigate('/login'); return }
    if (voting) return
    setVoting(true); setMutationError('')
    try {
      const result = await forumService.vote(id, type)
      setPost(current => current ? { ...current, currentUserVote: result.type, votes: { upvotes: result.upvotes, downvotes: result.downvotes, score: result.score } } : current)
    } catch { setMutationError(t('forum.voteError')) }
    finally { setVoting(false) }
  }
  const comment = async (text, parentId) => {
    if (!user) { navigate('/login'); throw new Error(t('forum.signInToReply')) }
    setMutationError('')
    try {
      await forumService.comment(id, text, parentId)
      const updated = await forumService.get(id)
      setPost(updated)
    } catch (err) { setMutationError(err.message || t('forum.sendError')); throw err }
  }
  if (loading) return <div className="loading-state">{t('forum.detailLoading')}</div>
  if (error || !post) return <div className="detail-page"><Link to="/forum" className="back-link"><ArrowLeft size={16}/> {t('common.backCommunity')}</Link><div className="empty-state"><h3>{error || t('forum.discussionUnavailable')}</h3><button className="button button-outline" onClick={load}>{t('forum.tryAgain')}</button></div></div>
  const counts = post.votes || { upvotes: post.upvotesCount || 0, downvotes: post.downvotesCount || 0, score: post.netVoteScore || 0 }
  return <div className="detail-page"><Link to="/forum" className="back-link"><ArrowLeft size={16}/> {t('common.backCommunity')}</Link><div className="detail-layout"><main className="detail-main"><article className="detail-post"><div className="post-author-row"><Avatar initials={initials(post.author?.name)}/><div className="author-meta"><strong>{post.author?.name || t('common.communityMember')}</strong><span><Clock3 size={12}/> {dateLabel(post.createdAt, t('common.recently'), i18n.resolvedLanguage)} <span className="meta-dot">·</span> <MapPin size={12}/>{post.author?.location || t('common.locationMissing')}</span></div><span className="category-pill">{post.category}</span></div><h1>{post.title}</h1><p className="detail-body">{post.body}</p><div className="tag-row">{(post.tags||[]).map(tag=><span className="tag" key={tag}>#{tag.replaceAll(' ','')}</span>)}</div>{mutationError && <div className="alert-error" role="alert">{mutationError}</div>}<div className="detail-actions"><button className={`post-action ${post.currentUserVote === 'UPVOTE' ? 'saved' : ''}`} aria-pressed={post.currentUserVote === 'UPVOTE'} disabled={voting} onClick={()=>vote('UPVOTE')}><ArrowUp size={17}/><b>{counts.upvotes}</b><span>{t('forum.helpful')}</span></button><button className={`post-action ${post.currentUserVote === 'DOWNVOTE' ? 'saved' : ''}`} aria-pressed={post.currentUserVote === 'DOWNVOTE'} disabled={voting} onClick={()=>vote('DOWNVOTE')}><ArrowDown size={16}/><b>{counts.downvotes}</b><span>{t('forum.notHelpful')}</span></button><span className="post-action">{t('forum.score')} <b>{counts.score}</b></span><button className="post-action" onClick={() => navigator.clipboard?.writeText(window.location.href).catch(()=>{})}><Share2 size={16}/><span>{t('forum.share')}</span></button><ReportControl targetType="POST" targetId={post.id} targetLabel="discussion"/></div></article><CommentSection comments={post.comments||[]} onComment={comment}/></main><aside className="detail-aside"><div className="sidebar-card"><span className="eyebrow">{t('forum.reminder')}</span><h3>{t('forum.keepUseful')}</h3><p>{t('forum.reminderBody')}</p></div></aside></div></div>
}
