import { useEffect, useState, useCallback } from 'react'
import { adminService } from '../../services/adminService'
import ActivityDetailModal from '../../components/admin/ActivityDetailModal'

function formatTimestamp(ts) {
  if (!ts) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(ts))
  } catch {
    return '—'
  }
}

function formatINNumber(n) {
  if (n == null || isNaN(n)) return '0'
  return new Intl.NumberFormat('en-IN').format(Math.round(n))
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
  const accent = ACTION_ACCENTS[type] ?? 'muted'
  const label = ACTION_LABELS[type] ?? type?.replace(/_/g, ' ') ?? 'Action'
  return <span className={`adm-action-badge adm-action-badge-${accent}`}>{label}</span>
}

export default function AdminActivity() {
  // Activity logs state
  const [activities, setActivities] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedActivityId, setSelectedActivityId] = useState(null)

  // Summary state
  const [summary, setSummary] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(true)

  // Filters state
  const [actionTypeFilter, setActionTypeFilter] = useState('ALL')
  const [targetEntityFilter, setTargetEntityFilter] = useState('ALL')
  const [adminIdFilter, setAdminIdFilter] = useState('')
  const [targetIdFilter, setTargetIdFilter] = useState('')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('desc')

  // Load summary statistics
  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true)
    try {
      const data = await adminService.getAdminActivitySummary()
      setSummary(data)
    } catch {
      // Summary is supplementary; don't break page if fails
    } finally {
      setLoadingSummary(false)
    }
  }, [])

  // Load paginated activity list
  const fetchActivities = useCallback(async (targetPage = 1) => {
    setLoading(true)
    setError(null)
    try {
      let isoStart = null
      let isoEnd = null
      if (startDateFilter) {
        isoStart = new Date(startDateFilter + 'T00:00:00.000Z').toISOString()
      }
      if (endDateFilter) {
        isoEnd = new Date(endDateFilter + 'T23:59:59.999Z').toISOString()
      }

      const data = await adminService.getAdminActivity({
        page: targetPage,
        limit: 20,
        actionType: actionTypeFilter,
        targetEntity: targetEntityFilter,
        adminId: adminIdFilter.trim() || undefined,
        targetId: targetIdFilter.trim() || undefined,
        startDate: isoStart,
        endDate: isoEnd,
        sortOrder,
      })

      setActivities(data?.actions || [])
      setPagination(data?.pagination || { page: targetPage, limit: 20, total: 0, totalPages: 1 })
    } catch (err) {
      setError(err.message || 'Failed to load administrative audit logs.')
    } finally {
      setLoading(false)
    }
  }, [actionTypeFilter, targetEntityFilter, adminIdFilter, targetIdFilter, startDateFilter, endDateFilter, sortOrder])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  useEffect(() => {
    fetchActivities(1)
  }, [fetchActivities])

  const handleClearFilters = () => {
    setActionTypeFilter('ALL')
    setTargetEntityFilter('ALL')
    setAdminIdFilter('')
    setTargetIdFilter('')
    setStartDateFilter('')
    setEndDateFilter('')
    setSortOrder('desc')
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.page) {
      fetchActivities(newPage)
    }
  }

  const hasActiveFilters =
    actionTypeFilter !== 'ALL' ||
    targetEntityFilter !== 'ALL' ||
    adminIdFilter.trim() !== '' ||
    targetIdFilter.trim() !== '' ||
    startDateFilter !== '' ||
    endDateFilter !== '' ||
    sortOrder !== 'desc'

  const startRecord = (pagination.page - 1) * pagination.limit + (pagination.total > 0 ? 1 : 0)
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total)

  const byActionType = summary?.byActionType || {}
  const byTargetEntity = summary?.byTargetEntity || {}
  const topAdmins = summary?.topAdministrators || []
  const totalSummaryActions = summary?.totalActions || 1

  return (
    <div className="adm-activity-page">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <header className="adm-header">
        <div>
          <div className="adm-header-title-row">
            <h1 className="adm-page-title">Admin Activity & Audit Logs</h1>
            {summary && (
              <span className="adm-badge adm-badge-users-count">
                {summary.totalActions} Total Action{summary.totalActions === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <p className="adm-page-subtitle">
            Immutable chronological audit trail recording all administrative mutations, article reviews, user suspensions, and report resolutions.
          </p>
        </div>

        <button
          type="button"
          className="button button-outline button-small"
          onClick={() => {
            fetchSummary()
            fetchActivities(pagination.page)
          }}
          disabled={loading}
          aria-label="Refresh audit logs"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {loading ? 'Refreshing…' : 'Refresh Logs'}
        </button>
      </header>

      {/* ── Summary Overview Metrics ───────────────────────────────────── */}
      {summary && (
        <section className="adm-section" aria-labelledby="section-summary-overview">
          <div className="adm-stat-group">
            <div className="adm-stat-card adm-stat-accent-blue">
              <span className="adm-stat-label">Total Actions</span>
              <strong className="adm-stat-value">{formatINNumber(summary.totalActions)}</strong>
              <span className="adm-stat-sub">Lifetime logged</span>
            </div>

            <div className="adm-stat-card adm-stat-accent-green">
              <span className="adm-stat-label">Last 7 Days</span>
              <strong className="adm-stat-value">{formatINNumber(summary.activityLast7Days)}</strong>
              <span className="adm-stat-sub">Recent activity</span>
            </div>

            <div className="adm-stat-card adm-stat-accent-orange">
              <span className="adm-stat-label">Last 30 Days</span>
              <strong className="adm-stat-value">{formatINNumber(summary.activityLast30Days)}</strong>
              <span className="adm-stat-sub">Monthly activity</span>
            </div>

            <div className="adm-stat-card adm-stat-accent-muted">
              <span className="adm-stat-label">Active Administrators</span>
              <strong className="adm-stat-value">{topAdmins.length}</strong>
              <span className="adm-stat-sub">Logged actions</span>
            </div>
          </div>

          {/* Grouped Breakdowns Panel */}
          <div className="adm-audit-breakdowns-grid">
            {/* By Action Type */}
            {Object.keys(byActionType).length > 0 && (
              <div className="adm-breakdown-panel">
                <h3 className="adm-breakdown-title">Actions by Type</h3>
                {Object.entries(byActionType).map(([actType, count]) => {
                  const pct = Math.round((count / totalSummaryActions) * 100)
                  return (
                    <div key={actType} className="adm-breakdown-row">
                      <div className="adm-breakdown-meta" style={{ width: '180px' }}>
                        <span className="adm-breakdown-label">{ACTION_LABELS[actType] || actType}</span>
                        <span className="adm-breakdown-count">{count}</span>
                      </div>
                      <div className="adm-breakdown-track">
                        <div className="adm-breakdown-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="adm-breakdown-pct">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* By Target Entity */}
            {Object.keys(byTargetEntity).length > 0 && (
              <div className="adm-breakdown-panel">
                <h3 className="adm-breakdown-title">Actions by Target Entity</h3>
                {Object.entries(byTargetEntity).map(([entity, count]) => {
                  const pct = Math.round((count / totalSummaryActions) * 100)
                  return (
                    <div key={entity} className="adm-breakdown-row">
                      <div className="adm-breakdown-meta" style={{ width: '140px' }}>
                        <span className="adm-breakdown-label">{entity}</span>
                        <span className="adm-breakdown-count">{count}</span>
                      </div>
                      <div className="adm-breakdown-track">
                        <div className="adm-breakdown-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="adm-breakdown-pct">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Top Administrators */}
            {topAdmins.length > 0 && (
              <div className="adm-breakdown-panel">
                <h3 className="adm-breakdown-title">Top Administrators</h3>
                {topAdmins.slice(0, 5).map((admItem) => {
                  const pct = Math.round((admItem.actionCount / totalSummaryActions) * 100)
                  return (
                    <div key={admItem.adminId} className="adm-breakdown-row">
                      <div className="adm-breakdown-meta" style={{ width: '160px' }}>
                        <span className="adm-breakdown-label">{admItem.admin?.name || admItem.adminId.slice(0, 10)}</span>
                        <span className="adm-breakdown-count">{admItem.actionCount}</span>
                      </div>
                      <div className="adm-breakdown-track">
                        <div className="adm-breakdown-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="adm-breakdown-pct">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Error Banner with Retry ────────────────────────────────────── */}
      {error && (
        <div className="adm-error-banner" role="alert">
          <span className="adm-error-icon" aria-hidden="true">⚠️</span>
          <span className="adm-error-msg">{error}</span>
          <button
            type="button"
            className="button button-outline button-small"
            onClick={() => fetchActivities(pagination.page)}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Filter Toolbar ─────────────────────────────────────────────── */}
      <div className="adm-filter-toolbar">
        {/* Action Type Filter */}
        <div className="adm-filter-group">
          <label htmlFor="filter-action-type" className="adm-filter-label">Action:</label>
          <select
            id="filter-action-type"
            className="adm-select"
            value={actionTypeFilter}
            onChange={(e) => setActionTypeFilter(e.target.value)}
          >
            <option value="ALL">All Actions</option>
            <option value="ARTICLE_APPROVED">Approved Article</option>
            <option value="ARTICLE_REJECTED">Rejected Article</option>
            <option value="USER_SUSPENDED">Suspended User</option>
            <option value="USER_ACTIVATED">Activated User</option>
            <option value="USER_ROLE_CHANGED">Changed User Role</option>
            <option value="REPORT_RESOLVED">Resolved Report</option>
            <option value="REPORT_DISMISSED">Dismissed Report</option>
          </select>
        </div>

        {/* Target Entity Filter */}
        <div className="adm-filter-group">
          <label htmlFor="filter-target-entity" className="adm-filter-label">Entity:</label>
          <select
            id="filter-target-entity"
            className="adm-select"
            value={targetEntityFilter}
            onChange={(e) => setTargetEntityFilter(e.target.value)}
          >
            <option value="ALL">All Entities</option>
            <option value="Article">Article</option>
            <option value="User">User</option>
            <option value="Report">Report</option>
            <option value="ForumPost">Forum Post</option>
            <option value="Comment">Comment</option>
          </select>
        </div>

        {/* Start Date */}
        <div className="adm-filter-group">
          <label htmlFor="filter-start-date" className="adm-filter-label">From:</label>
          <input
            id="filter-start-date"
            type="date"
            className="adm-select"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
            aria-label="Filter from start date"
          />
        </div>

        {/* End Date */}
        <div className="adm-filter-group">
          <label htmlFor="filter-end-date" className="adm-filter-label">To:</label>
          <input
            id="filter-end-date"
            type="date"
            className="adm-select"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
            aria-label="Filter to end date"
          />
        </div>

        {/* Target ID Filter */}
        <div className="adm-filter-group" style={{ flex: '1', minWidth: '150px' }}>
          <input
            type="text"
            className="adm-select"
            style={{ width: '100%' }}
            placeholder="Target ID…"
            value={targetIdFilter}
            onChange={(e) => setTargetIdFilter(e.target.value)}
            aria-label="Filter by Target ID"
          />
        </div>

        {/* Sort Order */}
        <div className="adm-filter-group">
          <label htmlFor="sort-activity-order" className="adm-filter-label">Sort:</label>
          <select
            id="sort-activity-order"
            className="adm-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            className="button button-outline button-small adm-clear-filters-btn"
            onClick={handleClearFilters}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ── Audit Logs Table ───────────────────────────────────────────── */}
      <div className="adm-table-card">
        {loading ? (
          <div className="adm-table-skeleton" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="adm-table-sk-row">
                <div className="adm-sk-text" style={{ width: '20%' }} />
                <div className="adm-sk-text" style={{ width: '25%' }} />
                <div className="adm-sk-text" style={{ width: '20%' }} />
                <div className="adm-sk-text" style={{ width: '15%' }} />
                <div className="adm-sk-text" style={{ width: '10%' }} />
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="adm-empty-state" role="status">
            <div className="adm-empty-icon" aria-hidden="true">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <h3 className="adm-empty-title">No Audit Actions Found</h3>
            <p className="adm-empty-desc">
              {hasActiveFilters
                ? 'No administrative actions match the selected filter criteria. Try resetting your filters.'
                : 'No administrative actions have been recorded yet.'}
            </p>
          </div>
        ) : (
          <div className="adm-table-wrapper">
            <table className="adm-table" aria-label="Administrative audit log table">
              <thead>
                <tr>
                  <th scope="col">Action Type</th>
                  <th scope="col">Administrator</th>
                  <th scope="col">Target Entity & ID</th>
                  <th scope="col">Timestamp</th>
                  <th scope="col" className="adm-text-right">Audit Details</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((item) => (
                  <tr key={item.id} className="adm-table-row">
                    <td>
                      <ActionBadge type={item.actionType} />
                    </td>
                    <td>
                      <div className="adm-author-info-cell">
                        <strong className="adm-author-name">{item.admin?.name || 'Administrator'}</strong>
                        <span className="adm-author-email">{item.admin?.email || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="adm-activity-target-cell">
                        <span className="adm-activity-entity-tag">{item.targetEntity}</span>
                        <span className="adm-meta-mono" title={item.targetId}>
                          {item.targetId ? item.targetId.slice(0, 12) + '…' : '—'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="adm-date-cell">
                        {formatTimestamp(item.createdAt)}
                      </span>
                    </td>
                    <td className="adm-text-right">
                      <button
                        type="button"
                        className="button button-outline button-small adm-review-btn"
                        onClick={() => setSelectedActivityId(item.id)}
                        aria-label={`View audit details for action ${item.id}`}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        </svg>
                        Inspect
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
              <strong>{pagination.total}</strong> actions
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

      {/* ── Activity Detail Modal ──────────────────────────────────────── */}
      {selectedActivityId && (
        <ActivityDetailModal
          activityId={selectedActivityId}
          onClose={() => setSelectedActivityId(null)}
        />
      )}
    </div>
  )
}
