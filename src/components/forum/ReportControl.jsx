import { useEffect, useRef, useState } from 'react'
import { Flag } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { REPORT_REASONS, submitReport } from '../../services/reportService'

function feedbackFor(error) {
  if (error?.status === 400) return error.message || 'Check the report details and try again.'
  if (error?.status === 401) return 'Your session has expired. Please sign in again.'
  if (error?.status === 404) return 'This content is no longer available to report.'
  return 'We could not submit your report. Please try again.'
}

export default function ReportControl({ targetType, targetId, targetLabel = 'content' }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const submittingRef = useRef(false)

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = event => {
      if (event.key === 'Escape' && !submittingRef.current) close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const close = () => {
    if (submittingRef.current) return
    setOpen(false)
    setReason('')
    setDescription('')
    setError('')
    setSubmitted(false)
  }

  const startReport = event => {
    event.preventDefault()
    event.stopPropagation()
    if (!user) {
      navigate('/login')
      return
    }
    setOpen(true)
    setReason('')
    setDescription('')
    setError('')
    setSubmitted(false)
  }

  const submit = async event => {
    event.preventDefault()
    if (submittingRef.current || !reason) return
    submittingRef.current = true
    setSubmitting(true)
    setError('')
    try {
      await submitReport({ targetType, targetId, reason, description })
      setSubmitted(true)
    } catch (requestError) {
      setError(feedbackFor(requestError))
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return <>
    <button
      type="button"
      className="post-action report-control"
      onClick={startReport}
      aria-label={`Report ${targetLabel}`}
      title={`Report ${targetLabel}`}
    >
      <Flag size={15}/><span>Report</span>
    </button>
    {open && <div
      className="report-modal-backdrop"
      role="presentation"
      onClick={event => { if (event.target === event.currentTarget && !submitting) close() }}
    >
      <section className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title">
        {submitted ? <>
          <div className="report-modal-header"><h2 id="report-dialog-title">Report submitted</h2></div>
          <div className="report-modal-body">
            <p className="report-success" role="status">Thank you. Your report has been sent to the moderation team.</p>
            <div className="report-modal-actions"><button type="button" className="button button-primary" onClick={close}>Done</button></div>
          </div>
        </> : <>
          <div className="report-modal-header">
            <div><span className="eyebrow">COMMUNITY SAFETY</span><h2 id="report-dialog-title">Report {targetLabel}</h2></div>
            <button type="button" className="icon-button" aria-label="Close report form" onClick={close} disabled={submitting}>×</button>
          </div>
          <form className="report-modal-body" onSubmit={submit}>
            <label>Reason
              <select value={reason} onChange={event => setReason(event.target.value)} required disabled={submitting}>
                <option value="">Choose a reason</option>
                {REPORT_REASONS.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>Additional details <span className="optional">(optional)</span>
              <textarea
                value={description}
                onChange={event => setDescription(event.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Share any context that may help us review this report."
                disabled={submitting}
              />
              <span className="report-character-count">{description.length}/2000</span>
            </label>
            {error && <div className="alert-error" role="alert">{error}</div>}
            <div className="report-modal-actions">
              <button type="button" className="button button-outline" onClick={close} disabled={submitting}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={submitting || !reason}>
                {submitting ? 'Sending…' : 'Submit report'}
              </button>
            </div>
          </form>
        </>}
      </section>
    </div>}
  </>
}
