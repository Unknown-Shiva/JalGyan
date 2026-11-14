import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, Plus, TrendingUp, Users, Sprout, Search, BookmarkCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PostCard from '../components/forum/PostCard'
import CreatePostForm from '../components/forum/CreatePostForm'
import { forumService } from '../services/forumService'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from 'react-i18next'

const categories = [['All topics','forum.allTopics'],['Agriculture','forum.agriculture'],['Rainwater','forum.rainwater'],['Household','forum.household'],['Community','forum.community'],['Groundwater','forum.groundwater']]

export default function Forum() {
  const [posts, setPosts] = useState([]), [pagination, setPagination] = useState(null)
  const [category, setCategory] = useState('All topics'), [query, setQuery] = useState(''), [sort, setSort] = useState('recent')
  const [page, setPage] = useState(1), [reload, setReload] = useState(0), [creating, setCreating] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null), [mutationError, setMutationError] = useState('')
  const { user } = useAuth(), navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    let active = true
    const timer = setTimeout(async () => {
      setLoading(true); setError('')
      try {
        const result = await forumService.list({ page, limit: 10, search: query, category, sort })
        if (active) { setPosts(result.posts || []); setPagination(result.pagination || null) }
      } catch (err) { if (active) { setError(t('forum.loadError')); setPosts([]); setPagination(null) } }
      finally { if (active) setLoading(false) }
    }, query ? 250 : 0)
    return () => { active = false; clearTimeout(timer) }
  }, [page, query, category, sort, reload, t])

  const requireUser = () => { if (!user) { navigate('/login'); return false } return true }
  const create = async payload => {
    if (!requireUser()) return
    setBusyId('create'); setMutationError('')
    try { await forumService.create(payload); setCreating(false); setPage(1); setReload(value => value + 1) }
    catch { setMutationError(t('forum.createError')) }
    finally { setBusyId(null) }
  }
  const vote = async (id, type) => {
    if (!requireUser()) return
    if (busyId === id) return
    setBusyId(id); setMutationError('')
    try {
      const result = await forumService.vote(id, type)
      setPosts(current => current.map(post => post.id === id ? { ...post, upvotesCount: result.upvotes, downvotesCount: result.downvotes, netVoteScore: result.score, currentUserVote: result.type } : post))
    } catch { setMutationError(t('forum.voteError')) }
    finally { setBusyId(null) }
  }

  const shown = useMemo(() => posts, [posts])
  return <div className="forum-page">
    <section className="community-hero"><div className="hero-copy"><span className="eyebrow light-eyebrow">{t('forum.eyebrow')}</span><h1>{t('forum.title')}</h1><p>{t('forum.intro')}</p><div className="hero-buttons"><button className="button button-white" onClick={() => user ? setCreating(true) : navigate('/login')}><Plus size={17}/> {t('forum.start')}</button><span className="hero-note"><Users size={15}/> {t('forum.communityForChange')}</span></div></div><div className="hero-art"><div className="art-circle circle-one"></div><div className="art-circle circle-two"></div><div className="art-leaf"><Sprout size={100} strokeWidth={1}/></div><div className="art-label">{t('ui.k368')}<br/>{t('ui.k453')}</div></div></section>
    <section className="community-stats"><div><span className="stat-icon"><Users size={18}/></span><div><strong>{t('forum.community')}</strong><span>{t('forum.members')}</span></div></div><div><span className="stat-icon"><MessageCircle size={18}/></span><div><strong>{pagination?.total ?? '—'}</strong><span>{t('forum.visible')}</span></div></div><div><span className="stat-icon"><Sprout size={18}/></span><div><strong>{categories.length - 1}</strong><span>{t('forum.topicsCovered')}</span></div></div><div className="stats-note">{t('forum.statsNote')}</div></section>
    <div className="content-grid"><section className="feed-column">
      <div className="section-heading"><div><span className="eyebrow">{t('forum.knowledgeAction')}</span><h2>{t('forum.discussions')}</h2><p>{t('forum.discussionIntro')}</p></div><button className="button button-primary create-desktop" onClick={() => user ? setCreating(true) : navigate('/login')}><Plus size={16}/> {t('forum.newDiscussion')}</button></div>
      {mutationError && <div className="alert-error" role="alert">{mutationError}</div>}
      {creating && <CreatePostForm onSubmit={create} onClose={() => setCreating(false)} submitting={busyId === 'create'}/>}
      <div className="feed-toolbar"><div className="category-tabs">{categories.map(([value,key])=><button key={value} className={category===value?'category-tab active':'category-tab'} onClick={()=>{setCategory(value);setPage(1)}}>{t(key)}</button>)}</div><div className="feed-controls"><div className="feed-search"><Search size={16}/><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder={t('forum.search')}/></div><select value={sort} onChange={e=>{setSort(e.target.value);setPage(1)}} aria-label={t('forum.sort')}><option value="recent">{t('forum.recent')}</option><option value="popular">{t('forum.popular')}</option><option value="oldest">{t('forum.oldest')}</option></select></div></div>
      {error && <div className="alert-error" role="alert">{error} <button className="text-button" onClick={()=>setReload(value=>value+1)}>{t('common.retry')}</button></div>}
      {loading ? <div className="loading-state">{t('forum.loading')}</div> : <div className="post-list">{shown.map(post=><PostCard key={post.id} post={post} onVote={vote} busy={busyId===post.id}/>)}</div>}
      {!loading && !error && !shown.length && <div className="empty-state"><MessageCircle size={28}/><h3>{t('forum.notFound')}</h3><p>{t('forum.trySearch')}</p></div>}
      {!loading && !error && pagination && <div className="feed-end"><span>{t('forum.showing',{shown:shown.length,total:pagination.total})}</span><div className="feed-pagination"><button className="button button-outline button-small" disabled={!pagination.hasPreviousPage} onClick={()=>setPage(current=>current-1)}>{t('forum.previous')}</button><span>{t('common.page')} {pagination.page} {t('common.of')} {Math.max(pagination.totalPages,1)}</span><button className="button button-outline button-small" disabled={!pagination.hasNextPage} onClick={()=>setPage(current=>current+1)}>{t('forum.next')}</button></div></div>}
    </section><aside className="sidebar">
      <div className="sidebar-card welcome-card"><span className="sidebar-icon"><Sprout size={19}/></span><h3>{t('forum.welcomeTitle')}</h3><p>{t('forum.welcomeBody')}</p><button className="text-button" onClick={()=>user?setCreating(true):navigate('/login')}>{t('forum.shareExperience')} <span>→</span></button></div>
      <div className="sidebar-card"><div className="sidebar-title"><h3>{t('forum.popularTopics')}</h3><TrendingUp size={17}/></div>{[['topicDrip','Agriculture','Agriculture'],['topicRainwater','Rainwater','Rainwater'],['topicGreywater','Household','Household'],['topicGroundwater','Groundwater','Groundwater']].map(([nameKey,categoryKey,value])=><button className="topic-row" key={nameKey} onClick={()=>setCategory(value)}><span><b>{t(`forum.${nameKey}`)}</b><small>{t('forum.browseCategory',{category:t(`forum.${categoryKey}`).toLowerCase()})}</small></span><span>↗</span></button>)}</div>
      <div className="sidebar-card guidelines"><h3>{t('forum.principles')}</h3><ul><li>{t('forum.guideline1')}</li><li>{t('forum.guideline2')}</li><li>{t('forum.guideline3')}</li><li>{t('forum.guideline4')}</li></ul><a href="#guidelines">{t('forum.guidelinesLink')} ↗</a></div>
      <div className="sidebar-card saved-promo"><BookmarkCheck size={19}/><div><b>{t('forum.savedTitle')}</b><p>{t('forum.savedBody')}</p><button onClick={()=>navigate('/bookmarks')}>{t('forum.viewSaved')} →</button></div></div>
    </aside></div>
  </div>
}
