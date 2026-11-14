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

const CROP_OPTIONS = [
  { value: 'RICE_PADDY', label: 'Rice / Paddy (High ~1200mm)' },
  { value: 'WHEAT', label: 'Wheat (Medium ~450mm)' },
  { value: 'SUGARCANE', label: 'Sugarcane (High ~1800mm)' },
  { value: 'COTTON', label: 'Cotton (Moderate ~700mm)' },
  { value: 'MAIZE', label: 'Maize / Corn (~500mm)' },
  { value: 'PULSES', label: 'Pulses / Legumes (Low ~350mm)' },
  { value: 'VEGETABLES', label: 'Vegetables (~450mm)' },
  { value: 'MILLETS', label: 'Millets / Bajra / Jowar (Low ~300mm)' },
  { value: 'OTHER', label: 'Custom / Other Crop' },
];

export default function WaterCalculator() {
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
      setSuccessNotice('Calculation completed and recorded in database!');
      if (activeTab === 'HISTORY') {
        fetchHistory(1);
      }
    } catch (err) {
      setError(err.message || 'Calculation failed. Please verify your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="calc-page">
      {/* ── Header Banner ──────────────────────────────────────────────── */}
      <div className="knowledge-hero" style={{ minHeight: '220px', marginBottom: '24px' }}>
        <div className="knowledge-hero-content">
          <span className="eyebrow light-eyebrow">MODULE C: SCIENTIFIC DECISION SUPPORT</span>
          <h1>Water Conservation <em>Calculator</em></h1>
          <p>
            Estimate irrigation demands, quantify drip technology water savings, calculate rooftop rainwater harvesting yields, and optimize household domestic water efficiency using verified empirical formulas.
          </p>
        </div>
        <div className="knowledge-hero-stats" style={{ display: 'none' }}></div>
      </div>

      {/* Guest Mode Notice */}
      {!user && (
        <div className="calc-guest-banner" role="status">
          <Info size={18} className="calc-guest-icon" />
          <div className="calc-guest-text">
            <strong>Guest Mode Active:</strong> You can calculate and save live estimations freely.
            <NavLink to="/login" className="calc-guest-link"> Sign in</NavLink> to access your personal historical calculations and track long-term water savings.
          </div>
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
      <nav className="calc-tab-nav" aria-label="Calculator Categories">
        <button
          type="button"
          className={`calc-tab-btn ${activeTab === 'AGRICULTURE' ? 'active' : ''}`}
          onClick={() => { setActiveTab('AGRICULTURE'); setError(null); }}
        >
          <Sprout size={16} />
          <span>Agriculture</span>
        </button>

        <button
          type="button"
          className={`calc-tab-btn ${activeTab === 'DRIP_IRRIGATION' ? 'active' : ''}`}
          onClick={() => { setActiveTab('DRIP_IRRIGATION'); setError(null); }}
        >
          <Waves size={16} />
          <span>Drip Irrigation</span>
        </button>

        <button
          type="button"
          className={`calc-tab-btn ${activeTab === 'RAINWATER_HARVESTING' ? 'active' : ''}`}
          onClick={() => { setActiveTab('RAINWATER_HARVESTING'); setError(null); }}
        >
          <CloudRain size={16} />
          <span>Rainwater Harvest</span>
        </button>

        <button
          type="button"
          className={`calc-tab-btn ${activeTab === 'HOUSEHOLD' ? 'active' : ''}`}
          onClick={() => { setActiveTab('HOUSEHOLD'); setError(null); }}
        >
          <Home size={16} />
          <span>Household Domestic</span>
        </button>

        <button
          type="button"
          className={`calc-tab-btn ${activeTab === 'HISTORY' ? 'active' : ''}`}
          onClick={() => { setActiveTab('HISTORY'); setError(null); }}
        >
          <History size={16} />
          <span>Calculation History</span>
        </button>
      </nav>

      {/* ── TAB 1: AGRICULTURE CALCULATOR ──────────────────────────────── */}
      {activeTab === 'AGRICULTURE' && (
        <div className="calc-card-grid">
          <div className="calc-form-card">
            <div className="calc-card-head">
              <h2>🌾 Agriculture Water Requirement Calculator</h2>
              <p>Estimate net and gross seasonal crop water requirements and identify savings by upgrading from traditional flood methods.</p>
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
                  <label htmlFor="agri-area">Land Area</label>
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
                  <label htmlFor="agri-unit">Area Unit</label>
                  <select
                    id="agri-unit"
                    value={agriForm.unit}
                    onChange={(e) => setAgriForm({ ...agriForm, unit: e.target.value })}
                  >
                    <option value="ACRES">Acres (1 acre = 4,047 m²)</option>
                    <option value="HECTARES">Hectares (1 ha = 10,000 m²)</option>
                  </select>
                </div>
              </div>

              <div className="calc-field">
                <label htmlFor="agri-crop">Crop Type</label>
                <select
                  id="agri-crop"
                  value={agriForm.cropType}
                  onChange={(e) => setAgriForm({ ...agriForm, cropType: e.target.value })}
                >
                  {CROP_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {agriForm.cropType === 'OTHER' && (
                <div className="calc-field">
                  <label htmlFor="agri-depth">Custom Water Depth (mm per season)</label>
                  <input
                    id="agri-depth"
                    type="number"
                    min="50"
                    max="3000"
                    placeholder="e.g. 500"
                    value={agriForm.customWaterDepth}
                    onChange={(e) => setAgriForm({ ...agriForm, customWaterDepth: e.target.value })}
                  />
                </div>
              )}

              <div className="calc-field-row">
                <div className="calc-field">
                  <label htmlFor="agri-method">Current Irrigation Method</label>
                  <select
                    id="agri-method"
                    value={agriForm.irrigationMethod}
                    onChange={(e) => setAgriForm({ ...agriForm, irrigationMethod: e.target.value })}
                  >
                    <option value="FLOOD">Surface / Flood (45% efficiency)</option>
                    <option value="SPRINKLER">Sprinkler System (75% efficiency)</option>
                    <option value="DRIP">Drip / Micro-Irrigation (90% efficiency)</option>
                  </select>
                </div>

                <div className="calc-field">
                  <label htmlFor="agri-seasons">Seasons Per Year</label>
                  <select
                    id="agri-seasons"
                    value={agriForm.seasonsPerYear}
                    onChange={(e) => setAgriForm({ ...agriForm, seasonsPerYear: e.target.value })}
                  >
                    <option value="1">1 Cropping Season / Year</option>
                    <option value="2">2 Cropping Seasons / Year</option>
                    <option value="3">3 Cropping Seasons / Year</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="button button-primary button-wide"
                disabled={submitting}
              >
                {submitting ? 'Calculating…' : 'Calculate & Record Water Usage'}
              </button>
            </form>
          </div>

          {/* Result Panel */}
          <div className="calc-result-card">
            {lastResult && lastResult.calculationType === 'AGRICULTURE' ? (
              <div className="calc-result-body">
                <div className="calc-result-header">
                  <span className="adm-badge adm-badge-active">Estimation Ready</span>
                  <h3>Agriculture Demand Analysis</h3>
                  <p className="calc-result-sub">
                    {lastResult.inputParams?.area} {lastResult.inputParams?.unit?.toLowerCase()} of {lastResult.inputParams?.cropLabel || lastResult.inputParams?.cropType} using {lastResult.inputParams?.irrigationMethod} irrigation.
                  </p>
                </div>

                <div className="calc-metrics-grid">
                  <div className="calc-metric-box">
                    <span className="calc-metric-title">Gross Seasonal Requirement</span>
                    <strong className="calc-metric-number">
                      {formatIN(lastResult.resultMetrics?.grossWaterRequirementLiters)} <span className="calc-unit">L</span>
                    </strong>
                    <span className="calc-metric-sub">Accounting for field application losses</span>
                  </div>

                  <div className="calc-metric-box">
                    <span className="calc-metric-title">Daily Water Requirement</span>
                    <strong className="calc-metric-number">
                      {formatIN(lastResult.resultMetrics?.dailyRequirementLiters)} <span className="calc-unit">L/day</span>
                    </strong>
                    <span className="calc-metric-sub">Over {lastResult.resultMetrics?.durationDays} days duration</span>
                  </div>
                </div>

                {/* Savings Potential Comparison */}
                <div className="calc-savings-box">
                  <h4>💡 Water Savings Potential via Micro-Irrigation</h4>
                  <div className="calc-savings-row">
                    <span>Upgrade to Micro-Drip (90% eff):</span>
                    <strong className="calc-highlight-green">
                      Save {formatIN(lastResult.resultMetrics?.potentialDripSavingsLiters)} L ({lastResult.resultMetrics?.dripSavingsPercent}%)
                    </strong>
                  </div>
                  <div className="calc-savings-row">
                    <span>Upgrade to Sprinkler (75% eff):</span>
                    <strong className="calc-highlight-blue">
                      Save {formatIN(lastResult.resultMetrics?.potentialSprinklerSavingsLiters)} L ({lastResult.resultMetrics?.sprinklerSavingsPercent}%)
                    </strong>
                  </div>
                </div>

                {/* Assumptions Disclosed */}
                <div className="calc-assumptions-box">
                  <div className="calc-assumptions-title">
                    <HelpCircle size={14} />
                    <span>Scientific Assumptions Disclosed</span>
                  </div>
                  <p>
                    Net crop water depth: <strong>{lastResult.resultMetrics?.assumptionsDisclosed?.cropWaterDepthMm} mm</strong>.
                    Method application efficiency: <strong>{lastResult.resultMetrics?.assumptionsDisclosed?.methodEfficiencyPercent}%</strong>.
                    {lastResult.resultMetrics?.assumptionsDisclosed?.note}
                  </p>
                </div>
              </div>
            ) : (
              <div className="calc-result-placeholder">
                <Sprout size={48} className="calc-ph-icon" />
                <h3>Enter field dimensions to calculate</h3>
                <p>Provide your crop acreage and current irrigation method to estimate crop water requirements and potential conservation benefits.</p>
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
              <h2>💧 Drip Irrigation Savings Calculator</h2>
              <p>Quantify precise water conservation and percentage reduction achieved by shifting from conventional surface flooding to micro-drip emitters.</p>
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
                  <label htmlFor="drip-area">Land Area</label>
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
                  <label htmlFor="drip-unit">Unit</label>
                  <select
                    id="drip-unit"
                    value={dripForm.unit}
                    onChange={(e) => setDripForm({ ...dripForm, unit: e.target.value })}
                  >
                    <option value="ACRES">Acres</option>
                    <option value="HECTARES">Hectares</option>
                  </select>
                </div>
              </div>

              <div className="calc-field">
                <label htmlFor="drip-cur-method">Current Baseline Irrigation Method</label>
                <select
                  id="drip-cur-method"
                  value={dripForm.currentMethod}
                  onChange={(e) => setDripForm({ ...dripForm, currentMethod: e.target.value })}
                >
                  <option value="FLOOD">Surface Flood Irrigation (~45% efficiency)</option>
                  <option value="SPRINKLER">Overhead Sprinklers (~75% efficiency)</option>
                </select>
              </div>

              <div className="calc-field-row">
                <div className="calc-field">
                  <label htmlFor="drip-eff">Target Drip Efficiency (%)</label>
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
                  <label htmlFor="drip-seasons">Seasons Per Year</label>
                  <select
                    id="drip-seasons"
                    value={dripForm.seasonsPerYear}
                    onChange={(e) => setDripForm({ ...dripForm, seasonsPerYear: e.target.value })}
                  >
                    <option value="1">1 Season</option>
                    <option value="2">2 Seasons (Kharif + Rabi)</option>
                    <option value="3">3 Seasons (Continuous cropping)</option>
                  </select>
                </div>
              </div>

              <div className="calc-field">
                <label htmlFor="drip-cur-usage">
                  Known Current Usage (Litres/season, optional)
                </label>
                <input
                  id="drip-cur-usage"
                  type="number"
                  placeholder="Leave empty to auto-calculate from standard reference"
                  value={dripForm.currentWaterUsageLiters}
                  onChange={(e) => setDripForm({ ...dripForm, currentWaterUsageLiters: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="button button-primary button-wide"
                disabled={submitting}
              >
                {submitting ? 'Calculating…' : 'Calculate Drip Water Savings'}
              </button>
            </form>
          </div>

          {/* Drip Result */}
          <div className="calc-result-card">
            {lastResult && lastResult.calculationType === 'DRIP_IRRIGATION' ? (
              <div className="calc-result-body">
                <div className="calc-result-header">
                  <span className="adm-badge adm-badge-active">Savings Projected</span>
                  <h3>Drip Conversion Assessment</h3>
                  <p className="calc-result-sub">
                    Transitioning from {lastResult.resultMetrics?.currentMethod} ({lastResult.resultMetrics?.currentEfficiencyPercent}%) to Micro-Drip ({lastResult.resultMetrics?.dripEfficiencyPercent}%).
                  </p>
                </div>

                <div className="calc-metrics-grid">
                  <div className="calc-metric-box">
                    <span className="calc-metric-title">Seasonal Water Saved</span>
                    <strong className="calc-metric-number calc-highlight-green">
                      {formatIN(lastResult.resultMetrics?.waterSavedLiters)} <span className="calc-unit">L</span>
                    </strong>
                    <span className="calc-metric-sub">{lastResult.resultMetrics?.savingsPercent}% water reduction</span>
                  </div>

                  <div className="calc-metric-box">
                    <span className="calc-metric-title">Annualized Water Saved</span>
                    <strong className="calc-metric-number">
                      {formatIN(lastResult.resultMetrics?.annualWaterSavedLiters)} <span className="calc-unit">L/yr</span>
                    </strong>
                    <span className="calc-metric-sub">Across {lastResult.inputParams?.seasonsPerYear} annual seasons</span>
                  </div>
                </div>

                {/* Progress Comparison Bar */}
                <div className="calc-savings-box">
                  <h4>Water Consumption Comparison</h4>
                  <div className="calc-progress-wrap">
                    <div className="calc-progress-row">
                      <span>Baseline ({lastResult.resultMetrics?.currentMethod}):</span>
                      <strong>{formatIN(lastResult.resultMetrics?.currentConsumptionLiters)} L</strong>
                    </div>
                    <div className="calc-bar-track">
                      <div className="calc-bar-fill calc-bar-red" style={{ width: '100%' }} />
                    </div>

                    <div className="calc-progress-row" style={{ marginTop: '10px' }}>
                      <span>With Drip Irrigation:</span>
                      <strong>{formatIN(lastResult.resultMetrics?.dripConsumptionLiters)} L</strong>
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
                    <span>Calculation Disclosures</span>
                  </div>
                  <p>{lastResult.resultMetrics?.assumptionsDisclosed?.note}</p>
                </div>
              </div>
            ) : (
              <div className="calc-result-placeholder">
                <Waves size={48} className="calc-ph-icon" />
                <h3>Compute Micro-Irrigation Savings</h3>
                <p>Compare your current surface application volume against high-efficiency drip systems to see conservation gains.</p>
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
              <h2>🌧️ Rainwater Harvesting Calculator</h2>
              <p>Calculate your annual rooftop rainwater yield and recommended storage tank dimensions based on local rainfall patterns.</p>
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
                <label htmlFor="rwh-roof">Rooftop Catchment Area (m²)</label>
                <input
                  id="rwh-roof"
                  type="number"
                  min="5"
                  max="100000"
                  required
                  value={rwhForm.roofAreaSqM}
                  onChange={(e) => setRwhForm({ ...rwhForm, roofAreaSqM: e.target.value })}
                />
                <span className="calc-field-hint">e.g. 100 m² is typical for a 1,000 sq.ft residential roof.</span>
              </div>

              <div className="calc-field">
                <label htmlFor="rwh-rain">Annual Rainfall (mm)</label>
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
                <span className="calc-presets-label">Indian Regional Rainfall Presets:</span>
                <div className="calc-preset-chips">
                  {CITY_RAINFALL.map((c) => (
                    <button
                      key={c.city}
                      type="button"
                      className="calc-chip"
                      onClick={() => setRwhForm({ ...rwhForm, annualRainfallMm: String(c.mm) })}
                    >
                      {c.city} ({c.mm}mm)
                    </button>
                  ))}
                </div>
              </div>

              <div className="calc-field">
                <label htmlFor="rwh-eff">Runoff / Collection Efficiency (%)</label>
                <input
                  id="rwh-eff"
                  type="number"
                  min="10"
                  max="95"
                  required
                  value={rwhForm.efficiencyPercent}
                  onChange={(e) => setRwhForm({ ...rwhForm, efficiencyPercent: e.target.value })}
                />
                <span className="calc-field-hint">Standard efficiency is 80% (accounting for first-flush rejection and gutter adhesion).</span>
              </div>

              <button
                type="submit"
                className="button button-primary button-wide"
                disabled={submitting}
              >
                {submitting ? 'Calculating…' : 'Calculate Rainwater Potential'}
              </button>
            </form>
          </div>

          {/* RWH Result */}
          <div className="calc-result-card">
            {lastResult && lastResult.calculationType === 'RAINWATER_HARVESTING' ? (
              <div className="calc-result-body">
                <div className="calc-result-header">
                  <span className="adm-badge adm-badge-active">Harvest Potential Calculated</span>
                  <h3>Rooftop Rainwater Harvest</h3>
                  <p className="calc-result-sub">
                    {lastResult.inputParams?.roofAreaSqM} m² roof receiving {lastResult.inputParams?.annualRainfallMm} mm annual rainfall at {lastResult.inputParams?.efficiencyPercent}% collection efficiency.
                  </p>
                </div>

                <div className="calc-metrics-grid">
                  <div className="calc-metric-box">
                    <span className="calc-metric-title">Annual Harvest Volume</span>
                    <strong className="calc-metric-number calc-highlight-blue">
                      {formatIN(lastResult.resultMetrics?.annualHarvestedLiters)} <span className="calc-unit">Litres</span>
                    </strong>
                    <span className="calc-metric-sub">≈ {formatIN(lastResult.resultMetrics?.annualHarvestedLiters / 1000)} kL / m³ per year</span>
                  </div>

                  <div className="calc-metric-box">
                    <span className="calc-metric-title">Monthly Average</span>
                    <strong className="calc-metric-number">
                      {formatIN(lastResult.resultMetrics?.monthlyAverageLiters)} <span className="calc-unit">L/mo</span>
                    </strong>
                    <span className="calc-metric-sub">{formatIN(lastResult.resultMetrics?.dailyAverageLiters)} L/day annualized</span>
                  </div>
                </div>

                <div className="calc-savings-box">
                  <h4>🏗️ Recommended Storage Sizing</h4>
                  <div className="calc-savings-row">
                    <span>Suggested Storage Tank Capacity:</span>
                    <strong className="calc-highlight-green">
                      {formatIN(lastResult.resultMetrics?.recommendedTankCapacityLiters)} Litres
                    </strong>
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#5b7164' }}>
                    Sized to capture peak monsoon showers without immediate overflow while providing a reliable dry-period buffer.
                  </p>
                </div>

                <div className="calc-assumptions-box">
                  <div className="calc-assumptions-title">
                    <HelpCircle size={14} />
                    <span>Scientific Formula</span>
                  </div>
                  <p>
                    <strong>Harvest (L) = Roof Area (m²) × Rainfall (mm) × Runoff Efficiency</strong><br />
                    1 mm of rain falling on 1 m² of roof produces exactly 1 Litre of water before runoff absorption.
                  </p>
                </div>
              </div>
            ) : (
              <div className="calc-result-placeholder">
                <CloudRain size={48} className="calc-ph-icon" />
                <h3>Calculate Rooftop Rainwater Harvest</h3>
                <p>Input your roof catchment area and average annual rainfall to calculate total collectible rainwater.</p>
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
              <h2>🏠 Household Water Consumption Calculator</h2>
              <p>Audit your family's daily domestic consumption and observe how simple conservation fixtures save thousands of litres annually.</p>
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
                <label htmlFor="house-members">Number of Household Members</label>
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
                  <label htmlFor="house-bath">Bathing (L/person/day)</label>
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
                  <label htmlFor="house-toilet">Toilet Flushing (L/person/day)</label>
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
                  <label htmlFor="house-laundry">Laundry (L/household/day)</label>
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
                  <label htmlFor="house-kitchen">Kitchen & Cooking (L/day)</label>
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
                <span className="calc-checkbox-title">Select Conservation Measures to Apply:</span>

                <label className="calc-checkbox-item">
                  <input
                    type="checkbox"
                    checked={houseForm.lowFlowShowerheads}
                    onChange={(e) => setHouseForm({ ...houseForm, lowFlowShowerheads: e.target.checked })}
                  />
                  <span>Low-flow aerated showerheads (~35% bathing reduction)</span>
                </label>

                <label className="calc-checkbox-item">
                  <input
                    type="checkbox"
                    checked={houseForm.dualFlushToilets}
                    onChange={(e) => setHouseForm({ ...houseForm, dualFlushToilets: e.target.checked })}
                  />
                  <span>Dual-flush toilet cisterns (~40% flush reduction)</span>
                </label>

                <label className="calc-checkbox-item">
                  <input
                    type="checkbox"
                    checked={houseForm.aeratedTaps}
                    onChange={(e) => setHouseForm({ ...houseForm, aeratedTaps: e.target.checked })}
                  />
                  <span>Tap aerators in washbasins & kitchen (~25% tap reduction)</span>
                </label>

                <label className="calc-checkbox-item">
                  <input
                    type="checkbox"
                    checked={houseForm.greywaterReuse}
                    onChange={(e) => setHouseForm({ ...houseForm, greywaterReuse: e.target.checked })}
                  />
                  <span>Greywater recycling for toilet & garden (~50% rinse reuse)</span>
                </label>
              </div>

              <button
                type="submit"
                className="button button-primary button-wide"
                disabled={submitting}
              >
                {submitting ? 'Calculating…' : 'Calculate Domestic Water Footprint'}
              </button>
            </form>
          </div>

          {/* Household Result */}
          <div className="calc-result-card">
            {lastResult && lastResult.calculationType === 'HOUSEHOLD' ? (
              <div className="calc-result-body">
                <div className="calc-result-header">
                  <span className="adm-badge adm-badge-active">Footprint Audited</span>
                  <h3>Domestic Consumption Analysis</h3>
                  <p className="calc-result-sub">
                    Family of {lastResult.inputParams?.members} members with selected efficiency upgrades.
                  </p>
                </div>

                <div className="calc-metrics-grid">
                  <div className="calc-metric-box">
                    <span className="calc-metric-title">Annual Water Saved</span>
                    <strong className="calc-metric-number calc-highlight-green">
                      {formatIN(lastResult.resultMetrics?.annualWaterSavedLiters)} <span className="calc-unit">L/yr</span>
                    </strong>
                    <span className="calc-metric-sub">{lastResult.resultMetrics?.savingsPercent}% household reduction</span>
                  </div>

                  <div className="calc-metric-box">
                    <span className="calc-metric-title">Daily Conserved Total</span>
                    <strong className="calc-metric-number">
                      {formatIN(lastResult.resultMetrics?.dailyConservedLiters)} <span className="calc-unit">L/day</span>
                    </strong>
                    <span className="calc-metric-sub">Down from {formatIN(lastResult.resultMetrics?.dailyTotalBaselineLiters)} L/day</span>
                  </div>
                </div>

                <div className="calc-savings-box">
                  <h4>Per-Capita Benchmark Comparison</h4>
                  <div className="calc-savings-row">
                    <span>Your Conserved Usage:</span>
                    <strong>{lastResult.resultMetrics?.perCapitaConservedLiters} LPCD</strong>
                  </div>
                  <div className="calc-savings-row">
                    <span>CPHEEO Urban Benchmark:</span>
                    <strong>135 LPCD (Litres per capita per day)</strong>
                  </div>
                </div>

                <div className="calc-assumptions-box">
                  <div className="calc-assumptions-title">
                    <HelpCircle size={14} />
                    <span>Applied Measures Breakdown</span>
                  </div>
                  <ul className="calc-measures-list">
                    {Object.entries(lastResult.resultMetrics?.measureBreakdown || {}).map(([key, val]) => (
                      <li key={key}>
                        <strong>{key}:</strong> Saves {formatIN(val)} L/day ({formatIN(val * 365)} L/year)
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="calc-result-placeholder">
                <Home size={48} className="calc-ph-icon" />
                <h3>Audit Domestic Consumption</h3>
                <p>Provide your family size and select water-saving fixtures to model annual consumption and savings.</p>
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
              <h2>📜 Your Saved Calculation History</h2>
              <p>Chronological record of your agricultural, drip, rainwater, and household calculations.</p>
            </div>
            {user && (
              <button
                type="button"
                className="button button-outline button-small"
                onClick={() => fetchHistory(historyPagination.page)}
                disabled={loadingHistory}
              >
                <RefreshCw size={13} />
                <span>{loadingHistory ? 'Refreshing…' : 'Refresh History'}</span>
              </button>
            )}
          </div>

          {!user ? (
            <div className="calc-history-auth-needed">
              <Droplets size={44} className="calc-ph-icon" />
              <h3>Sign in to view your calculation history</h3>
              <p>Your previous calculations are linked to your user account. Log in to review past savings estimates and water audit models.</p>
              <NavLink to="/login" className="button button-primary">
                Sign In to View History
              </NavLink>
            </div>
          ) : (
            <div>
              {/* Filter */}
              <div className="calc-history-filters">
                <label htmlFor="history-filter-select">Filter by Calculation Type:</label>
                <select
                  id="history-filter-select"
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                >
                  <option value="ALL">All Types</option>
                  <option value="AGRICULTURE">Agriculture</option>
                  <option value="DRIP_IRRIGATION">Drip Irrigation</option>
                  <option value="RAINWATER_HARVESTING">Rainwater Harvesting</option>
                  <option value="HOUSEHOLD">Household</option>
                </select>
              </div>

              {loadingHistory ? (
                <div className="adm-loading-state">
                  <div className="adm-spinner" />
                  <p>Loading your calculation history…</p>
                </div>
              ) : history.length === 0 ? (
                <div className="adm-empty-state">
                  <History size={40} />
                  <h3>No calculations found</h3>
                  <p>You haven't recorded any {historyFilter !== 'ALL' ? historyFilter.toLowerCase().replace('_', ' ') : ''} calculations yet. Run a calculation above to record your first estimation!</p>
                </div>
              ) : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Period</th>
                        <th>Water Saved</th>
                        <th>Water Harvested</th>
                        <th>Action</th>
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
                              <strong className="calc-highlight-green">{formatIN(record.waterSavedLiters)} L</strong>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            {record.waterHarvestedLiters > 0 ? (
                              <strong className="calc-highlight-blue">{formatIN(record.waterHarvestedLiters)} L</strong>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="button button-outline button-small"
                              onClick={() => setSelectedRecord(record)}
                            >
                              View Details
                            </button>
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
                  <span className="adm-pagination-info">
                    Page <strong>{historyPagination.page}</strong> of <strong>{historyPagination.totalPages}</strong> ({historyPagination.total} total)
                  </span>
                  <div className="adm-pagination-controls">
                    <button
                      type="button"
                      className="button button-outline button-small"
                      disabled={historyPagination.page <= 1}
                      onClick={() => fetchHistory(historyPagination.page - 1)}
                    >
                      ← Previous
                    </button>
                    <button
                      type="button"
                      className="button button-outline button-small"
                      disabled={historyPagination.page >= historyPagination.totalPages}
                      onClick={() => fetchHistory(historyPagination.page + 1)}
                    >
                      Next →
                    </button>
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
                <h3 style={{ margin: '6px 0 0', fontSize: '18px' }}>Calculation Details</h3>
              </div>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setSelectedRecord(null)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="adm-modal-body" style={{ display: 'grid', gap: '16px' }}>
              <div>
                <strong>Recorded On:</strong> {new Date(selectedRecord.createdAt).toLocaleString('en-IN')}
              </div>
              <div>
                <strong>Period:</strong> {selectedRecord.period}
              </div>

              {selectedRecord.waterSavedLiters > 0 && (
                <div className="calc-savings-row" style={{ background: '#eaf4ee', padding: '10px 14px', borderRadius: '8px' }}>
                  <span>Period Water Saved:</span>
                  <strong className="calc-highlight-green">{formatIN(selectedRecord.waterSavedLiters)} Litres</strong>
                </div>
              )}

              {selectedRecord.waterHarvestedLiters > 0 && (
                <div className="calc-savings-row" style={{ background: '#e9f2f8', padding: '10px 14px', borderRadius: '8px' }}>
                  <span>Period Water Harvested:</span>
                  <strong className="calc-highlight-blue">{formatIN(selectedRecord.waterHarvestedLiters)} Litres</strong>
                </div>
              )}

              {/* Input Parameters */}
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: '#405648' }}>Input Parameters</h4>
                <pre style={{ background: '#f5f8f5', padding: '10px', borderRadius: '6px', fontSize: '11px', overflowX: 'auto' }}>
                  {JSON.stringify(selectedRecord.inputParams, null, 2)}
                </pre>
              </div>

              {/* Result Metrics */}
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: '#405648' }}>Result Metrics</h4>
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
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
