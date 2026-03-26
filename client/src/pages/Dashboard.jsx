import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { analyzeVitals, bookAppointment, triggerEmergency } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/* ─── REALISTIC VITAL SIMULATION ─── */
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

function randomWalk(current, target, step, min, max) {
  const drift = (target - current) * 0.05;
  const noise = (Math.random() - 0.5) * step;
  return clamp(current + drift + noise, min, max);
}

function generateNormalVitals(prev) {
  return {
    heartRate: Math.round(randomWalk(prev.heartRate, 76, 4, 62, 100)),
    spo2: Math.round(randomWalk(prev.spo2, 97, 1.2, 94, 99)),
    temperature: parseFloat(randomWalk(prev.temperature, 98.4, 0.2, 97.0, 99.2).toFixed(1)),
    rhythm: 'regular',
    hrv: 'normal',
  };
}

/* ─── GRADUAL CRITICAL ESCALATION ─── */
const ESCALATION_STEPS = [
  { heartRate: 88,  spo2: 96, temperature: 98.8 },
  { heartRate: 95,  spo2: 95, temperature: 99.2 },
  { heartRate: 105, spo2: 93, temperature: 99.8 },
  { heartRate: 115, spo2: 91, temperature: 100.5 },
  { heartRate: 125, spo2: 89, temperature: 101.2 },
  { heartRate: 130, spo2: 87, temperature: 101.8 },
  { heartRate: 135, spo2: 86, temperature: 102.2 },
  { heartRate: 140, spo2: 85, temperature: 102.5 },
];

function generateEscalatingVitals(step, prev) {
  const idx = Math.min(step, ESCALATION_STEPS.length - 1);
  const target = ESCALATION_STEPS[idx];
  // Smooth walk toward target for realism
  return {
    heartRate: Math.round(randomWalk(prev.heartRate, target.heartRate, 3, 60, 160)),
    spo2: Math.round(randomWalk(prev.spo2, target.spo2, 1, 80, 99)),
    temperature: parseFloat(randomWalk(prev.temperature, target.temperature, 0.2, 97, 104).toFixed(1)),
    rhythm: step >= 3 ? 'irregular' : 'regular',
    hrv: step >= 2 ? 'low' : 'normal',
  };
}

/* ─── HEALTH SCORE (client-side fallback) ─── */
function calcHealthScore(v) {
  let score = 100;
  if (v.heartRate > 110) score -= 15;
  else if (v.heartRate > 100) score -= 10;
  else if (v.heartRate > 90) score -= 3;
  if (v.heartRate < 55) score -= 12;
  else if (v.heartRate < 60) score -= 5;
  if (v.spo2 < 90) score -= 25;
  else if (v.spo2 < 92) score -= 18;
  else if (v.spo2 < 95) score -= 10;
  else if (v.spo2 < 96) score -= 4;
  if (v.temperature > 102) score -= 15;
  else if (v.temperature > 100) score -= 10;
  else if (v.temperature > 99) score -= 5;
  if (v.temperature < 96.5) score -= 8;
  if (v.rhythm === 'irregular') score -= 10;
  if (v.hrv === 'low') score -= 5;
  return clamp(Math.round(score), 0, 100);
}

/* ─── SVG Health Score Ring ─── */
function ScoreRing({ score }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score > 80 ? '#00e676' : score >= 60 ? '#ffa726' : '#ff4757';

  return (
    <div className="score-ring-wrap">
      <svg className="score-ring-svg" viewBox="0 0 100 100">
        <circle className="track" cx="50" cy="50" r={radius} />
        <circle
          className="fill"
          cx="50" cy="50" r={radius}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="score-val" style={{ color }}>{score}</span>
    </div>
  );
}

const MAX_POINTS = 30;
const SIM_INTERVAL = 1500;
const ANALYSIS_EVERY = 5;

