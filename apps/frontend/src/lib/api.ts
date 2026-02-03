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

// Public API (no auth required)
export const publicApi = {
  getPlans: () => api.get('/subscriptions/plans'),
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

// Workspace API
export const workspaceApi = {
  get: () => api.get('/workspace'),
  create: (data: { name: string; slug: string; description?: string }) =>
    api.post('/workspace', data),
  update: (data: {
    name?: string;
    description?: string;
    logo?: string;
    favicon?: string;
    settings?: string;
    isPublished?: boolean;
  }) => api.put('/workspace', data),
  delete: () => api.delete('/workspace'),
  checkSlug: (slug: string) => api.get(`/workspace/check-slug/${slug}`),
};

// Workspace Pages API
export const pagesApi = {
  list: () => api.get('/workspace/pages'),
  get: (id: string) => api.get(`/workspace/pages/${id}`),
  create: (data: {
    title: string;
    slug: string;
    description?: string;
    isHomePage?: boolean;
  }) => api.post('/workspace/pages', data),
  update: (
    id: string,
    data: {
      title?: string;
      slug?: string;
      description?: string;
      isHomePage?: boolean;
      seoTitle?: string;
      seoKeywords?: string;
      sortOrder?: number;
    }
  ) => api.put(`/workspace/pages/${id}`, data),
  updateContent: (
    id: string,
    data: { blocks: any[]; htmlContent?: string; cssContent?: string }
  ) => api.put(`/workspace/pages/${id}/content`, data),
  delete: (id: string) => api.delete(`/workspace/pages/${id}`),
  publish: (id: string) => api.post(`/workspace/pages/${id}/publish`),
  unpublish: (id: string) => api.post(`/workspace/pages/${id}/unpublish`),
  duplicate: (id: string) => api.post(`/workspace/pages/${id}/duplicate`),
  generate: (data: {
    prompt: string;
    pageType: string;
    style?: string;
    title?: string;
    slug?: string;
  }) => api.post('/workspace/pages/generate', data),
  generateSection: (data: { sectionType: string; prompt: string }) =>
    api.post('/workspace/pages/generate-section', data),
};

// Workspace Posts API
export const postsApi = {
  list: (params?: { status?: string; limit?: number; offset?: number }) =>
    api.get('/workspace/posts', { params }),
  get: (id: string) => api.get(`/workspace/posts/${id}`),
  create: (data: {
    title: string;
    slug?: string;
    excerpt?: string;
    content?: string;
    featuredImage?: string;
    tags?: string[];
    categories?: string[];
  }) => api.post('/workspace/posts', data),
  update: (
    id: string,
    data: {
      title?: string;
      slug?: string;
      excerpt?: string;
      content?: string;
      featuredImage?: string;
      seoTitle?: string;
      seoDescription?: string;
      seoKeywords?: string;
      tags?: string[];
      categories?: string[];
    }
  ) => api.put(`/workspace/posts/${id}`, data),
  delete: (id: string) => api.delete(`/workspace/posts/${id}`),
  publish: (id: string) => api.post(`/workspace/posts/${id}/publish`),
  unpublish: (id: string) => api.post(`/workspace/posts/${id}/unpublish`),
  syncToWordPress: (id: string, connectionId: string) =>
    api.post(`/workspace/posts/${id}/sync-wp`, { connectionId }),
};

// Workspace Menus API
export const menusApi = {
  list: () => api.get('/workspace/menus'),
  get: (id: string) => api.get(`/workspace/menus/${id}`),
  getByLocation: (location: string) =>
    api.get(`/workspace/menus/location/${location}`),
  getOptions: () => api.get('/workspace/menus/options'),
  create: (data: {
    name: string;
    location: 'HEADER' | 'FOOTER' | 'SIDEBAR';
    items?: any[];
  }) => api.post('/workspace/menus', data),
  update: (id: string, data: { name?: string; isActive?: boolean }) =>
    api.put(`/workspace/menus/${id}`, data),
  updateItems: (id: string, items: any[]) =>
    api.put(`/workspace/menus/${id}/items`, { items }),
  delete: (id: string) => api.delete(`/workspace/menus/${id}`),
};

// Public Workspace API (no auth required)
export const publicWorkspaceApi = {
  getHome: (workspaceSlug: string) => api.get(`/w/${workspaceSlug}`),
  getPage: (workspaceSlug: string, pageSlug: string) =>
    api.get(`/w/${workspaceSlug}/page/${pageSlug}`),
  getBlog: (workspaceSlug: string, params?: { limit?: number; offset?: number }) =>
    api.get(`/w/${workspaceSlug}/blog`, { params }),
  getPost: (workspaceSlug: string, postSlug: string) =>
    api.get(`/w/${workspaceSlug}/blog/${postSlug}`),
  getMenu: (workspaceSlug: string, location: string) =>
    api.get(`/w/${workspaceSlug}/menu/${location}`),
  getInfo: (workspaceSlug: string) => api.get(`/w/${workspaceSlug}/info`),
};

// Business Intelligence API
export const businessApi = {
  // Profile
  getProfile: () => api.get('/business/profile'),
  updateProfile: (data: any) => api.put('/business/profile', data),

  // Products
  getProducts: () => api.get('/business/products'),
  getProduct: (id: string) => api.get(`/business/products/${id}`),
  createProduct: (data: any) => api.post('/business/products', data),
  updateProduct: (id: string, data: any) => api.put(`/business/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/business/products/${id}`),

  // Services
  getServices: () => api.get('/business/services'),
  getService: (id: string) => api.get(`/business/services/${id}`),
  createService: (data: any) => api.post('/business/services', data),
  updateService: (id: string, data: any) => api.put(`/business/services/${id}`, data),
  deleteService: (id: string) => api.delete(`/business/services/${id}`),

  // Competitors
  getCompetitors: () => api.get('/business/competitors'),
  getCompetitor: (id: string) => api.get(`/business/competitors/${id}`),
  createCompetitor: (data: any) => api.post('/business/competitors', data),
  updateCompetitor: (id: string, data: any) => api.put(`/business/competitors/${id}`, data),
  deleteCompetitor: (id: string) => api.delete(`/business/competitors/${id}`),

  // Target Audiences
  getAudiences: () => api.get('/business/audiences'),
  getAudience: (id: string) => api.get(`/business/audiences/${id}`),
  createAudience: (data: any) => api.post('/business/audiences', data),
  updateAudience: (id: string, data: any) => api.put(`/business/audiences/${id}`, data),
  deleteAudience: (id: string) => api.delete(`/business/audiences/${id}`),
};

// AI Scraper API (Multi-provider data fetching)
export const aiScraperApi = {
  getProviders: () => api.get('/ai-scraper/providers'),
  getCreditCosts: () => api.get('/ai-scraper/credit-costs'),
  fetchCompetitor: (data: {
    provider: string;
    competitorName?: string;
    competitorUrl?: string;
    industry?: string;
    includeSocial?: boolean;
    includeAds?: boolean;
  }) => api.post('/ai-scraper/competitors', data),
  fetchProducts: (data: {
    provider: string;
    businessDescription?: string;
    industry?: string;
    targetMarket?: string;
    existingProducts?: string[];
  }) => api.post('/ai-scraper/products', data),
  fetchServices: (data: {
    provider: string;
    businessDescription?: string;
    industry?: string;
    businessModel?: string;
    existingServices?: string[];
  }) => api.post('/ai-scraper/services', data),
  fetchAudiences: (data: {
    provider: string;
    businessDescription?: string;
    industry?: string;
    products?: string[];
    services?: string[];
  }) => api.post('/ai-scraper/audiences', data),
  fetchBrand: (data: {
    provider: string;
    businessName?: string;
    businessDescription?: string;
    industry?: string;
    targetAudience?: string;
    existingBrandVoice?: string;
  }) => api.post('/ai-scraper/brand', data),
  // Scan business URL to extract company information
  scanBusinessUrl: (data: {
    provider: string;
    url: string;
    urlType?: 'website' | 'linkedin' | 'google_my_business' | 'facebook' | 'instagram' | 'twitter' | 'youtube' | 'unknown';
    context?: string;
  }) => api.post('/ai-scraper/scan', data),
};

// Upload API
export const uploadApi = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Alias for convenience
export const apiClient = api;
