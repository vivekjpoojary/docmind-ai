import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  User,
  AuthTokens,
  Document,
  Conversation,
  SearchResultItem,
  SearchResponse,
  UserAnalytics,
  SystemAnalytics,
  AdminUserListItem,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response Interceptor: Handle Token Refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const { data } = await axios.post<AuthTokens>(`${API_BASE_URL}/refresh`, {
            refresh_token: refreshToken,
          });

          localStorage.setItem('access_token', data.access_token);
          if (data.refresh_token) {
            localStorage.setItem('refresh_token', data.refresh_token);
          }

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          }
          return api(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.dispatchEvent(new Event('auth:logout'));
        }
      }
    }

    return Promise.reject(error);
  }
);

// Auth Endpoints
export const authApi = {
  register: async (email: string, password: string, fullName: string): Promise<User> => {
    const res = await api.post<User>('/register', {
      email,
      password,
      full_name: fullName,
    });
    return res.data;
  },

  login: async (email: string, password: string): Promise<AuthTokens> => {
    const res = await api.post<AuthTokens>('/login', { email, password });
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await api.get<User>('/me');
    return res.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/logout');
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },
};

// Document Endpoints
export const documentApi = {
  upload: async (file: File): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<{ document: Document; message: string }>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.document;
  },

  list: async (): Promise<Document[]> => {
    const res = await api.get<Document[]>('/documents');
    return res.data;
  },

  get: async (id: string): Promise<Document> => {
    const res = await api.get<Document>(`/document/${id}`);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/document/${id}`);
  },
};

// RAG Chat Endpoints
export const ragApi = {
  ask: async (
    question: string,
    conversationId?: string,
    documentIds?: string[]
  ): Promise<{
    answer: string;
    conversation_id: string;
    sources: any[];
    confidence_score: number;
  }> => {
    const res = await api.post('/ask', {
      question,
      conversation_id: conversationId,
      document_ids: documentIds,
    });
    return res.data;
  },
};

// History Endpoints
export const historyApi = {
  list: async (): Promise<Conversation[]> => {
    const res = await api.get<Conversation[]>('/history');
    return res.data;
  },

  get: async (id: string): Promise<Conversation> => {
    const res = await api.get<Conversation>(`/history/${id}`);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/history/${id}`);
  },

  clearAll: async (): Promise<void> => {
    await api.delete('/history');
  },
};

// Search Endpoints
export const searchApi = {
  search: async (
    query: string,
    mode: 'semantic' | 'keyword' | 'hybrid' = 'hybrid',
    limit: number = 10,
    documentIds?: string[]
  ): Promise<SearchResultItem[]> => {
    const res = await api.post<SearchResponse>('/search', {
      query,
      mode,
      top_k: limit,
      document_ids: documentIds,
    });
    return res.data.results || [];
  },
};

// Analytics & Admin Endpoints
export const analyticsApi = {
  getUserAnalytics: async (): Promise<UserAnalytics> => {
    const res = await api.get<UserAnalytics>('/analytics');
    return res.data;
  },
};

export const adminApi = {
  getSystemAnalytics: async (): Promise<SystemAnalytics> => {
    const res = await api.get<SystemAnalytics>('/admin/analytics');
    return res.data;
  },

  listUsers: async (): Promise<AdminUserListItem[]> => {
    const res = await api.get<AdminUserListItem[]>('/admin/users');
    return res.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },

  deleteDocument: async (id: string): Promise<void> => {
    await api.delete(`/admin/documents/${id}`);
  },
};
