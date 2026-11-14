import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation()
  const accent = ACTION_ACCENTS[type] ?? 'muted'
  const label = ACTION_LABELS[type] ? t(`admin.actions.${type}`) : type?.replace(/_/g, ' ') ?? t('common.action')
  return <span className={`adm-action-badge adm-action-badge-${accent}`}>{label}</span>
}

export default function AdminActivity() {
  const { t } = useTranslation();
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
      setError(t('admin.errors.loadActivity'))
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
            <h1 className="adm-page-title">{t('ui.k040')}</h1>
            {summary && (
              <span className="adm-badge adm-badge-users-count">
                {summary.totalActions}{' '}{t('ui.k422')}{summary.totalActions === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <p className="adm-page-subtitle">{t('ui.k204')}</p>
        </div>

        <button
          type="button"
          className="button button-outline button-small"
          onClick={() => {
            fetchSummary()
            fetchActivities(pagination.page)
          }}
          disabled={loading}
          aria-label={t('ui.a030')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {loading ? t('ui.extra.refreshing') : t('ui.extra.refreshLogs')}
        </button>
      </header>

      {/* ── Summary Overview Metrics ───────────────────────────────────── */}
      {loadingSummary && !summary && (
        <section className="adm-section" aria-labelledby="section-summary-overview" aria-busy="true">
          <div className="adm-stat-group">
            <div className="adm-stat-card adm-stat-accent-blue">
              <span className="adm-stat-label">{t('ui.k423')}</span>
              <strong className="adm-stat-value">…</strong>
              <span className="adm-stat-sub">{t('ui.k230')}</span>
            </div>
            <div className="adm-stat-card adm-stat-accent-green">
              <span className="adm-stat-label">{t('ui.k226')}</span>
              <strong className="adm-stat-value">…</strong>
              <span className="adm-stat-sub">{t('ui.k324')}</span>
            </div>
            <div className="adm-stat-card adm-stat-accent-orange">
              <span className="adm-stat-label">{t('ui.k225')}</span>
              <strong className="adm-stat-value">…</strong>
              <span className="adm-stat-sub">{t('ui.k255')}</span>
            </div>
            <div className="adm-stat-card adm-stat-accent-muted">
              <span className="adm-stat-label">{t('ui.k036')}</span>
              <strong className="adm-stat-value">…</strong>
              <span className="adm-stat-sub">{t('ui.k037')}</span>
            </div>
          </div>
        </section>
      )}

      {summary && (
        <section className="adm-section" aria-labelledby="section-summary-overview">
          <div className="adm-stat-group">
            <div className="adm-stat-card adm-stat-accent-blue">
              <span className="adm-stat-label">{t('ui.k423')}</span>
              <strong className="adm-stat-value">{formatINNumber(summary.totalActions)}</strong>
              <span className="adm-stat-sub">{t('ui.k230')}</span>
            </div>

            <div className="adm-stat-card adm-stat-accent-green">
              <span className="adm-stat-label">{t('ui.k226')}</span>
              <strong className="adm-stat-value">{formatINNumber(summary.activityLast7Days)}</strong>
              <span className="adm-stat-sub">{t('ui.k324')}</span>
            </div>

            <div className="adm-stat-card adm-stat-accent-orange">
              <span className="adm-stat-label">{t('ui.k225')}</span>
              <strong className="adm-stat-value">{formatINNumber(summary.activityLast30Days)}</strong>
              <span className="adm-stat-sub">{t('ui.k255')}</span>
            </div>

            <div className="adm-stat-card adm-stat-accent-muted">
              <span className="adm-stat-label">{t('ui.k036')}</span>
              <strong className="adm-stat-value">{formatINNumber(summary.activeAdministrators)}</strong>
              <span className="adm-stat-sub">{t('ui.k037')}</span>
            </div>
          </div>

          {/* Grouped Breakdowns Panel */}
          <div className="adm-audit-breakdowns-grid">
            {/* By Action Type */}
            {Object.keys(byActionType).length > 0 && (
              <div className="adm-breakdown-panel">
                <h3 className="adm-breakdown-title">{t('ui.k033')}</h3>
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
                <h3 className="adm-breakdown-title">{t('ui.k032')}</h3>
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
                <h3 className="adm-breakdown-title">{t('ui.k420')}</h3>
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
          >{t('ui.k353')}</button>
        </div>
      )}

      {/* ── Filter Toolbar ─────────────────────────────────────────────── */}
      <div className="adm-filter-toolbar">
        {/* Action Type Filter */}
        <div className="adm-filter-group">
          <label htmlFor="filter-action-type" className="adm-filter-label">{t('ui.k030')}</label>
          <select
            id="filter-action-type"
            className="adm-select"
            value={actionTypeFilter}
            onChange={(e) => setActionTypeFilter(e.target.value)}
          >
            <option value="ALL">{t('ui.k047')}</option>
            <option value="ARTICLE_APPROVED">{t('ui.k065')}</option>
            <option value="ARTICLE_REJECTED">{t('ui.k330')}</option>
            <option value="USER_SUSPENDED">{t('ui.k404')}</option>
            <option value="USER_ACTIVATED">{t('ui.k034')}</option>
            <option value="USER_ROLE_CHANGED">{t('ui.k109')}</option>
            <option value="REPORT_RESOLVED">{t('ui.k349')}</option>
            <option value="REPORT_DISMISSED">{t('ui.k147')}</option>
          </select>
        </div>

        {/* Target Entity Filter */}
        <div className="adm-filter-group">
          <label htmlFor="filter-target-entity" className="adm-filter-label">{t('ui.k168')}</label>
          <select
            id="filter-target-entity"
            className="adm-select"
            value={targetEntityFilter}
            onChange={(e) => setTargetEntityFilter(e.target.value)}
          >
            <option value="ALL">{t('ui.k051')}</option>
            <option value="Article">{t('ui.k067')}</option>
            <option value="User">{t('ui.k436')}</option>
            <option value="Report">{t('ui.k333')}</option>
            <option value="ForumPost">{t('ui.k184')}</option>
            <option value="Comment">{t('ui.k116')}</option>
          </select>
        </div>

        {/* Start Date */}
        <div className="adm-filter-group">
          <label htmlFor="filter-start-date" className="adm-filter-label">{t('ui.k186')}</label>
          <input
            id="filter-start-date"
            type="date"
            className="adm-select"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
            aria-label={t('ui.a024')}
          />
        </div>

        {/* End Date */}
        <div className="adm-filter-group">
          <label htmlFor="filter-end-date" className="adm-filter-label">{t('ui.k418')}</label>
          <input
            id="filter-end-date"
            type="date"
            className="adm-select"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
            aria-label={t('ui.a025')}
          />
        </div>

        {/* Target ID Filter */}
        <div className="adm-filter-group" style={{ flex: '1', minWidth: '150px' }}>
          <input
            type="text"
            className="adm-select"
            style={{ width: '100%' }}
            placeholder={t('ui.a045')}
            value={targetIdFilter}
            onChange={(e) => setTargetIdFilter(e.target.value)}
            aria-label={t('ui.a022')}
          />
        </div>

        {/* Sort Order */}
        <div className="adm-filter-group">
          <label htmlFor="sort-activity-order" className="adm-filter-label">{t('ui.k386')}</label>
          <select
            id="sort-activity-order"
            className="adm-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="desc">{t('ui.k263')}</option>
            <option value="asc">{t('ui.k283')}</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            className="button button-outline button-small adm-clear-filters-btn"
            onClick={handleClearFilters}
          >{t('ui.k342')}</button>
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
            <h3 className="adm-empty-title">{t('ui.k266')}</h3>
            <p className="adm-empty-desc">
              {hasActiveFilters
                ? 'No administrative actions match the selected filter criteria. Try resetting your filters.'
                : 'No administrative actions have been recorded yet.'}
            </p>
          </div>
        ) : (
          <div className="adm-table-wrapper">
            <table className="adm-table" aria-label={t('ui.a004')}>
              <thead>
                <tr>
                  <th scope="col">{t('ui.k029')}</th>
                  <th scope="col">{t('ui.k043')}</th>
                  <th scope="col">{t('ui.k411')}</th>
                  <th scope="col">{t('ui.k417')}</th>
                  <th scope="col" className="adm-text-right">{t('ui.k080')}</th>
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
                        <strong className="adm-author-name">{item.admin?.name || t('admin.userRoles.ADMIN')}</strong>
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
                        </svg>{t('ui.k209')}</button>
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
            <span className="adm-pagination-info">{t('ui.k381')}<strong>{startRecord}</strong>{' '}{t('ui.k491')}{' '}<strong>{endRecord}</strong>{' '}{t('ui.k486')}{' '}
              <strong>{pagination.total}</strong>{t('ui.k473')}</span>

            <div className="adm-pagination-controls">
              <button
                type="button"
                className="button button-outline button-small"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                aria-label={t('ui.a028')}
              >{t('ui.k501')}</button>

              <span className="adm-page-indicator" aria-current="page">{t('ui.k289')}{pagination.page}{' '}{t('ui.k486')}{' '}{pagination.totalPages}
              </span>

              <button
                type="button"
                className="button button-outline button-small"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                aria-label={t('ui.a027')}
              >{t('ui.k265')}</button>
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
