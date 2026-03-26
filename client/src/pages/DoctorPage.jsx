import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { doctorChat, doctorChatReset, bookAppointment, triggerEmergency } from '../services/api';

const CONDITIONS_LIST = [
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'hypertension', label: 'Hypertension' },
  { key: 'asthma', label: 'Asthma' },
  { key: 'heartDisease', label: 'Heart Disease' },
  { key: 'thyroid', label: 'Thyroid Disorder' },
];

// ─── HEALTH ASSESSMENT HELPERS ───
function getBMI(weight, height) {
  if (!weight || !height) return null;
  const hm = height / 100;
  return weight / (hm * hm);
}
function bmiStatus(bmi) {
  if (!bmi) return { label: 'N/A', color: '#888', level: 'unknown' };
  if (bmi < 18.5) return { label: 'Underweight', color: '#ffa726', level: 'warning' };
  if (bmi < 25) return { label: 'Normal', color: '#00e676', level: 'normal' };
  if (bmi < 30) return { label: 'Overweight', color: '#ffa726', level: 'warning' };
  return { label: 'Obese', color: '#ff4757', level: 'danger' };
}
function bpStatus(sys, dia) {
  if (!sys || !dia) return { label: 'N/A', color: '#888', level: 'unknown', detail: '' };
  if (sys < 120 && dia < 80) return { label: 'Normal', color: '#00e676', level: 'normal', detail: 'Optimal blood pressure' };
  if (sys < 130 && dia < 80) return { label: 'Elevated', color: '#ffa726', level: 'warning', detail: 'Consider lifestyle modifications' };
  if (sys < 140 || dia < 90) return { label: 'Stage 1 HTN', color: '#ff9800', level: 'warning', detail: 'Hypertension stage 1 — monitor closely' };
  if (sys < 180 && dia < 120) return { label: 'Stage 2 HTN', color: '#ff4757', level: 'danger', detail: 'Hypertension stage 2 — medication likely needed' };
  return { label: 'CRISIS', color: '#ff1744', level: 'critical', detail: 'Hypertensive crisis — seek immediate care' };
}
function ageRisk(age) {
  if (!age) return { label: 'N/A', color: '#888' };
  if (age < 40) return { label: 'Low Risk', color: '#00e676' };
  if (age < 60) return { label: 'Moderate', color: '#ffa726' };
  return { label: 'Elevated', color: '#ff4757' };
}

