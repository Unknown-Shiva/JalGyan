import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, Plus, SlidersHorizontal, TrendingUp, Users, Sprout, Search, BookmarkCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PostCard from '../components/forum/PostCard'
import CreatePostForm from '../components/forum/CreatePostForm'
import { forumService } from '../services/forumService'
import { bookmarkService } from '../services/bookmarkService'
import { useAuth } from '../hooks/useAuth'

const categories = ['All topics','Agriculture','Rainwater','Household','Community','Groundwater']

export default function Forum() {
  const [posts,setPosts] = useState([]), [category,setCategory] = useState('All topics'), [query,setQuery] = useState(''), [sort,setSort] = useState('Recent'), [creating,setCreating] = useState(false), [saved,setSaved] = useState(['a1','a3'])
  const { user } = useAuth(), navigate = useNavigate()
  useEffect(() => { forumService.list().then(setPosts) }, [])
  const filtered = useMemo(() => posts.filter(p => (category==='All topics' || p.category===category) && `${p.title} ${p.body} ${p.author}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>sort==='Popular'?b.votes-a.votes:0),[posts,category,query,sort])
  const create = async payload => { const post = await forumService.create(payload,user); setPosts(current=>[post,...current]); setCreating(false) }
  const vote = async id => { const updated = await forumService.vote(id); setPosts(current=>current.map(p=>p.id===id?updated:p)) }
  const bookmark = async id => { if (!user) { navigate('/login'); return } const next = await bookmarkService.toggle(id); setSaved(current=>next?[...current,id]:current.filter(x=>x!==id)) }
  return <div className="forum-page">
    <section className="community-hero"><div className="hero-copy"><span className="eyebrow light-eyebrow">WATERWISE COMMUNITY</span><h1>Solutions grow<br/>when we <em>share.</em></h1><p>Ask questions, exchange field-tested ideas and learn from people working to conserve water.</p><div className="hero-buttons"><button className="button button-white" onClick={()=>setCreating(true)}><Plus size={17}/> Start a discussion</button><span className="hero-note"><Users size={15}/> A community for practical change</span></div></div><div className="hero-art"><div className="art-circle circle-one"></div><div className="art-circle circle-two"></div><div className="art-leaf"><Sprout size={100} strokeWidth={1}/></div><div className="art-label">SHARE<br/>WHAT WORKS</div></div></section>
    <section className="community-stats"><div><span className="stat-icon"><Users size={18}/></span><div><strong>1,240+</strong><span>Community members</span></div></div><div><span className="stat-icon"><MessageCircle size={18}/></span><div><strong>386</strong><span>Discussions started</span></div></div><div><span className="stat-icon"><Sprout size={18}/></span><div><strong>24</strong><span>Topics covered</span></div></div><div className="stats-note">Small actions. Measurable change.</div></section>
    <div className="content-grid"><section className="feed-column">
      <div className="section-heading"><div><span className="eyebrow">KNOWLEDGE IN ACTION</span><h2>Community discussions</h2><p>Real questions and practical experiences from the community.</p></div><button className="button button-primary create-desktop" onClick={()=>setCreating(true)}><Plus size={16}/> New discussion</button></div>
      {creating && <CreatePostForm onSubmit={create} onClose={()=>setCreating(false)}/>}
      <div className="feed-toolbar"><div className="category-tabs">{categories.map(c=><button key={c} className={category===c?'category-tab active':'category-tab'} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="feed-controls"><div className="feed-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search discussions"/></div><select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sort discussions"><option>Recent</option><option>Popular</option></select></div></div>
      <div className="post-list">{filtered.map(post=><PostCard key={post.id} post={post} onVote={vote} onBookmark={bookmark} bookmarked={saved.includes(post.id)}/>)}
      {!filtered.length && <div className="empty-state"><MessageCircle size={28}/><h3>No discussions found</h3><p>Try another topic or search term.</p></div>}</div>
      <div className="feed-end"><span>Showing {filtered.length} discussions</span><span>Community guidelines apply to all contributions.</span></div>
    </section><aside className="sidebar">
      <div className="sidebar-card welcome-card"><span className="sidebar-icon"><Sprout size={19}/></span><h3>Knowledge is a resource.</h3><p>Share what has worked in your home, farm or neighbourhood. Practical experience helps others take action.</p><button className="text-button" onClick={()=>setCreating(true)}>Share your experience <span>→</span></button></div>
      <div className="sidebar-card"><div className="sidebar-title"><h3>Popular topics</h3><TrendingUp size={17}/></div>{[['Drip irrigation','Agriculture','128 posts'],['Rainwater harvesting','Rainwater','96 posts'],['Greywater reuse','Household','74 posts'],['Groundwater recharge','Groundwater','52 posts']].map(([name,cat,count])=><button className="topic-row" key={name} onClick={()=>setCategory(cat)}><span><b>{name}</b><small>{count}</small></span><span>↗</span></button>)}</div>
      <div className="sidebar-card guidelines"><h3>Community principles</h3><ul><li>Share sources where possible.</li><li>Be constructive and respectful.</li><li>Distinguish personal experience from verified guidance.</li><li>Protect private and sensitive information.</li></ul><a href="#guidelines">Read community guidelines ↗</a></div>
      <div className="sidebar-card saved-promo"><BookmarkCheck size={19}/><div><b>Keep useful ideas close</b><p>Save discussions and resources for later.</p><button onClick={()=>navigate('/bookmarks')}>View saved items →</button></div></div>
    </aside></div>
  </div>
}
