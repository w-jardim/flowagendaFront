import { useEffect, useState } from 'react';
import api from '../services/api';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function AdminLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [techMetrics, setTechMetrics] = useState([]);

  useEffect(() => { fetchLogs(); fetchTech(); }, []);

  async function fetchLogs() {
    setLoading(true); setError('');
    try {
      const resp = await api.get('/logs/frontend');
      const data = Array.isArray(resp.data) ? resp.data : resp.data?.results ?? [];
      setLogs(data);
    } catch (e) {
      console.error('Erro ao carregar logs:', e);
      setError('Erro ao carregar logs.');
      setLogs([]);
    } finally { setLoading(false); }
  }

  async function fetchTech() {
    try {
      const resp = await api.get('/admin/metrics/technical');
      const data = Array.isArray(resp.data) ? resp.data : resp.data?.results ?? [];
      setTechMetrics(data);
    } catch (e) {
      console.error('Erro ao carregar métricas técnicas:', e);
      setTechMetrics([]);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Monitoramento Técnico</h2>
      {loading && <div>Carregando...</div>}
      {error && <div className="text-red-500">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-medium mb-2">Volume de Erros (24h)</h3>
          {techMetrics.length === 0 ? (
            <div className="text-sm text-slate-500">Sem dados técnicos</div>
          ) : (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={techMetrics}>
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="errors" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-medium mb-2">Últimos Logs</h3>
          {logs.length === 0 ? <div className="text-sm text-slate-500">Nenhum log encontrado.</div> : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {logs.slice(0,20).map((l, idx) => (
                <li key={idx} className="border-b pb-2">
                  <div className="text-xs text-slate-500">{l.timestamp || l.createdAt || l.date}</div>
                  <div className="font-medium">{l.level || l.severity || 'info'} - {l.message || l.msg || JSON.stringify(l)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
