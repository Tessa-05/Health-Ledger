import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLogs } from '../services/api';

export default function LogsPage() {
  const { user } = useAuth();
  const uid = user?.id || user?._id;
  const [logList, setLogList] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (uid) fetchLogs(); }, [uid, filter]);

  const fetchLogs = async () => {
    setLoading(true);
    try { const d = await getLogs(uid, filter || undefined); setLogList(d.logs); } catch {}
    setLoading(false);
  };

  const types = ['', 'alert', 'appointment', 'recommendation', 'symptom'];

  return (
    <div className="page">
      <div className="card">
        <h2>Activity Log</h2>
        <div className="filter-row">
          {types.map((t) => (
            <button key={t} className={'filter-btn' + (filter === t ? ' active' : '')} onClick={() => setFilter(t)}>
              {t || 'All'}
            </button>
          ))}
        </div>

        {loading ? <p className="helper">Loading...</p> : logList.length === 0 ? <p className="helper">No logs found.</p> : (
          <table className="table">
            <thead>
              <tr><th>Time</th><th>Type</th><th>Event</th></tr>
            </thead>
            <tbody>
              {logList.map((log) => (
                <tr key={log.id}>
                  <td className="cell-time">{log.time}</td>
                  <td><span className={'type-badge type-' + log.type}>{log.type}</span></td>
                  <td>{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
