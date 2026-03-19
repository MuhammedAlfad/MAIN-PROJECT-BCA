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

const normalizePlacePayload = (place: any) => {
  const lat = Number(place?.coordinates?.lat ?? place?.lat ?? place?.latitude ?? 0);
  const lng = Number(place?.coordinates?.lng ?? place?.coordinates?.lon ?? place?.lng ?? place?.lon ?? place?.longitude ?? 0);
  const rating = Number(place?.rating ?? 0);
  const name = String(place?.name ?? place?.display_name ?? '').trim();
  const description =
    typeof place?.description === 'string' && place.description.trim().length > 0
      ? place.description.trim()
      : null;
  const category =
    typeof place?.category === 'string' && place.category.trim().length > 0
      ? place.category.trim()
      : 'Attraction';

  return {
    name,
    description,
    coordinates: {
      lat: Number.isFinite(lat) ? lat : 0,
      lng: Number.isFinite(lng) ? lng : 0,
    },
    rating: Number.isFinite(rating) ? rating : 0,
    image_url: typeof place?.image_url === 'string' && place.image_url.trim().length > 0 ? place.image_url.trim() : null,
    category,
    visit_time: place?.visit_time ?? null,
    duration_minutes: place?.duration_minutes ?? null,
    travel_minutes_from_previous: place?.travel_minutes_from_previous ?? null,
    notes: place?.notes ?? null,
    auto_generated_time: place?.auto_generated_time ?? null,
  };
};

export interface AuthApiResponse {
  requires_otp?: boolean;
  message?: string;
  email?: string;
  otp_expires_in_seconds?: number;
  access_token?: string;
  token_type?: string;
  user?: any;
}

export const authApi = {
  register: (email: string, username: string, password: string, otp?: string) =>
    apiClient.post<AuthApiResponse>('/api/auth/register', {
      email,
      username,
      password,
      ...(otp ? { otp } : {}),
    }),
  login: (email: string, password: string, otp?: string) =>
    apiClient.post<AuthApiResponse>('/api/auth/login', {
      email,
      password,
      ...(otp ? { otp } : {}),
    }),
  verifyToken: (token: string) =>
    apiClient.post('/api/auth/verify-token', { token }),
  updateProfile: (profileData: { username?: string; bio?: string; profile_picture?: string | null }) =>
    apiClient.put('/api/auth/profile', profileData),
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
  getAdminReport: () =>
    apiClient.get('/api/trips/admin/report'),
  addPlaceToTrip: (tripId: string, day: number, place: any) =>
    apiClient.post(`/api/trips/${tripId}/add-place/${day}`, normalizePlacePayload(place)),
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
