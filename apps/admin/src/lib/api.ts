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
  const token = localStorage.getItem('adminAccessToken');
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
        const refreshToken = localStorage.getItem('adminRefreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem('adminAccessToken', accessToken);
          localStorage.setItem('adminRefreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('adminAccessToken');
        localStorage.removeItem('adminRefreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: () => {
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('adminRefreshToken');
  },
};

// Admin API
export const adminApi = {
  // Dashboard stats
  getStats: () => api.get('/admin/stats'),

  // Users
  getUsers: (params?: { page?: number; limit?: number; search?: string; status?: string; role?: string }) =>
    api.get('/admin/users', { params }),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  updateUser: (id: string, data: { status?: string; role?: string }) =>
    api.put(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  createAdmin: (data: { email: string; password: string; name: string }) =>
    api.post('/admin/users/admin', data),
};

// Credentials API
export const credentialsApi = {
  getAll: () => api.get('/admin/credentials'),
  getByCategory: (category: string) => api.get(`/admin/credentials/category/${category}`),
  create: (data: { key: string; value: string; description?: string; category?: string }) =>
    api.post('/admin/credentials', data),
  update: (key: string, data: { value?: string; description?: string; isActive?: boolean }) =>
    api.put(`/admin/credentials/${key}`, data),
  delete: (key: string) => api.delete(`/admin/credentials/${key}`),
  test: (key: string) => api.get(`/admin/credentials/test/${key}`),
  clearCache: () => api.post('/admin/credentials/clear-cache'),
};

// Payments API (Admin)
export const paymentsApi = {
  getHistory: (params?: { page?: number; limit?: number; status?: string; userId?: string }) =>
    api.get('/admin/payments', { params }),
};

// Plans API (Admin)
export const plansApi = {
  getAll: () => api.get('/admin/plans'),
  getById: (id: string) => api.get(`/admin/plans/${id}`),
  create: (data: {
    name: string;
    displayName: string;
    description?: string;
    monthlyPrice: number;
    yearlyPrice: number;
    yearlyDiscount?: number;
    credits: number;
    features?: string[];
    isActive?: boolean;
    isDefault?: boolean;
    sortOrder?: number;
  }) => api.post('/admin/plans', data),
  update: (id: string, data: {
    displayName?: string;
    description?: string;
    monthlyPrice?: number;
    yearlyPrice?: number;
    yearlyDiscount?: number;
    credits?: number;
    features?: string[];
    isActive?: boolean;
    isDefault?: boolean;
    sortOrder?: number;
    razorpayMonthlyPlanId?: string;
    razorpayYearlyPlanId?: string;
  }) => api.put(`/admin/plans/${id}`, data),
  delete: (id: string) => api.delete(`/admin/plans/${id}`),
  seed: () => api.post('/admin/plans/seed'),
  createRazorpayPlan: (planId: string, billingCycle: 'MONTHLY' | 'YEARLY') =>
    api.post('/payments/admin/create-razorpay-plan', { planId, billingCycle }),
};

// Workspaces API (Admin)
export const workspacesApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; isPublished?: boolean }) =>
    api.get('/admin/workspaces', { params }),
  getById: (id: string) => api.get(`/admin/workspaces/${id}`),
  togglePublish: (id: string, isPublished: boolean) =>
    api.put(`/admin/workspaces/${id}/publish`, { isPublished }),
  delete: (id: string) => api.delete(`/admin/workspaces/${id}`),
};

// Credits API (Admin)
export const creditsApi = {
  getUtilization: (params?: { page?: number; limit?: number; tier?: string }) =>
    api.get('/admin/credits/utilization', { params }),
  getStats: () => api.get('/admin/credits/stats'),
};

export const apiClient = api;
