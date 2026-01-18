import React, { useEffect, useState, Suspense, lazy } from 'react';
import api from '../services/api';
import { Users, CheckCircle, PlusCircle, AlertCircle } from 'lucide-react';
const AdminRechartsWrapper = lazy(() => import('../components/AdminRechartsWrapper'));

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ totalProfessionals: 0, assinaturasAtivas: 0, novosCadastros7d: 0, errosCriticos: 0 });
  const [error, setError] = useState('');
  const [growthData, setGrowthData] = useState([]);


  useEffect(() => { fetchMetrics(); }, []);

  async function fetchMetrics() {
    setLoading(true);
    setError('');
    try {
      // Prefer dedicated stats endpoint
      const statsResp = await api.get('/admin/stats').catch(() => null);
      const logsResp = await api.get('/logs/frontend').catch(() => null);

      let totalProfessionals = 0;
      let assinaturasAtivas = 0;
      let novosCadastros7d = 0;

      if (statsResp && statsResp.data) {
        const s = statsResp.data;
        totalProfessionals = s.totalProfessionals ?? s.total_professionals ?? s.total ?? 0;
        assinaturasAtivas = s.assinaturasAtivas ?? s.activeSubscriptions ?? s.assinaturas_ativas ?? 0;
        novosCadastros7d = s.newRegistrations7d ?? s.novos_cadastros_7d ?? 0;
      } else {
        // Fallback: try to compute from /admin/profissionais
        const profsResp = await api.get('/admin/profissionais').catch(() => ({ data: [] }));
        const profs = Array.isArray(profsResp.data) ? profsResp.data : profsResp.data?.results ?? [];
        totalProfessionals = profs.length;
        assinaturasAtivas = profs.filter(p => p.assinatura && (p.assinatura.status === 'active' || p.assinatura.status === 'ativa')).length;
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        novosCadastros7d = profs.filter(p => {
          const created = p.createdAt || p.created_at || p.criado_em || p.created || null;
          if (!created) return false;
          const t = new Date(created).getTime();
          return now - t <= sevenDays;
        }).length;
      }

      const logs = logsResp && Array.isArray(logsResp.data) ? logsResp.data : logsResp?.data?.results ?? [];

      // Try to fetch growth metrics for chart
      const growthResp = await api.get('/admin/metrics/growth').catch(() => null);
      const growth = Array.isArray(growthResp?.data) ? growthResp.data : growthResp?.data?.results ?? [];
      setGrowthData(growth);

      setMetrics({ totalProfessionals, assinaturasAtivas, novosCadastros7d, errosCriticos: logs.length });
    } catch (e) {
      console.error('Erro ao carregar métricas admin:', e);
      setError('Erro ao carregar métricas.');
      setMetrics({ totalProfessionals: 0, assinaturasAtivas: 0, novosCadastros7d: 0, errosCriticos: 0 });
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Carregando métricas...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h2 className="text-xl font-bold">Painel Admin</h2>

      {error && <div className="text-red-500">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded">
              <Users className="text-indigo-600" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Total de Profissionais</div>
              <div className="text-2xl font-bold">{metrics.totalProfessionals}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded">
              <CheckCircle className="text-emerald-600" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Assinaturas Ativas</div>
              <div className="text-2xl font-bold">{metrics.assinaturasAtivas}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded">
              <PlusCircle className="text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Novos Cadastros (7d)</div>
              <div className="text-2xl font-bold">{metrics.novosCadastros7d}</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded">
              <AlertCircle className="text-red-600" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Erros Críticos</div>
              <div className="text-2xl font-bold">{metrics.errosCriticos}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6">
        <a href="/admin/usuarios" className="text-indigo-600 hover:underline">Gerenciar Profissionais</a>
        <span className="mx-2">·</span>
        <a href="/admin/logs" className="text-indigo-600 hover:underline">Ver Logs</a>
        <span className="mx-2">·</span>
        <a href="/admin/metricas" className="text-indigo-600 hover:underline">Métricas Detalhadas</a>
      </div>

      <div className="bg-white p-4 rounded-xl border shadow-sm">
        <h3 className="font-bold mb-2">Crescimento (novos usuários / churn)</h3>
        <Suspense fallback={<div>Carregando gráficos...</div>}>
          <AdminRechartsWrapper data={growthData} />
        </Suspense>
      </div>
    </div>
  );
}