export default function DoctorPage() {
  const { user } = useAuth();
  const uid = user?.id || user?._id;

  // ─── PROFILE STATE ───
  const [profile, setProfile] = useState({
    name: user?.name || '', age: '', weight: '', height: '',
    bpSystolic: '', bpDiastolic: '',
    conditions: [], medications: '', allergies: '',
  });
  const [profileSubmitted, setProfileSubmitted] = useState(false);

  // ─── CHAT STATE ───
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [actionRequired, setActionRequired] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [chatExpanded, setChatExpanded] = useState(false);
  const [location, setLocation] = useState({ latitude: null, longitude: null });

  // ─── MODALS ───
  const [apptModal, setApptModal] = useState(false);
  const [appt, setAppt] = useState({ date: '', timeSlot: '' });
  const [apptMsg, setApptMsg] = useState('');
  const [emergModal, setEmergModal] = useState(false);
  const [emergResult, setEmergResult] = useState(null);
  const [emergLoading, setEmergLoading] = useState(false);

  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, typing]);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const wid = navigator.geolocation.watchPosition(
      (p) => setLocation({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => {}, { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(wid);
  }, []);

  // ─── COMPUTED VALUES ───
  const bmi = getBMI(Number(profile.weight), Number(profile.height));
  const bmiInfo = bmiStatus(bmi);
  const bpInfo = bpStatus(Number(profile.bpSystolic), Number(profile.bpDiastolic));
  const ageInfo = ageRisk(Number(profile.age));
  const conditionCount = profile.conditions.length;

  const healthAssessmentText = useCallback(() => {
    const parts = [];
    if (bmi) parts.push(`BMI: ${bmi.toFixed(1)} (${bmiInfo.label})`);
    if (profile.bpSystolic) parts.push(`BP: ${profile.bpSystolic}/${profile.bpDiastolic} (${bpInfo.label})`);
    if (conditionCount > 0) parts.push(`Conditions: ${profile.conditions.join(', ')}`);
    if (profile.medications) parts.push(`Medications: ${profile.medications}`);
    if (profile.allergies) parts.push(`Allergies: ${profile.allergies}`);
    return parts.join('. ');
  }, [bmi, bmiInfo, profile, bpInfo, conditionCount]);

  // ─── PROFILE SUBMIT ───
  const submitProfile = (e) => {
    e.preventDefault();
    setProfileSubmitted(true);
    setChatExpanded(false);
    setMessages([]);
    // Reset Gemini session
    doctorChatReset({ userId: uid }).catch(() => {});
  };

  const toggleCondition = (key) => {
    setProfile(p => ({
      ...p,
      conditions: p.conditions.includes(key) ? p.conditions.filter(c => c !== key) : [...p.conditions, key],
    }));
  };

  // ─── SEND MESSAGE TO GEMINI ───
  const handleSend = async () => {
    if (!input.trim() || typing) return;
    const userText = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', text: userText }]);
    setTyping(true);

    try {
      const res = await doctorChat({
        userId: uid,
        message: userText,
        patientContext: {
          name: profile.name,
          age: profile.age ? Number(profile.age) : undefined,
          weight: profile.weight ? Number(profile.weight) : undefined,
          height: profile.height ? Number(profile.height) : undefined,
          bpSystolic: profile.bpSystolic ? Number(profile.bpSystolic) : undefined,
          bpDiastolic: profile.bpDiastolic ? Number(profile.bpDiastolic) : undefined,
          conditions: profile.conditions,
          medications: profile.medications,
          allergies: profile.allergies,
          healthAssessment: healthAssessmentText(),
        },
      });

      setMessages(m => [...m, { role: 'doctor', text: res.reply }]);

      if (res.actionRequired && res.actionRequired !== 'self_care') {
        setActionRequired(res.actionRequired);
        setActionReason(res.actionReason);
      }
    } catch (err) {
      setMessages(m => [...m, { role: 'doctor', text: `⚠️ ${err.response?.data?.message || err.message || 'Connection error. Please try again.'}` }]);
    }
    setTyping(false);
  };

  const handleReset = async () => {
    setMessages([]);
    setActionRequired(null);
    try { await doctorChatReset({ userId: uid }); } catch {}
  };

  // ─── ACTIONS ───
  const doEmergency = async () => {
    setEmergModal(true); setEmergLoading(true); setEmergResult(null);
    try {
      const d = await triggerEmergency({
        userId: uid,
        condition: 'Critical condition — AI Doctor recommended emergency',
        latitude: location.latitude, longitude: location.longitude,
      });
      setEmergResult(d);
    } catch (err) {
      setEmergResult({ status: 'error', message: err.response?.data?.message || 'Emergency call failed' });
    }
    setEmergLoading(false);
  };

  const doAppt = async (e) => {
    e.preventDefault();
    try {
      const d = await bookAppointment({
        userId: uid, date: appt.date, timeSlot: appt.timeSlot,
        reason: 'AI Doctor recommended consultation',
      });
      setApptMsg(d.message);
      setTimeout(() => { setApptModal(false); setApptMsg(''); }, 2000);
    } catch (err) { setApptMsg(err.response?.data?.message || 'Error'); }
  };

  const onKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  // ─── FORMAT GEMINI MARKDOWN ───
  const renderMd = (text) => {
    // Handle **bold**, *italic*, bullet lists, and line breaks
    return text.split('\n').map((line, i) => {
      const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
      const content = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');

      if (isBullet) {
        const bulletContent = content.replace(/^[\s]*[*-]\s/, '');
        return <div key={i} className="doc-bullet" dangerouslySetInnerHTML={{ __html: '• ' + bulletContent }} />;
      }
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} className="doc-para" dangerouslySetInnerHTML={{ __html: content }} />;
    });
  };

  // ═══════ INTAKE FORM ═══════
  if (!profileSubmitted) {
    return (
      <div className="page">
        <div className="card" style={{ maxWidth: 680, margin: '0 auto' }}>
          <div className="section-header">
            <div className="section-icon cyan" style={{ fontSize: 22 }}>🩺</div>
            <div>
              <h2 style={{ margin: 0 }}>AI Doctor — Patient Intake</h2>
              <p className="helper">Complete your profile for a personalized AI consultation</p>
            </div>
          </div>
          <form onSubmit={submitProfile}>
            <div className="field-row">
              <div className="field"><label>Full Name</label><input value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} placeholder="John Doe" /></div>
              <div className="field"><label>Age</label><input type="number" value={profile.age} onChange={(e) => setProfile({...profile, age: e.target.value})} placeholder="30" /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Weight (kg)</label><input type="number" value={profile.weight} onChange={(e) => setProfile({...profile, weight: e.target.value})} placeholder="70" /></div>
              <div className="field"><label>Height (cm)</label><input type="number" value={profile.height} onChange={(e) => setProfile({...profile, height: e.target.value})} placeholder="175" /></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Blood Pressure — Systolic</label><input type="number" value={profile.bpSystolic} onChange={(e) => setProfile({...profile, bpSystolic: e.target.value})} placeholder="120" /></div>
              <div className="field"><label>Blood Pressure — Diastolic</label><input type="number" value={profile.bpDiastolic} onChange={(e) => setProfile({...profile, bpDiastolic: e.target.value})} placeholder="80" /></div>
            </div>
            <div className="field">
              <label>Existing Medical Conditions</label>
              <div className="doc-conditions">
                {CONDITIONS_LIST.map((c) => (
                  <label key={c.key} className={'doc-cond-chip' + (profile.conditions.includes(c.key) ? ' active' : '')} onClick={() => toggleCondition(c.key)}>
                    <input type="checkbox" checked={profile.conditions.includes(c.key)} onChange={() => {}} style={{ display: 'none' }} />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="field"><label>Current Medications</label><input value={profile.medications} onChange={(e) => setProfile({...profile, medications: e.target.value})} placeholder="e.g., Metformin, Lisinopril, Aspirin" /></div>
            <div className="field"><label>Drug Allergies</label><input value={profile.allergies} onChange={(e) => setProfile({...profile, allergies: e.target.value})} placeholder="e.g., Penicillin, NSAIDs" /></div>
            <button type="submit" className="btn btn-blue" style={{ width: '100%', marginTop: 8 }}>Start Consultation →</button>
          </form>
        </div>
      </div>
    );
  }

  // ═══════ CONSULTATION PAGE ═══════
  return (
    <div className="doc-page">
      {/* ─── PATIENT CONDITION SUMMARY ─── */}
      <div className="doc-summary">
        <div className="doc-summary-header">
          <div>
            <h2>🩺 Patient Health Summary</h2>
            <p className="helper">{profile.name}{profile.age ? `, ${profile.age} yrs` : ''}</p>
          </div>
          <button className="btn-sm btn-outline" onClick={() => setProfileSubmitted(false)}>✏️ Edit Profile</button>
        </div>

        <div className="doc-grid">
          {/* BMI Card */}
          <div className="doc-metric-card">
            <div className="doc-metric-icon">⚖️</div>
            <div className="doc-metric-label">BMI</div>
            <div className="doc-metric-value" style={{ color: bmiInfo.color }}>{bmi ? bmi.toFixed(1) : '—'}</div>
            <div className="doc-metric-badge" style={{ background: bmiInfo.color + '18', color: bmiInfo.color, borderColor: bmiInfo.color + '40' }}>{bmiInfo.label}</div>
            {profile.weight && <div className="doc-metric-detail">{profile.weight}kg / {profile.height}cm</div>}
          </div>

          {/* Blood Pressure Card */}
          <div className="doc-metric-card">
            <div className="doc-metric-icon">🫀</div>
            <div className="doc-metric-label">Blood Pressure</div>
            <div className="doc-metric-value" style={{ color: bpInfo.color }}>
              {profile.bpSystolic ? `${profile.bpSystolic}/${profile.bpDiastolic}` : '—'}
            </div>
            <div className="doc-metric-badge" style={{ background: bpInfo.color + '18', color: bpInfo.color, borderColor: bpInfo.color + '40' }}>{bpInfo.label}</div>
            {bpInfo.detail && <div className="doc-metric-detail">{bpInfo.detail}</div>}
          </div>

          {/* Age Risk Card */}
          <div className="doc-metric-card">
            <div className="doc-metric-icon">📅</div>
            <div className="doc-metric-label">Age Risk Factor</div>
            <div className="doc-metric-value" style={{ color: ageInfo.color }}>{profile.age || '—'}</div>
            <div className="doc-metric-badge" style={{ background: ageInfo.color + '18', color: ageInfo.color, borderColor: ageInfo.color + '40' }}>{ageInfo.label}</div>
          </div>

          {/* Conditions Card */}
          <div className="doc-metric-card">
            <div className="doc-metric-icon">📋</div>
            <div className="doc-metric-label">Conditions</div>
            <div className="doc-metric-value" style={{ color: conditionCount > 0 ? '#ffa726' : '#00e676' }}>{conditionCount}</div>
            <div className="doc-metric-badge" style={{
              background: (conditionCount > 0 ? '#ffa726' : '#00e676') + '18',
              color: conditionCount > 0 ? '#ffa726' : '#00e676',
              borderColor: (conditionCount > 0 ? '#ffa726' : '#00e676') + '40',
            }}>{conditionCount > 0 ? 'Flagged' : 'Clear'}</div>
          </div>
        </div>

        {/* Detail Row */}
        <div className="doc-detail-row">
          {profile.conditions.length > 0 && (
            <div className="doc-detail-card">
              <h4>⚠️ Existing Conditions</h4>
              <div className="doc-tag-list">
                {profile.conditions.map(c => (
                  <span key={c} className="doc-tag warning">{CONDITIONS_LIST.find(x => x.key === c)?.label || c}</span>
                ))}
              </div>
            </div>
          )}
          {profile.medications && (
            <div className="doc-detail-card">
              <h4>💊 Current Medications</h4>
              <p>{profile.medications}</p>
            </div>
          )}
          {profile.allergies && (
            <div className="doc-detail-card">
              <h4>🚫 Drug Allergies</h4>
              <p style={{ color: '#ff4757' }}>{profile.allergies}</p>
            </div>
          )}
          {!profile.conditions.length && !profile.medications && !profile.allergies && (
            <div className="doc-detail-card" style={{ textAlign: 'center' }}>
              <h4>✅ No Pre-existing Conditions</h4>
              <p>All vitals and metrics are within normal range</p>
            </div>
          )}
        </div>

        {/* Action buttons (only when AI recommends) */}
        {actionRequired && actionRequired !== 'self_care' && (
          <div className="doc-action-panel">
            <div className="doc-action-reason">
              <span className="doc-action-icon">{actionRequired === 'emergency' ? '🚨' : '📅'}</span>
              {actionReason}
            </div>
            <div className="doc-action-bar">
              {actionRequired === 'emergency' && <button className="btn btn-red" onClick={doEmergency}>🚑 Emergency Alert</button>}
              <button className="btn btn-blue" onClick={() => setApptModal(true)}>📅 Book Appointment</button>
            </div>
          </div>
        )}
      </div>

      {/* ─── BOTTOM CHAT BAR ─── */}
      <div className={'doc-chatbar' + (chatExpanded ? ' expanded' : '')}>
        <div className="doc-chatbar-header" onClick={() => setChatExpanded(!chatExpanded)}>
          <div className="doc-chatbar-title">
            <span className="doc-chatbar-dot"></span>
            🩺 Dr. Ledger — AI Physician
            <span className="helper" style={{ marginLeft: 8 }}>Powered by Gemini AI</span>
          </div>
          <div className="doc-chatbar-actions">
            {messages.length > 0 && <button className="btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); handleReset(); }}>New</button>}
            <span className="doc-chatbar-toggle">{chatExpanded ? '▼' : '▲'}</span>
          </div>
        </div>

        {chatExpanded && (
          <>
            <div className="doc-chat-messages" ref={chatRef}>
              {messages.length === 0 && (
                <div className="doc-chat-welcome">
                  <p>👋 Hello{profile.name ? ', ' + profile.name : ''}! I'm <strong>Dr. Ledger</strong>, your AI physician powered by Google Gemini.</p>
                  <p>I have access to your health profile. Describe your symptoms or ask me any health question.</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`doc-chat-msg ${msg.role}`}>
                  <div className="doc-chat-label">{msg.role === 'user' ? '🧑 You' : '🩺 Dr. Ledger'}</div>
                  <div className="doc-chat-bubble">
                    {msg.role === 'doctor' ? renderMd(msg.text) : msg.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="doc-chat-msg doctor">
                  <div className="doc-chat-label">🩺 Dr. Ledger</div>
                  <div className="doc-chat-bubble typing">
                    <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                  </div>
                </div>
              )}
            </div>

            <div className="doc-chat-input">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown}
                placeholder="Describe your symptoms or ask a health question..." disabled={typing} />
              <button onClick={handleSend} disabled={typing || !input.trim()}>Send</button>
            </div>
          </>
        )}
      </div>

      {/* ─── APPOINTMENT MODAL ─── */}
      {apptModal && (
        <div className="overlay" onClick={() => setApptModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>📅 Book Appointment</h2>
            <p className="helper" style={{ marginBottom: 14 }}>Recommended by Dr. Ledger</p>
            <form onSubmit={doAppt}>
              <div className="field"><label>Date</label><input type="date" value={appt.date} onChange={(e) => setAppt({...appt, date: e.target.value})} required /></div>
              <div className="field">
                <label>Time Slot</label>
                <select value={appt.timeSlot} onChange={(e) => setAppt({...appt, timeSlot: e.target.value})} required>
                  <option value="">Select</option>
                  <option>09:00 AM</option><option>10:00 AM</option><option>11:00 AM</option>
                  <option>02:00 PM</option><option>03:00 PM</option><option>04:00 PM</option>
                </select>
              </div>
              {apptMsg && <div className="msg msg-success">{apptMsg}</div>}
              <button type="submit" className="btn btn-blue" style={{ width: '100%' }}>Confirm Appointment</button>
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
              <div className="emerg-loading"><div className="emerg-spinner"></div><p>Contacting emergency services...</p></div>
            )}
            {emergResult && !emergLoading && (
              <>
                <div className={'msg ' + (emergResult.status === 'error' ? 'msg-error' : 'msg-success')}>{emergResult.message}</div>
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
                <button className="btn btn-blue" style={{ marginTop: 18, width: '100%' }} onClick={() => setEmergModal(false)}>Close</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
