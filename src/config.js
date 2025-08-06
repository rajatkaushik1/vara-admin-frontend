const API_BASE_URL = 'https://vara-admin-backend.onrender.com';

// Analytics API endpoints
const ANALYTICS_ENDPOINTS = {
  getAllSongsAnalytics: () => `${API_BASE_URL}/api/analytics/songs`,
  getSongAnalytics: (songId, days = 7) => `${API_BASE_URL}/api/analytics/songs/${songId}?days=${days}`,
  getPlatformStats: (days = 7) => `${API_BASE_URL}/api/analytics/platform?days=${days}`,
  resetWeeklyCounters: () => `${API_BASE_URL}/api/analytics/reset-weekly`
};

export { API_BASE_URL, ANALYTICS_ENDPOINTS };
