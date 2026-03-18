import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { connectSocket, disconnectSocket } from '../utils/socket';
import { getTabId, tokenKey, userKey } from '../utils/tabSession';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const tabId = getTabId()
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(userKey(tabId))); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(tokenKey(tabId));
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data.user);
          localStorage.setItem(userKey(tabId), JSON.stringify(res.data.user));
          connectSocket(token);
        })
        .catch(() => { localStorage.removeItem(tokenKey(tabId)); localStorage.removeItem(userKey(tabId)); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user } = res.data;
    localStorage.setItem(tokenKey(tabId), token);
    localStorage.setItem(userKey(tabId), JSON.stringify(user));
    setUser(user);
    connectSocket(token);
    return user;
  }, []);

  const register = useCallback(async (data) => {
    const res = await api.post('/auth/register', data);
    const { token, user } = res.data;
    localStorage.setItem(tokenKey(tabId), token);
    localStorage.setItem(userKey(tabId), JSON.stringify(user));
    setUser(user);
    connectSocket(token);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(tokenKey(tabId));
    localStorage.removeItem(userKey(tabId));
    setUser(null);
    disconnectSocket();
  }, []);

  const updateUser = useCallback((updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem(userKey(tabId), JSON.stringify(updated));
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
