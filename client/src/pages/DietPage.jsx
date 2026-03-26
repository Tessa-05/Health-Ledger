import { useState } from 'react';
import { getDiet } from '../services/api';

export default function DietPage() {
  const [form, setForm] = useState({ heartRate: '72', spo2: '98', temperature: '98.6' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const d = await getDiet({ vitals: { heartRate: Number(form.heartRate), spo2: Number(form.spo2), temperature: Number(form.temperature), ecg: { rhythm: 'regular', hrv: 'normal' } } });
      setResult(d);
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
    setLoading(false);
  };

  return (
    <div className="page">
      <div className="card">
        <h2>Diet & Lifestyle Guidance</h2>
        <p className="helper">Get personalized recommendations based on your current health condition.</p>
        <form onSubmit={submit}>
          <div className="grid-3">
            <div className="field"><label>Heart Rate</label><input type="number" value={form.heartRate} onChange={(e) => setForm({ ...form, heartRate: e.target.value })} required /></div>
            <div className="field"><label>SpO2</label><input type="number" value={form.spo2} onChange={(e) => setForm({ ...form, spo2: e.target.value })} required /></div>
            <div className="field"><label>Temperature</label><input type="number" step="0.1" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} required /></div>
          </div>
          <button type="submit" className="btn btn-blue" disabled={loading}>{loading ? 'Loading...' : 'Get Recommendations'}</button>
        </form>
      </div>

      {result && (
        <div className="grid-3">
          <div className="card">
            <h3 className="text-ok">✓ Recommended</h3>
            <ul className="diet-list">{result.recommended.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </div>
          <div className="card">
            <h3 className="text-danger">✗ Avoid</h3>
            <ul className="diet-list">{result.avoid.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </div>
          <div className="card">
            <h3 className="text-blue">↑ Lifestyle</h3>
            <ul className="diet-list">{result.lifestyle.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </div>
        </div>
      )}
    </div>
  );
}
