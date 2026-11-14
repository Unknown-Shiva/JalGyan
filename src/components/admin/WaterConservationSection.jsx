import { useTranslation } from 'react-i18next';
/**
 * WaterConservationSection — water stats + calculation type breakdown.
 */

const CALCULATION_TYPES = ['AGRICULTURE', 'DRIP_IRRIGATION', 'RAINWATER_HARVESTING', 'HOUSEHOLD']

function WaterMetric({ label, value, unit, formatINNumber }) {
  return (
    <div className="adm-water-metric">
      <span className="adm-stat-label">{label}</span>
      <strong className="adm-water-value">
        {formatINNumber(value)}
        {unit && <span className="adm-water-unit"> {unit}</span>}
      </strong>
    </div>
  )
}

function BreakdownBar({ type, count, total }) {
  const { t } = useTranslation()
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="adm-breakdown-row">
      <div className="adm-breakdown-meta">
        <span className="adm-breakdown-label">{t(`admin.calculationTypes.${type}`, { defaultValue: type })}</span>
        <span className="adm-breakdown-count">{new Intl.NumberFormat('en-IN').format(count)}</span>
      </div>
      <div className="adm-breakdown-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${t(`admin.calculationTypes.${type}`, { defaultValue: type })}: ${pct}%`}>
        <div className="adm-breakdown-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="adm-breakdown-pct">{pct}%</span>
    </div>
  )
}

export default function WaterConservationSection({ data, loading, formatINNumber }) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <section className="adm-section" aria-labelledby="section-water">
        <h2 className="adm-section-title" id="section-water">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>{t('ui.k457')}</h2>
        <div className="adm-water-grid">
          {[0,1,2].map(i => <div key={i} className="adm-stat-card adm-skeleton"><div className="adm-sk-label"/><div className="adm-sk-value"/></div>)}
        </div>
      </section>
    )
  }

  const breakdown = data?.breakdownByType ?? {}
  const total = data?.totalCalculations ?? 0

  return (
    <section className="adm-section" aria-labelledby="section-water">
      <h2 className="adm-section-title" id="section-water">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>{t('ui.k457')}</h2>

      <div className="adm-water-grid">
        <WaterMetric
          label={t('admin.waterMetrics.annualSaved')}
          value={data?.totalAnnualWaterSavedLiters}
          unit="L"
          formatINNumber={formatINNumber}
        />
        <WaterMetric
          label={t('admin.waterMetrics.annualHarvest')}
          value={data?.totalAnnualWaterHarvestedLiters}
          unit="L"
          formatINNumber={formatINNumber}
        />
        <WaterMetric
          label={t('admin.waterMetrics.totalCalculations')}
          value={total}
          formatINNumber={formatINNumber}
        />
      </div>

      {total > 0 && (
        <div className="adm-breakdown-panel" aria-label={t('ui.a008')}>
          <h3 className="adm-breakdown-title">{t('ui.k096')}</h3>
          {CALCULATION_TYPES.map((key) => (
            <BreakdownBar
              key={key}
              type={key}
              count={breakdown[key] ?? 0}
              total={total}
            />
          ))}
        </div>
      )}

      {total === 0 && (
        <p className="adm-water-empty">{t('ui.k279')}</p>
      )}
    </section>
  )
}
