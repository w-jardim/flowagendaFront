import { useState, useEffect } from 'react';
import api from '../services/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError('');
    try {
      const [uResp, aResp] = await Promise.all([
        api.get('/usuarios'),
        api.get('/agendamentos')
      ]);

      const usersData = Array.isArray(uResp.data) ? uResp.data : uResp.data?.results ?? [];
      const apps = Array.isArray(aResp.data) ? aResp.data : aResp.data?.results ?? [];

      setUsers(usersData);
      setAppointments(apps);
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

  async function toggleBlock(u) {
    const userId = u.id || u._id || u.user_id;
    if (!userId) return alert('ID do usuário ausente');

    const willBlock = !u.blocked;
    if (!confirm(`${willBlock ? 'Bloquear' : 'Desbloquear'} acesso de ${u.nome || u.email || userId}?`)) return;

    try {
      // tentativa padrão: PATCH /usuarios/:id { blocked: true }
      await api.patch(`/usuarios/${userId}`, { blocked: willBlock });
      // atualizar estado local
      setUsers(prev => prev.map(item => item.id === userId || item._id === userId ? { ...item, blocked: willBlock } : item));
      alert('Operação realizada com sucesso.');
    } catch (e) {
      console.error('Erro ao bloquear usuário:', e);
      alert('Erro ao alterar estado do usuário. Verifique o backend.');
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Gestão de Profissionais</h2>

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
                <th className="py-3">Nome</th>
                <th className="py-3">E-mail</th>
                <th className="py-3">Role</th>
                <th className="py-3">Agendamentos</th>
                <th className="py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id || u._id} className="border-b">
                  <td className="py-3">{u.nome || u.name || u.email}</td>
                  <td className="py-3">{u.email}</td>
                  <td className="py-3">{u.role || u.tipo || '-'}</td>
                  <td className="py-3">{countAppointmentsFor(u)}</td>
                  <td className="py-3">
                    <button onClick={() => toggleBlock(u)} className={`px-3 py-1 rounded ${u.blocked ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}`}>
                      {u.blocked ? 'Desbloquear' : 'Bloquear Acesso'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
