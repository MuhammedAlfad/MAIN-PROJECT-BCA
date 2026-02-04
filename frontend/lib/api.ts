import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  // Only access localStorage on client-side
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const authApi = {
  register: (email: string, username: string, password: string) =>
    apiClient.post('/api/auth/register', { email, username, password }),
  login: (email: string, password: string) =>
    apiClient.post('/api/auth/login', { email, password }),
  verifyToken: (token: string) =>
    apiClient.post('/api/auth/verify-token', { token }),
};

export const tripsApi = {
  createTrip: (tripData: any) =>
    apiClient.post('/api/trips/create', tripData),
  getMyTrips: () =>
    apiClient.get('/api/trips/my-trips'),
  getTrip: (tripId: string) =>
    apiClient.get(`/api/trips/${tripId}`),
  updateTrip: (tripId: string, tripData: any) =>
    apiClient.put(`/api/trips/${tripId}`, tripData),
  deleteTrip: (tripId: string) =>
    apiClient.delete(`/api/trips/${tripId}`),
  getPublicTrips: (limit?: number, skip?: number) =>
    apiClient.get('/api/trips/discover/public', { params: { limit, skip } }),
  addPlaceToTrip: (tripId: string, day: number, place: any) =>
    apiClient.post(`/api/trips/${tripId}/add-place/${day}`, place),
  removePlaceFromTrip: (tripId: string, day: number, placeName: string) =>
    apiClient.delete(`/api/trips/${tripId}/remove-place/${day}/${placeName}`),
  updateDayNotes: (tripId: string, day: number, notes: string) =>
    apiClient.put(`/api/trips/${tripId}/day/${day}/notes`, { notes }),
};

export const placesApi = {
  getRecommendations: (location: string, limit?: number, timestamp?: number) =>
    apiClient.get('/api/places/recommendations', { params: { location, limit, _t: timestamp } }),
  searchPlaces: (query: string) =>
    apiClient.get('/api/places/search', { params: { query } }),
};

export default apiClient;
