import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

// ── Request Interceptor: Attach Bearer Token ──────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bhavvi_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Handle 401 ─────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bhavvi_access_token');
      localStorage.removeItem('bhavvi_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
};

// ── Sessions ──────────────────────────────────────────────────────────────────
export const sessionsApi = {
  list: () => api.get('/sessions'),
  create: (title = 'New Conversation') => api.post('/sessions', { title }),
  get: (id) => api.get(`/sessions/${id}`),
  update: (id, data) => api.patch(`/sessions/${id}`, data),
  delete: (id) => api.delete(`/sessions/${id}`),
};

// ── Chat ──────────────────────────────────────────────────────────────────────
export const chatApi = {
  send: (data) => api.post('/chat', data),
  streamUrl: `${BASE_URL}/chat/stream`,
};

// ── Upload ────────────────────────────────────────────────────────────────────
export const uploadApi = {
  upload: (file, sessionId, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    if (sessionId) formData.append('session_id', sessionId);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      },
    });
  },
};

// ── Documents ─────────────────────────────────────────────────────────────────
export const documentsApi = {
  list: () => api.get('/documents'),
  get: (id) => api.get(`/documents/${id}`),
};

// ── Health ────────────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get('/health').catch(() => ({ data: { status: 'unreachable' } })),
};

export default api;
