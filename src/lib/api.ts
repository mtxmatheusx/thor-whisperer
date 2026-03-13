// API utilities — all data flows through Supabase/Lovable Cloud
// The external FastAPI backend is no longer used

export const api = {
  // These functions return null to gracefully handle dashboard calls
  getDashboardOverview: async () => null,
  getDashboard: async () => null,
  getFunnel: async () => null,
  getPlatformPerformance: async () => null,
  getRevenue: async () => null,
};
