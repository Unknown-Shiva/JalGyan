/**
 * AdminComingSoon — shared placeholder for admin sub-pages not yet implemented.
 * Shows a clear "coming soon" state rather than a blank or broken page.
 */
export default function AdminComingSoon({ title, description }) {
  return (
    <div className="adm-coming-soon" role="status">
      <div className="adm-coming-icon" aria-hidden="true">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <h2 className="adm-coming-title">{title}</h2>
      <p className="adm-coming-desc">{description ?? 'This section is under development and will be available soon.'}</p>
      <span className="adm-coming-badge">Coming in a future phase</span>
    </div>
  )
}
