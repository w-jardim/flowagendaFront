// src/contexts/AuthContext.jsx
import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storagedUser = localStorage.getItem('@FlowAgenda:user');
    const storagedToken = localStorage.getItem('@FlowAgenda:token');

    if (storagedUser && storagedToken) {
      try {
        const parsedUser = JSON.parse(storagedUser);
        api.defaults.headers.common.Authorization = `Bearer ${storagedToken}`;

        // Ensure role is present on user (try to decode token if needed)
        const decoded = decodeToken(storagedToken);
        if (decoded && decoded.role && !parsedUser.role) parsedUser.role = decoded.role;

        setUser(parsedUser);
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    setLoading(true);
    try {
      console.log('[Auth] Iniciando chamada ao backend...');

      const response = await api.post('/auth/login', { email, password });
      
      console.log('[Auth] Resposta recebida:', response.data);

      const token = response.data?.token || response.data?.access_token;

      if (!token) {
        throw new Error('Token não retornado pelo servidor');
      }

      // Se o backend não mandou o objeto 'user', criamos um temporário para destravar o front
      const userData = response.data?.user || { 
        email: email, 
        nome: email.split('@')[0] 
      };

      // Extrai role do token se não veio no user
      const decoded = decodeToken(token);
      if (decoded && decoded.role) userData.role = userData.role || decoded.role;

      // Algumas APIs retornam roles em arrays
      if (!userData.role && decoded && decoded.roles && Array.isArray(decoded.roles) && decoded.roles.length) {
        userData.role = decoded.roles[0];
      }

      localStorage.setItem('@FlowAgenda:token', token);
      localStorage.setItem('@FlowAgenda:user', JSON.stringify(userData));

      api.defaults.headers.common.Authorization = `Bearer ${token}`;

      setUser(userData);
      
      console.log('[Auth] Login concluído com sucesso!');
      setLoading(false);
    } catch (error) {
      console.error('[Auth] Erro no processo de login:', error);
      setLoading(false);
      throw new Error('Falha na autenticação');
    }
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem('@FlowAgenda:token');
    localStorage.removeItem('@FlowAgenda:user');
    setUser(null);
    delete api.defaults.headers.common.Authorization;
  }, []);

  return (
    <AuthContext.Provider value={{ signed: !!user, user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Decodifica payload de JWT sem dependências externas
function decodeToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // base64url -> base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

export const useAuth = () => { // eslint-disable-line react-refresh/only-export-components
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
};