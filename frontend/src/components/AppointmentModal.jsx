// src/components/AppointmentModal.jsx
import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, MessageCircle, Plus } from 'lucide-react';
import { parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import api from '../services/api';
import { normalizeService, normalizeClient, normalizeAppointment, stripNonDigits } from '../services/normalize';

export default function AppointmentModal({ isOpen, onClose, appointment, onSuccess, onOpenClientModal }) {
  const [formData, setFormData] = useState({
    cliente_id: '',
    cliente_nome: '',
    servico_id: '',
    data_inicio: '',
    hora_inicio: '',
    observacoes: '',
    status: 'confirmado'
  });
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);

  // Carregar serviços e clientes quando modal abre
  useEffect(() => {
    if (isOpen) {
      fetchServices();
      fetchClients();
      if (appointment) {
        // Modo edição - preencher dados com objeto normalizado
        const normalized = normalizeAppointment(appointment);
        populateForm(normalized);
      } else {
        // Modo criação - limpar form
        resetForm();
      }
    }
  }, [isOpen, appointment]);

  async function fetchServices() {
    try {
      const resp = await api.get('/servicos');
      const data = Array.isArray(resp.data) ? resp.data : resp.data?.results ?? [];
      setServices(data.map(normalizeService));
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
    }
  }

  async function fetchClients() {
    try {
      const resp = await api.get('/clientes');
      const data = Array.isArray(resp.data) ? resp.data : resp.data?.results ?? [];
      setClients(data.map(normalizeClient));
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  }

  function populateForm(appointment) {
    // Parse da data e hora em UTC para edição
    let dataInicio = '';
    let horaInicio = '';

    if (appointment.data_inicio || appointment.datetime_inicio || appointment.start) {
      const dateStr = appointment.data_inicio || appointment.datetime_inicio || appointment.start;
      try {
        const dt = parseISO(dateStr);
        // Extrair componentes em UTC para mostrar exatamente a hora armazenada
        dataInicio = formatInTimeZone(dt, 'UTC', 'yyyy-MM-dd');
        horaInicio = formatInTimeZone(dt, 'UTC', 'HH:mm');
      } catch (e) {
        console.error('Erro ao parsear data:', e);
      }
    }

    setFormData({
      cliente_id: appointment.cliente_id || appointment.cliente?.id || '',
      cliente_nome: appointment.cliente_nome || appointment.cliente?.nome || '',
      servico_id: appointment.servico_id || appointment.servico?.id || '',
      data_inicio: dataInicio,
      hora_inicio: horaInicio,
      observacoes: appointment.observacoes || appointment.observações || appointment.notes || '',
      status: appointment.status || 'confirmado'
    });
  }

  function resetForm() {
    setFormData({
      cliente_id: '',
      cliente_nome: '',
      servico_id: '',
      data_inicio: '',
      hora_inicio: '',
      observacoes: '',
      status: 'confirmado'
    });
  }

  function getSelectedService() {
    return services.find(s => s.id === formData.servico_id || s._id === formData.servico_id);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    try {
      // Criar string ISO "nominal" sem timezone - backend interpretará como UTC
      const dataInicioPayload = `${formData.data_inicio}T${formData.hora_inicio}:00`;

      const payload = {
        cliente_id: formData.cliente_id,
        cliente_nome: formData.cliente_nome,
        servico_id: formData.servico_id,
        data_inicio: dataInicioPayload,
        observacoes: formData.observacoes,
        status: formData.status
      };

      if (appointment) {
        // Editar
        await api.patch(`/agendamentos/${appointment.id || appointment._id}`, payload);
      } else {
        // Criar
        await api.post('/agendamentos', payload);
      }

      onSuccess(); // Callback para atualizar listas
      onClose();
    } catch (error) {
      if (error.response?.status === 409) {
        alert('Este horário já está ocupado. Por favor, escolha outro momento.');
      } else {
        console.error('Erro ao salvar agendamento:', error);
        alert('Erro ao salvar agendamento. Verifique os dados e tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  const selectedService = getSelectedService();
  const selectedClientForPhone = clients.find(c => c.id === formData.cliente_id || c._id === formData.cliente_id);

  function formatWhatsappDisplay(rawWhatsapp) {
    if (!rawWhatsapp) return '';
    const digits = stripNonDigits(rawWhatsapp || '');
    const d = digits.startsWith('55') ? digits.slice(2) : digits;
    if (!d) return '';
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7,11)}`;
  }

  const formattedClientPhone = selectedClientForPhone ? formatWhatsappDisplay(selectedClientForPhone.whatsapp) : '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">
            {appointment ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cliente <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 items-center">
                <select
                  required
                  value={formData.cliente_id}
                  onChange={(e) => {
                    const selectedClient = clients.find(c => c.id === e.target.value);
                    setFormData({
                      ...formData,
                      cliente_id: e.target.value,
                      cliente_nome: selectedClient ? selectedClient.nome : formData.cliente_nome
                    });
                  }}
                  className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.nome}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={onOpenClientModal}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex-shrink-0"
                  title="Cadastrar novo cliente"
                >
                  <Plus size={20} />
                </button>
              </div>
              {formattedClientPhone && (
                <p className="text-sm text-slate-500 mt-1">{formattedClientPhone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ou digite nome do cliente
              </label>
              <input
                type="text"
                value={formData.cliente_nome}
                onChange={(e) => setFormData({...formData, cliente_nome: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Nome do cliente"
              />
            </div>
          </div>

          {/* Serviço */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Serviço <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.servico_id}
              onChange={(e) => setFormData({...formData, servico_id: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Selecione um serviço</option>
              {services.map(service => (
                <option key={service.id || service._id} value={service.id || service._id}>
                  {service.nome || service.name} - R$ {service.precoFormatted || service.preco || ''}
                  {service.duracao || service.duration ? ` (${service.duracao || service.duration}min)` : ''}
                </option>
              ))}
            </select>
            {selectedService && (
              <p className="text-sm text-slate-500 mt-1">
                Duração: {selectedService.duracao || selectedService.duration || selectedService.duracao_minutos || selectedService.tempo || selectedService.tempo_minutos || 'N/A'} minutos
              </p>
            )}
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Data <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.data_inicio}
                onChange={(e) => setFormData({...formData, data_inicio: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Hora <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                required
                value={formData.hora_inicio}
                onChange={(e) => setFormData({...formData, hora_inicio: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Status e Observações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="confirmado">Confirmado</option>
                <option value="pendente">Pendente</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
              <input
                type="text"
                value={formData.observacoes}
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Observações opcionais"
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Salvando...' : (appointment ? 'Atualizar' : 'Agendar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}