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

function ReasonBadge({ reason }) {
  const norm = String(reason || '').toUpperCase()
  let accentClass = 'adm-reason-other'
  if (norm === 'SPAM') accentClass = 'adm-reason-spam'
  else if (norm === 'HARASSMENT') accentClass = 'adm-reason-harassment'
  else if (norm === 'MISINFORMATION') accentClass = 'adm-reason-misinformation'
  else if (norm === 'INAPPROPRIATE') accentClass = 'adm-reason-inappropriate'

  return <span className={`adm-reason-pill ${accentClass}`}>{reason}</span>
}

function TargetTypeBadge({ type }) {
  const norm = String(type || '').toUpperCase()
  let icon = '📄'
  if (norm === 'POST') icon = '💬'
  else if (norm === 'COMMENT') icon = '🗨️'
  else if (norm === 'ARTICLE') icon = '📰'
  else if (norm === 'USER') icon = '👤'

  return (
    <span className="adm-target-type-badge">
      <span className="adm-tt-icon">{icon}</span>
      <span>{type}</span>
    </span>
  )
}

function StatusBadge({ status }) {
  const norm = String(status || '').toUpperCase()
  let pillClass = 'adm-report-status-pending'
  let label = 'Pending'

  if (norm === 'RESOLVED') {
    pillClass = 'adm-report-status-resolved'
    label = 'Resolved'
  } else if (norm === 'DISMISSED') {
    pillClass = 'adm-report-status-dismissed'
    label = 'Dismissed'
  }

  return <span className={`adm-report-status-pill ${pillClass}`}>{label}</span>
}

