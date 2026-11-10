import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUp, Bookmark, Clock3, MapPin, Share2 } from 'lucide-react'
import Avatar from '../components/common/Avatar'
import CommentSection from '../components/forum/CommentSection'
import { forumService } from '../services/forumService'
import { useAuth } from '../hooks/useAuth'

export default function PostDetails() {
  const { id } = useParams(), { user } = useAuth()
  const [post,setPost] = useState(null)
  useEffect(()=>{ forumService.get(id).then(setPost) },[id])
  const vote = async () => setPost(await forumService.vote(id))
  const comment = async text => { await forumService.comment(id,text,user); setPost(await forumService.get(id)) }
  if (!post) return <div className="loading-state">Loading discussion…</div>
  return <div className="detail-page"><Link to="/forum" className="back-link"><ArrowLeft size={16}/> Back to community</Link><div className="detail-layout"><main className="detail-main"><article className="detail-post"><div className="post-author-row"><Avatar initials={post.initials}/><div className="author-meta"><strong>{post.author}</strong><span><Clock3 size={12}/> {post.time} <span className="meta-dot">·</span><MapPin size={12}/> {post.location}</span></div><span className="category-pill">{post.category}</span></div><h1>{post.title}</h1><p className="detail-body">{post.body}</p><div className="tag-row">{(post.tags||[]).map(t=><span className="tag" key={t}>#{t.replaceAll(' ','')}</span>)}</div><div className="detail-actions"><button className="post-action" onClick={vote}><ArrowUp size={17}/><b>{post.votes}</b><span>Helpful</span></button><button className="post-action"><Share2 size={16}/><span>Share</span></button><button className="post-action"><Bookmark size={16}/><span>Save</span></button></div></article><CommentSection comments={post.commentsList||[]} onComment={comment}/></main><aside className="detail-aside"><div className="sidebar-card"><span className="eyebrow">COMMUNITY REMINDER</span><h3>Keep it useful.</h3><p>Offer practical suggestions, explain limitations and link to reliable sources when available.</p></div></aside></div></div>
}
