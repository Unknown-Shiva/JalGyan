import { useTranslation } from 'react-i18next';
import { useEffect, useState, useCallback } from 'react'
import { adminService } from '../../services/adminService'

function formatTimestamp(ts) {
  if (!ts) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(new Date(ts))
  } catch {
    return '—'
  }
}

const ACTION_LABELS = {
  ARTICLE_APPROVED: 'Approved Article',
  ARTICLE_REJECTED: 'Rejected Article',
  USER_SUSPENDED: 'Suspended User',
  USER_ACTIVATED: 'Activated User',
  USER_ROLE_CHANGED: 'Changed Role',
  REPORT_RESOLVED: 'Resolved Report',
  REPORT_DISMISSED: 'Dismissed Report',
}

const ACTION_ACCENTS = {
  ARTICLE_APPROVED: 'green',
  ARTICLE_REJECTED: 'red',
  USER_SUSPENDED: 'orange',
  USER_ACTIVATED: 'green',
  USER_ROLE_CHANGED: 'blue',
  REPORT_RESOLVED: 'green',
  REPORT_DISMISSED: 'muted',
}

function ActionBadge({ type }) {
  const { t } = useTranslation()
  const accent = ACTION_ACCENTS[type] ?? 'muted'
  const label = ACTION_LABELS[type] ? t(`admin.actions.${type}`) : type?.replace(/_/g, ' ') ?? t('common.action')
  return <span className={`adm-action-badge adm-action-badge-${accent}`}>{label}</span>
}

/**
 * Filter out sensitive fields (passwords, tokens, secrets) from arbitrary JSON details
 */
function sanitizeDetails(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(sanitizeDetails)

  const sensitiveKeys = ['password', 'passwordHash', 'token', 'jwt', 'secret', 'hash', 'authToken']
  const clean = {}

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      clean[key] = '[REDACTED]'
    } else if (value && typeof value === 'object') {
      clean[key] = sanitizeDetails(value)
    } else {
      clean[key] = value
    }
  }

  return clean
}

export default function ActivityDetailModal({
  activityId,
  onClose,
}) {
  const { t } = useTranslation();
  const [activity, setActivity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewRawJson, setViewRawJson] = useState(false)

  const loadDetails = useCallback(async () => {
    if (!activityId) return
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getAdminActivityById(activityId)
      setActivity(data?.action || data)
    } catch (err) {
      setError(err.message || t('admin.errors.loadActivityDetails'))
    } finally {
      setLoading(false)
    }
  }, [activityId, t])

  useEffect(() => {
    loadDetails()
  }, [loadDetails])

  // Keyboard close on Esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const sanitized = activity?.details ? sanitizeDetails(activity.details) : null

  return (
    <div
      className="adm-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div
        className="adm-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-detail-title"
      >
        {/* ── Modal Header ──────────────────────────────────────────────── */}
        <div className="adm-modal-header">
          <div className="adm-modal-title-group">
            <h2 id="activity-detail-title" className="adm-modal-title">{t('ui.k083')}</h2>
            {activity?.actionType && (
              <ActionBadge type={activity.actionType} />
            )}
          </div>
          <button
            type="button"
            className="adm-modal-close"
            onClick={onClose}
            aria-label={t('ui.a012')}
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
              <div className="adm-sk-sub" style={{ width: '100%', height: '120px', marginTop: '16px' }} />
            </div>
          )}

          {error && (
            <div className="adm-error-banner" role="alert">
              <span className="adm-error-icon" aria-hidden="true">⚠️</span>
              <span className="adm-error-msg">{error}</span>
              <button
                type="button"
                className="button button-outline button-small"
                onClick={loadDetails}
              >{t('ui.k353')}</button>
            </div>
          )}

          {!loading && activity && (
            <div className="adm-detail-content">
              {/* Meta Grid */}
              <div className="adm-detail-meta-grid">
                <div className="adm-detail-meta-item">
                  <span className="adm-meta-label">{t('ui.k082')}</span>
                  <span className="adm-meta-mono">{activity.id}</span>
                </div>

                <div className="adm-detail-meta-item">
                  <span className="adm-meta-label">{t('ui.k043')}</span>
                  <strong className="adm-author-name">
                    {activity.admin?.name || 'Unknown Administrator'}
                  </strong>
                  <span className="adm-author-email">{activity.admin?.email || '—'}</span>
                  {activity.admin?.id && (
                    <span className="adm-meta-desc">{t('ui.k203')}{' '}{activity.admin.id}</span>
                  )}
                </div>

                <div className="adm-detail-meta-item">
                  <span className="adm-meta-label">{t('ui.k410')}</span>
                  <span className="adm-activity-entity">{activity.targetEntity || '—'}</span>
                  <span className="adm-meta-mono" title={activity.targetId}>{t('ui.k203')}{activity.targetId || '—'}
                  </span>
                </div>

                <div className="adm-detail-meta-item">
                  <span className="adm-meta-label">{t('ui.k417')}</span>
                  <span>{formatTimestamp(activity.createdAt)}</span>
                  <span className="adm-meta-desc">{activity.createdAt}</span>
                </div>
              </div>

              {/* Action Context Details */}
              <div className="adm-detail-section">
                <div className="adm-target-section-header">
                  <h3 className="adm-section-heading" style={{ margin: 0 }}>{t('ui.k028')}</h3>
                  {sanitized && (
                    <button
                      type="button"
                      className="button button-outline button-small adm-view-toggle"
                      onClick={() => setViewRawJson((prev) => !prev)}
                    >
                      {viewRawJson ? 'View Structured List' : 'View Raw JSON'}
                    </button>
                  )}
                </div>

                {sanitized && !viewRawJson && (
                  <div className="adm-audit-kv-box">
                    <dl className="adm-audit-kv-list">
                      {Object.entries(sanitized).map(([key, val]) => (
                        <div key={key} className="adm-audit-kv-row">
                          <dt className="adm-audit-key">{key}:</dt>
                          <dd className="adm-audit-val">
                            {typeof val === 'object' && val !== null ? (
                              <pre className="adm-audit-nested-json">{JSON.stringify(val, null, 2)}</pre>
                            ) : (
                              String(val)
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {sanitized && viewRawJson && (
                  <div className="adm-raw-json-wrap">
                    <pre className="adm-raw-json">{JSON.stringify(sanitized, null, 2)}</pre>
                  </div>
                )}

                {!sanitized && (
                  <p className="adm-muted-text">{t('ui.k269')}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Modal Footer ──────────────────────────────────────────────── */}
        <div className="adm-modal-footer">
          <button
            type="button"
            className="button button-outline"
            onClick={onClose}
          >{t('ui.k114')}</button>
        </div>
      </div>
    </div>
  )
}
