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

function ReasonBadge({ reason }) {
  const { t } = useTranslation()
  const norm = String(reason || '').toUpperCase()
  let accentClass = 'adm-reason-other'
  if (norm === 'SPAM') accentClass = 'adm-reason-spam'
  else if (norm === 'HARASSMENT') accentClass = 'adm-reason-harassment'
  else if (norm === 'MISINFORMATION') accentClass = 'adm-reason-misinformation'
  else if (norm === 'INAPPROPRIATE') accentClass = 'adm-reason-inappropriate'

  return <span className={`adm-reason-pill ${accentClass}`}>{t(`report.reasons.${norm}`, { defaultValue: reason })}</span>
}

function TargetTypeBadge({ type }) {
  const { t } = useTranslation()
  const norm = String(type || '').toUpperCase()
  let icon = '📄'
  if (norm === 'POST') icon = '💬'
  else if (norm === 'COMMENT') icon = '🗨️'
  else if (norm === 'ARTICLE') icon = '📰'
  else if (norm === 'USER') icon = '👤'

  return (
    <span className="adm-target-type-badge">
      <span className="adm-tt-icon">{icon}</span>
      <span>{t(`admin.targetTypes.${norm}`, { defaultValue: type })}</span>
    </span>
  )
}

function StatusBadge({ status }) {
  const { t } = useTranslation()
  const norm = String(status || '').toUpperCase()
  let pillClass = 'adm-report-status-pending'
  let label = t(`admin.reportStatus.${norm}`, { defaultValue: status })

  if (norm === 'RESOLVED') {
    pillClass = 'adm-report-status-resolved'
    label = t('admin.reportStatus.RESOLVED')
  } else if (norm === 'DISMISSED') {
    pillClass = 'adm-report-status-dismissed'
    label = t('admin.reportStatus.DISMISSED')
  }

  return <span className={`adm-report-status-pill ${pillClass}`}>{label}</span>
}

