// src/pages/ClientsPage.jsx
import { useState, useEffect } from 'react';
import {
  User,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  Loader2,
  Users,
  CreditCard,
  MapPin
} from 'lucide-react';
import api from '../services/api';
import ClientModal from '../components/ClientModal';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      const resp = await api.get('/clientes');
      const data = Array.isArray(resp.data) ? resp.data : resp.data?.results ?? [];
      setClients(data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      alert('Erro ao carregar clientes. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  }

  function openModal(client = null) {
    console.log('Abrindo modal com cliente:', client);
    setEditingClient(client);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingClient(null);
  }

  async function handleSuccess() {
    await fetchClients(); // Recarrega a lista
  }

  async function handleDelete(clientId) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      await api.delete(`/clientes/${clientId}`);
      await fetchClients(); // Recarrega após exclusão
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      alert('Erro ao excluir cliente. Tente novamente.');
    }
  }

  const filteredClients = clients.filter(client =>
    client.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.telefone?.includes(searchTerm) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.cpf?.includes(searchTerm) ||
    client.endereco?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Users size={28} className="text-indigo-600" />
            Gestão de Clientes
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Você tem {clients.length} cliente{clients.length !== 1 ? 's' : ''} cadastrado{clients.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          onClick={() => openModal()}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 font-medium"
        >
          <Plus size={20} />
          Novo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone, e-mail, CPF ou endereço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Clients List */}
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-20">
            <User className="mx-auto text-slate-200 mb-4" size={64} />
            <h3 className="text-lg font-medium text-slate-800 mb-2">
              {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </h3>
            <p className="text-slate-500 mb-6">
              {searchTerm
                ? 'Tente ajustar os termos da busca.'
                : 'Comece cadastrando seu primeiro cliente.'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => openModal()}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Cadastrar Primeiro Cliente
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredClients.map((client) => (
              <div key={client.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User size={24} className="text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{client.nome}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        {client.telefone && (
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Phone size={14} />
                            {client.telefone}
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Mail size={14} />
                            {client.email}
                          </div>
                        )}
                        {client.cpf && (
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <CreditCard size={14} />
                            CPF: {client.cpf}
                          </div>
                        )}
                        {client.endereco && (
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <MapPin size={14} />
                            {client.endereco}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(client)}
                      className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                      title="Editar cliente"
                    >
                      <Edit size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Excluir cliente"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <ClientModal
        isOpen={modalOpen}
        onClose={closeModal}
        clientToEdit={editingClient}
        onSuccess={handleSuccess}
      />
    </div>
  );
}