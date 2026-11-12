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
  if (options.body instanceof FormData) {
    headers.delete('Content-Type');
  } else if (!headers.has('Content-Type')) {
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

  // Feedback & Reviews
  submitFeedback: (requestId: string, payload: { rating?: number; review?: string; comment?: string }) =>
    request(`/requests/${requestId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getWorkerFeedback: (workerId: string) => request(`/workers/${workerId}/feedback`),

  // Interest & Assignment Moderation
  declineTaskInterest: (requestId: string, workerId: string) =>
    request(`/requests/${requestId}/interests/${workerId}/decline`, { method: 'POST' }),
  cancelAssignment: (requestId: string) =>
    request(`/requests/${requestId}/cancel-assignment`, { method: 'POST' }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id: string) =>
    request(`/notifications/${id}/read`, { method: 'PATCH' }),
  // Delete a single notification
  deleteNotification: (id: string) =>
    request(`/notifications/${id}`, { method: 'DELETE' }),
  // Clear all notifications for the current user
  clearAllNotifications: () =>
    request('/notifications', { method: 'DELETE' }),

  // Worker Identity Document
  uploadIdentityDocument: (formData: FormData) =>
    request('/workers/me/identity-document', { method: 'POST', body: formData }),
  getMyDocumentBlob: async (): Promise<string> => {
    return api.fetchDocumentBlob('/workers/me/document');
  },

  // Complaints
  submitComplaint: (formData: FormData) =>
    request('/complaints', { method: 'POST', body: formData }),
  getMyComplaints: () => request('/complaints/my'),

  // Secure Document Viewer Helper (Authenticated Blob URL)
  fetchDocumentBlob: async (endpoint: string): Promise<string> => {
    const token = await getIdToken();
    const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch document (${res.status})`);
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  // Admin
  getStats: () => request('/admin/stats'),
  getAdminWorkers: () => request('/admin/workers'),
  getAdminWorkerDocumentBlob: (workerId: string) =>
    api.fetchDocumentBlob(`/admin/workers/${workerId}/document`),
  verifyWorker: (
    workerId: string,
    status: 'VERIFIED' | 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUIRED',
    notes: string
  ) =>
    request(`/admin/workers/${workerId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    }),
  getAdminUsers: (params?: { role?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request(`/admin/users${query ? `?${query}` : ''}`);
  },
  banUser: (userId: string, reason: string) =>
    request(`/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  unbanUser: (userId: string, reason?: string) =>
    request(`/admin/users/${userId}/unban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  getAdminComplaints: (params?: { targetRole?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request(`/admin/complaints${query ? `?${query}` : ''}`);
  },
  getAdminComplaint: (id: string) => request(`/admin/complaints/${id}`),
  updateComplaintStatus: (
    id: string,
    status: 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED',
    resolutionNotes?: string
  ) =>
    request(`/admin/complaints/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolutionNotes }),
    }),
  getComplaintEvidenceBlob: (complaintId: string) =>
    api.fetchDocumentBlob(`/complaints/${complaintId}/evidence`),
  getAuditLogs: (params?: { action?: string; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return request(`/admin/audit-logs${query ? `?${query}` : ''}`);
  },
  changeAdminPassword: (payload: { currentPassword?: string; newPassword: string }) =>
    request('/admin/password/change', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getRateCards: () => request('/admin/rate-cards'),
  createRateCard: (payload: any) =>
    request('/admin/rate-cards', { method: 'POST', body: JSON.stringify(payload) }),
  getSkills: () => request('/admin/skills'),
  getAdminRequests: () => request('/admin/requests'),
};
