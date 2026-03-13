const API_URL = import.meta.env.VITE_API_URL || 'http://187.77.232.76:8000';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API Error ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export const api = {
  // Analytics / Dashboard
  getDashboardOverview: () => request<any>('/api/analytics/overview'),
  getDashboard: () => request<any>('/api/analytics/dashboard'),
  getFunnel: () => request<any>('/api/analytics/funnel'),
  getPlatformPerformance: () => request<any>('/api/analytics/platform-performance'),
  getRevenue: () => request<any>('/api/analytics/revenue'),

  // Leads
  getLeads: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/api/leads${qs}`);
  },
  createLead: (data: any) => request<any>('/api/leads', { method: 'POST', body: JSON.stringify(data) }),
  updateLead: (id: string, data: any) => request<any>(`/api/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLead: (id: string) => request<any>(`/api/leads/${id}`, { method: 'DELETE' }),
  bulkImportLeads: (data: any[]) => request<any>('/api/leads/bulk-import', { method: 'POST', body: JSON.stringify(data) }),
  getLeadStats: () => request<any>('/api/leads/stats'),

  // Thor AI
  analyzeProspect: (data: any) => request<any>('/api/thor/analyze-prospect', { method: 'POST', body: JSON.stringify(data) }),
  generateMessage: (data: any) => request<any>('/api/thor/generate-message', { method: 'POST', body: JSON.stringify(data) }),
  researchCompany: (data: any) => request<any>('/api/thor/research-company', { method: 'POST', body: JSON.stringify(data) }),
  getThorStatus: () => request<any>('/api/thor/status'),

  // Paula Profile
  getPaulaProfile: () => request<any>('/api/paula/profile'),
};
