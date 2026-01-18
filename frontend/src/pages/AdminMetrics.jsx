import { useEffect, useState } from 'react';
import api from '../services/api';

export default function AdminMetrics() {
  const [since, setSince] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mrr, setMrr] = useState(0);
  const [renewals, setRenewals] = useState([]);
  const [topPros, setTopPros] = useState([]);

  useEffect(() => { fetchAll(); }, [since]);

  async function fetchAll() {
    setLoading(true); setError('');
    try {
      const qs = `?since=${since}`;
      const [finResp, topResp] = await Promise.all([
        api.get(`/admin/metrics/financial${qs}`).catch(() => null),
        api.get(`/admin/metrics/top${qs}`).catch(() => null)
      ]);

      const fin = finResp?.data ?? {};
      setMrr(fin.mrr ?? fin.MRR ?? fin.mensal ?? 0);
      setRenewals(Array.isArray(fin.next_renewals) ? fin.next_renewals : (fin.renovacoes ?? []));

      const top = topResp?.data ?? [];
      setTopPros(Array.isArray(top) ? top.slice(0,10) : []);
    } catch (e) {
      console.error('Erro ao buscar métricas detalhadas:', e);
      setError('Erro ao carregar métricas.');
      setMrr(0); setRenewals([]); setTopPros([]);
    } finally { setLoading(false); }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h2 className="text-xl font-bold">Métricas Detalhadas</h2>

      <div className="flex items-center gap-3">
        <label className="text-sm">Período:</label>
        <select value={since} onChange={e => setSince(Number(e.target.value))} className="px-3 py-2 border rounded">
          <option value={7}>7 dias</option>
          <option value={30}>30 dias</option>
          <option value={90}>90 dias</option>
        </select>
      </div>

      {loading ? <div>Carregando métricas...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <div className="text-sm text-slate-500">MRR (Receita Mensal)</div>
            <div className="text-2xl font-bold">R$ {Number(mrr).toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
          </div>

          <div className="bg-white p-4 rounded-xl border shadow-sm md:col-span-2">
            <div className="text-sm text-slate-500">Próximas Renovações</div>
            {renewals.length === 0 ? <div className="mt-2 text-sm text-slate-500">Nenhuma renovação próxima</div> : (
              <ul className="mt-2 space-y-2">
                {renewals.map((r, idx) => (
                  <li key={idx} className="flex items-center justify-between">
                    <div>{r.nome || r.name || r.email}</div>
                    <div className="text-sm text-slate-500">{r.vencimento || r.next_payment || r.date}</div>
                    <div className="text-sm font-medium">R$ {Number(r.valor || r.amount || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white p-4 rounded-xl border shadow-sm md:col-span-3">
            <div className="text-sm text-slate-500">Top 10 Profissionais por Agendamentos</div>
            {topPros.length === 0 ? <div className="mt-2 text-sm text-slate-500">Sem dados</div> : (
              <ol className="mt-2 list-decimal list-inside">
                {topPros.map((p, i) => (
                  <li key={i} className="py-1 flex justify-between"><span>{p.nome || p.name || p.email}</span><span className="text-sm text-slate-500">{p.count || p.agendamentos || 0}</span></li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
