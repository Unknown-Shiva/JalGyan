import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, Plus, TrendingUp, Users, Sprout, Search, BookmarkCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PostCard from '../components/forum/PostCard'
import CreatePostForm from '../components/forum/CreatePostForm'
import { forumService } from '../services/forumService'
import { useAuth } from '../hooks/useAuth'

const categories = ['All topics','Agriculture','Rainwater','Household','Community','Groundwater']

export default function Forum() {
  const [posts, setPosts] = useState([]), [pagination, setPagination] = useState(null)
  const [category, setCategory] = useState('All topics'), [query, setQuery] = useState(''), [sort, setSort] = useState('recent')
  const [page, setPage] = useState(1), [reload, setReload] = useState(0), [creating, setCreating] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null), [mutationError, setMutationError] = useState('')
  const { user } = useAuth(), navigate = useNavigate()

  useEffect(() => {
    let active = true
    const timer = setTimeout(async () => {
      setLoading(true); setError('')
      try {
        const result = await forumService.list({ page, limit: 10, search: query, category, sort })
        if (active) { setPosts(result.posts || []); setPagination(result.pagination || null) }
      } catch (err) { if (active) { setError(err.message || 'Could not load discussions.'); setPosts([]); setPagination(null) } }
      finally { if (active) setLoading(false) }
    }, query ? 250 : 0)
    return () => { active = false; clearTimeout(timer) }
  }, [page, query, category, sort, reload])

  const requireUser = () => { if (!user) { navigate('/login'); return false } return true }
  const create = async payload => {
    if (!requireUser()) return
    setBusyId('create'); setMutationError('')
    try { await forumService.create(payload); setCreating(false); setPage(1); setReload(value => value + 1) }
    catch (err) { setMutationError(err.message || 'Could not publish the discussion.') }
    finally { setBusyId(null) }
  }
  const vote = async (id, type) => {
    if (!requireUser()) return
    if (busyId === id) return
    setBusyId(id); setMutationError('')
    try {
      const result = await forumService.vote(id, type)
      setPosts(current => current.map(post => post.id === id ? { ...post, upvotesCount: result.upvotes, downvotesCount: result.downvotes, netVoteScore: result.score, currentUserVote: result.type } : post))
    } catch (err) { setMutationError(err.message || 'Could not update your vote.') }
    finally { setBusyId(null) }
  }

  const shown = useMemo(() => posts, [posts])
  return <div className="forum-page">
    <section className="community-hero"><div className="hero-copy"><span className="eyebrow light-eyebrow">WATERWISE COMMUNITY</span><h1>Solutions grow<br/>when we <em>share.</em></h1><p>Ask questions, exchange field-tested ideas and learn from people working to conserve water.</p><div className="hero-buttons"><button className="button button-white" onClick={() => user ? setCreating(true) : navigate('/login')}><Plus size={17}/> Start a discussion</button><span className="hero-note"><Users size={15}/> A community for practical change</span></div></div><div className="hero-art"><div className="art-circle circle-one"></div><div className="art-circle circle-two"></div><div className="art-leaf"><Sprout size={100} strokeWidth={1}/></div><div className="art-label">SHARE<br/>WHAT WORKS</div></div></section>
    <section className="community-stats"><div><span className="stat-icon"><Users size={18}/></span><div><strong>Community</strong><span>Members sharing ideas</span></div></div><div><span className="stat-icon"><MessageCircle size={18}/></span><div><strong>{pagination?.total ?? '—'}</strong><span>Visible discussions</span></div></div><div><span className="stat-icon"><Sprout size={18}/></span><div><strong>{categories.length - 1}</strong><span>Topics covered</span></div></div><div className="stats-note">Small actions. Measurable change.</div></section>
    <div className="content-grid"><section className="feed-column">
      <div className="section-heading"><div><span className="eyebrow">KNOWLEDGE IN ACTION</span><h2>Community discussions</h2><p>Real questions and practical experiences from the community.</p></div><button className="button button-primary create-desktop" onClick={() => user ? setCreating(true) : navigate('/login')}><Plus size={16}/> New discussion</button></div>
      {mutationError && <div className="alert-error" role="alert">{mutationError}</div>}
      {creating && <CreatePostForm onSubmit={create} onClose={() => setCreating(false)} submitting={busyId === 'create'}/>}
      <div className="feed-toolbar"><div className="category-tabs">{categories.map(c=><button key={c} className={category===c?'category-tab active':'category-tab'} onClick={()=>{setCategory(c);setPage(1)}}>{c}</button>)}</div><div className="feed-controls"><div className="feed-search"><Search size={16}/><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="Search discussions"/></div><select value={sort} onChange={e=>{setSort(e.target.value);setPage(1)}} aria-label="Sort discussions"><option value="recent">Recent</option><option value="popular">Popular</option><option value="oldest">Oldest</option></select></div></div>
      {error && <div className="alert-error" role="alert">{error} <button className="text-button" onClick={()=>setReload(value=>value+1)}>Retry</button></div>}
      {loading ? <div className="loading-state">Loading discussions…</div> : <div className="post-list">{shown.map(post=><PostCard key={post.id} post={post} onVote={vote} busy={busyId===post.id}/>)}</div>}
      {!loading && !error && !shown.length && <div className="empty-state"><MessageCircle size={28}/><h3>No discussions found</h3><p>Try another topic or search term.</p></div>}
      {!loading && !error && pagination && <div className="feed-end"><span>Showing {shown.length} of {pagination.total} discussions</span><div className="feed-pagination"><button className="button button-outline button-small" disabled={!pagination.hasPreviousPage} onClick={()=>setPage(current=>current-1)}>Previous</button><span>Page {pagination.page} of {Math.max(pagination.totalPages,1)}</span><button className="button button-outline button-small" disabled={!pagination.hasNextPage} onClick={()=>setPage(current=>current+1)}>Next</button></div></div>}
    </section><aside className="sidebar">
      <div className="sidebar-card welcome-card"><span className="sidebar-icon"><Sprout size={19}/></span><h3>Knowledge is a resource.</h3><p>Share what has worked in your home, farm or neighbourhood. Practical experience helps others take action.</p><button className="text-button" onClick={()=>user?setCreating(true):navigate('/login')}>Share your experience <span>→</span></button></div>
      <div className="sidebar-card"><div className="sidebar-title"><h3>Popular topics</h3><TrendingUp size={17}/></div>{[['Drip irrigation','Agriculture'],['Rainwater harvesting','Rainwater'],['Greywater reuse','Household'],['Groundwater recharge','Groundwater']].map(([name,cat])=><button className="topic-row" key={name} onClick={()=>setCategory(cat)}><span><b>{name}</b><small>Browse {cat.toLowerCase()} discussions</small></span><span>↗</span></button>)}</div>
      <div className="sidebar-card guidelines"><h3>Community principles</h3><ul><li>Share sources where possible.</li><li>Be constructive and respectful.</li><li>Distinguish personal experience from verified guidance.</li><li>Protect private and sensitive information.</li></ul><a href="#guidelines">Read community guidelines ↗</a></div>
      <div className="sidebar-card saved-promo"><BookmarkCheck size={19}/><div><b>Keep useful ideas close</b><p>Save articles and resources for later.</p><button onClick={()=>navigate('/bookmarks')}>View saved items →</button></div></div>
    </aside></div>
  </div>
}