export default function Dashboard() {
  const { user } = useAuth();
  const uid = user?.id || user?._id;

  const [vitals, setVitals] = useState({ heartRate: 75, spo2: 97, temperature: 98.4, rhythm: 'regular', hrv: 'normal' });
  const [history, setHistory] = useState([]);
  const [monitoring, setMonitoring] = useState(false);
  const [critical, setCritical] = useState(false);
  const [result, setResult] = useState(null);
  const [healthScore, setHealthScore] = useState(92);
  const [modal, setModal] = useState(false);
  const [appt, setAppt] = useState({ date: '', timeSlot: '' });
  const [apptMsg, setApptMsg] = useState('');
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [emergModal, setEmergModal] = useState(false);
  const [emergResult, setEmergResult] = useState(null);
  const [emergLoading, setEmergLoading] = useState(false);

  const intervalRef = useRef(null);
  const tickRef = useRef(0);
  const vitalsRef = useRef(vitals);
  const criticalRef = useRef(false);
  const escalationStepRef = useRef(0);
  const autoTriggeredRef = useRef(false);
  const snapshotRef = useRef(null);

  // Keep refs in sync
  useEffect(() => { vitalsRef.current = vitals; }, [vitals]);
  useEffect(() => { criticalRef.current = critical; }, [critical]);

  // Continuously track location
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => console.log('Geolocation denied'),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  /* ─── SIMULATION TICK ─── */
  const tick = useCallback(async () => {
    const prev = vitalsRef.current;
    let next;

    if (criticalRef.current) {
      // Gradual escalation
      next = generateEscalatingVitals(escalationStepRef.current, prev);
      escalationStepRef.current = Math.min(escalationStepRef.current + 1, ESCALATION_STEPS.length - 1);
    } else {
      next = generateNormalVitals(prev);
    }

    const score = calcHealthScore(next);
    setVitals(next);
    setHealthScore(score);

    setHistory((h) => {
      const ts = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const point = { t: ts, hr: next.heartRate, spo2: next.spo2, temp: next.temperature };
      const updated = [...h, point];
      return updated.length > MAX_POINTS ? updated.slice(-MAX_POINTS) : updated;
    });

    // Run analysis every Nth tick
    tickRef.current++;
    if (tickRef.current % ANALYSIS_EVERY === 0 && uid) {
      try {
        const data = await analyzeVitals({
          userId: uid,
          heartRate: next.heartRate,
          spo2: next.spo2,
          temperature: next.temperature,
          ecg: { rhythm: next.rhythm, hrv: next.hrv },
        });
        setResult(data);

        // Use server-computed health score if available
        if (data.healthScore != null) {
          setHealthScore(data.healthScore);
        }

        // Auto-trigger emergency if critical detected
        const isCritical = (data.mlPredictions?.cardiac_risk > 0.8) ||
          (data.mlPredictions?.hypoxia > 0.8) ||
          data.alerts?.length > 0;
        if (isCritical && !autoTriggeredRef.current) {
          autoTriggeredRef.current = true;
          // EMERGENCY SNAPSHOT: Freeze current values for emergency
          snapshotRef.current = {
            vitals: { heartRate: next.heartRate, spo2: next.spo2, temperature: next.temperature },
            analysis: data,
          };
          setTimeout(() => doEmergencyAuto(data, next), 500);
        }
      } catch {}
    }
  }, [uid]);

  /* ─── START / STOP ─── */
  const toggleMonitoring = () => {
    if (monitoring) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setMonitoring(false);
    } else {
      tickRef.current = 0;
      setMonitoring(true);
      tick();
      intervalRef.current = setInterval(tick, SIM_INTERVAL);
    }
  };

  const triggerCritical = () => {
    setCritical(true);
    escalationStepRef.current = 0;
    if (!monitoring) {
      tickRef.current = 0;
      setMonitoring(true);
      tick();
      intervalRef.current = setInterval(tick, SIM_INTERVAL);
    }
  };

  const resetCritical = () => {
    setCritical(false);
    escalationStepRef.current = 0;
    autoTriggeredRef.current = false;
    snapshotRef.current = null;
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  /* ─── ACTIONS ─── */
  const fireEmergency = async (conditionText, currentVitals, mlPreds) => {
    setEmergModal(true);
    setEmergLoading(true);
    setEmergResult(null);
    try {
      const d = await triggerEmergency({
        userId: uid,
        condition: conditionText,
        latitude: location.latitude,
        longitude: location.longitude,
        vitals: currentVitals,
        mlPredictions: mlPreds,
      });
      setEmergResult(d);
    } catch (err) {
      setEmergResult({ status: 'error', message: err.response?.data?.message || 'Emergency call failed' });
    }
    setEmergLoading(false);
  };

  const doEmergency = () => {
    // Use snapshot if available, otherwise current
    const snap = snapshotRef.current;
    const v = snap?.vitals || { heartRate: vitals.heartRate, spo2: vitals.spo2, temperature: vitals.temperature };
    const insight = snap?.analysis?.insight || result?.insight || 'Critical vitals detected';
    const mlPreds = snap?.analysis?.mlPredictions || result?.mlPredictions || null;
    fireEmergency(insight, v, mlPreds);
  };

  const doEmergencyAuto = (data, currentVitals) => {
    fireEmergency(
      data.insight || 'Critical condition auto-detected',
      { heartRate: currentVitals.heartRate, spo2: currentVitals.spo2, temperature: currentVitals.temperature },
      data.mlPredictions || null,
    );
  };

  const doAppt = async (e) => {
    e.preventDefault();
    try {
      const d = await bookAppointment({ userId: uid, date: appt.date, timeSlot: appt.timeSlot, reason: result?.insight || 'Consultation' });
      setApptMsg(d.message);
      setTimeout(() => { setModal(false); setApptMsg(''); }, 2000);
    } catch (err) { setApptMsg(err.response?.data?.message || 'Error'); }
  };

  /* ─── HELPERS ─── */
  const riskColor = (level) => level === 'high' ? '#ff4757' : level === 'moderate' ? '#ffa726' : '#00e676';
  const pct = (v) => (v * 100).toFixed(0);
  const isCrit = critical || healthScore < 60;

  const vitalClass = (val, type) => {
    if (type === 'hr') return val > 110 || val < 55 ? 'danger' : val > 100 ? 'warning' : '';
    if (type === 'spo2') return val < 90 ? 'danger' : val < 95 ? 'warning' : '';
    if (type === 'temp') return val > 101 ? 'danger' : val > 99.5 ? 'warning' : '';
    if (type === 'ecg') return val === 'irregular' ? 'danger' : '';
    return '';
  };

  return (
    <div className="page">
      {/* ─── CONTROLS ─── */}
      <div className="card control-bar">
        <div className="control-left">
          <button className={'btn ' + (monitoring ? 'btn-red' : 'btn-blue')} onClick={toggleMonitoring}>
            {monitoring ? '⏹ Stop Monitoring' : '▶ Start Monitoring'}
          </button>
          {monitoring && !critical && (
            <button className="btn btn-crit" onClick={triggerCritical}>⚡ Trigger Critical</button>
          )}
          {critical && (
            <button className="btn btn-blue" onClick={resetCritical}>↺ Reset to Normal</button>
          )}
        </div>
        <div className="control-right">
          <div className="status-dot" style={{ background: monitoring ? (critical ? '#ff4757' : '#00e676') : '#555', color: monitoring ? (critical ? '#ff4757' : '#00e676') : '#555' }}></div>
          <span className="status-text">{monitoring ? (critical ? 'CRITICAL' : 'Monitoring') : 'Idle'}</span>
        </div>
      </div>

      {/* ─── LIVE VITALS ─── */}
      <div className={'grid-4' + (isCrit ? ' crit-glow' : '')}>
        <div className="card vital-card">
          <div className="vital-icon-wrap hr-icon">
            {monitoring && <span className="pulse-dot"></span>}
          </div>
          <span className={`vital-num ${vitalClass(vitals.heartRate, 'hr')}`}>{vitals.heartRate}</span>
          <span className="vital-lbl">Heart Rate <small>bpm</small></span>
        </div>
        <div className="card vital-card">
          <span className={`vital-num ${vitalClass(vitals.spo2, 'spo2')}`}>{vitals.spo2}</span>
          <span className="vital-lbl">SpO2 <small>%</small></span>
        </div>
        <div className="card vital-card">
          <span className={`vital-num ${vitalClass(vitals.temperature, 'temp')}`}>{vitals.temperature}</span>
          <span className="vital-lbl">Temperature <small>°F</small></span>
        </div>
        <div className="card vital-card">
          <span className={`vital-num ecg-val ${vitalClass(vitals.rhythm, 'ecg')}`}>{vitals.rhythm}</span>
          <span className="vital-lbl">ECG <small>HRV: {vitals.hrv}</small></span>
        </div>
      </div>

      {/* ─── HEALTH SCORE + ANOMALY ─── */}
      <div className={'card score-card' + (isCrit ? ' score-crit' : '')}>
        <ScoreRing score={healthScore} />
        <div className="score-info">
          <h2>Health Score</h2>
          <p className="helper">Composite metric from ML predictions, anomaly detection, and trends</p>
          <span className="score-level" style={{ color: healthScore > 80 ? '#00e676' : healthScore >= 60 ? '#ffa726' : '#ff4757' }}>
            {healthScore > 80 ? '● Normal' : healthScore >= 60 ? '● Moderate' : '● Critical'}
          </span>
        </div>
        {result?.anomaly && (
          <div className="anomaly-section" style={{ marginLeft: 'auto' }}>
            <span className={`anomaly-dot ${result.anomaly.status}`}></span>
            <div className="anomaly-text">
              <strong>Anomaly Detection</strong><br />
              <span style={{ color: result.anomaly.status === 'abnormal' ? '#ff4757' : '#00e676' }}>
                {result.anomaly.status === 'abnormal' ? '⚠ Abnormal Pattern' : '✓ Normal Pattern'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── FLOWING GRAPHS ─── */}
      {history.length > 1 && (
        <div className="card">
          <div className="section-header">
            <div className="section-icon cyan">📊</div>
            <h2 style={{ margin: 0 }}>Real-Time Trends</h2>
          </div>
          <div className="grid-3">
            <div>
              <h3 className="chart-title">Heart Rate</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="t" stroke="#555" fontSize={10} interval="preserveStartEnd" />
                  <YAxis stroke="#555" fontSize={12} domain={[50, 150]} />
                  <Tooltip contentStyle={{ background: 'rgba(18,18,48,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e8e8f0' }} />
                  <Line type="monotone" dataKey="hr" stroke="#ff4757" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 className="chart-title">SpO2</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="t" stroke="#555" fontSize={10} interval="preserveStartEnd" />
                  <YAxis stroke="#555" fontSize={12} domain={[80, 100]} />
                  <Tooltip contentStyle={{ background: 'rgba(18,18,48,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e8e8f0' }} />
                  <Line type="monotone" dataKey="spo2" stroke="#00d4ff" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 className="chart-title">Temperature</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="t" stroke="#555" fontSize={10} interval="preserveStartEnd" />
                  <YAxis stroke="#555" fontSize={12} domain={[96, 105]} />
                  <Tooltip contentStyle={{ background: 'rgba(18,18,48,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e8e8f0' }} />
                  <Line type="monotone" dataKey="temp" stroke="#ffa726" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─── ANALYSIS RESULTS ─── */}
      {result && (
        <>
          {/* Trend Insights */}
          {result.trends?.length > 0 && (
            <div className="card">
              <div className="section-header">
                <div className="section-icon orange">📈</div>
                <h2 style={{ margin: 0 }}>Trend Analysis</h2>
              </div>
              <div className="trend-list">
                {result.trends.map((t, i) => (
                  <div key={i} className="trend-item">
                    <span className={`trend-arrow ${t.direction === 'increasing' ? 'up' : 'down'}`}>
                      {t.direction === 'increasing' ? '↑' : '↓'}
                    </span>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{t.label}</strong>
                      <p className="sub">{t.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Health Report */}
          <div className="card">
            <div className="section-header">
              <div className="section-icon cyan">🩺</div>
              <h2 style={{ margin: 0 }}>Health Report</h2>
            </div>
            {result.healthReport.filter((r) => r.severity !== 'normal').length === 0 ? (
              <p className="text-ok">✓ All vitals within normal range.</p>
            ) : (
              <ul className="report-list">
                {result.healthReport.filter((r) => r.severity !== 'normal').map((r, i) => (
                  <li key={i} className={'report-item sev-' + r.severity}>
                    <span className="badge">{r.severity}</span> {r.label}
                    <p className="sub">{r.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Clinical Insight */}
          <div className="card">
            <div className="section-header">
              <div className="section-icon purple">🧠</div>
              <h2 style={{ margin: 0 }}>Clinical Insight</h2>
            </div>
            <p className="insight">{result.insight}</p>
          </div>

          {/* ML Predictions */}
          {result.mlPredictions && (
            <div className="card">
              <div className="section-header">
                <div className="section-icon cyan">🤖</div>
                <h2 style={{ margin: 0 }}>ML Predictions</h2>
              </div>
              <p className="helper" style={{ marginBottom: 14 }}>Multi-label XGBoost classification with Isolation Forest anomaly detection</p>
              <div className="grid-4">
                {Object.entries(result.mlPredictions).map(([key, val]) => {
                  const level = result.mlRiskLevels?.[key] || 'low';
                  const color = riskColor(level);
                  return (
                    <div key={key} className="ml-tile">
                      <div className="ml-bar-track"><div className="ml-bar" style={{ width: pct(val) + '%', background: color }}></div></div>
                      <span className="ml-pct" style={{ color }}>{pct(val)}%</span>
                      <span className="ml-label">{key.replace('_', ' ')}</span>
                      <span className="ml-level" style={{ color }}>{level}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="card">
            <div className="section-header">
              <div className="section-icon green">💡</div>
              <h2 style={{ margin: 0 }}>Recommendations</h2>
            </div>
            <ul className="rec-list">{result.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </div>

          {/* Diet & Lifestyle */}
          {result.diet && (
            <div className="card">
              <div className="section-header">
                <div className="section-icon green">🥗</div>
                <h2 style={{ margin: 0 }}>Diet & Lifestyle</h2>
              </div>
              {result.diet.matchedConditions && (
                <p className="helper" style={{ marginBottom: 12 }}>
                  Based on: {result.diet.matchedConditions.join(', ')}
                </p>
              )}
              <div className="diet-grid">
                <div className="card diet-card-rec" style={{ padding: '14px 16px' }}>
                  <h3 className="text-ok" style={{ fontSize: 14, marginBottom: 8 }}>✓ Recommended</h3>
                  <ul className="diet-list">
                    {(result.diet.recommended || []).slice(0, 5).map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
                <div className="card diet-card-avoid" style={{ padding: '14px 16px' }}>
                  <h3 className="text-danger" style={{ fontSize: 14, marginBottom: 8 }}>✗ Avoid</h3>
                  <ul className="diet-list">
                    {(result.diet.avoid || []).slice(0, 5).map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Alerts */}
          {result.alerts.length > 0 && (
            <div className="card card-alert">
              <div className="section-header">
                <div className="section-icon red">🚨</div>
                <h2 style={{ margin: 0, color: '#ff4757' }}>Critical Alerts</h2>
              </div>
              {result.alerts.map((a, i) => (
                <div key={i} className="alert-row"><strong>{a.message}</strong><p>{a.action}</p></div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="section-header" style={{ justifyContent: 'center' }}>
              <div className="section-icon cyan">⚡</div>
              <h2 style={{ margin: 0 }}>Actions</h2>
            </div>
            <div className="action-btns">
              <button className="btn btn-blue" onClick={() => setModal(true)}>📅 Book Appointment</button>
              <button className="btn btn-red" onClick={doEmergency}>🚑 Emergency Alert</button>
            </div>
            <p className="helper" style={{ marginTop: 14 }}>Decision: <strong style={{ color: 'var(--text-primary)' }}>{result.decision?.actionType}</strong></p>
            {location.latitude && <p className="helper">📍 Location acquired ({location.latitude.toFixed(4)}, {location.longitude.toFixed(4)})</p>}
          </div>
        </>
      )}

      {/* ─── APPOINTMENT MODAL ─── */}
      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Book Appointment</h2>
            <form onSubmit={doAppt}>
              <div className="field"><label>Date</label><input type="date" value={appt.date} onChange={(e) => setAppt({ ...appt, date: e.target.value })} required /></div>
              <div className="field">
                <label>Time Slot</label>
                <select value={appt.timeSlot} onChange={(e) => setAppt({ ...appt, timeSlot: e.target.value })} required>
                  <option value="">Select</option>
                  <option>09:00 AM</option><option>10:00 AM</option><option>11:00 AM</option>
                  <option>02:00 PM</option><option>03:00 PM</option><option>04:00 PM</option>
                </select>
              </div>
              {apptMsg && <div className="msg msg-success">{apptMsg}</div>}
              <button type="submit" className="btn btn-blue" style={{ width: '100%' }}>Confirm</button>
            </form>
          </div>
        </div>
      )}

      {/* ─── EMERGENCY MODAL ─── */}
      {emergModal && (
        <div className="overlay" onClick={() => !emergLoading && setEmergModal(false)}>
          <div className="modal emerg-modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: '#ff4757' }}>🚨 Emergency Alert</h2>

            {emergLoading && (
              <div className="emerg-loading">
                <div className="emerg-spinner"></div>
                <p>Contacting emergency services...</p>
                <p className="helper">Placing voice call and sending SMS</p>
              </div>
            )}

            {emergResult && !emergLoading && (
              <>
                <div className={'msg ' + (emergResult.status === 'error' ? 'msg-error' : 'msg-success')}>
                  {emergResult.message}
                </div>

                {emergResult.steps && (
                  <div className="emerg-steps">
                    {emergResult.steps.map((s) => (
                      <div key={s.step} className={'emerg-step step-' + s.status}>
                        <span className="step-icon">{s.status === 'complete' ? '✓' : s.status === 'failed' ? '✗' : '⋯'}</span>
                        {s.action}
                      </div>
                    ))}
                  </div>
                )}

                {emergResult.location && (
                  <div className="emerg-location">
                    <strong>📍 Patient Location:</strong>
                    <p>{emergResult.location.name || 'Resolving address...'}</p>
                    <a href={emergResult.location.mapsLink} target="_blank" rel="noopener noreferrer" className="btn-sm btn-outline" style={{ marginTop: 8, display: 'inline-flex' }}>
                      Open in Google Maps
                    </a>
                  </div>
                )}

                {emergResult.call?.voiceMessage && (
                  <div className="emerg-msg-preview">
                    <strong>Voice Message Sent:</strong>
                    <p className="sub">{emergResult.call.voiceMessage}</p>
                  </div>
                )}

                {emergResult.call?.demo && (
                  <p className="helper" style={{ marginTop: 12 }}>ℹ️ Running in demo mode — configure Twilio credentials for live calls</p>
                )}

                {emergResult.instructions && (
                  <div style={{ marginTop: 14 }}>
                    <strong>Instructions:</strong>
                    <ul className="rec-list" style={{ marginTop: 8 }}>
                      {emergResult.instructions.map((ins, i) => <li key={i}>{ins}</li>)}
                    </ul>
                  </div>
                )}

                <button className="btn btn-blue" style={{ marginTop: 18, width: '100%' }} onClick={() => setEmergModal(false)}>Close</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
