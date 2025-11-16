export const API_BASE_URL = import.meta.env.VITE_ADMIN_API_URL || 'https://vara-admin-backend.onrender.com';

// Analytics API endpoints
const ANALYTICS_ENDPOINTS = {
  getAllSongsAnalytics: () => `${API_BASE_URL}/api/analytics/songs`,
  getSongAnalytics: (songId, days = 7) => `${API_BASE_URL}/api/analytics/songs/${songId}?days=${days}`,
  getPlatformStats: (days = 7) => `${API_BASE_URL}/api/analytics/platform?days=${days}`,
  resetWeeklyCounters: () => `${API_BASE_URL}/api/analytics/reset-weekly`
};

// NEW: Batch API endpoints
const BATCH_ENDPOINTS = {
  list: () => `${API_BASE_URL}/api/batches`,
  create: () => `${API_BASE_URL}/api/batches`,
};

export { ANALYTICS_ENDPOINTS, BATCH_ENDPOINTS };
// Do not change any other file or function.

