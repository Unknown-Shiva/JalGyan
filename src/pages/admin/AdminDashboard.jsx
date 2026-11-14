import { useTranslation } from 'react-i18next';
import { useEffect, useState, useCallback } from 'react'
import { apiRequest } from '../../services/api'
import StatCard from '../../components/admin/StatCard'
import ActivityFeed from '../../components/admin/ActivityFeed'
import WaterConservationSection from '../../components/admin/WaterConservationSection'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINNumber(n) {
  if (n == null || isNaN(n)) return '0'
  return new Intl.NumberFormat('en-IN').format(Math.round(n))
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="adm-stat-card adm-skeleton" aria-hidden="true">
      <div className="adm-sk-label" />
      <div className="adm-sk-value" />
      <div className="adm-sk-sub" />
    </div>
  )
}

function SkeletonSection({ cards = 4 }) {
  return (
    <div className="adm-stat-group">
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

// ─── Error Banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }) {
  const { t } = useTranslation();
  return (
    <div className="adm-error-banner" role="alert">
      <span className="adm-error-icon" aria-hidden="true">⚠️</span>
      <span className="adm-error-msg">{message || 'Failed to load dashboard statistics.'}</span>
      <button className="button button-outline button-small" onClick={onRetry}>{t('ui.k353')}</button>
    </div>
  )
}

// ─── Main AdminDashboard Component ───────────────────────────────────────────

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest('/admin/dashboard/stats')
      setStats(data)
    } catch (err) {
      setError(t('admin.errors.loadDashboard'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const u = stats?.users
  const a = stats?.articles
  const c = stats?.community
  const r = stats?.reports
  const w = stats?.waterConservation
  const activity = stats?.recentAdminActivity ?? []

  return (
    <div className="adm-dashboard-page">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="adm-header">
        <div>
          <h1 className="adm-page-title">{t('ui.k041')}</h1>
          <p className="adm-page-subtitle">{t('ui.k298')}</p>
        </div>
        <button
          className="button button-outline button-small"
          onClick={fetchStats}
          aria-label={t('ui.a031')}
          disabled={loading}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {loading ? t('ui.extra.refreshing') : t('ui.extra.refresh')}
        </button>
      </header>

      {/* ── Error Banner with Retry ──────────────────────────────────────── */}
      {error && <ErrorBanner message={error} onRetry={fetchStats} />}

      {/* ── User Statistics ──────────────────────────────────────────────── */}
      <section className="adm-section" aria-labelledby="section-users">
        <h2 className="adm-section-title" id="section-users">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>{t('ui.k441')}</h2>
        {loading ? (
          <SkeletonSection cards={4} />
        ) : (
          <div className="adm-stat-group">
            <StatCard label={t('admin.dashboard.totalUsers')} value={u?.total} loading={loading} />
            <StatCard label={t('admin.dashboard.activeUsers')} value={u?.active} loading={loading} accent="green" />
            <StatCard label={t('admin.dashboard.suspendedUsers')} value={u?.suspended} loading={loading} accent="orange" />
            <StatCard label={t('admin.dashboard.newUsersWeek')} value={u?.newInLast7Days} loading={loading} accent="blue" sub={t('admin.dashboard.registeredLast7')} />
          </div>
        )}
      </section>

      {/* ── Article Statistics ───────────────────────────────────────────── */}
      <section className="adm-section" aria-labelledby="section-articles">
        <h2 className="adm-section-title" id="section-articles">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <line x1="16" y1="13" x2="8" y2="13" />
          </svg>{t('ui.k071')}</h2>
        {loading ? (
          <SkeletonSection cards={4} />
        ) : (
          <div className="adm-stat-group">
            <StatCard label={t('admin.dashboard.totalArticles')} value={a?.total} loading={loading} />
            <StatCard label={t('admin.dashboard.published')} value={a?.published} loading={loading} accent="green" />
            <StatCard label={t('admin.dashboard.pendingReview')} value={a?.pendingReview} loading={loading} accent="orange" />
            <StatCard label={t('admin.dashboard.rejected')} value={a?.rejected} loading={loading} accent="red" />
          </div>
        )}
      </section>

      {/* ── Community Statistics ─────────────────────────────────────────── */}
      <section className="adm-section" aria-labelledby="section-community">
        <h2 className="adm-section-title" id="section-community">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>{t('ui.k119')}</h2>
        {loading ? (
          <SkeletonSection cards={3} />
        ) : (
          <div className="adm-stat-group">
            <StatCard label={t('admin.dashboard.forumPosts')} value={c?.totalPosts} loading={loading} />
            <StatCard label={t('admin.dashboard.comments')} value={c?.totalComments} loading={loading} />
            <StatCard label={t('admin.dashboard.totalVotes')} value={c?.totalVotes} loading={loading} />
          </div>
        )}
      </section>

      {/* ── Report Statistics ────────────────────────────────────────────── */}
      <section className="adm-section" aria-labelledby="section-reports">
        <h2 className="adm-section-title" id="section-reports">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>{t('ui.k126')}</h2>
        {loading ? (
          <SkeletonSection cards={4} />
        ) : (
          <div className="adm-stat-group">
            <StatCard label={t('admin.dashboard.totalReports')} value={r?.total} loading={loading} />
            <StatCard label={t('admin.dashboard.pending')} value={r?.pending} loading={loading} accent="orange" />
            <StatCard label={t('admin.dashboard.resolved')} value={r?.resolved} loading={loading} accent="green" />
            <StatCard label={t('admin.dashboard.dismissed')} value={r?.dismissed} loading={loading} accent="muted" />
          </div>
        )}
      </section>

      {/* ── Water Conservation Section ───────────────────────────────────── */}
      <WaterConservationSection data={w} loading={loading} formatINNumber={formatINNumber} />

      {/* ── Recent Administrative Activity ──────────────────────────────── */}
      <ActivityFeed activity={activity} loading={loading} />
    </div>
  )
}