export default function ReportDetailModal({
  reportId,
  onClose,
  onReportUpdated,
}) {
  const { t } = useTranslation();
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
      setError(t('admin.errors.loadReport'))
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
      setActionError(t('admin.errors.resolveReport'))
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
      setActionError(t('admin.errors.dismissReport'))
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
            <h2 id="report-detail-title" className="adm-modal-title">{t('ui.k335')}</h2>
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
            aria-label={t('ui.a014')}
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

          {!loading && reportDetails && (
            <div className="adm-detail-content">
              {/* Report Metadata Grid */}
              <div className="adm-detail-meta-grid">
                <div className="adm-detail-meta-item">
                  <span className="adm-meta-label">{t('ui.k334')}</span>
                  <span className="adm-meta-mono">{reportDetails.id}</span>
                </div>

                <div className="adm-detail-meta-item">
                  <span className="adm-meta-label">{t('ui.k180')}</span>
                  <strong className="adm-author-name">{reportDetails.reporter?.name || t('admin.anonymousReporter')}</strong>
                  <span className="adm-author-email">{reportDetails.reporter?.email || '—'}</span>
                </div>

                <div className="adm-detail-meta-item">
                  <span className="adm-meta-label">{t('ui.k141')}</span>
                  <span>{formatDate(reportDetails.createdAt)}</span>
                </div>

                <div className="adm-detail-meta-item">
                  <span className="adm-meta-label">{t('ui.k252')}</span>
                  <span>{t(`admin.reportStatus.${String(reportDetails.status || '').toUpperCase()}`, { defaultValue: reportDetails.status })}</span>
                  {reportDetails.resolvedAt && (
                    <span className="adm-meta-desc">{t('ui.k487')}{' '}{formatDate(reportDetails.resolvedAt)}</span>
                  )}
                </div>
              </div>

              {/* Reporter's Description / Note */}
              <div className="adm-detail-section">
                <h3 className="adm-section-heading">{t('ui.k339')}</h3>
                {reportDetails.description ? (
                  <blockquote className="adm-detail-summary">
                    {reportDetails.description}
                  </blockquote>
                ) : (
                  <p className="adm-muted-text">{t('ui.k270')}</p>
                )}
              </div>

              {/* ── Target Entity Section ─────────────────────────────────── */}
              <div className="adm-detail-section">
                <div className="adm-target-section-header">
                  <h3 className="adm-section-heading" style={{ margin: 0 }}>{t('ui.k336')}{reportDetails.targetType})
                  </h3>

                  {isTargetDeleted && (
                    <span className="adm-deleted-target-badge" title={t('ui.a046')}>{t('ui.k502')}</span>
                  )}

                  {isAvailable && (
                    <span className="adm-live-target-badge">{t('ui.k510')}</span>
                  )}
                </div>

                {isTargetMissing ? (
                  <div className="adm-target-missing-box" role="status">
                    <p>{t('ui.k413')}</p>
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
                            <span>{t('ui.k087')}{' '}<strong>{target.author.name}</strong> ({target.author.email})</span>
                          )}
                          {target.category && <span className="adm-category-tag">{target.category}</span>}
                          {target.createdAt && <span>{t('ui.k302')}{' '}{formatDate(target.createdAt)}</span>}
                        </div>
                      </div>
                    )}

                    {/* COMMENT target */}
                    {reportDetails.targetType === 'COMMENT' && (
                      <div className="adm-target-comment-view">
                        <p className="adm-target-body">{target.text || target.body || '—'}</p>
                        <div className="adm-target-meta-row">
                          {target.author?.name && (
                            <span>{t('ui.k117')}{' '}<strong>{target.author.name}</strong> ({target.author.email})</span>
                          )}
                          {target.postId && <span className="adm-meta-desc">{t('ui.k301')}{' '}{target.postId}</span>}
                          {target.createdAt && <span>{t('ui.k466')}{' '}{formatDate(target.createdAt)}</span>}
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
                            <span>{t('ui.k087')}{' '}<strong>{target.author.name}</strong> ({target.author.email})</span>
                          )}
                          {target.status && <span className="adm-status-badge">{t(`admin.articleStatus.${String(target.status).toUpperCase()}`, { defaultValue: target.status })}</span>}
                        </div>
                      </div>
                    )}

                    {/* USER target */}
                    {reportDetails.targetType === 'USER' && (
                      <div className="adm-target-user-view">
                        <h4 className="adm-target-title">{target.name}</h4>
                        <div className="adm-target-meta-row">
                          <span>{t('ui.k165')}{' '}<strong>{target.email}</strong></span>
                          {target.role && <span className="adm-role-badge">{t(`admin.userRoles.${target.role}`, { defaultValue: target.role })}</span>}
                          {target.status && <span className="adm-user-status-pill">{t(`admin.userStatus.${target.status}`, { defaultValue: target.status })}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Taken / Moderator Note */}
              {reportDetails.actionTaken && (
                <div className="adm-detail-section">
                  <h3 className="adm-section-heading">{t('ui.k344')}</h3>
                  <div className="adm-resolution-box">
                    <p><strong>{t('ui.k281')}</strong> {reportDetails.actionTaken}</p>
                    {reportDetails.moderator?.name && (
                      <span className="adm-meta-desc">{t('ui.k304')}<strong>{reportDetails.moderator.name}</strong> ({reportDetails.moderator.email})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ── Audit History ─────────────────────────────────────────── */}
              {reportDetails.auditHistory && reportDetails.auditHistory.length > 0 && (
                <div className="adm-detail-section">
                  <h3 className="adm-section-heading">{t('ui.k250')}</h3>
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
                          <span>{t('ui.k253')}{' '}<strong>{audit.admin?.name || t('admin.userRoles.ADMIN')}</strong></span>
                          {audit.admin?.email && (
                            <span className="adm-reviewer-email"> ({audit.admin.email})</span>
                          )}
                        </div>
                        {audit.details?.moderationNote && (
                          <div className="adm-review-feedback">
                            <em>{t('ui.k281')}</em> {audit.details.moderationNote}
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
                  <h3 className="adm-section-heading">{t('ui.k251')}</h3>

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
                        </svg>{t('ui.k347')}</button>

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
                        </svg>{t('ui.k144')}</button>
                    </div>
                  )}

                  {/* Resolve Form */}
                  {activeAction === 'resolve' && (
                    <form onSubmit={handleResolve} className="adm-action-form adm-approve-form">
                      <h4 className="adm-form-title">{t('ui.k346')}</h4>
                      <p className="adm-form-desc">{t('ui.k248')}<strong>{t('ui.k312')}</strong>{t('ui.k472')}</p>

                      <label className="adm-form-label">{t('ui.k345')}<textarea
                          className="adm-textarea"
                          rows="2"
                          value={moderatorNote}
                          onChange={(e) => setModeratorNote(e.target.value)}
                          placeholder={t('ui.a054')}
                          disabled={submitting}
                        />
                      </label>

                      <div className="adm-form-actions">
                        <button
                          type="button"
                          className="button button-outline button-small"
                          onClick={() => setActiveAction(null)}
                          disabled={submitting}
                        >{t('ui.k106')}</button>
                        <button
                          type="submit"
                          className="button button-primary button-small"
                          disabled={submitting}
                        >
                          {submitting ? t('ui.extra.resolving') : t('ui.extra.confirmResolution')}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Dismiss Form */}
                  {activeAction === 'dismiss' && (
                    <form onSubmit={handleDismiss} className="adm-action-form adm-reject-form">
                      <h4 className="adm-form-title">{t('ui.k143')}</h4>
                      <p className="adm-form-desc">{t('ui.k148')}</p>

                      <label className="adm-form-label">{t('ui.k145')}<textarea
                          className="adm-textarea"
                          rows="2"
                          value={moderatorNote}
                          onChange={(e) => setModeratorNote(e.target.value)}
                          placeholder={t('ui.a057')}
                          disabled={submitting}
                        />
                      </label>

                      <div className="adm-form-actions">
                        <button
                          type="button"
                          className="button button-outline button-small"
                          onClick={() => setActiveAction(null)}
                          disabled={submitting}
                        >{t('ui.k106')}</button>
                        <button
                          type="submit"
                          className="button button-outline button-small"
                          disabled={submitting}
                        >
                          {submitting ? t('ui.extra.dismissing') : t('ui.extra.confirmDismissal')}
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
