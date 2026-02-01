import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { email?: string; phone?: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email?: string; phone?: string; password: string }) =>
    api.post('/auth/login', data),
  verify: (data: { email?: string; phone?: string; code: string }) =>
    api.post('/auth/verify', data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Users API
export const usersApi = {
  getProfile: () => api.get('/users/me/profile'),
  updateProfile: (data: any) => api.put('/users/me/profile', data),
  getUser: () => api.get('/users/me'),
  updateUser: (data: any) => api.put('/users/me', data),
};

// Subscriptions API
export const subscriptionsApi = {
  getPlans: () => api.get('/subscriptions/plans'),
  getSubscription: () => api.get('/subscriptions'),
  getCredits: () => api.get('/subscriptions/credits'),
  getCreditHistory: (params?: { limit?: number; offset?: number }) =>
    api.get('/subscriptions/credits/history', { params }),
};

// Content API
export const contentApi = {
  generate: (data: {
    platform: string;
    contentType: string;
    topic?: string;
    tone?: string;
    length?: string;
  }) => api.post('/content/generate', data),
  create: (data: any) => api.post('/content', data),
  getAll: (params?: { type?: string; status?: string; limit?: number; offset?: number }) =>
    api.get('/content', { params }),
  getById: (id: string) => api.get(`/content/${id}`),
  update: (id: string, data: any) => api.put(`/content/${id}`, data),
  delete: (id: string) => api.delete(`/content/${id}`),
  schedule: (id: string, data: { scheduledAt: string; connectionId?: string }) =>
    api.post(`/content/${id}/schedule`, data),
  getVariations: (id: string) => api.post(`/content/${id}/variations`),
  getTrending: () => api.get('/content/trending'),
  getDrafts: () => api.get('/content/drafts'),
  getScheduled: () => api.get('/content/scheduled'),
};

// Publishing API
export const publishingApi = {
  publish: (contentId: string, connectionId?: string) =>
    api.post(`/publishing/${contentId}/publish`, { connectionId }),
  getHistory: (params?: { limit?: number; offset?: number }) =>
    api.get('/publishing/history', { params }),
};

// Platforms API
export const platformsApi = {
  getConnections: () => api.get('/platforms'),
  getConnection: (id: string) => api.get(`/platforms/${id}`),
  disconnect: (id: string) => api.delete(`/platforms/${id}`),
  testConnection: (id: string) => api.post(`/platforms/${id}/test`),
  getMetaAuthUrl: () => api.get('/platforms/oauth/meta'),
  getGoogleAuthUrl: () => api.get('/platforms/oauth/google'),
  getWordPressAuthUrl: (siteUrl: string) =>
    api.get('/platforms/oauth/wordpress', { params: { siteUrl } }),
};

// Analytics API
export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getContentAnalytics: (id: string) => api.get(`/analytics/content/${id}`),
  getReport: (startDate: string, endDate: string) =>
    api.get('/analytics/report', { params: { startDate, endDate } }),
};

// Alias for convenience
export const apiClient = api;
