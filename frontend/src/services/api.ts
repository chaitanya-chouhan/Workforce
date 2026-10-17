import { auth } from '../config/firebase';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Retrieves the current Firebase user ID token for authenticated requests.
 */
async function getIdToken(): Promise<string | null> {
  if (auth && auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken();
    } catch (e) {
      console.warn('Failed to get fresh ID token:', e);
    }
  }
  // Check local fallback
  return localStorage.getItem('workforce_token');
}

/**
 * Standard HTTP fetch wrapper with authorization header injection and error handling.
 */
async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getIdToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Do not set Content-Type for FormData uploads (browser sets multipart boundary automatically)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // System Health
  checkHealth: () => request('/health'),

  // Auth & Profile
  register: (payload: any) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request('/auth/me'),
  updateProfile: (payload: any) =>
    request('/users/me', { method: 'PATCH', body: JSON.stringify(payload) }),

  // Workers
  getWorkerProfile: () => request('/workers/me'),
  updateWorkerProfile: (payload: any) =>
    request('/workers/me', { method: 'PATCH', body: JSON.stringify(payload) }),
  toggleAvailability: (availabilityStatus: 'AVAILABLE' | 'UNAVAILABLE') =>
    request('/workers/me/availability', {
      method: 'PATCH',
      body: JSON.stringify({ availabilityStatus }),
    }),
  getMatchingWorkers: (requestId: string) =>
    request(`/workers/matches?requestId=${requestId}`),
  getOpenTasks: () => request('/workers/open-tasks'),
  expressInterest: (requestId: string, message?: string) =>
    request(`/workers/tasks/${requestId}/interest`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  // Service Requests & Gemma 4
  createRequest: (payload: any) =>
    request('/requests', { method: 'POST', body: JSON.stringify(payload) }),
  getRequests: () => request('/requests'),
  getRequest: (id: string) => request(`/requests/${id}`),
  analyzeRequest: (id: string, formData: FormData) =>
    request(`/requests/${id}/analyze`, { method: 'POST', body: formData }),
  cancelRequest: (id: string) =>
    request(`/requests/${id}/cancel`, { method: 'POST' }),

  // Assignment OTP
  generateAssignmentOtp: (requestId: string, workerId: string) =>
    request(`/requests/${requestId}/assignment-otp`, {
      method: 'POST',
      body: JSON.stringify({ workerId }),
    }),
  verifyAssignmentOtp: (requestId: string, otp: string) =>
    request(`/requests/${requestId}/verify-assignment-otp`, {
      method: 'POST',
      body: JSON.stringify({ otp }),
    }),

  // Tasks Management
  getAssignedTasks: () => request('/tasks/assigned'),
  startTask: (id: string) => request(`/tasks/${id}/start`, { method: 'POST' }),
  completeTask: (id: string) => request(`/tasks/${id}/complete`, { method: 'POST' }),
  confirmTaskCompletion: (id: string) =>
    request(`/tasks/${id}/confirm-completion`, { method: 'POST' }),

  // Feedback
  submitFeedback: (requestId: string, payload: { rating: number; comment: string }) =>
    request(`/requests/${requestId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getWorkerFeedback: (workerId: string) => request(`/workers/${workerId}/feedback`),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id: string) =>
    request(`/notifications/${id}/read`, { method: 'PATCH' }),

  // Admin
  getStats: () => request('/admin/stats'),
  getAdminWorkers: () => request('/admin/workers'),
  verifyWorker: (workerId: string, status: 'VERIFIED' | 'REJECTED', notes?: string) =>
    request(`/admin/workers/${workerId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    }),
  getRateCards: () => request('/admin/rate-cards'),
  createRateCard: (payload: any) =>
    request('/admin/rate-cards', { method: 'POST', body: JSON.stringify(payload) }),
  getSkills: () => request('/admin/skills'),
  getAdminUsers: () => request('/admin/users'),
  getAdminRequests: () => request('/admin/requests'),
};
