// src/pages/AgendaPage.jsx
import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  MessageCircle,
  MoreVertical,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../services/api';
import AppointmentModal from '../components/AppointmentModal';
import ClientModal from '../components/ClientModal';

/*
  AgendaPage
  - Busca /agendamentos?data=YYYY-MM-DD (se suportado)
  - Fallback: /agendamentos e filtra localmente por data (apenas quando backend envia ISO)
  - Normaliza o objeto retornado para os campos usados pela UI
*/

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);

  useEffect(() => {
    fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  function normalizeItem(item) {
    const possibleStartKeys = [
      'data_inicio',
      'datetime_inicio',
      'start',
      'inicio',
      'data',
      'data_agendamento',
      'horario_inicio'
    ];
    const possibleEndKeys = [
      'data_fim',
      'datetime_fim',
      'end',
      'fim',
      'horario_fim'
    ];

    let startVal = null;
    for (const k of possibleStartKeys) {
      if (item[k]) { startVal = item[k]; break; }
    }

    let endVal = null;
    for (const k of possibleEndKeys) {
      if (item[k]) { endVal = item[k]; break; }
    }

    const servicoNome = item.servico_nome || item.servico?.nome || item.service?.name || item.title || 'Serviço';
    const clienteNome = item.cliente_nome || item.cliente?.nome || item.customer?.name || item.client_name || 'Cliente';
    // <-- Usando o mesmo nome que você retorna/consome no JSX
    const cliente_telefone = item.cliente_telefone || item.cliente?.telefone || item.customer?.phone || item.client_phone || '';
    const status = item.status || item.estado || item.situacao || 'confirmado';

    let horario_inicio = '';
    let horario_fim = '';

    try {
      const s = String(startVal || '');
      const e = String(endVal || '');

      if (/\d{4}-\d{2}-\d{2}T/.test(s)) {
        // Usar getUTCHours/Minutes para evitar interferência de timezone local
        const d = new Date(s);
        const hours = String(d.getUTCHours()).padStart(2, '0');
        const minutes = String(d.getUTCMinutes()).padStart(2, '0');
        horario_inicio = `${hours}:${minutes}`;
      } else if (/^\d{2}:\d{2}$/.test(s)) {
        horario_inicio = s;
      }

      if (/\d{4}-\d{2}-\d{2}T/.test(e)) {
        // Usar getUTCHours/Minutes para evitar interferência de timezone local
        const d2 = new Date(e);
        const hours2 = String(d2.getUTCHours()).padStart(2, '0');
        const minutes2 = String(d2.getUTCMinutes()).padStart(2, '0');
        horario_fim = `${hours2}:${minutes2}`;
      } else if (/^\d{2}:\d{2}$/.test(e)) {
        horario_fim = e;
      }
    } catch {
      horario_inicio = horario_inicio || item.horario_inicio || '';
      horario_fim = horario_fim || item.horario_fim || '';
    }

    return {
      id: item.id ?? item._id ?? `${String(startVal || clienteNome)}_${Math.random().toString(36).slice(2, 9)}`,
      horario_inicio,
      horario_fim,
      servico_nome: servicoNome,
      cliente_nome: clienteNome,
      cliente_telefone, // agora existe
      status,
      raw: item
    };
  }

  async function fetchAppointments() {
    setLoading(true);
    setErrorMsg('');
    try {
      // Usar data pura no formato YYYY-MM-DD para o filtro da API
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // 1) tenta query param com data pura (como solicitado)
      try {
        const resp = await api.get(`/agendamentos?data=${dateStr}`);
        const data = Array.isArray(resp.data) ? resp.data : resp.data?.results ?? [];
        setAppointments(data.map(normalizeItem));
        return;
      } catch {
        // se falhar (404, 400, network já tratado), vamos para fallback
      }

      // 2) fallback: buscar todos e filtrar localmente por data (apenas se backend retornou datas ISO)
      const respAll = await api.get('/agendamentos');
      const all = Array.isArray(respAll.data) ? respAll.data : respAll.data?.results ?? [];

      const filtered = all.filter(item => {
        const dateVal = item.data_inicio || item.datetime_inicio || item.start || item.inicio || item.data || item.data_agendamento;
        if (!dateVal) return false;
        // Comparar apenas a parte da data (YYYY-MM-DD) com a data selecionada
        if (/\d{4}-\d{2}-\d{2}T/.test(String(dateVal))) {
          const datePart = String(dateVal).split('T')[0]; // Extrair YYYY-MM-DD
          return datePart === dateStr; // Comparar strings diretamente
        }
        return false;
      });

      setAppointments(filtered.map(normalizeItem));
    } catch (error) {
      console.error('Erro ao buscar agenda:', error);
      setErrorMsg('Não foi possível carregar a agenda. Verifique se o backend está rodando e o token está válido.');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }

  function openAppointmentModal(appointment = null) {
    setEditingAppointment(appointment);
    setModalOpen(true);
  }

  function closeAppointmentModal() {
    setModalOpen(false);
    setEditingAppointment(null);
  }

  function openClientModal() {
    setClientModalOpen(true);
  }

  function closeClientModal() {
    setClientModalOpen(false);
  }

  async function handleClientSuccess() {
    // Se o modal de agendamento estiver aberto, fechá-lo e reabri-lo para recarregar clientes
    if (modalOpen) {
      setModalOpen(false);
      setTimeout(() => {
        setModalOpen(true);
      }, 100);
    }
  }

  async function handleAppointmentSuccess() {
    // Recarregar agendamentos
    await fetchAppointments();

    // Notificar Dashboard para atualizar (se existir função global)
    if (window.updateDashboardStats) {
      window.updateDashboardStats();
    }
  }

  async function handleDeleteAppointment(appointmentId) {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;

    try {
      await api.delete(`/agendamentos/${appointmentId}`);
      await handleAppointmentSuccess(); // Recarrega dados
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      alert('Erro ao excluir agendamento. Tente novamente.');
    }
  }

  const navigateDay = (amount) => setSelectedDate(prev => amount > 0 ? addDays(prev, amount) : subDays(prev, Math.abs(amount)));
  const setToday = () => setSelectedDate(new Date());

  const getStatusStyles = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'concluido':
      case 'concluída':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'cancelado':
        return 'bg-red-50 text-red-600 border-red-100';
      default:
        return 'bg-indigo-50 text-indigo-600 border-indigo-100';
    }
  };

  const getStatusIcon = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'concluido':
      case 'concluída':
        return <CheckCircle2 size={14} />;
      case 'cancelado':
        return <XCircle size={14} />;
      default:
        return <Clock size={14} />;
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 capitalize">
            {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </h1>
          <p className="text-slate-500 text-sm">Você tem {appointments.length} compromissos para este dia.</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
          <button onClick={() => navigateDay(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-600">
            <ChevronLeft size={20} />
          </button>

          <button onClick={setToday} className="px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-white hover:shadow-sm rounded-xl transition-all">
            Hoje
          </button>

          <button onClick={() => navigateDay(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-600">
            <ChevronRight size={20} />
          </button>

          <div className="w-px h-6 bg-slate-200 mx-1"></div>

          <button onClick={() => openAppointmentModal()} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all flex items-center gap-2">
            <Plus size={16} />
            Novo
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button onClick={setToday} className={`px-4 py-2 rounded-full text-sm font-medium ${isSameDay(selectedDate, new Date()) ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border'}`}>
          Hoje
        </button>
        <button onClick={() => setSelectedDate(addDays(new Date(), 1))} className={`px-4 py-2 rounded-full text-sm font-medium ${isSameDay(selectedDate, addDays(new Date(), 1)) ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border'}`}>
          Amanhã
        </button>
      </div>

      <div className="relative">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
          </div>
        ) : errorMsg ? (
          <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-100 text-yellow-700">{errorMsg}</div>
        ) : appointments.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center">
            <CalendarIcon className="mx-auto text-slate-200 mb-4" size={48} />
            <h3 className="text-lg font-medium text-slate-800">Nenhum agendamento</h3>
            <p className="text-slate-500">Aproveite o tempo livre ou cadastre um novo horário.</p>
          </div>
        ) : (
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-linear-to-b before:from-transparent before:via-slate-200 before:to-transparent">
            {appointments.map((app) => (
              <div key={app.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-400 shadow shrink-0 md:order-1 z-10">
                  <Clock size={16} />
                </div>

                <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                        {app.horario_inicio} {app.horario_fim ? `- ${app.horario_fim}` : ''}
                      </span>
                      <h3 className="font-bold text-slate-800 text-lg block">{app.servico_nome}</h3>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${getStatusStyles(app.status)}`}>
                      {getStatusIcon(app.status)}
                      {app.status?.toUpperCase() || 'CONFIRMADO'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{app.cliente_nome}</p>
                        <p className="text-xs text-slate-500">Cliente</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <a href={`https://wa.me/55${(app.cliente_telefone || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="Conversar no WhatsApp">
                        <MessageCircle size={20} />
                      </a>
                      <button onClick={() => openAppointmentModal(app.raw)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all" title="Editar agendamento">
                        <Edit size={20} />
                      </button>
                      <button onClick={() => handleDeleteAppointment(app.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Excluir agendamento">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AppointmentModal
        isOpen={modalOpen}
        onClose={closeAppointmentModal}
        appointment={editingAppointment}
        selectedDate={selectedDate}
        onSuccess={handleAppointmentSuccess}
        onOpenClientModal={openClientModal}
      />

      <ClientModal
        isOpen={clientModalOpen}
        onClose={closeClientModal}
        onSuccess={handleClientSuccess}
      />
    </div>
  );
}