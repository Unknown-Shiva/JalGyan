import { useEffect, useRef, useState } from 'react'
import { Flag } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { REPORT_REASONS, submitReport } from '../../services/reportService'
import { useTranslation } from 'react-i18next'

export default function ReportControl({ targetType, targetId, targetLabel = 'content' }) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const targetText = t(`report.targets.${targetLabel}`)
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
      setError(requestError?.status === 400 ? t('report.invalid') : requestError?.status === 401 ? t('report.sessionExpired') : requestError?.status === 404 ? t('report.unavailable') : t('report.failed'))
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
      aria-label={`${t('report.report')} ${targetText}`}
      title={`${t('report.report')} ${targetText}`}
    >
      <Flag size={15}/><span>{t('report.report')}</span>
    </button>
    {open && <div
      className="report-modal-backdrop"
      role="presentation"
      onClick={event => { if (event.target === event.currentTarget && !submitting) close() }}
    >
      <section className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title">
        {submitted ? <>
          <div className="report-modal-header"><h2 id="report-dialog-title">{t('report.submitted')}</h2></div>
          <div className="report-modal-body">
            <p className="report-success" role="status">{t('report.thanks')}</p>
            <div className="report-modal-actions"><button type="button" className="button button-primary" onClick={close}>{t('report.done')}</button></div>
          </div>
        </> : <>
          <div className="report-modal-header">
            <div><span className="eyebrow">{t('report.safety')}</span><h2 id="report-dialog-title">{t('report.report')} {targetText}</h2></div>
            <button type="button" className="icon-button" aria-label={t('common.close')} onClick={close} disabled={submitting}>×</button>
          </div>
          <form className="report-modal-body" onSubmit={submit}>
            <label>{t('report.reason')}
              <select value={reason} onChange={event => setReason(event.target.value)} required disabled={submitting}>
                <option value="">{t('report.chooseReason')}</option>
                {REPORT_REASONS.map(option => <option value={option.value} key={option.value}>{t(`report.reasons.${option.value}`)}</option>)}
              </select>
            </label>
            <label>{t('report.details')} <span className="optional">{t('auth.optional')}</span>
              <textarea
                value={description}
                onChange={event => setDescription(event.target.value)}
                maxLength={2000}
                rows={4}
                placeholder={t('report.context')}
                disabled={submitting}
              />
              <span className="report-character-count">{description.length}/2000</span>
            </label>
            {error && <div className="alert-error" role="alert">{error}</div>}
            <div className="report-modal-actions">
              <button type="button" className="button button-outline" onClick={close} disabled={submitting}>{t('common.cancel')}</button>
              <button type="submit" className="button button-primary" disabled={submitting || !reason}>
                {submitting ? t('report.sending') : t('report.submit')}
              </button>
            </div>
          </form>
        </>}
      </section>
    </div>}
  </>
}
