// src/App.jsx
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Loader2, Calendar, LogOut, LayoutDashboard, Users, Briefcase } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
//paginas
import AgendaPage from './pages/AgendaPage';
import ServicesPage from './pages/ServicesPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import AdminUsersPage from './pages/AdminUsersPage';

// RequireAdmin wrapper: if user is not admin, redirect to / with alert
function RequireAdmin({ children }) {
  const { user } = useAuth();
  const role = (user && user.role) ? String(user.role).toUpperCase() : 'PROFISSIONAL';
  const location = useLocation();
  if (role === 'ADMIN' || role === 'ADMINISTRADOR') return children;
  // Redirect non-admins to dashboard with alert
  alert('Acesso Negado');
  return <Navigate to="/" replace state={{ from: location }} />;
}

function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault(); // IMPORTANTE: Impede o refresh da página
    setLoading(true);
    setError('');
    
    try {
      await signIn({ email, password });
      // Se chegar aqui, o AuthContext vai mudar o estado 'signed' e o App vai trocar a tela
    } catch (err) {
      console.error("Erro no componente de login:", err);
      setError('Usuário ou senha incorretos ou erro de conexão');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <Calendar className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">FlowAgenda</h1>
          <p className="text-slate-500 text-sm mt-2">Entre com suas credenciais</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">E-mail</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 mt-1" 
              placeholder="seu@email.com" 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Senha</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 mt-1" 
              placeholder="••••••••" 
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 text-xs p-3 rounded-lg text-center font-medium">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Entrar na Plataforma'}
          </button>
        </form>
      </div>
    </div>
  );
}

function MainLayout({ children }) {
  const { signOut, user } = useAuth();
  const location = useLocation();

  // Menu condicional baseado no role do usuário
  const role = (user && user.role) ? String(user.role).toUpperCase() : 'PROFISSIONAL';

  let menuItems = [];
  if (role === 'ADMIN' || role === 'ADMINISTRADOR') {
    menuItems = [
      { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
      { path: '/admin/usuarios', label: 'Gestão de Profissionais', icon: <Users size={20} /> },
      { path: '/admin/metrics', label: 'Métricas', icon: <TrendingUp size={20} /> },
      { path: '/admin/config', label: 'Configurações', icon: <LayoutDashboard size={20} /> },
    ];
  } else {
    // Profissional padrão
    menuItems = [
      { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
      { path: '/agenda', label: 'Agenda', icon: <Calendar size={20} /> },
      { path: '/clientes', label: 'Clientes', icon: <Users size={20} /> },
      { path: '/servicos', label: 'Serviços', icon: <Briefcase size={20} /> },
    ];
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-white border-r border-slate-200 p-6 hidden md:flex flex-col">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Calendar className="text-white" size={20} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">FlowAgenda</h2>
        </div>

        <nav className="space-y-2 flex-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${location.pathname === item.path ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>

        <div className="pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
              {user?.nome?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate">{user?.nome || 'Usuário'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={signOut} className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 rounded-xl font-medium transition-all">
            <LogOut size={20} /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-50">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const { signed, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  if (!signed) {
    return <LoginPage />;
  }

  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/servicos" element={<ServicesPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/clientes" element={<ClientsPage />} />

          {/* Admin routes */}
          <Route path="/admin/usuarios" element={<RequireAdmin><AdminUsersPage /></RequireAdmin>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}