import { useEffect, useState, useCallback } from 'react'
import { adminService } from '../../services/adminService'
import ReportDetailModal from '../../components/admin/ReportDetailModal'

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

export default function ReportModeration() {
  const [reports, setReports] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState(null)
  const [selectedReportId, setSelectedReportId] = useState(null)

  // Filters state
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [reasonFilter, setReasonFilter] = useState('ALL')
  const [targetTypeFilter, setTargetTypeFilter] = useState('ALL')
  const [sortOrder, setSortOrder] = useState('desc')

  const fetchReports = useCallback(async (targetPage = 1) => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getReports({
        page: targetPage,
        limit: 10,
        status: statusFilter,
        reason: reasonFilter,
        targetType: targetTypeFilter,
        sortOrder,
      })
      setReports(data?.reports || [])
      setPagination(data?.pagination || { page: targetPage, limit: 10, total: 0, totalPages: 1 })
    } catch (err) {
      setError(err.message || 'Failed to load content reports.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, reasonFilter, targetTypeFilter, sortOrder])

  useEffect(() => {
    fetchReports(1)
  }, [fetchReports])

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.page) {
      fetchReports(newPage)
    }
  }

  const handleReportUpdated = ({ id, status }) => {
    const msg = status === 'RESOLVED' ? 'Report marked as resolved.' : 'Report dismissed.'
    setNotification({ type: 'success', message: msg })
    // Refresh current page
    fetchReports(pagination.page)

    setTimeout(() => {
      setNotification(null)
    }, 4500)
  }

  const startRecord = (pagination.page - 1) * pagination.limit + (pagination.total > 0 ? 1 : 0)
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <div className="adm-reports-page">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <header className="adm-header">
        <div>
          <div className="adm-header-title-row">
            <h1 className="adm-page-title">Content Moderation & Reports</h1>
            {pagination.total > 0 && (
              <span className="adm-badge adm-badge-warn">
                {pagination.total} Report{pagination.total === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <p className="adm-page-subtitle">
            Review community-flagged posts, comments, articles, and user profiles. Investigate reports and make moderation decisions.
          </p>
        </div>

        <button
          type="button"
          className="button button-outline button-small"
          onClick={() => fetchReports(pagination.page)}
          disabled={loading}
          aria-label="Refresh reports queue"
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
            onClick={() => fetchReports(pagination.page)}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Filter Toolbar ─────────────────────────────────────────────── */}
      <div className="adm-filter-toolbar">
        {/* Status Filter */}
        <div className="adm-filter-group">
          <label htmlFor="filter-report-status" className="adm-filter-label">Status:</label>
          <select
            id="filter-report-status"
            className="adm-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
        </div>

        {/* Reason Filter */}
        <div className="adm-filter-group">
          <label htmlFor="filter-report-reason" className="adm-filter-label">Reason:</label>
          <select
            id="filter-report-reason"
            className="adm-select"
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
          >
            <option value="ALL">All Reasons</option>
            <option value="SPAM">Spam</option>
            <option value="HARASSMENT">Harassment</option>
            <option value="MISINFORMATION">Misinformation</option>
            <option value="INAPPROPRIATE">Inappropriate</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Target Type Filter */}
        <div className="adm-filter-group">
          <label htmlFor="filter-target-type" className="adm-filter-label">Target:</label>
          <select
            id="filter-target-type"
            className="adm-select"
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
          >
            <option value="ALL">All Content Types</option>
            <option value="POST">Forum Post</option>
            <option value="COMMENT">Comment</option>
            <option value="ARTICLE">Article</option>
            <option value="USER">User Account</option>
          </select>
        </div>

        {/* Sort Order */}
        <div className="adm-filter-group">
          <label htmlFor="sort-report-order" className="adm-filter-label">Sort:</label>
          <select
            id="sort-report-order"
            className="adm-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* ── Reports Table Card ─────────────────────────────────────────── */}
      <div className="adm-table-card">
        {loading ? (
          <div className="adm-table-skeleton" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="adm-table-sk-row">
                <div className="adm-sk-text" style={{ width: '15%' }} />
                <div className="adm-sk-text" style={{ width: '20%' }} />
                <div className="adm-sk-text" style={{ width: '25%' }} />
                <div className="adm-sk-text" style={{ width: '15%' }} />
                <div className="adm-sk-text" style={{ width: '15%' }} />
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="adm-empty-state" role="status">
            <div className="adm-empty-icon" aria-hidden="true">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="adm-empty-title">No Reports Found</h3>
            <p className="adm-empty-desc">
              {statusFilter !== 'ALL' || reasonFilter !== 'ALL' || targetTypeFilter !== 'ALL'
                ? 'No reports match the selected filters. Try broadening your criteria.'
                : 'There are no active content reports in the queue.'}
            </p>
          </div>
        ) : (
          <div className="adm-table-wrapper">
            <table className="adm-table" aria-label="Content moderation reports">
              <thead>
                <tr>
                  <th scope="col">Target</th>
                  <th scope="col">Reason</th>
                  <th scope="col" style={{ minWidth: '220px' }}>Target Preview & Description</th>
                  <th scope="col">Reporter</th>
                  <th scope="col">Reported Date</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="adm-text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((rep) => {
                  const targetPreview =
                    rep.target?.title ||
                    rep.target?.text ||
                    rep.target?.body ||
                    rep.target?.name ||
                    '—'

                  const isDeleted = !rep.isTargetAvailable && (rep.target || rep.targetSnapshot)

                  return (
                    <tr key={rep.id} className="adm-table-row">
                      <td>
                        <TargetTypeBadge type={rep.targetType} />
                      </td>
                      <td>
                        <ReasonBadge reason={rep.reason} />
                      </td>
                      <td>
                        <div className="adm-report-preview-cell">
                          <p className="adm-report-target-snippet" title={targetPreview}>
                            {targetPreview}
                          </p>
                          {isDeleted && (
                            <span className="adm-snippet-deleted-tag">
                              (Snapshot: Content Deleted)
                            </span>
                          )}
                          {rep.description && (
                            <span className="adm-report-desc-snippet" title={rep.description}>
                              “{rep.description}”
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="adm-author-info-cell">
                          <strong className="adm-author-name">{rep.reporter?.name || 'Anonymous'}</strong>
                          <span className="adm-author-email">{rep.reporter?.email || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <span className="adm-date-cell">
                          {formatDate(rep.createdAt)}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={rep.status} />
                      </td>
                      <td className="adm-text-right">
                        <button
                          type="button"
                          className="button button-outline button-small adm-review-btn"
                          onClick={() => setSelectedReportId(rep.id)}
                          aria-label={`Inspect report ${rep.id}`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          Inspect
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ────────────────────────────────────────────────── */}
        {!loading && pagination.total > 0 && (
          <div className="adm-pagination-bar">
            <span className="adm-pagination-info">
              Showing <strong>{startRecord}</strong> to <strong>{endRecord}</strong> of{' '}
              <strong>{pagination.total}</strong> reports
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

      {/* ── Report Details & Action Modal ──────────────────────────────── */}
      {selectedReportId && (
        <ReportDetailModal
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
          onReportUpdated={handleReportUpdated}
        />
      )}
    </div>
  )
}