export default function ReportDetailModal({
  reportId,
  onClose,
  onReportUpdated,
}) {
  const [reportDetails, setReportDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Action states
  const [activeAction, setActiveAction] = useState(null) // 'resolve' | 'dismiss' | null
  const [moderatorNote, setModeratorNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)

  const loadReportDetails = useCallback(async () => {
    if (!reportId) return
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getReportById(reportId)
      setReportDetails(data?.report || data)
    } catch (err) {
      setError(err.message || 'Failed to load report details.')
    } finally {
      setLoading(false)
    }
  }, [reportId])

  useEffect(() => {
    loadReportDetails()
  }, [loadReportDetails])

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

  // Handle Resolve
  const handleResolve = async (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setActionError(null)

    try {
      const res = await adminService.resolveReport(reportId, { note: moderatorNote.trim() })
      setActionSuccess('Report resolved successfully.')
      const updated = res?.report || { ...reportDetails, status: 'RESOLVED', actionTaken: moderatorNote.trim() || 'Report resolved by administrator' }
      setReportDetails((prev) => ({ ...prev, ...updated, status: 'RESOLVED' }))
      setActiveAction(null)
      setModeratorNote('')
      if (onReportUpdated) onReportUpdated({ id: reportId, status: 'RESOLVED' })
    } catch (err) {
      setActionError(err.message || 'Failed to resolve report.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Dismiss
  const handleDismiss = async (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setActionError(null)

    try {
      const res = await adminService.dismissReport(reportId, { note: moderatorNote.trim() })
      setActionSuccess('Report dismissed successfully.')
      const updated = res?.report || { ...reportDetails, status: 'DISMISSED', actionTaken: moderatorNote.trim() || 'Report dismissed by administrator' }
      setReportDetails((prev) => ({ ...prev, ...updated, status: 'DISMISSED' }))
      setActiveAction(null)
      setModeratorNote('')
      if (onReportUpdated) onReportUpdated({ id: reportId, status: 'DISMISSED' })
    } catch (err) {
      setActionError(err.message || 'Failed to dismiss report.')
    } finally {
      setSubmitting(false)
    }
  }

  const target = reportDetails?.target
  const isAvailable = reportDetails?.isTargetAvailable
  const hasSnapshot = Boolean(reportDetails?.targetSnapshot)
  const isTargetDeleted = !isAvailable && (target || hasSnapshot)
  const isTargetMissing = !target && !hasSnapshot

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
        aria-labelledby="report-detail-title"
      >
        {/* ── Modal Header ──────────────────────────────────────────────── */}
        <div className="adm-modal-header">
          <div className="adm-modal-title-group">
            <h2 id="report-detail-title" className="adm-modal-title">
              Report Moderation
            </h2>
            {reportDetails?.targetType && (
              <TargetTypeBadge type={reportDetails.targetType} />
            )}
            {reportDetails?.reason && (
              <ReasonBadge reason={reportDetails.reason} />
            )}
            {reportDetails?.status && (
              <StatusBadge status={reportDetails.status} />
            )}
          </div>
          <button
            type="button"
            className="adm-modal-close"
            onClick={onClose}
            aria-label="Close report details"
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
              <div className="adm-sk-label" style={{ width: '35%' }} />
              <div className="adm-sk-value" style={{ width: '70%', height: '32px' }} />
              <div className="adm-sk-sub" style={{ width: '100%', height: '80px', marginTop: '16px' }} />
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
                onClick={loadReportDetails}
              >
                Retry
              </button>
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

          {!loading && reportDetails && (
            <div className="adm-detail-content">
              {/* Report Metadata Grid */}
              <div className="adm-detail-meta-grid">
                <div className="adm-detail-meta-item">
                  <span className="adm-meta-label">Report ID</span>
                  <span className="adm-meta-mono">{reportDetails.id}</span>
                </div>

                <div className="adm-detail-meta-item">
                  <span className="adm-meta-label">Filed By</span>
                  <strong className="adm-author-name">{reportDetails.reporter?.name || 'Anonymous Reporter'}</strong>
                  <span className="adm-author-email">{reportDetails.reporter?.email || '—'}</span>
                </div>

                <div className="adm-detail-meta-item">
                  <span className="adm-meta-label">Date Reported</span>
                  <span>{formatDate(reportDetails.createdAt)}</span>
                </div>

                <div className="adm-detail-meta-item">
                  <span className="adm-meta-label">Moderation Status</span>
                  <span>{reportDetails.status}</span>
                  {reportDetails.resolvedAt && (
                    <span className="adm-meta-desc">on {formatDate(reportDetails.resolvedAt)}</span>
                  )}
                </div>
              </div>

              {/* Reporter's Description / Note */}
              <div className="adm-detail-section">
                <h3 className="adm-section-heading">Reporter’s Explanation</h3>
                {reportDetails.description ? (
                  <blockquote className="adm-detail-summary">
                    {reportDetails.description}
                  </blockquote>
                ) : (
                  <p className="adm-muted-text">No additional written description provided by the reporter.</p>
                )}
              </div>

              {/* ── Target Entity Section ─────────────────────────────────── */}
              <div className="adm-detail-section">
                <div className="adm-target-section-header">
                  <h3 className="adm-section-heading" style={{ margin: 0 }}>
                    Reported Content ({reportDetails.targetType})
                  </h3>

                  {isTargetDeleted && (
                    <span className="adm-deleted-target-badge" title="The reported item was deleted. A preserved snapshot is displayed below.">
                      ⚠️ Target Content Deleted — Preserved Snapshot
                    </span>
                  )}

                  {isAvailable && (
                    <span className="adm-live-target-badge">
                      🟢 Live Platform Content
                    </span>
                  )}
                </div>

                {isTargetMissing ? (
                  <div className="adm-target-missing-box" role="status">
                    <p>Target entity could not be loaded or was removed without snapshot.</p>
                  </div>
                ) : (
                  <div className={`adm-target-box ${isTargetDeleted ? 'adm-target-box-deleted' : ''}`}>
                    {/* POST target */}
                    {reportDetails.targetType === 'POST' && (
                      <div className="adm-target-post-view">
                        {target.title && <h4 className="adm-target-title">{target.title}</h4>}
                        {target.body && <p className="adm-target-body">{target.body}</p>}
                        <div className="adm-target-meta-row">
                          {target.author?.name && (
                            <span>Author: <strong>{target.author.name}</strong> ({target.author.email})</span>
                          )}
                          {target.category && <span className="adm-category-tag">{target.category}</span>}
                          {target.createdAt && <span>Posted: {formatDate(target.createdAt)}</span>}
                        </div>
                      </div>
                    )}

                    {/* COMMENT target */}
                    {reportDetails.targetType === 'COMMENT' && (
                      <div className="adm-target-comment-view">
                        <p className="adm-target-body">{target.text || target.body || '—'}</p>
                        <div className="adm-target-meta-row">
                          {target.author?.name && (
                            <span>Commenter: <strong>{target.author.name}</strong> ({target.author.email})</span>
                          )}
                          {target.postId && <span className="adm-meta-desc">Post ID: {target.postId}</span>}
                          {target.createdAt && <span>Written: {formatDate(target.createdAt)}</span>}
                        </div>
                      </div>
                    )}

                    {/* ARTICLE target */}
                    {reportDetails.targetType === 'ARTICLE' && (
                      <div className="adm-target-article-view">
                        {target.title && <h4 className="adm-target-title">{target.title}</h4>}
                        {target.summary && <p className="adm-target-body">{target.summary}</p>}
                        <div className="adm-target-meta-row">
                          {target.author?.name && (
                            <span>Author: <strong>{target.author.name}</strong> ({target.author.email})</span>
                          )}
                          {target.status && <span className="adm-status-badge">{target.status}</span>}
                        </div>
                      </div>
                    )}

                    {/* USER target */}
                    {reportDetails.targetType === 'USER' && (
                      <div className="adm-target-user-view">
                        <h4 className="adm-target-title">{target.name}</h4>
                        <div className="adm-target-meta-row">
                          <span>Email: <strong>{target.email}</strong></span>
                          {target.role && <span className="adm-role-badge">{target.role}</span>}
                          {target.status && <span className="adm-user-status-pill">{target.status}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Taken / Moderator Note */}
              {reportDetails.actionTaken && (
                <div className="adm-detail-section">
                  <h3 className="adm-section-heading">Resolution & Action Taken</h3>
                  <div className="adm-resolution-box">
                    <p><strong>Note:</strong> {reportDetails.actionTaken}</p>
                    {reportDetails.moderator?.name && (
                      <span className="adm-meta-desc">
                        Processed by <strong>{reportDetails.moderator.name}</strong> ({reportDetails.moderator.email})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ── Audit History ─────────────────────────────────────────── */}
              {reportDetails.auditHistory && reportDetails.auditHistory.length > 0 && (
                <div className="adm-detail-section">
                  <h3 className="adm-section-heading">Moderation Audit Trail</h3>
                  <div className="adm-review-history-list">
                    {reportDetails.auditHistory.map((audit) => (
                      <div key={audit.id} className="adm-review-item">
                        <div className="adm-review-header">
                          <span className="adm-action-badge adm-action-badge-blue">
                            {audit.actionType}
                          </span>
                          <span className="adm-review-time">{formatDate(audit.createdAt)}</span>
                        </div>
                        <div className="adm-review-reviewer">
                          <span>Moderator: <strong>{audit.admin?.name || 'Administrator'}</strong></span>
                          {audit.admin?.email && (
                            <span className="adm-reviewer-email"> ({audit.admin.email})</span>
                          )}
                        </div>
                        {audit.details?.moderationNote && (
                          <div className="adm-review-feedback">
                            <em>Note:</em> {audit.details.moderationNote}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Moderation Action Panel (for PENDING reports) ─────────── */}
              {reportDetails.status === 'PENDING' && (
                <div className="adm-moderation-actions-panel">
                  <h3 className="adm-section-heading">Moderation Decision</h3>

                  {activeAction === null && (
                    <div className="adm-action-buttons-row">
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() => {
                          setActiveAction('resolve')
                          setActionError(null)
                          setModeratorNote('')
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Resolve Report
                      </button>

                      <button
                        type="button"
                        className="button button-outline"
                        onClick={() => {
                          setActiveAction('dismiss')
                          setActionError(null)
                          setModeratorNote('')
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        Dismiss Report
                      </button>
                    </div>
                  )}

                  {/* Resolve Form */}
                  {activeAction === 'resolve' && (
                    <form onSubmit={handleResolve} className="adm-action-form adm-approve-form">
                      <h4 className="adm-form-title">Resolve Content Report</h4>
                      <p className="adm-form-desc">
                        Marking this report as <strong>RESOLVED</strong> acknowledges that appropriate moderation action was taken or verified.
                      </p>

                      <label className="adm-form-label">
                        Resolution Note (Optional)
                        <textarea
                          className="adm-textarea"
                          rows="2"
                          value={moderatorNote}
                          onChange={(e) => setModeratorNote(e.target.value)}
                          placeholder="e.g., Content reviewed and confirmed compliant with community guidelines."
                          disabled={submitting}
                        />
                      </label>

                      <div className="adm-form-actions">
                        <button
                          type="button"
                          className="button button-outline button-small"
                          onClick={() => setActiveAction(null)}
                          disabled={submitting}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="button button-primary button-small"
                          disabled={submitting}
                        >
                          {submitting ? 'Resolving…' : 'Confirm Resolution'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Dismiss Form */}
                  {activeAction === 'dismiss' && (
                    <form onSubmit={handleDismiss} className="adm-action-form adm-reject-form">
                      <h4 className="adm-form-title">Dismiss Content Report</h4>
                      <p className="adm-form-desc">
                        Dismissing this report records that the report was investigated and deemed invalid, mistaken, or not requiring administrative intervention.
                      </p>

                      <label className="adm-form-label">
                        Dismissal Note (Optional)
                        <textarea
                          className="adm-textarea"
                          rows="2"
                          value={moderatorNote}
                          onChange={(e) => setModeratorNote(e.target.value)}
                          placeholder="e.g., Target content does not violate platform rules."
                          disabled={submitting}
                        />
                      </label>

                      <div className="adm-form-actions">
                        <button
                          type="button"
                          className="button button-outline button-small"
                          onClick={() => setActiveAction(null)}
                          disabled={submitting}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="button button-outline button-small"
                          disabled={submitting}
                        >
                          {submitting ? 'Dismissing…' : 'Confirm Dismissal'}
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
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
