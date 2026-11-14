import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Droplets,
  Sprout,
  Waves,
  CloudRain,
  Home,
  History,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Info,
  Calendar,
  Layers,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { calculatorService } from '../services/calculatorService';

function formatIN(n) {
  if (n == null || isNaN(n)) return '0';
  return new Intl.NumberFormat('en-IN').format(Math.round(n));
}

const CITY_RAINFALL = [
  { city: 'New Delhi', mm: 790 },
  { city: 'Mumbai', mm: 2420 },
  { city: 'Bengaluru', mm: 970 },
  { city: 'Chennai', mm: 1400 },
  { city: 'Kolkata', mm: 1650 },
  { city: 'Jaipur', mm: 620 },
  { city: 'Hyderabad', mm: 820 },
  { city: 'Pune', mm: 750 },
];

const CROP_OPTIONS = ['RICE_PADDY', 'WHEAT', 'SUGARCANE', 'COTTON', 'MAIZE', 'PULSES', 'VEGETABLES', 'MILLETS', 'OTHER'];

export default function WaterCalculator() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('AGRICULTURE');

  // Calculation state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successNotice, setSuccessNotice] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  // History state
  const [history, setHistory] = useState([]);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: 5, total: 0, totalPages: 1 });
  const [historyFilter, setHistoryFilter] = useState('ALL');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // 1. Agriculture form state
  const [agriForm, setAgriForm] = useState({
    area: '2.5',
    unit: 'ACRES',
    cropType: 'WHEAT',
    irrigationMethod: 'FLOOD',
    customWaterDepth: '',
    seasonsPerYear: '1',
  });

  // 2. Drip Irrigation form state
  const [dripForm, setDripForm] = useState({
    area: '2',
    unit: 'ACRES',
    currentMethod: 'FLOOD',
    dripEfficiency: '90',
    currentWaterUsageLiters: '',
    seasonsPerYear: '2',
  });

  // 3. Rainwater Harvesting form state
  const [rwhForm, setRwhForm] = useState({
    roofAreaSqM: '120',
    annualRainfallMm: '1000',
    efficiencyPercent: '80',
  });

  // 4. Household form state
  const [houseForm, setHouseForm] = useState({
    members: '4',
    bathingLitersPerPerson: '50',
    toiletLitersPerPerson: '25',
    laundryLitersDaily: '40',
    kitchenLitersDaily: '30',
    otherLitersDaily: '20',
    lowFlowShowerheads: true,
    dualFlushToilets: true,
    aeratedTaps: true,
    greywaterReuse: false,
  });

  // Load history when tab is HISTORY and user is logged in
  const fetchHistory = useCallback(async (targetPage = 1) => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const data = await calculatorService.getHistory({
        page: targetPage,
        limit: 5,
        type: historyFilter,
      });
      setHistory(data?.calculations || []);
      setHistoryPagination(data?.pagination || { page: targetPage, limit: 5, total: 0, totalPages: 1 });
    } catch {
      // History is supplementary; do not block user
    } finally {
      setLoadingHistory(false);
    }
  }, [user, historyFilter]);

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      fetchHistory(1);
    }
  }, [activeTab, fetchHistory]);

  // Form submission handler
  const handleCalculate = async (type, payload) => {
    setSubmitting(true);
    setError(null);
    setSuccessNotice(null);

    try {
      const res = await calculatorService.calculate({
        calculationType: type,
        ...payload,
      });
      setLastResult(res);
      setSuccessNotice(t('calculator.completed'));
      if (activeTab === 'HISTORY') {
        fetchHistory(1);
      }
    } catch (err) {
      setError(t('calculator.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="calc-page">
      {/* ── Header Banner ──────────────────────────────────────────────── */}
      <div className="knowledge-hero" style={{ minHeight: '220px', marginBottom: '24px' }}>
        <div className="knowledge-hero-content">
          <span className="eyebrow light-eyebrow">{t('ui.k243')}</span>
          <h1>{t('ui.k457')}{' '}<em>{t('ui.k105')}</em></h1>
          <p>{t('ui.k169')}</p>
        </div>
        <div className="knowledge-hero-stats" style={{ display: 'none' }}></div>
      </div>

      {/* Guest Mode Notice */}
      {!user && (
        <div className="calc-guest-banner" role="status">
          <Info size={18} className="calc-guest-icon" />
          <div className="calc-guest-text">
            <strong>{t('ui.k194')}</strong>{t('ui.k468')}<NavLink to="/login" className="calc-guest-link">{' '}{t('ui.k383')}</NavLink>{t('ui.k492')}</div>
        </div>
      )}

      {/* Notifications */}
      {successNotice && (
        <div className="adm-success-banner" role="status" style={{ marginBottom: '18px' }}>
          <CheckCircle2 size={16} />
          <span>{successNotice}</span>
          <button type="button" className="adm-banner-close" onClick={() => setSuccessNotice(null)}>×</button>
        </div>
      )}

      {error && (
        <div className="adm-error-banner" role="alert" style={{ marginBottom: '18px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button type="button" className="adm-banner-close" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* ── Calculator Tabs ────────────────────────────────────────────── */}
      <nav className="calc-tab-nav" aria-label={t('ui.a009')}>
        <button
          type="button"
          className={`calc-tab-btn ${activeTab === 'AGRICULTURE' ? 'active' : ''}`}
          onClick={() => { setActiveTab('AGRICULTURE'); setError(null); }}
        >
          <Sprout size={16} />
          <span>{t('ui.k044')}</span>
        </button>

        <button
          type="button"
          className={`calc-tab-btn ${activeTab === 'DRIP_IRRIGATION' ? 'active' : ''}`}
          onClick={() => { setActiveTab('DRIP_IRRIGATION'); setError(null); }}
        >
          <Waves size={16} />
          <span>{t('ui.k157')}</span>
        </button>

        <button
          type="button"
          className={`calc-tab-btn ${activeTab === 'RAINWATER_HARVESTING' ? 'active' : ''}`}
          onClick={() => { setActiveTab('RAINWATER_HARVESTING'); setError(null); }}
        >
          <CloudRain size={16} />
          <span>{t('ui.k313')}</span>
        </button>

        <button
          type="button"
          className={`calc-tab-btn ${activeTab === 'HOUSEHOLD' ? 'active' : ''}`}
          onClick={() => { setActiveTab('HOUSEHOLD'); setError(null); }}
        >
          <Home size={16} />
          <span>{t('ui.k202')}</span>
        </button>

        <button
          type="button"
          className={`calc-tab-btn ${activeTab === 'HISTORY' ? 'active' : ''}`}
          onClick={() => { setActiveTab('HISTORY'); setError(null); }}
        >
          <History size={16} />
          <span>{t('ui.k104')}</span>
        </button>
      </nav>

      {/* ── TAB 1: AGRICULTURE CALCULATOR ──────────────────────────────── */}
      {activeTab === 'AGRICULTURE' && (
        <div className="calc-card-grid">
          <div className="calc-form-card">
            <div className="calc-card-head">
              <h2>{t('ui.k504')}</h2>
              <p>{t('ui.k170')}</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCalculate('AGRICULTURE', {
                  area: Number(agriForm.area),
                  unit: agriForm.unit,
                  cropType: agriForm.cropType,
                  irrigationMethod: agriForm.irrigationMethod,
                  customWaterDepth: agriForm.customWaterDepth ? Number(agriForm.customWaterDepth) : undefined,
                  seasonsPerYear: Number(agriForm.seasonsPerYear),
                });
              }}
              className="calc-form"
            >
              <div className="calc-field-row">
                <div className="calc-field">
                  <label htmlFor="agri-area">{t('ui.k224')}</label>
                  <input
                    id="agri-area"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10000"
                    required
                    value={agriForm.area}
                    onChange={(e) => setAgriForm({ ...agriForm, area: e.target.value })}
                  />
                </div>
                <div className="calc-field">
                  <label htmlFor="agri-unit">{t('ui.k066')}</label>
                  <select
                    id="agri-unit"
                    value={agriForm.unit}
                    onChange={(e) => setAgriForm({ ...agriForm, unit: e.target.value })}
                  >
                    <option value="ACRES">{t('ui.k025')}</option>
                    <option value="HECTARES">{t('ui.k200')}</option>
                  </select>
                </div>
              </div>

              <div className="calc-field">
                <label htmlFor="agri-crop">{t('ui.k131')}</label>
                <select
                  id="agri-crop"
                  value={agriForm.cropType}
                  onChange={(e) => setAgriForm({ ...agriForm, cropType: e.target.value })}
                >
                {CROP_OPTIONS.map((crop) => (
                  <option key={crop} value={crop}>{t(`calculator.crops.${crop}`)}</option>
                  ))}
                </select>
              </div>

              {agriForm.cropType === 'OTHER' && (
                <div className="calc-field">
                  <label htmlFor="agri-depth">{t('ui.k134')}</label>
                  <input
                    id="agri-depth"
                    type="number"
                    min="50"
                    max="3000"
                    placeholder={t('ui.a049')}
                    value={agriForm.customWaterDepth}
                    onChange={(e) => setAgriForm({ ...agriForm, customWaterDepth: e.target.value })}
                  />
                </div>
              )}

              <div className="calc-field-row">
                <div className="calc-field">
                  <label htmlFor="agri-method">{t('ui.k133')}</label>
                  <select
                    id="agri-method"
                    value={agriForm.irrigationMethod}
                    onChange={(e) => setAgriForm({ ...agriForm, irrigationMethod: e.target.value })}
                  >
                    <option value="FLOOD">{t('ui.k400')}</option>
                    <option value="SPRINKLER">{t('ui.k389')}</option>
                    <option value="DRIP">{t('ui.k155')}</option>
                  </select>
                </div>

                <div className="calc-field">
                  <label htmlFor="agri-seasons">{t('ui.k378')}</label>
                  <select
                    id="agri-seasons"
                    value={agriForm.seasonsPerYear}
                    onChange={(e) => setAgriForm({ ...agriForm, seasonsPerYear: e.target.value })}
                  >
                    <option value="1">{t('ui.k012')}</option>
                    <option value="2">{t('ui.k016')}</option>
                    <option value="3">{t('ui.k018')}</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="button button-primary button-wide"
                disabled={submitting}
              >
                {submitting ? t('calculator.calculating') : t('calculator.calculateAgriculture')}
              </button>
            </form>
          </div>

          {/* Result Panel */}
          <div className="calc-result-card">
            {lastResult && lastResult.calculationType === 'AGRICULTURE' ? (
              <div className="calc-result-body">
                <div className="calc-result-header">
                  <span className="adm-badge adm-badge-active">{t('ui.k172')}</span>
                  <h3>{t('ui.k045')}</h3>
                  <p className="calc-result-sub">
                    {lastResult.inputParams?.area} {lastResult.inputParams?.unit?.toLowerCase()}{' '}{t('ui.k486')}{' '}{lastResult.inputParams?.cropLabel || lastResult.inputParams?.cropType}{' '}{t('ui.k496')}{' '}{lastResult.inputParams?.irrigationMethod}{t('ui.k478')}</p>
                </div>

                <div className="calc-metrics-grid">
                  <div className="calc-metric-box">
                    <span className="calc-metric-title">{t('ui.k193')}</span>
                    <strong className="calc-metric-number">
                      {formatIN(lastResult.resultMetrics?.grossWaterRequirementLiters)} <span className="calc-unit">{t('ui.k215')}</span>
                    </strong>
                    <span className="calc-metric-sub">{t('ui.k023')}</span>
                  </div>

                  <div className="calc-metric-box">
                    <span className="calc-metric-title">{t('ui.k137')}</span>
                    <strong className="calc-metric-number">
                      {formatIN(lastResult.resultMetrics?.dailyRequirementLiters)} <span className="calc-unit">{t('ui.k217')}</span>
                    </strong>
                    <span className="calc-metric-sub">{t('ui.k285')}{' '}{lastResult.resultMetrics?.durationDays}{' '}{t('ui.k476')}</span>
                  </div>
                </div>

                {/* Savings Potential Comparison */}
                <div className="calc-savings-box">
                  <h4>{t('ui.k507')}</h4>
                  <div className="calc-savings-row">
                    <span>{t('ui.k434')}</span>
                    <strong className="calc-highlight-green">{t('ui.k369')}{formatIN(lastResult.resultMetrics?.potentialDripSavingsLiters)}{' '}{t('ui.k216')}{lastResult.resultMetrics?.dripSavingsPercent}%)
                    </strong>
                  </div>
                  <div className="calc-savings-row">
                    <span>{t('ui.k435')}</span>
                    <strong className="calc-highlight-blue">{t('ui.k369')}{formatIN(lastResult.resultMetrics?.potentialSprinklerSavingsLiters)}{' '}{t('ui.k216')}{lastResult.resultMetrics?.sprinklerSavingsPercent}%)
                    </strong>
                  </div>
                </div>

                {/* Assumptions Disclosed */}
                <div className="calc-assumptions-box">
                  <div className="calc-assumptions-title">
                    <HelpCircle size={14} />
                    <span>{t('ui.k374')}</span>
                  </div>
                  <p>{t('ui.k261')}<strong>{lastResult.resultMetrics?.assumptionsDisclosed?.cropWaterDepthMm}{' '}{t('ui.k482')}</strong>{t('ui.k011')}<strong>{lastResult.resultMetrics?.assumptionsDisclosed?.methodEfficiencyPercent}%</strong>.
                    {lastResult.resultMetrics?.assumptionsDisclosed?.note}
                  </p>
                </div>
              </div>
            ) : (
              <div className="calc-result-placeholder">
                <Sprout size={48} className="calc-ph-icon" />
                <h3>{t('ui.k167')}</h3>
                <p>{t('ui.k305')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: DRIP IRRIGATION SAVINGS CALCULATOR ──────────────────── */}
      {activeTab === 'DRIP_IRRIGATION' && (
        <div className="calc-card-grid">
          <div className="calc-form-card">
            <div className="calc-card-head">
              <h2>{t('ui.k508')}</h2>
              <p>{t('ui.k311')}</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCalculate('DRIP_IRRIGATION', {
                  area: Number(dripForm.area),
                  unit: dripForm.unit,
                  currentMethod: dripForm.currentMethod,
                  dripEfficiency: Number(dripForm.dripEfficiency),
                  currentWaterUsageLiters: dripForm.currentWaterUsageLiters ? Number(dripForm.currentWaterUsageLiters) : undefined,
                  seasonsPerYear: Number(dripForm.seasonsPerYear),
                });
              }}
              className="calc-form"
            >
              <div className="calc-field-row">
                <div className="calc-field">
                  <label htmlFor="drip-area">{t('ui.k224')}</label>
                  <input
                    id="drip-area"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10000"
                    required
                    value={dripForm.area}
                    onChange={(e) => setDripForm({ ...dripForm, area: e.target.value })}
                  />
                </div>
                <div className="calc-field">
                  <label htmlFor="drip-unit">{t('ui.k432')}</label>
                  <select
                    id="drip-unit"
                    value={dripForm.unit}
                    onChange={(e) => setDripForm({ ...dripForm, unit: e.target.value })}
                  >
                    <option value="ACRES">{t('ui.k024')}</option>
                    <option value="HECTARES">{t('ui.k199')}</option>
                  </select>
                </div>
              </div>

              <div className="calc-field">
                <label htmlFor="drip-cur-method">{t('ui.k132')}</label>
                <select
                  id="drip-cur-method"
                  value={dripForm.currentMethod}
                  onChange={(e) => setDripForm({ ...dripForm, currentMethod: e.target.value })}
                >
                  <option value="FLOOD">{t('ui.k401')}</option>
                  <option value="SPRINKLER">{t('ui.k286')}</option>
                </select>
              </div>

              <div className="calc-field-row">
                <div className="calc-field">
                  <label htmlFor="drip-eff">{t('ui.k409')}</label>
                  <input
                    id="drip-eff"
                    type="number"
                    min="60"
                    max="98"
                    required
                    value={dripForm.dripEfficiency}
                    onChange={(e) => setDripForm({ ...dripForm, dripEfficiency: e.target.value })}
                  />
                </div>
                <div className="calc-field">
                  <label htmlFor="drip-seasons">{t('ui.k378')}</label>
                  <select
                    id="drip-seasons"
                    value={dripForm.seasonsPerYear}
                    onChange={(e) => setDripForm({ ...dripForm, seasonsPerYear: e.target.value })}
                  >
                    <option value="1">{t('ui.k013')}</option>
                    <option value="2">{t('ui.k017')}</option>
                    <option value="3">{t('ui.k019')}</option>
                  </select>
                </div>
              </div>

              <div className="calc-field">
                <label htmlFor="drip-cur-usage">{t('ui.k214')}</label>
                <input
                  id="drip-cur-usage"
                  type="number"
                  placeholder={t('ui.a026')}
                  value={dripForm.currentWaterUsageLiters}
                  onChange={(e) => setDripForm({ ...dripForm, currentWaterUsageLiters: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="button button-primary button-wide"
                disabled={submitting}
              >
                {submitting ? t('calculator.calculating') : t('calculator.calculateDrip')}
              </button>
            </form>
          </div>

          {/* Drip Result */}
          <div className="calc-result-card">
            {lastResult && lastResult.calculationType === 'DRIP_IRRIGATION' ? (
              <div className="calc-result-body">
                <div className="calc-result-header">
                  <span className="adm-badge adm-badge-active">{t('ui.k373')}</span>
                  <h3>{t('ui.k156')}</h3>
                  <p className="calc-result-sub">{t('ui.k427')}{lastResult.resultMetrics?.currentMethod} ({lastResult.resultMetrics?.currentEfficiencyPercent}{t('ui.k006')}{lastResult.resultMetrics?.dripEfficiencyPercent}%).
                  </p>
                </div>

                <div className="calc-metrics-grid">
                  <div className="calc-metric-box">
                    <span className="calc-metric-title">{t('ui.k377')}</span>
                    <strong className="calc-metric-number calc-highlight-green">
                      {formatIN(lastResult.resultMetrics?.waterSavedLiters)} <span className="calc-unit">{t('ui.k215')}</span>
                    </strong>
                    <span className="calc-metric-sub">{lastResult.resultMetrics?.savingsPercent}{t('ui.k005')}</span>
                  </div>

                  <div className="calc-metric-box">
                    <span className="calc-metric-title">{t('ui.k061')}</span>
                    <strong className="calc-metric-number">
                      {formatIN(lastResult.resultMetrics?.annualWaterSavedLiters)} <span className="calc-unit">{t('ui.k222')}</span>
                    </strong>
                    <span className="calc-metric-sub">{t('ui.k026')}{' '}{lastResult.inputParams?.seasonsPerYear}{' '}{t('ui.k474')}</span>
                  </div>
                </div>

                {/* Progress Comparison Bar */}
                <div className="calc-savings-box">
                  <h4>{t('ui.k458')}</h4>
                  <div className="calc-progress-wrap">
                    <div className="calc-progress-row">
                      <span>{t('ui.k092')}{lastResult.resultMetrics?.currentMethod}):</span>
                      <strong>{formatIN(lastResult.resultMetrics?.currentConsumptionLiters)}{' '}{t('ui.k215')}</strong>
                    </div>
                    <div className="calc-bar-track">
                      <div className="calc-bar-fill calc-bar-red" style={{ width: '100%' }} />
                    </div>

                    <div className="calc-progress-row" style={{ marginTop: '10px' }}>
                      <span>{t('ui.k462')}</span>
                      <strong>{formatIN(lastResult.resultMetrics?.dripConsumptionLiters)}{' '}{t('ui.k215')}</strong>
                    </div>
                    <div className="calc-bar-track">
                      <div
                        className="calc-bar-fill calc-bar-green"
                        style={{ width: `${100 - (lastResult.resultMetrics?.savingsPercent || 50)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="calc-assumptions-box">
                  <div className="calc-assumptions-title">
                    <HelpCircle size={14} />
                    <span>{t('ui.k103')}</span>
                  </div>
                  <p>{lastResult.resultMetrics?.assumptionsDisclosed?.note}</p>
                </div>
              </div>
            ) : (
              <div className="calc-result-placeholder">
                <Waves size={48} className="calc-ph-icon" />
                <h3>{t('ui.k121')}</h3>
                <p>{t('ui.k120')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: RAINWATER HARVESTING CALCULATOR ─────────────────────── */}
      {activeTab === 'RAINWATER_HARVESTING' && (
        <div className="calc-card-grid">
          <div className="calc-form-card">
            <div className="calc-card-head">
              <h2>{t('ui.k503')}</h2>
              <p>{t('ui.k101')}</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCalculate('RAINWATER_HARVESTING', {
                  roofAreaSqM: Number(rwhForm.roofAreaSqM),
                  annualRainfallMm: Number(rwhForm.annualRainfallMm),
                  efficiencyPercent: Number(rwhForm.efficiencyPercent),
                });
              }}
              className="calc-form"
            >
              <div className="calc-field">
                <label htmlFor="rwh-roof">{t('ui.k365')}</label>
                <input
                  id="rwh-roof"
                  type="number"
                  min="5"
                  max="100000"
                  required
                  value={rwhForm.roofAreaSqM}
                  onChange={(e) => setRwhForm({ ...rwhForm, roofAreaSqM: e.target.value })}
                />
                <span className="calc-field-hint">{t('ui.k477')}</span>
              </div>

              <div className="calc-field">
                <label htmlFor="rwh-rain">{t('ui.k059')}</label>
                <input
                  id="rwh-rain"
                  type="number"
                  min="50"
                  max="12000"
                  required
                  value={rwhForm.annualRainfallMm}
                  onChange={(e) => setRwhForm({ ...rwhForm, annualRainfallMm: e.target.value })}
                />
              </div>

              {/* Quick City Presets */}
              <div className="calc-presets">
                <span className="calc-presets-label">{t('ui.k206')}</span>
                <div className="calc-preset-chips">
                  {CITY_RAINFALL.map((c) => (
                    <button
                      key={c.city}
                      type="button"
                      className="calc-chip"
                      onClick={() => setRwhForm({ ...rwhForm, annualRainfallMm: String(c.mm) })}
                    >
                      {c.city} ({c.mm}{t('ui.k484')}</button>
                  ))}
                </div>
              </div>

              <div className="calc-field">
                <label htmlFor="rwh-eff">{t('ui.k367')}</label>
                <input
                  id="rwh-eff"
                  type="number"
                  min="10"
                  max="95"
                  required
                  value={rwhForm.efficiencyPercent}
                  onChange={(e) => setRwhForm({ ...rwhForm, efficiencyPercent: e.target.value })}
                />
                <span className="calc-field-hint">{t('ui.k390')}</span>
              </div>

              <button
                type="submit"
                className="button button-primary button-wide"
                disabled={submitting}
              >
                {submitting ? t('calculator.calculating') : t('calculator.calculateRainwater')}
              </button>
            </form>
          </div>

          {/* RWH Result */}
          <div className="calc-result-card">
            {lastResult && lastResult.calculationType === 'RAINWATER_HARVESTING' ? (
              <div className="calc-result-body">
                <div className="calc-result-header">
                  <span className="adm-badge adm-badge-active">{t('ui.k197')}</span>
                  <h3>{t('ui.k366')}</h3>
                  <p className="calc-result-sub">
                    {lastResult.inputParams?.roofAreaSqM}{' '}{t('ui.k485')}{' '}{lastResult.inputParams?.annualRainfallMm}{' '}{t('ui.k483')}{' '}{lastResult.inputParams?.efficiencyPercent}{t('ui.k003')}</p>
                </div>

                <div className="calc-metrics-grid">
                  <div className="calc-metric-box">
                    <span className="calc-metric-title">{t('ui.k058')}</span>
                    <strong className="calc-metric-number calc-highlight-blue">
                      {formatIN(lastResult.resultMetrics?.annualHarvestedLiters)} <span className="calc-unit">{t('ui.k231')}</span>
                    </strong>
                    <span className="calc-metric-sub">≈ {formatIN(lastResult.resultMetrics?.annualHarvestedLiters / 1000)}{' '}{t('ui.k480')}</span>
                  </div>

                  <div className="calc-metric-box">
                    <span className="calc-metric-title">{t('ui.k254')}</span>
                    <strong className="calc-metric-number">
                      {formatIN(lastResult.resultMetrics?.monthlyAverageLiters)} <span className="calc-unit">{t('ui.k220')}</span>
                    </strong>
                    <span className="calc-metric-sub">{formatIN(lastResult.resultMetrics?.dailyAverageLiters)}{' '}{t('ui.k219')}</span>
                  </div>
                </div>

                <div className="calc-savings-box">
                  <h4>{t('ui.k505')}</h4>
                  <div className="calc-savings-row">
                    <span>{t('ui.k397')}</span>
                    <strong className="calc-highlight-green">
                      {formatIN(lastResult.resultMetrics?.recommendedTankCapacityLiters)}{t('ui.k231')}</strong>
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#5b7164' }}>{t('ui.k385')}</p>
                </div>

                <div className="calc-assumptions-box">
                  <div className="calc-assumptions-title">
                    <HelpCircle size={14} />
                    <span>{t('ui.k375')}</span>
                  </div>
                  <p>
                    <strong>{t('ui.k196')}</strong><br />{t('ui.k014')}</p>
                </div>
              </div>
            ) : (
              <div className="calc-result-placeholder">
                <CloudRain size={48} className="calc-ph-icon" />
                <h3>{t('ui.k100')}</h3>
                <p>{t('ui.k208')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: HOUSEHOLD WATER CALCULATOR ─────────────────────────── */}
      {activeTab === 'HOUSEHOLD' && (
        <div className="calc-card-grid">
          <div className="calc-form-card">
            <div className="calc-card-head">
              <h2>{t('ui.k506')}</h2>
              <p>{t('ui.k084')}</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCalculate('HOUSEHOLD', {
                  members: Number(houseForm.members),
                  bathingLitersPerPerson: Number(houseForm.bathingLitersPerPerson),
                  toiletLitersPerPerson: Number(houseForm.toiletLitersPerPerson),
                  laundryLitersDaily: Number(houseForm.laundryLitersDaily),
                  kitchenLitersDaily: Number(houseForm.kitchenLitersDaily),
                  otherLitersDaily: Number(houseForm.otherLitersDaily),
                  conservationMeasures: [
                    houseForm.lowFlowShowerheads ? 'lowFlowShowerheads' : null,
                    houseForm.dualFlushToilets ? 'dualFlushToilets' : null,
                    houseForm.aeratedTaps ? 'aeratedTaps' : null,
                    houseForm.greywaterReuse ? 'greywaterReuse' : null,
                  ].filter(Boolean),
                });
              }}
              className="calc-form"
            >
              <div className="calc-field">
                <label htmlFor="house-members">{t('ui.k282')}</label>
                <input
                  id="house-members"
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={houseForm.members}
                  onChange={(e) => setHouseForm({ ...houseForm, members: e.target.value })}
                />
              </div>

              <div className="calc-field-row">
                <div className="calc-field">
                  <label htmlFor="house-bath">{t('ui.k093')}</label>
                  <input
                    id="house-bath"
                    type="number"
                    min="5"
                    max="200"
                    required
                    value={houseForm.bathingLitersPerPerson}
                    onChange={(e) => setHouseForm({ ...houseForm, bathingLitersPerPerson: e.target.value })}
                  />
                </div>
                <div className="calc-field">
                  <label htmlFor="house-toilet">{t('ui.k419')}</label>
                  <input
                    id="house-toilet"
                    type="number"
                    min="5"
                    max="150"
                    required
                    value={houseForm.toiletLitersPerPerson}
                    onChange={(e) => setHouseForm({ ...houseForm, toiletLitersPerPerson: e.target.value })}
                  />
                </div>
              </div>

              <div className="calc-field-row">
                <div className="calc-field">
                  <label htmlFor="house-laundry">{t('ui.k229')}</label>
                  <input
                    id="house-laundry"
                    type="number"
                    min="0"
                    max="500"
                    required
                    value={houseForm.laundryLitersDaily}
                    onChange={(e) => setHouseForm({ ...houseForm, laundryLitersDaily: e.target.value })}
                  />
                </div>
                <div className="calc-field">
                  <label htmlFor="house-kitchen">{t('ui.k212')}</label>
                  <input
                    id="house-kitchen"
                    type="number"
                    min="0"
                    max="500"
                    required
                    value={houseForm.kitchenLitersDaily}
                    onChange={(e) => setHouseForm({ ...houseForm, kitchenLitersDaily: e.target.value })}
                  />
                </div>
              </div>

              {/* Conservation Measures Checklist */}
              <div className="calc-checkbox-section">
                <span className="calc-checkbox-title">{t('ui.k379')}</span>

                <label className="calc-checkbox-item">
                  <input
                    type="checkbox"
                    checked={houseForm.lowFlowShowerheads}
                    onChange={(e) => setHouseForm({ ...houseForm, lowFlowShowerheads: e.target.checked })}
                  />
                  <span>{t('ui.k240')}</span>
                </label>

                <label className="calc-checkbox-item">
                  <input
                    type="checkbox"
                    checked={houseForm.dualFlushToilets}
                    onChange={(e) => setHouseForm({ ...houseForm, dualFlushToilets: e.target.checked })}
                  />
                  <span>{t('ui.k158')}</span>
                </label>

                <label className="calc-checkbox-item">
                  <input
                    type="checkbox"
                    checked={houseForm.aeratedTaps}
                    onChange={(e) => setHouseForm({ ...houseForm, aeratedTaps: e.target.checked })}
                  />
                  <span>{t('ui.k407')}</span>
                </label>

                <label className="calc-checkbox-item">
                  <input
                    type="checkbox"
                    checked={houseForm.greywaterReuse}
                    onChange={(e) => setHouseForm({ ...houseForm, greywaterReuse: e.target.checked })}
                  />
                  <span>{t('ui.k192')}</span>
                </label>
              </div>

              <button
                type="submit"
                className="button button-primary button-wide"
                disabled={submitting}
              >
                {submitting ? t('calculator.calculating') : t('calculator.calculateHousehold')}
              </button>
            </form>
          </div>

          {/* Household Result */}
          <div className="calc-result-card">
            {lastResult && lastResult.calculationType === 'HOUSEHOLD' ? (
              <div className="calc-result-body">
                <div className="calc-result-header">
                  <span className="adm-badge adm-badge-active">{t('ui.k183')}</span>
                  <h3>{t('ui.k151')}</h3>
                  <p className="calc-result-sub">{t('ui.k177')}{lastResult.inputParams?.members}{t('ui.k481')}</p>
                </div>

                <div className="calc-metrics-grid">
                  <div className="calc-metric-box">
                    <span className="calc-metric-title">{t('ui.k060')}</span>
                    <strong className="calc-metric-number calc-highlight-green">
                      {formatIN(lastResult.resultMetrics?.annualWaterSavedLiters)} <span className="calc-unit">{t('ui.k222')}</span>
                    </strong>
                    <span className="calc-metric-sub">{lastResult.resultMetrics?.savingsPercent}{t('ui.k004')}</span>
                  </div>

                  <div className="calc-metric-box">
                    <span className="calc-metric-title">{t('ui.k136')}</span>
                    <strong className="calc-metric-number">
                      {formatIN(lastResult.resultMetrics?.dailyConservedLiters)} <span className="calc-unit">{t('ui.k217')}</span>
                    </strong>
                    <span className="calc-metric-sub">{t('ui.k152')}{' '}{formatIN(lastResult.resultMetrics?.dailyTotalBaselineLiters)}{' '}{t('ui.k217')}</span>
                  </div>
                </div>

                <div className="calc-savings-box">
                  <h4>{t('ui.k292')}</h4>
                  <div className="calc-savings-row">
                    <span>{t('ui.k470')}</span>
                    <strong>{lastResult.resultMetrics?.perCapitaConservedLiters}{' '}{t('ui.k223')}</strong>
                  </div>
                  <div className="calc-savings-row">
                    <span>{t('ui.k099')}</span>
                    <strong>{t('ui.k015')}</strong>
                  </div>
                </div>

                <div className="calc-assumptions-box">
                  <div className="calc-assumptions-title">
                    <HelpCircle size={14} />
                    <span>{t('ui.k062')}</span>
                  </div>
                  <ul className="calc-measures-list">
                    {Object.entries(lastResult.resultMetrics?.measureBreakdown || {}).map(([key, val]) => (
                      <li key={key}>
                        <strong>{key}:</strong>{' '}{t('ui.k372')}{' '}{formatIN(val)}{' '}{t('ui.k218')}{formatIN(val * 365)}{t('ui.k221')}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="calc-result-placeholder">
                <Home size={48} className="calc-ph-icon" />
                <h3>{t('ui.k081')}</h3>
                <p>{t('ui.k306')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 5: CALCULATION HISTORY ─────────────────────────────────── */}
      {activeTab === 'HISTORY' && (
        <div className="calc-history-card">
          <div className="calc-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>{t('ui.k509')}</h2>
              <p>{t('ui.k112')}</p>
            </div>
            {user && (
              <button
                type="button"
                className="button button-outline button-small"
                onClick={() => fetchHistory(historyPagination.page)}
                disabled={loadingHistory}
              >
                <RefreshCw size={13} />
                <span>{loadingHistory ? t('ui.extra.refreshing') : t('ui.extra.refreshHistory')}</span>
              </button>
            )}
          </div>

          {!user ? (
            <div className="calc-history-auth-needed">
              <Droplets size={44} className="calc-ph-icon" />
              <h3>{t('ui.k384')}</h3>
              <p>{t('ui.k471')}</p>
              <NavLink to="/login" className="button button-primary">{t('ui.k382')}</NavLink>
            </div>
          ) : (
            <div>
              {/* Filter */}
              <div className="calc-history-filters">
                <label htmlFor="history-filter-select">{t('ui.k181')}</label>
                <select
                  id="history-filter-select"
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                >
                  <option value="ALL">{t('ui.k057')}</option>
                  <option value="AGRICULTURE">{t('ui.k044')}</option>
                  <option value="DRIP_IRRIGATION">{t('ui.k157')}</option>
                  <option value="RAINWATER_HARVESTING">{t('ui.k314')}</option>
                  <option value="HOUSEHOLD">{t('ui.k201')}</option>
                </select>
              </div>

              {loadingHistory ? (
                <div className="adm-loading-state">
                  <div className="adm-spinner" />
                  <p>{t('ui.k238')}</p>
                </div>
              ) : history.length === 0 ? (
                <div className="adm-empty-state">
                  <History size={40} />
                  <h3>{t('ui.k274')}</h3>
                  <p>{t('ui.k469')}{' '}{historyFilter !== 'ALL' ? historyFilter.toLowerCase().replace('_', ' ') : ''}{' '}{t('ui.k475')}</p>
                </div>
              ) : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>{t('ui.k140')}</th>
                        <th>{t('ui.k429')}</th>
                        <th>{t('ui.k293')}</th>
                        <th>{t('ui.k460')}</th>
                        <th>{t('ui.k459')}</th>
                        <th>{t('ui.k027')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((record) => (
                        <tr key={record.id}>
                          <td>{new Date(record.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td>
                            <span className="adm-badge adm-badge-active">
                              {record.calculationType?.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td>{record.period}</td>
                          <td>
                            {record.waterSavedLiters > 0 ? (
                              <strong className="calc-highlight-green">{formatIN(record.waterSavedLiters)}{' '}{t('ui.k215')}</strong>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            {record.waterHarvestedLiters > 0 ? (
                              <strong className="calc-highlight-blue">{formatIN(record.waterHarvestedLiters)}{' '}{t('ui.k215')}</strong>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="button button-outline button-small"
                              onClick={() => setSelectedRecord(record)}
                            >{t('ui.k450')}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* History Pagination */}
              {historyPagination.totalPages > 1 && (
                <div className="adm-pagination-bar" style={{ marginTop: '16px' }}>
                  <span className="adm-pagination-info">{t('ui.k289')}<strong>{historyPagination.page}</strong>{' '}{t('ui.k486')}{' '}<strong>{historyPagination.totalPages}</strong> ({historyPagination.total}{t('ui.k494')}</span>
                  <div className="adm-pagination-controls">
                    <button
                      type="button"
                      className="button button-outline button-small"
                      disabled={historyPagination.page <= 1}
                      onClick={() => fetchHistory(historyPagination.page - 1)}
                    >{t('ui.k501')}</button>
                    <button
                      type="button"
                      className="button button-outline button-small"
                      disabled={historyPagination.page >= historyPagination.totalPages}
                      onClick={() => fetchHistory(historyPagination.page + 1)}
                    >{t('ui.k265')}</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Detail Modal for Past Calculation ─────────────────────────── */}
      {selectedRecord && (
        <div className="adm-modal-backdrop" onClick={() => setSelectedRecord(null)}>
          <div className="adm-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="adm-modal-header">
              <div>
                <span className="adm-badge adm-badge-active">{selectedRecord.calculationType?.replace(/_/g, ' ')}</span>
                <h3 style={{ margin: '6px 0 0', fontSize: '18px' }}>{t('ui.k102')}</h3>
              </div>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setSelectedRecord(null)}
                aria-label={t('ui.a013')}
              >
                ×
              </button>
            </div>

            <div className="adm-modal-body" style={{ display: 'grid', gap: '16px' }}>
              <div>
                <strong>{t('ui.k325')}</strong> {new Date(selectedRecord.createdAt).toLocaleString('en-IN')}
              </div>
              <div>
                <strong>{t('ui.k296')}</strong> {selectedRecord.period}
              </div>

              {selectedRecord.waterSavedLiters > 0 && (
                <div className="calc-savings-row" style={{ background: '#eaf4ee', padding: '10px 14px', borderRadius: '8px' }}>
                  <span>{t('ui.k295')}</span>
                  <strong className="calc-highlight-green">{formatIN(selectedRecord.waterSavedLiters)}{' '}{t('ui.k231')}</strong>
                </div>
              )}

              {selectedRecord.waterHarvestedLiters > 0 && (
                <div className="calc-savings-row" style={{ background: '#e9f2f8', padding: '10px 14px', borderRadius: '8px' }}>
                  <span>{t('ui.k294')}</span>
                  <strong className="calc-highlight-blue">{formatIN(selectedRecord.waterHarvestedLiters)}{' '}{t('ui.k231')}</strong>
                </div>
              )}

              {/* Input Parameters */}
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: '#405648' }}>{t('ui.k207')}</h4>
                <pre style={{ background: '#f5f8f5', padding: '10px', borderRadius: '6px', fontSize: '11px', overflowX: 'auto' }}>
                  {JSON.stringify(selectedRecord.inputParams, null, 2)}
                </pre>
              </div>

              {/* Result Metrics */}
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: '#405648' }}>{t('ui.k352')}</h4>
                <pre style={{ background: '#f5f8f5', padding: '10px', borderRadius: '6px', fontSize: '11px', overflowX: 'auto' }}>
                  {JSON.stringify(selectedRecord.resultMetrics, null, 2)}
                </pre>
              </div>
            </div>

            <div className="adm-modal-footer">
              <button
                type="button"
                className="button button-outline"
                onClick={() => setSelectedRecord(null)}
              >{t('ui.k114')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
