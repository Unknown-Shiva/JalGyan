import { useCallback, useEffect, useRef, useState } from 'react'
import { Bookmark, BookOpen, Clock3, ArrowUpRight, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { bookmarkService } from '../services/bookmarkService'
import { useTranslation } from 'react-i18next'

function requestErrorMessage(error, action, t) {
  if (error?.status === 401) return t('bookmarks.sessionExpired')
  if (error?.status === 404 && action === 'remove') return t('bookmarks.articleMissing')
  return action === 'remove'
    ? t('bookmarks.removeError')
    : t('bookmarks.loadError')
}

export default function Bookmarks() {
  const { user } = useAuth()
  const { t } = useTranslation()
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
        if (active) setLoadError(requestErrorMessage(error, 'load', t))
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
      if (activeUserId.current === userId) setRemoveError(requestErrorMessage(error, 'remove', t))
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
      <span className="eyebrow">{t('bookmarks.eyebrow')}</span>
      <h1>{t('bookmarks.title')}</h1>
      <p>{t('bookmarks.intro')}</p>
    </div>

    {removeError && <div className="alert-error" role="alert">{removeError}</div>}
    {loading && <div className="loading-state" role="status">{t('bookmarks.loading')}</div>}
    {!loading && loadError && <div className="empty-state">
      <Bookmark size={30}/>
      <h3>{t('bookmarks.unavailable')}</h3>
      <p>{loadError}</p>
      <button className="button button-primary" onClick={retry}>{t('common.retry')}</button>
    </div>}
    {!loading && !loadError && <div className="bookmark-list">
      {visibleItems.map(bookmark => {
        const article = bookmark.article
        if (!article) return null
        const removing = removingIds.has(article.id)
        return <article className="bookmark-card" key={bookmark.id}>
          <div className="bookmark-icon"><BookOpen size={21}/></div>
          <div className="bookmark-info">
            <span className="category-pill">{article.category?.name || t('common.article')}</span>
            <h3>{article.title}</h3>
            {article.summary && <p>{article.summary}</p>}
            {article.readTime && <span className="read-time"><Clock3 size={13}/>{article.readTime}</span>}
          </div>
          <div className="bookmark-actions">
            <button
              className="icon-button"
              onClick={() => remove(bookmark)}
              title={t('common.removeBookmark')}
              aria-label={t('common.removeBookmarkFor', { title: article.title })}
              disabled={removing}
            >
              <Trash2 size={17}/>
            </button>
            <Link to={`/articles/${article.slug || article.id}`} className="text-button">{t('common.readArticle')} <ArrowUpRight size={15}/></Link>
          </div>
        </article>
      })}
      {!visibleItems.length && <div className="empty-state">
        <Bookmark size={30}/>
        <h3>{t('bookmarks.emptyTitle')}</h3>
        <p>{t('bookmarks.emptyBody')}</p>
        <Link to="/knowledge" className="button button-primary">{t('bookmarks.browse')}</Link>
      </div>}
    </div>}
  </div>
}
