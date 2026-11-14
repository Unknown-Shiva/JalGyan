import { useTranslation } from 'react-i18next';
import { useEffect, useState, useCallback, useRef } from 'react'
import { adminService } from '../../services/adminService'
import UserDetailModal from '../../components/admin/UserDetailModal'

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

export default function UserManagement() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState(null)

  // Filters & Sorting state
  const [searchInput, setSearchInput] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')

  // Debounce search input
  const searchTimeoutRef = useRef(null)

  const fetchUsers = useCallback(async (targetPage = 1) => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getUsers({
        page: targetPage,
        limit: 10,
        search: activeSearch,
        role: roleFilter,
        status: statusFilter,
        sortBy,
        sortOrder,
      })
      setUsers(data?.users || [])
      setPagination(data?.pagination || { page: targetPage, limit: 10, total: 0, totalPages: 1 })
    } catch (err) {
      setError(t('admin.errors.loadUsers'))
    } finally {
      setLoading(false)
    }
  }, [activeSearch, roleFilter, statusFilter, sortBy, sortOrder])

  // Fetch when filters change
  useEffect(() => {
    fetchUsers(1)
  }, [fetchUsers])

  // Handle live search with 350ms debounce
  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearchInput(val)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setActiveSearch(val.trim())
    }, 350)
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.page) {
      fetchUsers(newPage)
    }
  }

  const handleUserUpdated = ({ id, status, role }) => {
    let msg = t('admin.notifications.userUpdated')
    if (status === 'SUSPENDED') msg = t('admin.notifications.userSuspended')
    else if (status === 'ACTIVE') msg = t('admin.notifications.userReactivated')
    else if (role) msg = t('admin.notifications.userRoleChanged', { role: t(`admin.userRoles.${role}`, { defaultValue: role }) })

    setNotification({ type: 'success', message: msg })
    // Refresh user list
    fetchUsers(pagination.page)

    setTimeout(() => {
      setNotification(null)
    }, 4500)
  }

  const startRecord = (pagination.page - 1) * pagination.limit + (pagination.total > 0 ? 1 : 0)
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <div className="adm-users-page">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <header className="adm-header">
        <div>
          <div className="adm-header-title-row">
            <h1 className="adm-page-title">{t('ui.k440')}</h1>
            {pagination.total > 0 && (
              <span className="adm-badge adm-badge-users-count">
                {pagination.total}{' '}{t('ui.k328')}{pagination.total === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <p className="adm-page-subtitle">{t('ui.k452')}</p>
        </div>

        <button
          type="button"
          className="button button-outline button-small"
          onClick={() => fetchUsers(pagination.page)}
          disabled={loading}
          aria-label={t('ui.a034')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {loading ? t('ui.extra.refreshing') : t('ui.extra.refresh')}
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
            aria-label={t('ui.a021')}
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
            onClick={() => fetchUsers(pagination.page)}
          >{t('ui.k353')}</button>
        </div>
      )}

      {/* ── Filter & Search Toolbar ────────────────────────────────────── */}
      <div className="adm-filter-toolbar">
        {/* Search */}
        <div className="adm-search-input-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className="adm-search-icon">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            className="adm-search-input"
            placeholder={t('ui.a039')}
            value={searchInput}
            onChange={handleSearchChange}
            aria-label={t('ui.a042')}
          />
          {searchInput && (
            <button
              type="button"
              className="adm-search-clear"
              onClick={() => {
                setSearchInput('')
                setActiveSearch('')
              }}
              aria-label={t('ui.a010')}
            >
              ×
            </button>
          )}
        </div>

        {/* Role Filter */}
        <div className="adm-filter-group">
          <label htmlFor="filter-role" className="adm-filter-label">{t('ui.k364')}</label>
          <select
            id="filter-role"
            className="adm-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">{t('ui.k054')}</option>
            <option value="USER">{t('ui.k430')}</option>
            <option value="ADMIN">{t('ui.k021')}</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="adm-filter-group">
          <label htmlFor="filter-status" className="adm-filter-label">{t('ui.k392')}</label>
          <select
            id="filter-status"
            className="adm-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">{t('ui.k055')}</option>
            <option value="ACTIVE">{t('ui.k035')}</option>
            <option value="SUSPENDED">{t('ui.k403')}</option>
          </select>
        </div>

        {/* Sort Controls */}
        <div className="adm-filter-group">
          <label htmlFor="sort-by" className="adm-filter-label">{t('ui.k386')}</label>
          <select
            id="sort-by"
            className="adm-select"
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split(':')
              setSortBy(sb)
              setSortOrder(so)
            }}
          >
            <option value="createdAt:desc">{t('ui.k263')}</option>
            <option value="createdAt:asc">{t('ui.k283')}</option>
            <option value="name:asc">{t('ui.k259')}</option>
            <option value="name:desc">{t('ui.k260')}</option>
          </select>
        </div>
      </div>

      {/* ── User Table & Mobile Cards ──────────────────────────────────── */}
      <div className="adm-table-card">
        {loading ? (
          <div className="adm-table-skeleton" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="adm-table-sk-row">
                <div className="adm-sk-text" style={{ width: '30%' }} />
                <div className="adm-sk-text" style={{ width: '25%' }} />
                <div className="adm-sk-text" style={{ width: '15%' }} />
                <div className="adm-sk-text" style={{ width: '15%' }} />
                <div className="adm-sk-text" style={{ width: '10%' }} />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="adm-empty-state" role="status">
            <div className="adm-empty-icon" aria-hidden="true">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="adm-empty-title">{t('ui.k268')}</h3>
            <p className="adm-empty-desc">
              {activeSearch || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'No users match the selected search and filter criteria. Try adjusting your filters.'
                : 'No registered user accounts found in the database.'}
            </p>
          </div>
        ) : (
          <div className="adm-table-wrapper">
            <table className="adm-table" aria-label={t('ui.a035')}>
              <thead>
                <tr>
                  <th scope="col" style={{ minWidth: '220px' }}>{t('ui.k439')}</th>
                  <th scope="col">{t('ui.k363')}</th>
                  <th scope="col">{t('ui.k391')}</th>
                  <th scope="col">{t('ui.k239')}</th>
                  <th scope="col">{t('ui.k210')}</th>
                  <th scope="col" className="adm-text-right">{t('ui.k031')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="adm-table-row">
                    <td>
                      <div className="adm-user-cell">
                        <strong className="adm-user-name">{u.name}</strong>
                        <span className="adm-user-email">{u.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`adm-role-badge adm-role-${(u.role || '').toLowerCase()}`}>
                        {t(`admin.userRoles.${u.role}`, { defaultValue: u.role })}
                      </span>
                    </td>
                    <td>
                      <span className={`adm-user-status-pill adm-status-${(u.status || '').toLowerCase()}`}>
                        {t(`admin.userStatus.${u.status}`, { defaultValue: u.status })}
                      </span>
                    </td>
                    <td>
                      <span className="adm-meta-desc">
                        {u.location || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="adm-date-cell">
                        {formatDate(u.createdAt)}
                      </span>
                    </td>
                    <td className="adm-text-right">
                      <button
                        type="button"
                        className="button button-outline button-small adm-review-btn"
                        onClick={() => setSelectedUserId(u.id)}
                        aria-label={`View profile and manage ${u.name}`}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>{t('ui.k244')}</button>
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
              <strong>{pagination.total}</strong>{t('ui.k495')}</span>

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

      {/* ── User Detail & Action Modal ─────────────────────────────────── */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUserUpdated={handleUserUpdated}
        />
      )}
    </div>
  )
}
