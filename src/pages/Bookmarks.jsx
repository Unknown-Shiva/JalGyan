import { useCallback, useEffect, useRef, useState } from 'react'
import { Bookmark, BookOpen, Clock3, ArrowUpRight, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { bookmarkService } from '../services/bookmarkService'

function requestErrorMessage(error, action) {
  if (error?.status === 401) return 'Your session has expired. Please sign in again.'
  if (error?.status === 404 && action === 'remove') return 'This article is no longer available.'
  return action === 'remove'
    ? 'We could not remove this bookmark. Please try again.'
    : 'Saved articles could not be loaded. Please try again.'
}

export default function Bookmarks() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [ownerId, setOwnerId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [removingIds, setRemovingIds] = useState(() => new Set())
  const [removeError, setRemoveError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const removingRef = useRef(new Set())
  const userId = user?.id
  const activeUserId = useRef(userId)
  activeUserId.current = userId

  useEffect(() => {
    let active = true
    setItems([])
    setOwnerId(userId ?? null)
    setLoading(Boolean(userId))
    setLoadError('')
    setRemovingIds(new Set())
    removingRef.current.clear()
    setRemoveError('')

    if (!userId) {
      setLoading(false)
      return () => { active = false }
    }

    bookmarkService.list()
      .then(bookmarks => {
        if (active) setItems(bookmarks)
      })
      .catch(error => {
        if (active) setLoadError(requestErrorMessage(error, 'load'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [userId, reloadKey])

  const retry = useCallback(() => setReloadKey(key => key + 1), [])

  const remove = async bookmark => {
    const articleId = bookmark?.article?.id
    const operationKey = `${userId}:${articleId}`
    if (!articleId || removingRef.current.has(operationKey)) return
    removingRef.current.add(operationKey)
    setRemovingIds(current => new Set(current).add(articleId))
    setRemoveError('')
    try {
      await bookmarkService.remove(articleId)
      if (activeUserId.current === userId) {
        setItems(current => current.filter(item => item.article?.id !== articleId))
      }
    } catch (error) {
      if (activeUserId.current === userId) setRemoveError(requestErrorMessage(error, 'remove'))
    } finally {
      removingRef.current.delete(operationKey)
      if (activeUserId.current === userId) {
        setRemovingIds(current => {
          const next = new Set(current)
          next.delete(articleId)
          return next
        })
      }
    }
  }

  // Never render a previous account's result during an account switch, even
  // before the new user's loading effect runs.
  const visibleItems = ownerId === userId ? items : []

  return <div className="bookmarks-page">
    <div className="page-heading">
      <span className="eyebrow">YOUR PERSONAL LIBRARY</span>
      <h1>Saved resources</h1>
      <p>Articles and practical guidance you have kept for later.</p>
    </div>

    {removeError && <div className="alert-error" role="alert">{removeError}</div>}
    {loading && <div className="loading-state" role="status">Loading saved articles…</div>}
    {!loading && loadError && <div className="empty-state">
      <Bookmark size={30}/>
      <h3>Saved articles are unavailable</h3>
      <p>{loadError}</p>
      <button className="button button-primary" onClick={retry}>Try again</button>
    </div>}
    {!loading && !loadError && <div className="bookmark-list">
      {visibleItems.map(bookmark => {
        const article = bookmark.article
        if (!article) return null
        const removing = removingIds.has(article.id)
        return <article className="bookmark-card" key={bookmark.id}>
          <div className="bookmark-icon"><BookOpen size={21}/></div>
          <div className="bookmark-info">
            <span className="category-pill">{article.category?.name || 'Article'}</span>
            <h3>{article.title}</h3>
            {article.summary && <p>{article.summary}</p>}
            {article.readTime && <span className="read-time"><Clock3 size={13}/>{article.readTime}</span>}
          </div>
          <div className="bookmark-actions">
            <button
              className="icon-button"
              onClick={() => remove(bookmark)}
              title="Remove bookmark"
              aria-label={`Remove bookmark for ${article.title}`}
              disabled={removing}
            >
              <Trash2 size={17}/>
            </button>
            <Link to="/forum" className="text-button">Explore community <ArrowUpRight size={15}/></Link>
          </div>
        </article>
      })}
      {!visibleItems.length && <div className="empty-state">
        <Bookmark size={30}/>
        <h3>No saved resources yet</h3>
        <p>Articles you bookmark will appear here.</p>
        <Link to="/forum" className="button button-primary">Explore community</Link>
      </div>}
    </div>}
  </div>
}
