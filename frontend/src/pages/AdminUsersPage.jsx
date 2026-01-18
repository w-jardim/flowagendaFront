import { useState, useEffect } from 'react';
import api from '../services/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [columns, setColumns] = useState([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError('');
    try {
      const [uResp, aResp] = await Promise.all([
        api.get('/admin/profissionais'),
        api.get('/agendamentos')
      ]);

      const usersData = Array.isArray(uResp.data) ? uResp.data : uResp.data?.results ?? [];
      const apps = Array.isArray(aResp.data) ? aResp.data : aResp.data?.results ?? [];

      setUsers(usersData);
      setAppointments(apps);
      // infer columns dynamically from the payload (flatten profissional object if present)
      try {
        const colsSet = new Set();
        function collectKeys(obj, prefix = '') {
          if (!obj || typeof obj !== 'object') return;
          Object.keys(obj).forEach(k => {
            const v = obj[k];
            const path = prefix ? `${prefix}.${k}` : k;
            colsSet.add(path);
            if (v && typeof v === 'object' && !Array.isArray(v)) collectKeys(v, path);
          });
        }
        usersData.forEach(u => {
          const p = u.profissional || u.professional || u;
          collectKeys(p);
        });
        setColumns(Array.from(colsSet));
      } catch (e) {
        console.warn('Não foi possível inferir colunas dinamicamente', e);
      }
    } catch (e) {
      console.error('Erro ao carregar usuários/agendamentos:', e);
      setError('Não foi possível carregar usuários. Verifique o backend.');
      setUsers([]);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }

  function countAppointmentsFor(user) {
    const userId = user.id || user._id || user.user_id;
    const possibleProfessionalKeys = ['profissional_id','profissional','user_id','owner_id','responsavel_id'];
    let count = 0;
    appointments.forEach(app => {
      // tenta várias chaves possíveis
      for (const k of possibleProfessionalKeys) {
        if (app[k] && String(app[k]) === String(userId)) {
          count++;
          break;
        }
      }
      // também aceitar appointments que tenham objeto profissional
      if (app.profissional && (app.profissional.id === userId || app.profissional._id === userId)) count++;
    });
    return count;
  }

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [especialidadeFilter, setEspecialidadeFilter] = useState('all');
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [subForm, setSubForm] = useState({ plano_valor: '', data_proximo_pagamento: '' });
  const [editingSubId, setEditingSubId] = useState(null);

  const filteredUsers = users.filter(u => {
    if (statusFilter !== 'all') {
      const blocked = !!u.blocked;
      if (statusFilter === 'blocked' && !blocked) return false;
      if (statusFilter === 'active' && blocked) return false;
    }
    if (especialidadeFilter !== 'all') {
      const esp = (u.especialidade || u.specialty || '').toLowerCase();
      if (!esp.includes(especialidadeFilter.toLowerCase())) return false;
    }
    return true;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pagedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  function getValueByPath(obj, path) {
    if (!obj) return null;
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : null), obj);
  }

  function openDetail(p) {
    setDetailData(p);
    setDetailModalOpen(true);
  }

  async function toggleBlock(u) {
    const userId = u.id || u._id || u.user_id;
    if (!userId) {
      setToast({ type: 'error', message: 'ID do usuário ausente' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const willBlock = !u.blocked;
    if (!confirm(`${willBlock ? 'Bloquear' : 'Desbloquear'} acesso de ${u.nome || u.email || userId}?`)) return;

    try {
      // tentativa padrão: PATCH /admin/profissionais/:id { blocked: true }
      await api.patch(`/admin/profissionais/${userId}`, { blocked: willBlock });
      // atualizar estado local
      setUsers(prev => prev.map(item => item.id === userId || item._id === userId ? { ...item, blocked: willBlock } : item));
      setToast({ type: 'success', message: 'Operação realizada com sucesso.' });
      setTimeout(() => setToast(null), 3500);
    } catch (e) {
      console.error('Erro ao bloquear usuário:', e);
      setToast({ type: 'error', message: 'Erro ao alterar estado do usuário. Verifique o backend.' });
      setTimeout(() => setToast(null), 3500);
    }
  }

  function openSubscriptionModal(id, p) {
    setEditingSubId(id);
    setSubForm({
      plano_valor: p.plano_valor ?? p.subscription?.amount ?? '',
      data_proximo_pagamento: (p.data_proximo_pagamento || p.subscription?.next_payment || '')
    });
    setSubscriptionModalOpen(true);
  }

  async function handleSubscriptionSave(e) {
    e.preventDefault();
    if (!editingSubId) {
      setToast({ type: 'error', message: 'ID do profissional ausente' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    try {
      const payload = { plano_valor: subForm.plano_valor, data_proximo_pagamento: subForm.data_proximo_pagamento };
      await api.patch(`/admin/profissionais/${editingSubId}/subscription`, payload);
      // Update local state
      setUsers(prev => prev.map(item => {
        const p = item.profissional || item.professional || item;
        const id = p.id || p._id || item.id || item._id || item.user_id;
        if (String(id) === String(editingSubId)) {
          const updated = { ...item };
          if (updated.profissional) updated.profissional = { ...updated.profissional, plano_valor: subForm.plano_valor, data_proximo_pagamento: subForm.data_proximo_pagamento };
          else updated.plano_valor = subForm.plano_valor, updated.data_proximo_pagamento = subForm.data_proximo_pagamento;
          return updated;
        }
        return item;
      }));
      setToast({ type: 'success', message: 'Assinatura atualizada.' });
      setTimeout(() => setToast(null), 3000);
      setSubscriptionModalOpen(false);
    } catch (e) {
      console.error('Erro ao atualizar assinatura:', e);
      setToast({ type: 'error', message: 'Erro ao atualizar assinatura.' });
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {toast && (
        <div className={`fixed right-6 top-6 z-50 px-4 py-2 rounded shadow ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}
      <h2 className="text-xl font-bold mb-4">Gestão de Profissionais</h2>

      <div className="flex gap-3 mb-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded">
          <option value="all">Todos os Status</option>
          <option value="active">Ativos</option>
          <option value="blocked">Bloqueados</option>
        </select>
        <input placeholder="Filtrar por especialidade" value={especialidadeFilter} onChange={e => setEspecialidadeFilter(e.target.value)} className="px-3 py-2 border rounded" />
        <button onClick={() => { setStatusFilter('all'); setEspecialidadeFilter('all'); }} className="px-3 py-2 bg-slate-100 rounded">Limpar</button>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : users.length === 0 ? (
        <div>Nenhum profissional cadastrado.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-sm text-slate-500 border-b">
                {columns.length === 0 ? (
                  <>
                    <th className="py-3">Nome</th>
                    <th className="py-3">E-mail</th>
                    <th className="py-3">Role</th>
                    <th className="py-3">Assinatura</th>
                    <th className="py-3">Especialidade</th>
                    <th className="py-3">Agendamentos</th>
                  </>
                ) : (
                  columns.map(col => <th key={col} className="py-3">{col}</th>)
                )}
                <th className="py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.map(u => {
                const p = u.profissional || u.professional || u;
                const id = p.id || p._id || u.id || u._id || u.user_id;
                return (
                  <tr key={id} className="border-b">
                    {columns.length === 0 ? (
                      <>
                        <td className="py-3">{p.nome || p.name || p.email || u.nome || u.name || '-'}</td>
                        <td className="py-3">{p.email || u.email || '-'}</td>
                        <td className="py-3">{p.role || p.tipo || u.role || '-'}</td>
                        <td className="py-3">{p.plano_valor ? `R$ ${Number(p.plano_valor).toLocaleString('pt-BR', {minimumFractionDigits:2})}` : (p.subscription?.amount ? `R$ ${Number(p.subscription.amount).toLocaleString('pt-BR', {minimumFractionDigits:2})}` : '-')}</td>
                        <td className="py-3">{p.especialidade || p.specialty || '-'}</td>
                        <td className="py-3">{countAppointmentsFor(u)}</td>
                      </>
                    ) : (
                      columns.map(col => (
                        <td key={col} className="py-3 align-top">{String(getValueByPath(p, col) ?? getValueByPath(u, col) ?? '')}</td>
                      ))
                    )}
                    <td className="py-3 flex gap-2">
                      <button onClick={() => openDetail(p)} className="px-3 py-1 rounded bg-indigo-600 text-white">Ver Detalhes</button>
                      <button onClick={() => toggleBlock(u)} className={`px-3 py-1 rounded ${u.blocked || p.blocked ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}`}>
                        {(u.blocked || p.blocked) ? 'Ativar' : 'Bloquear'}
                      </button>
                      <button onClick={() => openSubscriptionModal(id, p)} className="px-3 py-1 rounded bg-slate-100">Gerenciar Assinatura</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

        {/* Subscription Modal */}
        {subscriptionModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">Editar Assinatura</h3>
              <form onSubmit={handleSubscriptionSave} className="space-y-3">
                <div>
                  <label className="text-sm">Valor do Plano (R$)</label>
                  <input type="number" step="0.01" value={subForm.plano_valor} onChange={e => setSubForm({...subForm, plano_valor: e.target.value})} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="text-sm">Próximo Pagamento</label>
                  <input type="date" value={subForm.data_proximo_pagamento} onChange={e => setSubForm({...subForm, data_proximo_pagamento: e.target.value})} className="w-full px-3 py-2 border rounded" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setSubscriptionModalOpen(false)} className="px-4 py-2 border rounded">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}

