import axios from 'axios';
import { getTabId, tokenKey } from './tabSession';

const api = axios.create({
  baseURL: 'http://localhost:5001/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  try {
    const tabId = getTabId()
    const token = localStorage.getItem(tokenKey(tabId))
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch (e) {}
  return config
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      try {
        const tabId = getTabId()
        localStorage.removeItem(tokenKey(tabId))
        localStorage.removeItem(`au_user_${tabId}`)
      } catch (e) {}
      window.location.href = '/login'
    }
    return Promise.reject(err);
  }
);

export default api;
