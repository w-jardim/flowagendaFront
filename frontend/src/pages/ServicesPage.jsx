// src/pages/ServicesPage.jsx
import { useState, useEffect } from 'react';
import { Loader2, Briefcase, Plus, Edit, Trash2, X } from 'lucide-react';
import api from '../services/api';
import { normalizeService } from '../services/normalize';

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    preco: '',
    duracao: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    setLoading(true);
    setErrorMsg('');
    try {
      const resp = await api.get('/servicos');
      const data = Array.isArray(resp.data) ? resp.data : resp.data?.results ?? [];
      const normalized = data.map(normalizeService);
      setServices(normalized);
    } catch (err) {
      console.error('Erro ao buscar serviços:', err);
      setErrorMsg('Não foi possível carregar os serviços. Verifique o token e se o backend está ativo.');
      setServices([]);
    } finally {
      setLoading(false);
    }
  }

  function openModal(service = null) {
    if (service) {
      setEditingService(service);
      setFormData({
        nome: service.nome || service.name || service.title || '',
        preco: service.preco ?? service.price ?? '',
        duracao: (() => {
          const duracao = service.duracao || service.duration || service.duracao_minutos || service.durationMinutes;
          return duracao && String(duracao).trim() !== '' ? String(duracao) : '';
        })()
      });
    } else {
      setEditingService(null);
      setFormData({
        nome: '',
        preco: '',
        duracao: ''
      });
    }
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingService(null);
    setFormData({
      nome: '',
      preco: '',
      duracao: ''
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    
    try {
      const serviceData = {
        nome: formData.nome,
        preco: parseFloat(formData.preco) || 0,
        duracao: formData.duracao
      };

      if (editingService) {
        // Editar serviço existente
        await api.patch(`/servicos/${editingService.id || editingService._id}`, serviceData);
      } else {
        // Criar novo serviço
        await api.post('/servicos', serviceData);
      }

      await fetchServices(); // Recarrega a lista
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      setErrorMsg('Erro ao salvar serviço. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(serviceId) {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    try {
      await api.delete(`/servicos/${serviceId}`);
      await fetchServices(); // Recarrega a lista
    } catch (error) {
      console.error('Erro ao excluir serviço:', error);
      setErrorMsg('Erro ao excluir serviço. Tente novamente.');
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border">
        <h2 className="text-lg font-bold">Serviços</h2>
        <button 
          onClick={() => openModal()} 
          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={14} /> Novo
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-indigo-600" size={36} />
        </div>
      ) : errorMsg ? (
        <div className="bg-yellow-50 p-4 rounded border border-yellow-100 text-yellow-800">{errorMsg}</div>
      ) : services.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center">
          <Briefcase className="mx-auto text-slate-200 mb-4" size={48} />
          <h3 className="text-lg font-medium text-slate-800">Nenhum serviço cadastrado</h3>
          <p className="text-slate-500">Cadastre seus serviços para que clientes possam agendar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map(s => (
            <div key={s.id ?? s._id} className="bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">{s.nome || s.title || s.name || 'Serviço'}</h3>
                  <p className="text-sm text-slate-500 mt-1">{s.descricao || s.description || ''}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button 
                    onClick={() => openModal(s)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Editar serviço"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(s.id || s._id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir serviço"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-3 text-sm text-slate-600">
                <span className="font-medium">Duração:</span> {
                  (() => {
                    const duracao = s.duracao || s.duration || s.duracao_minutos || s.durationMinutes;
                    return duracao && String(duracao).trim() !== '' ? `${duracao} min` : 'N/D';
                  })()
                }
              </div>
              <div className="mt-3 text-sm text-indigo-600 font-bold">{s.preco ? `R$ ${s.precoFormatted}` : ''}</div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criar/Editar Serviço */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </h3>
              <button 
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Serviço</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ex: Corte de Cabelo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preço (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.preco}
                  onChange={(e) => setFormData({...formData, preco: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0,00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duração (minutos)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.duracao}
                  onChange={(e) => setFormData({...formData, duracao: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="30"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Salvando...' : (editingService ? 'Atualizar' : 'Criar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}