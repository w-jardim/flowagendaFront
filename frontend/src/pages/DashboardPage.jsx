// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import { Users, Calendar, TrendingUp, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isToday, parseISO, format, isAfter, isBefore, addHours } from 'date-fns';
import api from '../services/api';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState([
    { label: 'Agendamentos Hoje', value: '0', icon: <Calendar className="text-indigo-600" />, color: 'bg-indigo-50' },
    { label: 'Novos Clientes', value: '0', icon: <Users className="text-emerald-600" />, color: 'bg-emerald-50' },
    { label: 'Faturamento Hoje', value: 'R$ 0,00', icon: <TrendingUp className="text-amber-600" />, color: 'bg-amber-50' },
    { label: 'Horas Agendadas', value: '0h', icon: <Clock className="text-rose-600" />, color: 'bg-rose-50' },
  ]);
  const [loading, setLoading] = useState(true);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  async function fetchDashboardStats() {
    try {
      setLoading(true);

      // Busca todos os agendamentos (mesma rota que AgendaPage usa)
      const response = await api.get('/agendamentos');
      const appointments = Array.isArray(response.data) ? response.data : response.data?.results ?? [];

      // Busca todos os serviços para ter os preços
      const servicesResponse = await api.get('/servicos');
      const services = Array.isArray(servicesResponse.data) ? servicesResponse.data : servicesResponse.data?.results ?? [];

      // Cria um mapa de serviços por ID para acesso rápido
      const servicesMap = {};
      services.forEach(service => {
        servicesMap[service.id || service._id] = service;
      });

      // Filtra agendamentos de hoje
      const todayAppointments = appointments.filter(appointment => {
        const dateFields = ['data_inicio', 'datetime_inicio', 'start', 'inicio', 'data', 'data_agendamento'];
        for (const field of dateFields) {
          if (appointment[field]) {
            try {
              // Se for datetime ISO, parse e verifica se é hoje
              if (/\d{4}-\d{2}-\d{2}T/.test(String(appointment[field]))) {
                const date = parseISO(String(appointment[field]));
                if (isToday(date)) {
                  return true;
                }
              }
            } catch {
              // Ignora erros de parsing
            }
          }
        }
        return false;
      });

      // Calcula próximos agendamentos (próximas 12 horas)
      const now = new Date();
      const windowEnd = addHours(now, 12);
      const upcoming = [];

      appointments.forEach(appointment => {
        const dateFields = ['data_inicio', 'datetime_inicio', 'start', 'inicio', 'data', 'data_agendamento'];
        for (const field of dateFields) {
          const raw = appointment[field];
          if (!raw) continue;
          try {
            if (/\d{4}-\d{2}-\d{2}T/.test(String(raw))) {
              const date = parseISO(String(raw));
              if (isAfter(date, now) && isBefore(date, windowEnd)) {
                upcoming.push({ ...appointment, __parsedDate: date });
              }
            }
          } catch {
            // ignore parse errors
          }
        }
      });

      // Ordena por data
      upcoming.sort((a, b) => a.__parsedDate - b.__parsedDate);

      setUpcomingAppointments(upcoming);

      // Calcula estatísticas
      const appointmentsToday = todayAppointments.length;

      // Calcula faturamento (soma dos preços dos serviços usando o mapa)
      const revenueToday = todayAppointments.reduce((total, appointment) => {
        const serviceId = appointment.servico_id || appointment.service_id || appointment.servico?.id || appointment.service?.id;
        const service = servicesMap[serviceId];

        if (service) {
          const price = service.preco || service.price || 0;
          const numericPrice = typeof price === 'string' ? parseFloat(price) || 0 :
                              typeof price === 'number' ? price : 0;
          return total + numericPrice;
        }

        return total;
      }, 0);

      // Conta clientes únicos de hoje (aproximado)
      const uniqueClientsToday = new Set(
        todayAppointments.map(app => 
          app.cliente?.id || app.cliente?.nome || app.customer?.id || app.customer?.name || app.client_name
        ).filter(Boolean)
      ).size;

      // Calcula horas agendadas (aproximado: cada agendamento = 1 hora)
      const hoursScheduled = todayAppointments.length;

      // Atualiza as estatísticas
      setStats([
        { 
          label: 'Agendamentos Hoje', 
          value: appointmentsToday.toString(), 
          icon: <Calendar className="text-indigo-600" />, 
          color: 'bg-indigo-50' 
        },
        { 
          label: 'Novos Clientes', 
          value: uniqueClientsToday.toString(), 
          icon: <Users className="text-emerald-600" />, 
          color: 'bg-emerald-50' 
        },
        { 
          label: 'Faturamento Hoje', 
          value: `R$ ${revenueToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
          icon: <TrendingUp className="text-amber-600" />, 
          color: 'bg-amber-50' 
        },
        { 
          label: 'Horas Agendadas', 
          value: `${hoursScheduled}h`, 
          icon: <Clock className="text-rose-600" />, 
          color: 'bg-rose-50' 
        },
      ]);

    } catch (error) {
      console.error('Erro ao buscar estatísticas do dashboard:', error);
      // Mantém os valores padrão em caso de erro
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Olá, {user?.nome || 'Profissional'}! 👋</h1>
        <p className="text-slate-500">Aqui está o resumo do seu dia no FlowAgenda.</p>
      </div>

      {/* Grid de Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
              {stat.icon}
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {loading ? '...' : stat.value}
            </h3>
          </div>
        ))}
      </div>

      {/* Seção de Próximos Agendamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm min-h-75">
          <h3 className="font-bold text-slate-800 mb-6">Próximos Agendamentos</h3>
          {upcomingAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <div className="bg-slate-50 p-4 rounded-full mb-4">
                <Calendar className="text-slate-300" size={32} />
              </div>
              <p className="text-slate-400 text-sm">Nenhum agendamento para as próximas horas.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.map((app) => {
                const date = app.__parsedDate || parseISO(String(app.data_inicio || app.datetime_inicio || app.start || app.inicio || app.data || app.data_agendamento));
                const timeLabel = isToday(date)
                  ? `Hoje, ${format(date, 'HH:mm')}`
                  : `${format(date, 'dd/MM')} - ${format(date, 'HH:mm')}`;

                const clientName = app.cliente?.nome || app.customer?.name || app.client_name || app.client || 'Cliente';
                const serviceName = app.servico?.nome || app.service?.name || app.servico_nome || '';

                return (
                  <div key={app.id || app._id || `${app.__parsedDate?.toISOString()}-${Math.random()}`} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg">
                    <div>
                      <div className="text-sm text-slate-500">{timeLabel}</div>
                      <div className="font-medium text-slate-800">{clientName}</div>
                      {serviceName && <div className="text-sm text-slate-500">{serviceName}</div>}
                    </div>
                    <div className="text-sm text-slate-500">{app.status || ''}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Card Lateral de Destaque */}
        <div className="bg-indigo-600 p-8 rounded-3xl shadow-xl shadow-indigo-100 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="font-bold text-xl mb-2">Dica do Dia</h3>
            <p className="text-indigo-100 text-sm leading-relaxed">
              Mantenha seus serviços atualizados para que seus clientes saibam exatamente o que você oferece.
            </p>
            <button className="mt-6 bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all">
              Ver Serviços
            </button>
          </div>
          {/* Círculo decorativo */}
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500 rounded-full opacity-50"></div>
        </div>
      </div>
    </div>
  );
}