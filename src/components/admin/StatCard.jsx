/**
 * StatCard — single metric card for the admin dashboard.
 * Props:
 *   label   {string}  — metric label
 *   value   {number}  — numeric value to display
 *   loading {boolean} — show skeleton
 *   accent  {string}  — 'green' | 'orange' | 'red' | 'blue' | 'muted'
 *   sub     {string}  — optional secondary label
 */
export default function StatCard({ label, value, loading = false, accent, sub }) {
  const formatted =
    value == null || isNaN(value)
      ? '—'
      : new Intl.NumberFormat('en-IN').format(value)

  const accentClass = accent ? ` adm-stat-accent-${accent}` : ''

  if (loading) {
    return (
      <div className="adm-stat-card adm-skeleton" aria-hidden="true">
        <div className="adm-sk-label" />
        <div className="adm-sk-value" />
        {sub && <div className="adm-sk-sub" />}
      </div>
    )
  }

  return (
    <div className={`adm-stat-card${accentClass}`}>
      <span className="adm-stat-label">{label}</span>
      <strong className="adm-stat-value" aria-label={`${label}: ${formatted}`}>
        {formatted}
      </strong>
      {sub && <span className="adm-stat-sub">{sub}</span>}
    </div>
  )
}
