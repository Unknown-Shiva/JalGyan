import { useEffect, useState } from 'react'
import { Bookmark, BookOpen, Clock3, ArrowUpRight, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { bookmarkService } from '../services/bookmarkService'

export default function Bookmarks() {
  const [items,setItems] = useState([])
  useEffect(()=>{ bookmarkService.list().then(setItems) },[])
  const remove = async id => { await bookmarkService.toggle(id); setItems(current=>current.filter(x=>x.id!==id)) }
  return <div className="bookmarks-page"><div className="page-heading"><span className="eyebrow">YOUR PERSONAL LIBRARY</span><h1>Saved resources</h1><p>Articles and practical guidance you have kept for later.</p></div><div className="bookmark-list">{items.map(item=><article className="bookmark-card" key={item.id}><div className="bookmark-icon"><BookOpen size={21}/></div><div className="bookmark-info"><span className="category-pill">{item.category}</span><h3>{item.title}</h3><p>{item.summary}</p><span className="read-time"><Clock3 size={13}/>{item.read}</span></div><div className="bookmark-actions"><button className="icon-button" onClick={()=>remove(item.id)} title="Remove bookmark"><Trash2 size={17}/></button><Link to="/forum" className="text-button">Open resource <ArrowUpRight size={15}/></Link></div></article>)}{!items.length && <div className="empty-state"><Bookmark size={30}/><h3>No saved resources yet</h3><p>Use the save control on useful community resources to find them here.</p><Link to="/forum" className="button button-primary">Explore community</Link></div>}</div></div>
}
