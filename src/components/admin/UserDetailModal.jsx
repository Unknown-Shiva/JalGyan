import { useEffect, useState, useCallback } from 'react'
import { adminService } from '../../services/adminService'
import { useAuth } from '../../hooks/useAuth'

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

export default function UserDetailModal({
  userId,
  onClose,
  onUserUpdated,
}) {
  const { user: currentAdmin } = useAuth()
  const [userDetails, setUserDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Action states
  const [activeAction, setActiveAction] = useState(null) // 'suspend' | 'activate' | 'role' | null
  const [actionReason, setActionReason] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)

  const isSelf = currentAdmin?.id === userId

  const loadUserDetails = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getUserById(userId)
      setUserDetails(data?.user || data)
    } catch (err) {
      setError(err.message || 'Failed to load user details.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadUserDetails()
  }, [loadUserDetails])

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

  // Handle Suspend
  const handleSuspend = async (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setActionError(null)

    try {
      const res = await adminService.suspendUser(userId, { reason: actionReason.trim() || undefined })
      setActionSuccess('User account suspended successfully.')
      const updated = res?.user || { ...userDetails, status: 'SUSPENDED' }
      setUserDetails((prev) => ({ ...prev, ...updated, status: 'SUSPENDED' }))
      setActiveAction(null)
      setActionReason('')
      if (onUserUpdated) onUserUpdated({ id: userId, status: 'SUSPENDED' })
    } catch (err) {
      setActionError(err.message || 'Failed to suspend user.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Activate
  const handleActivate = async (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setActionError(null)

    try {
      const res = await adminService.activateUser(userId, { reason: actionReason.trim() || undefined })
      setActionSuccess('User account reactivated successfully.')
      const updated = res?.user || { ...userDetails, status: 'ACTIVE' }
      setUserDetails((prev) => ({ ...prev, ...updated, status: 'ACTIVE' }))
      setActiveAction(null)
      setActionReason('')
      if (onUserUpdated) onUserUpdated({ id: userId, status: 'ACTIVE' })
    } catch (err) {
      setActionError(err.message || 'Failed to activate user.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Role Change
  const handleRoleChange = async (e) => {
    e.preventDefault()
    if (submitting || !targetRole) return
    setSubmitting(true)
    setActionError(null)

    try {
      const res = await adminService.updateUserRole(userId, { role: targetRole })
      setActionSuccess(`User role successfully updated to ${targetRole}.`)
      const updated = res?.user || { ...userDetails, role: targetRole }
      setUserDetails((prev) => ({ ...prev, ...updated, role: targetRole }))
      setActiveAction(null)
      setTargetRole('')
      if (onUserUpdated) onUserUpdated({ id: userId, role: targetRole })
    } catch (err) {
      setActionError(err.message || 'Failed to update user role.')
    } finally {
      setSubmitting(false)
    }
  }

  const counts = userDetails?.activityCounts || {}

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
        aria-labelledby="user-detail-title"
      >
        {/* ── Modal Header ──────────────────────────────────────────────── */}
        <div className="adm-modal-header">
          <div className="adm-modal-title-group">
            <h2 id="user-detail-title" className="adm-modal-title">
              {userDetails?.name || 'User Profile & Activity'}
            </h2>
            {userDetails?.role && (
              <span className={`adm-role-badge adm-role-${userDetails.role.toLowerCase()}`}>
                {userDetails.role}
              </span>
            )}
            {userDetails?.status && (
              <span className={`adm-user-status-pill adm-status-${userDetails.status.toLowerCase()}`}>
                {userDetails.status}
              </span>
            )}
            {isSelf && (
              <span className="adm-badge" title="You are currently signed in as this administrator">
                You
              </span>
            )}
          </div>
          <button
            type="button"
            className="adm-modal-close"
            onClick={onClose}
            aria-label="Close user details"
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
              <div className="adm-sk-label" style={{ width: '40%' }} />
              <div className="adm-sk-value" style={{ width: '70%', height: '32px' }} />
              <div className="adm-sk-sub" style={{ width: '100%', height: '90px', marginTop: '16px' }} />
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
                onClick={loadUserDetails}
              >
                Retry
              </button>
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

          {!loading && userDetails && (
            <div className="adm-detail-content">
              {/* Identity & Profile Grid */}
              <div className="adm-detail-meta-grid">
                <div className="adm-detail-meta-item">
                  <span className="adm-meta-label">Full Name</span>
                  <strong className="adm-author-name">{userDetails.name}</strong>
                </div>

                <div className="adm-detail-meta-item">
                  <span className="adm-meta-label">Email Address</span>
                  <span className="adm-author-email">{userDetails.email}</span>
                </div>

                <div className="adm-detail-meta-item">
                  <span className="adm-meta-label">Registered Since</span>
                  <span>{formatDate(userDetails.createdAt)}</span>
                </div>

                <div className="adm-detail-meta-item">
                  <span className="adm-meta-label">Location</span>
                  <span>{userDetails.location || 'Not specified'}</span>
                </div>
              </div>

              {/* Bio if present */}
              {userDetails.bio && (
                <div className="adm-author-bio-box">
                  <span className="adm-meta-label">User Biography</span>
                  <p>{userDetails.bio}</p>
                </div>
              )}

              {/* Aggregated Platform Activity Counts */}
              <div className="adm-detail-section">
                <h3 className="adm-section-heading">Platform Activity Breakdown</h3>
                <div className="adm-activity-counts-grid">
                  <div className="adm-activity-count-card">
                    <span className="adm-act-icon">📝</span>
                    <strong className="adm-act-num">{counts.articlesAuthored ?? 0}</strong>
                    <span className="adm-act-label">Articles Authored</span>
                  </div>

                  <div className="adm-activity-count-card">
                    <span className="adm-act-icon">💬</span>
                    <strong className="adm-act-num">{counts.postsCreated ?? 0}</strong>
                    <span className="adm-act-label">Forum Posts</span>
                  </div>

                  <div className="adm-activity-count-card">
                    <span className="adm-act-icon">🗨️</span>
                    <strong className="adm-act-num">{counts.commentsCreated ?? counts.commentsWritten ?? 0}</strong>
                    <span className="adm-act-label">Comments Written</span>
                  </div>

                  <div className="adm-activity-count-card">
                    <span className="adm-act-icon">💧</span>
                    <strong className="adm-act-num">{counts.calculationsPerformed ?? counts.waterCalculationsRecorded ?? 0}</strong>
                    <span className="adm-act-label">Water Calculations</span>
                  </div>

                  <div className="adm-activity-count-card">
                    <span className="adm-act-icon">🚩</span>
                    <strong className="adm-act-num">{counts.reportsSubmitted ?? 0}</strong>
                    <span className="adm-act-label">Reports Filed</span>
                  </div>
                </div>
              </div>

              {/* ── Administrative Actions Section ──────────────────────── */}
              <div className="adm-moderation-actions-panel">
                <h3 className="adm-section-heading">Account Controls & Role Management</h3>

                {isSelf && (
                  <p className="adm-self-note" role="note">
                    ℹ️ You are viewing your own administrator account. Self-suspension and self-demotion are prohibited by platform security rules.
                  </p>
                )}

                {activeAction === null && (
                  <div className="adm-action-buttons-row">
                    {/* Suspend or Activate button */}
                    {userDetails.status === 'ACTIVE' ? (
                      <button
                        type="button"
                        className="button adm-button-danger button-small"
                        onClick={() => {
                          setActiveAction('suspend')
                          setActionError(null)
                          setActionReason('')
                        }}
                        disabled={isSelf}
                        title={isSelf ? 'Cannot suspend your own account' : 'Suspend account'}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                        </svg>
                        Suspend User
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button button-primary button-small"
                        onClick={() => {
                          setActiveAction('activate')
                          setActionError(null)
                          setActionReason('')
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Reactivate User
                      </button>
                    )}

                    {/* Change Role Button */}
                    <button
                      type="button"
                      className="button button-outline button-small"
                      onClick={() => {
                        setActiveAction('role')
                        setActionError(null)
                        setTargetRole(userDetails.role === 'ADMIN' ? 'USER' : 'ADMIN')
                      }}
                      disabled={isSelf}
                      title={isSelf ? 'Cannot demote your own administrator account' : 'Modify user role'}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      {userDetails.role === 'ADMIN' ? 'Demote to USER' : 'Promote to ADMIN'}
                    </button>
                  </div>
                )}

                {/* ── Suspend Confirmation Form ───────────────────────────── */}
                {activeAction === 'suspend' && (
                  <form onSubmit={handleSuspend} className="adm-action-form adm-reject-form">
                    <h4 className="adm-form-title adm-text-danger">Confirm Account Suspension</h4>
                    <p className="adm-form-desc">
                      Suspending <strong>{userDetails.name}</strong> ({userDetails.email}) will immediately revoke their access and invalidate their login sessions.
                    </p>

                    <label className="adm-form-label">
                      Suspension Reason (Optional)
                      <textarea
                        className="adm-textarea"
                        rows="2"
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        placeholder="e.g., Repeated violations of platform content guidelines."
                        disabled={submitting}
                      />
                    </label>

                    <div className="adm-form-actions">
                      <button
                        type="button"
                        className="button button-outline button-small"
                        onClick={() => setActiveAction(null)}
                        disabled={submitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="button adm-button-danger button-small"
                        disabled={submitting}
                      >
                        {submitting ? 'Suspending…' : 'Confirm Suspension'}
                      </button>
                    </div>
                  </form>
                )}

                {/* ── Activate Confirmation Form ─────────────────────────── */}
                {activeAction === 'activate' && (
                  <form onSubmit={handleActivate} className="adm-action-form adm-approve-form">
                    <h4 className="adm-form-title">Confirm Account Reactivation</h4>
                    <p className="adm-form-desc">
                      Reactivating <strong>{userDetails.name}</strong> will restore their login access and allow participation in community forums and calculations.
                    </p>

                    <label className="adm-form-label">
                      Reactivation Note (Optional)
                      <textarea
                        className="adm-textarea"
                        rows="2"
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        placeholder="e.g., Account restored following review of submitted appeal."
                        disabled={submitting}
                      />
                    </label>

                    <div className="adm-form-actions">
                      <button
                        type="button"
                        className="button button-outline button-small"
                        onClick={() => setActiveAction(null)}
                        disabled={submitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="button button-primary button-small"
                        disabled={submitting}
                      >
                        {submitting ? 'Reactivating…' : 'Confirm Reactivation'}
                      </button>
                    </div>
                  </form>
                )}

                {/* ── Role Update Confirmation Form ──────────────────────── */}
                {activeAction === 'role' && (
                  <form onSubmit={handleRoleChange} className="adm-action-form adm-approve-form">
                    <h4 className="adm-form-title">
                      {targetRole === 'ADMIN' ? 'Promote User to Administrator' : 'Demote Administrator to Standard User'}
                    </h4>
                    <p className="adm-form-desc">
                      {targetRole === 'ADMIN' ? (
                        <>Granting administrator privileges to <strong>{userDetails.name}</strong> will give them full access to moderation, user controls, and system statistics.</>
                      ) : (
                        <>Demoting <strong>{userDetails.name}</strong> to standard user will revoke all administrative dashboard access and moderation permissions.</>
                      )}
                    </p>

                    <div className="adm-form-actions">
                      <button
                        type="button"
                        className="button button-outline button-small"
                        onClick={() => setActiveAction(null)}
                        disabled={submitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className={`button ${targetRole === 'ADMIN' ? 'button-primary' : 'adm-button-danger'} button-small`}
                        disabled={submitting}
                      >
                        {submitting ? 'Updating Role…' : `Confirm Change to ${targetRole}`}
                      </button>
                    </div>
                  </form>
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
            disabled={submitting}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
