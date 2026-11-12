import { useEffect, useState, useCallback } from 'react'
import { adminService } from '../../services/adminService'
import ArticleDetailModal from '../../components/admin/ArticleDetailModal'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr))
  } catch {
    return '—'
  }
}

export default function ArticleModeration() {
  const [articles, setArticles] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState(null)
  const [selectedArticleId, setSelectedArticleId] = useState(null)

  const fetchPendingArticles = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getPendingArticles({ page, limit: 10 })
      setArticles(data?.articles || [])
      setPagination(data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 })
    } catch (err) {
      setError(err.message || 'Failed to load pending articles.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPendingArticles(1)
  }, [fetchPendingArticles])

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.page) {
      fetchPendingArticles(newPage)
    }
  }

  const handleArticleUpdated = ({ id, status }) => {
    setNotification({
      type: 'success',
      message: `Article ${status === 'PUBLISHED' ? 'approved and published' : 'rejected'} successfully.`,
    })
    // Refresh the current page of pending articles
    fetchPendingArticles(pagination.page)
    // Auto-dismiss notification after 5s
    setTimeout(() => {
      setNotification((curr) => (curr?.message?.includes(id) || curr ? null : curr))
    }, 5000)
  }

  const startRecord = (pagination.page - 1) * pagination.limit + (pagination.total > 0 ? 1 : 0)
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <div className="adm-moderation-page">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <header className="adm-header">
        <div>
          <div className="adm-header-title-row">
            <h1 className="adm-page-title">Article Moderation</h1>
            {pagination.total > 0 && (
              <span className="adm-badge adm-badge-pending-count">
                {pagination.total} Pending Review
              </span>
            )}
          </div>
          <p className="adm-page-subtitle">
            Review community-submitted articles, verify conservation practices, check technical accuracy, and approve or reject submissions.
          </p>
        </div>

        <button
          type="button"
          className="button button-outline button-small"
          onClick={() => fetchPendingArticles(pagination.page)}
          disabled={loading}
          aria-label="Refresh pending articles list"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {loading ? 'Refreshing…' : 'Refresh Queue'}
        </button>
      </header>

      {/* ── Notification Banner ────────────────────────────────────────── */}
      {notification && (
        <div className="adm-success-banner" role="status">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{notification.message}</span>
          <button
            type="button"
            className="adm-banner-close"
            onClick={() => setNotification(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Error Banner with Retry ────────────────────────────────────── */}
      {error && (
        <div className="adm-error-banner" role="alert">
          <span className="adm-error-icon" aria-hidden="true">⚠️</span>
          <span className="adm-error-msg">{error}</span>
          <button
            type="button"
            className="button button-outline button-small"
            onClick={() => fetchPendingArticles(pagination.page)}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Process Guidelines Banner ──────────────────────────────────── */}
      <div className="adm-guide-box">
        <div className="adm-guide-icon" aria-hidden="true">💡</div>
        <div className="adm-guide-text">
          <strong>Review Guidelines:</strong> Ensure submissions provide actionable water conservation guidance, verify cited references, and check for appropriate categorization. Approved articles immediately appear in the public knowledge base; rejections require an actionable explanation for the author.
        </div>
      </div>

      {/* ── Pending Queue Table / Cards ────────────────────────────────── */}
      <div className="adm-table-card">
        {loading ? (
          <div className="adm-table-skeleton" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="adm-table-sk-row">
                <div className="adm-sk-text" style={{ width: '40%' }} />
                <div className="adm-sk-text" style={{ width: '20%' }} />
                <div className="adm-sk-text" style={{ width: '25%' }} />
                <div className="adm-sk-text" style={{ width: '15%' }} />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="adm-empty-state" role="status">
            <div className="adm-empty-icon" aria-hidden="true">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <h3 className="adm-empty-title">All Caught Up!</h3>
            <p className="adm-empty-desc">
              There are no articles currently pending moderation review. New user submissions will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="adm-table-wrapper">
            <table className="adm-table" aria-label="Articles pending review">
              <thead>
                <tr>
                  <th scope="col" style={{ minWidth: '240px' }}>Article Details</th>
                  <th scope="col">Category</th>
                  <th scope="col">Author</th>
                  <th scope="col">Submitted</th>
                  <th scope="col" className="adm-text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((art) => (
                  <tr key={art.id} className="adm-table-row">
                    <td>
                      <div className="adm-table-title-group">
                        <strong className="adm-article-title">{art.title}</strong>
                        {art.summary && (
                          <p className="adm-article-summary-snippet">{art.summary}</p>
                        )}
                        {art.readTime && (
                          <span className="adm-article-readtime">⏱ {art.readTime.includes('min') ? art.readTime : `~${art.readTime} min read`}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="adm-category-tag">
                        {art.category?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td>
                      <div className="adm-author-info-cell">
                        <strong className="adm-author-name">{art.author?.name || 'Unknown'}</strong>
                        <span className="adm-author-email">{art.author?.email || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="adm-date-cell">
                        {formatDate(art.submissionDate || art.createdAt)}
                      </span>
                    </td>
                    <td className="adm-text-right">
                      <button
                        type="button"
                        className="button button-outline button-small adm-review-btn"
                        onClick={() => setSelectedArticleId(art.id)}
                        aria-label={`View details and review ${art.title}`}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ────────────────────────────────────────────────── */}
        {!loading && pagination.total > 0 && (
          <div className="adm-pagination-bar">
            <span className="adm-pagination-info">
              Showing <strong>{startRecord}</strong> to <strong>{endRecord}</strong> of{' '}
              <strong>{pagination.total}</strong> pending articles
            </span>

            <div className="adm-pagination-controls">
              <button
                type="button"
                className="button button-outline button-small"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                aria-label="Previous page"
              >
                ← Previous
              </button>

              <span className="adm-page-indicator" aria-current="page">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                type="button"
                className="button button-outline button-small"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                aria-label="Next page"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail & Moderation Modal ──────────────────────────────────── */}
      {selectedArticleId && (
        <ArticleDetailModal
          articleId={selectedArticleId}
          onClose={() => setSelectedArticleId(null)}
          onArticleUpdated={handleArticleUpdated}
        />
      )}
    </div>
  )
}
