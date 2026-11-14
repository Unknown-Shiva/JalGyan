import { useTranslation } from 'react-i18next';
import { useEffect, useState, useCallback } from 'react'
import { adminService } from '../../services/adminService'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(dateStr))
  } catch {
    return '—'
  }
}

function StatusBadge({ status }) {
  const { t } = useTranslation()
  const norm = String(status || '').toUpperCase()
  let className = 'adm-status-badge'
  let label = t(`admin.articleStatus.${norm}`, { defaultValue: status })

  if (norm === 'PENDING_REVIEW') {
    className += ' adm-status-pending'
    label = t('admin.articleStatus.PENDING_REVIEW')
  } else if (norm === 'PUBLISHED') {
    className += ' adm-status-published'
    label = t('admin.articleStatus.PUBLISHED')
  } else if (norm === 'REJECTED') {
    className += ' adm-status-rejected'
    label = t('admin.articleStatus.REJECTED')
  } else if (norm === 'DRAFT') {
    className += ' adm-status-draft'
    label = t('admin.articleStatus.DRAFT')
  }

  return <span className={className}>{label}</span>
}

export default function ArticleDetailModal({
  articleId,
  onClose,
  onArticleUpdated,
}) {
  const { t } = useTranslation();
  const [article, setArticle] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Moderation action states
  const [actionType, setActionType] = useState(null) // 'approve' | 'reject' | null
  const [feedback, setFeedback] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [validationError, setValidationError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)

  // Fetch article details & review history
  const loadArticleDetails = useCallback(async () => {
    if (!articleId) return
    setLoading(true)
    setError(null)
    try {
      const [detailRes, reviewsRes] = await Promise.all([
        adminService.getArticleById(articleId),
        adminService.getArticleReviews(articleId).catch(() => ({ reviews: [] })),
      ])
      const art = detailRes.article || detailRes
      setArticle(art)
      setReviews(reviewsRes?.reviews || art.reviews || [])
    } catch (err) {
      setError(t('admin.errors.loadArticle'))
    } finally {
      setLoading(false)
    }
  }, [articleId])

  useEffect(() => {
    loadArticleDetails()
  }, [loadArticleDetails])

  // Keyboard close on Esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, submitting])

  // Handle Approve submission
  const handleApprove = async (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setActionError(null)
    setValidationError('')

    try {
      const result = await adminService.approveArticle(articleId, feedback)
      setActionSuccess('Article approved and published successfully.')
      if (result?.article) {
        setArticle((prev) => ({ ...prev, ...result.article, status: 'PUBLISHED' }))
      } else {
        setArticle((prev) => ({ ...prev, status: 'PUBLISHED' }))
      }
      setActionType(null)
      setFeedback('')

      // Refresh reviews
      const freshReviews = await adminService.getArticleReviews(articleId).catch(() => null)
      if (freshReviews?.reviews) {
        setReviews(freshReviews.reviews)
      }

      if (onArticleUpdated) {
        onArticleUpdated({ id: articleId, status: 'PUBLISHED' })
      }
    } catch (err) {
      setActionError(t('admin.errors.approveArticle'))
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Reject submission
  const handleReject = async (e) => {
    e.preventDefault()
    if (submitting) return

    if (!rejectionReason || !rejectionReason.trim()) {
      setValidationError('A rejection reason is required and cannot be empty.')
      return
    }

    setSubmitting(true)
    setActionError(null)
    setValidationError('')

    try {
      const result = await adminService.rejectArticle(articleId, rejectionReason.trim())
      setActionSuccess('Article rejected successfully.')
      if (result?.article) {
        setArticle((prev) => ({ ...prev, ...result.article, status: 'REJECTED' }))
      } else {
        setArticle((prev) => ({ ...prev, status: 'REJECTED' }))
      }
      setActionType(null)
      setRejectionReason('')

      // Refresh reviews
      const freshReviews = await adminService.getArticleReviews(articleId).catch(() => null)
      if (freshReviews?.reviews) {
        setReviews(freshReviews.reviews)
      }

      if (onArticleUpdated) {
        onArticleUpdated({ id: articleId, status: 'REJECTED' })
      }
    } catch (err) {
      setActionError(t('admin.errors.rejectArticle'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="adm-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose()
      }}
      role="presentation"
    >
      <div
        className="adm-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-detail-title"
      >
        {/* ── Modal Header ──────────────────────────────────────────────── */}
        <div className="adm-modal-header">
          <div className="adm-modal-title-group">
            <h2 id="article-detail-title" className="adm-modal-title">
              {article?.title || t('ui.extra.articleDetails')}
            </h2>
            {article?.status && <StatusBadge status={article.status} />}
          </div>
          <button
            type="button"
            className="adm-modal-close"
            onClick={onClose}
            aria-label={t('ui.a011')}
            disabled={submitting}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Modal Body ────────────────────────────────────────────────── */}
        <div className="adm-modal-body">
          {loading && (
            <div className="adm-modal-loading" role="status">
              <div className="adm-sk-label" style={{ width: '40%' }} />
              <div className="adm-sk-value" style={{ width: '90%', height: '36px' }} />
              <div className="adm-sk-sub" style={{ width: '70%', height: '80px', marginTop: '16px' }} />
              <div className="adm-sk-sub" style={{ width: '100%', height: '140px', marginTop: '16px' }} />
            </div>
          )}

          {error && (
            <div className="adm-error-banner" role="alert">
              <span className="adm-error-icon" aria-hidden="true">⚠️</span>
              <span className="adm-error-msg">{error}</span>
              <button
                type="button"
                className="button button-outline button-small"
                onClick={loadArticleDetails}
              >{t('ui.k353')}</button>
            </div>
          )}

          {/* Action Success Alert */}
          {actionSuccess && (
            <div className="adm-success-banner" role="status">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Action Error Alert */}
          {actionError && (
            <div className="adm-error-banner" role="alert">
              <span className="adm-error-icon" aria-hidden="true">⚠️</span>
              <span className="adm-error-msg">{actionError}</span>
            </div>
          )}

          {!loading && article && (
            <div className="adm-detail-content">
              {/* Cover Image if available */}
              {article.coverImage && (
                <div className="adm-detail-cover">
                  <img
                    src={article.coverImage}
                    alt={article.title}
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                </div>
              )}

              {/* Metadata Grid */}
              <div className="adm-detail-meta-grid">
                <div className="adm-detail-meta-item">
                  <span className="adm-meta-label">{t('ui.k108')}</span>
                  <span className="adm-category-tag">
                    {article.category?.name || t('ui.extra.uncategorized')}
                  </span>
                  {article.category?.description && (
                    <span className="adm-meta-desc">{article.category.description}</span>
                  )}
                </div>

                <div className="adm-detail-meta-item">
                  <span className="adm-meta-label">{t('ui.k085')}</span>
                  <strong className="adm-author-name">{article.author?.name || t('ui.extra.unknown')}</strong>
                  <span className="adm-author-email">{article.author?.email || '—'}</span>
                  {article.author?.location && (
                    <span className="adm-meta-desc">📍 {article.author.location}</span>
                  )}
                </div>

                <div className="adm-detail-meta-item">
                  <span className="adm-meta-label">{t('ui.k396')}</span>
                  <span>{formatDate(article.createdAt || article.submissionDate)}</span>
                </div>

                <div className="adm-detail-meta-item">
                  <span className="adm-meta-label">{t('ui.k227')}</span>
                  <span>{formatDate(article.updatedAt || article.updatedDate)}</span>
                  {article.readTime && (
                    <span className="adm-meta-desc">⏱ {article.readTime.includes('min') ? article.readTime : `~${article.readTime} min read`}</span>
                  )}
                </div>
              </div>

              {/* Author Bio if present */}
              {article.author?.bio && (
                <div className="adm-author-bio-box">
                  <span className="adm-meta-label">{t('ui.k086')}</span>
                  <p>{article.author.bio}</p>
                </div>
              )}

              {/* Summary */}
              {article.summary && (
                <div className="adm-detail-section">
                  <h3 className="adm-section-heading">{t('ui.k398')}</h3>
                  <blockquote className="adm-detail-summary">
                    {article.summary}
                  </blockquote>
                </div>
              )}

              {/* Full Content */}
              <div className="adm-detail-section">
                <h3 className="adm-section-heading">{t('ui.k189')}</h3>
                <div className="adm-detail-body">
                  {article.content ? (
                    article.content.split('\n\n').map((para, i) => (
                      <p key={i}>{para}</p>
                    ))
                  ) : (
                    <p className="adm-muted-text">{t('ui.k275')}</p>
                  )}
                </div>
              </div>

              {/* Article Resources */}
              {article.resources && article.resources.length > 0 && (
                <div className="adm-detail-section">
                  <h3 className="adm-section-heading">{t('ui.k351')}</h3>
                  <ul className="adm-resource-list">
                    {article.resources.map((res) => (
                      <li key={res.id} className="adm-resource-item">
                        <span className="adm-resource-type">
                          {res.type || 'DOCUMENT'}
                        </span>
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="adm-resource-link"
                        >
                          {res.title || res.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Rejection Reason notice if already rejected */}
              {article.rejectionReason && (
                <div className="adm-rejection-notice" role="alert">
                  <div className="adm-rejection-header">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <strong>{t('ui.k331')}</strong>
                  </div>
                  <p>{article.rejectionReason}</p>
                </div>
              )}

              {/* Review History */}
              <div className="adm-detail-section">
                <h3 className="adm-section-heading">{t('ui.k357')}</h3>
                {reviews.length === 0 ? (
                  <p className="adm-muted-text">{t('ui.k278')}</p>
                ) : (
                  <div className="adm-review-history-list">
                    {reviews.map((rev) => (
                      <div key={rev.id} className="adm-review-item">
                        <div className="adm-review-header">
                          <div className="adm-review-transition">
                            <span className="adm-review-badge-prev">{rev.previousStatus || 'INIT'}</span>
                            <span className="adm-review-arrow">→</span>
                            <span className={`adm-review-badge-next adm-badge-${(rev.newStatus || '').toLowerCase()}`}>
                              {rev.newStatus}
                            </span>
                          </div>
                          <span className="adm-review-time">{formatDate(rev.createdAt)}</span>
                        </div>
                        <div className="adm-review-reviewer">
                          <span>{t('ui.k360')}{' '}</span>
                          <strong>{rev.reviewer?.name || t('admin.userRoles.ADMIN')}</strong>
                          {rev.reviewer?.email && (
                            <span className="adm-reviewer-email"> ({rev.reviewer.email})</span>
                          )}
                        </div>
                        {rev.feedback && (
                          <div className="adm-review-feedback">
                            <em>{t('ui.k178')}</em> {rev.feedback}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Inline Moderation Forms ─────────────────────────────── */}
              {article.status === 'PENDING_REVIEW' && (
                <div className="adm-moderation-actions-panel">
                  {actionType === null && (
                    <div className="adm-action-buttons-row">
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() => {
                          setActionType('approve')
                          setActionError(null)
                          setValidationError('')
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>{t('ui.k063')}</button>

                      <button
                        type="button"
                        className="button adm-button-danger"
                        onClick={() => {
                          setActionType('reject')
                          setActionError(null)
                          setValidationError('')
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>{t('ui.k329')}</button>
                    </div>
                  )}

                  {/* Approve Form */}
                  {actionType === 'approve' && (
                    <form onSubmit={handleApprove} className="adm-action-form adm-approve-form">
                      <h4 className="adm-form-title">{t('ui.k064')}</h4>
                      <p className="adm-form-desc">{t('ui.k310')}</p>

                      <label className="adm-form-label">{t('ui.k361')}<textarea
                          className="adm-textarea"
                          rows="3"
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder={t('ui.a055')}
                          disabled={submitting}
                        />
                      </label>

                      <div className="adm-form-actions">
                        <button
                          type="button"
                          className="button button-outline button-small"
                          onClick={() => setActionType(null)}
                          disabled={submitting}
                        >{t('ui.k106')}</button>
                        <button
                          type="submit"
                          className="button button-primary button-small"
                          disabled={submitting}
                        >
                          {submitting ? t('ui.extra.approving') : t('ui.extra.confirmApprovalPublish')}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Reject Form */}
                  {actionType === 'reject' && (
                    <form onSubmit={handleReject} className="adm-action-form adm-reject-form">
                      <h4 className="adm-form-title adm-text-danger">{t('ui.k329')}</h4>
                      <p className="adm-form-desc">{t('ui.k300')}</p>

                      <label className="adm-form-label">{t('ui.k331')}<span className="adm-required-asterisk">*</span>
                        <textarea
                          className={`adm-textarea ${validationError ? 'adm-input-invalid' : ''}`}
                          rows="3"
                          value={rejectionReason}
                          onChange={(e) => {
                            setRejectionReason(e.target.value)
                            if (validationError) setValidationError('')
                          }}
                          placeholder={t('ui.a053')}
                          disabled={submitting}
                          required
                        />
                      </label>

                      {validationError && (
                        <p className="adm-field-error" role="alert">
                          {validationError}
                        </p>
                      )}

                      <div className="adm-form-actions">
                        <button
                          type="button"
                          className="button button-outline button-small"
                          onClick={() => {
                            setActionType(null)
                            setValidationError('')
                          }}
                          disabled={submitting}
                        >{t('ui.k106')}</button>
                        <button
                          type="submit"
                          className="button adm-button-danger button-small"
                          disabled={submitting}
                        >
                          {submitting ? t('ui.extra.rejecting') : t('ui.extra.confirmRejection')}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Modal Footer ──────────────────────────────────────────────── */}
        <div className="adm-modal-footer">
          <button
            type="button"
            className="button button-outline"
            onClick={onClose}
            disabled={submitting}
          >{t('ui.k114')}</button>
        </div>
      </div>
    </div>
  )
}
