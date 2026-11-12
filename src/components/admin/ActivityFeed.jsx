/**
 * ActivityFeed — recent administrative action log.
 */

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

function ActivityRow({ item }) {
  return (
    <tr className="adm-activity-row">
      <td className="adm-activity-action">
        <ActionBadge type={item.actionType} />
      </td>
      <td className="adm-activity-target">
        <span className="adm-activity-entity">{item.targetEntity ?? '—'}</span>
        {item.targetId && (
          <span className="adm-activity-id" title={item.targetId}>
            {item.targetId.slice(0, 8)}…
          </span>
        )}
      </td>
      <td className="adm-activity-admin">
        <span className="adm-activity-name">{item.admin?.name ?? '—'}</span>
        {item.admin?.email && (
          <span className="adm-activity-email">{item.admin.email}</span>
        )}
      </td>
      <td className="adm-activity-time">
        <time dateTime={item.timestamp}>{formatTimestamp(item.timestamp)}</time>
      </td>
    </tr>
  )
}

export default function ActivityFeed({ activity = [], loading }) {
  return (
    <section className="adm-section" aria-labelledby="section-activity">
      <h2 className="adm-section-title" id="section-activity">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        Recent Administrative Activity
      </h2>

      {loading ? (
        <div className="adm-activity-skeleton" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="adm-activity-sk-row">
              <div className="adm-sk-badge" />
              <div className="adm-sk-text" />
              <div className="adm-sk-text adm-sk-text-sm" />
              <div className="adm-sk-text adm-sk-text-sm" />
            </div>
          ))}
        </div>
      ) : activity.length === 0 ? (
        <div className="adm-empty-activity" role="status">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" style={{ color: 'var(--muted)', marginBottom: 10 }}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p>No administrative actions recorded yet.</p>
        </div>
      ) : (
        <div className="adm-activity-table-wrap">
          <table className="adm-activity-table">
            <thead>
              <tr>
                <th scope="col">Action</th>
                <th scope="col">Target</th>
                <th scope="col">Administrator</th>
                <th scope="col">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {activity.map(item => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
