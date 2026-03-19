'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { placesApi, tripsApi } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ItineraryBuilder } from '@/components/ItineraryBuilder';
import { TripMediaGallery, getTripGallery, getTripThumbnail } from '@/components/TripMediaGallery';
import dynamic from 'next/dynamic';
import {
  CheckSquare,
  Compass,
  Eye,
  Flag,
  Globe2,
  Image,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  PlusSquare,
  Search,
  Square,
  Trash2,
  UserCircle2,
  Video,
} from 'lucide-react';

type Pane = 'create' | 'saved' | 'discover' | 'finished' | 'openTrip' | 'builder' | 'profile';
type Step = 'destination' | 'details';
type TripMapLocation = { name: string; lat: number; lng: number };
type SavedMode = 'itinerary' | 'details';
type DiscoverMode = 'list' | 'view';
type LocationSuggestion = { label: string };

const TripMap = dynamic(() => import('@/components/TripMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-white/5 flex items-center justify-center text-slate-400">Loading map...</div>,
});

const tripId = (trip: any) => trip?._id || trip?.id || '';
const fmtDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : '-');
const normalizePlaceName = (value?: string) => (value || '').toLowerCase().trim();
const recommendationKey = (place: any) => `${place?.name || ''}|${place?.coordinates?.lat ?? ''}|${place?.coordinates?.lng ?? ''}`;
const placesToMapLocations = (places: any[] = []): TripMapLocation[] =>
  places
    .filter((place: any) => Number.isFinite(place?.coordinates?.lat) && Number.isFinite(place?.coordinates?.lng))
    .filter((place: any) => !(Number(place.coordinates.lat) === 0 && Number(place.coordinates.lng) === 0))
    .map((place: any) => ({
      name: place.name,
      lat: Number(place.coordinates.lat),
      lng: Number(place.coordinates.lng),
    }));

const toDotTime = (minutes: number) => {
  const dayMinutes = 24 * 60;
  const normalized = ((Math.round(minutes) % dayMinutes) + dayMinutes) % dayMinutes;
  const h = Math.floor(normalized / 60).toString().padStart(2, '0');
  const m = (normalized % 60).toString().padStart(2, '0');
  return `${h}.${m}`;
};

const toMinutes = (value?: string | null) => {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hh, mm] = value.split(':').map((n) => parseInt(n, 10));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
};

const buildDayTimeline = (day: any) => {
  const places = day?.places || [];
  const slots = {
    morning: [] as any[],
    afternoon: [] as any[],
  };
  let morningStart: number | null = null;
  let morningEnd: number | null = null;
  let afternoonStart: number | null = null;
  let afternoonEnd: number | null = null;

  places.forEach((place: any, index: number) => {
    const visitMinutes = toMinutes(place?.visit_time);
    const duration = Number.isFinite(Number(place?.duration_minutes)) && Number(place?.duration_minutes) > 0
      ? Math.round(Number(place.duration_minutes))
      : 90;
    const slot = visitMinutes !== null ? (visitMinutes < 12 * 60 ? 'morning' : 'afternoon') : (index < Math.ceil(places.length / 2) ? 'morning' : 'afternoon');
    slots[slot].push({
      place,
      visitMinutes,
      duration,
      originalIndex: index,
    });

    if (visitMinutes !== null) {
      const end = visitMinutes + duration;
      if (slot === 'morning') {
        morningStart = morningStart === null ? visitMinutes : Math.min(morningStart, visitMinutes);
        morningEnd = morningEnd === null ? end : Math.max(morningEnd, end);
      } else {
        afternoonStart = afternoonStart === null ? visitMinutes : Math.min(afternoonStart, visitMinutes);
        afternoonEnd = afternoonEnd === null ? end : Math.max(afternoonEnd, end);
      }
    }
  });

  const sortTimelinePlaces = (entries: any[]) =>
    [...entries].sort((a, b) => {
      if (a.visitMinutes === null && b.visitMinutes === null) {
        return a.originalIndex - b.originalIndex;
      }
      if (a.visitMinutes === null) return 1;
      if (b.visitMinutes === null) return -1;
      if (a.visitMinutes === b.visitMinutes) {
        return a.originalIndex - b.originalIndex;
      }
      return a.visitMinutes - b.visitMinutes;
    });

  return [
    {
      key: 'morning',
      label: 'MORNING',
      range: morningStart !== null && morningEnd !== null ? `${toDotTime(morningStart)} - ${toDotTime(morningEnd)}` : '06.00 - 09.00',
      places: sortTimelinePlaces(slots.morning),
    },
    {
      key: 'afternoon',
      label: 'AFTERNOON',
      range: afternoonStart !== null && afternoonEnd !== null ? `${toDotTime(afternoonStart)} - ${toDotTime(afternoonEnd)}` : '15.00 - 17.00',
      places: sortTimelinePlaces(slots.afternoon),
    },
  ].filter((slot) => slot.places.length > 0);
};

const buildDaySchedule = (day: any) =>
  (day?.places || [])
    .map((place: any, index: number) => ({
      place,
      visitMinutes: toMinutes(place?.visit_time),
      originalIndex: index,
    }))
    .sort((a: any, b: any) => {
      if (a.visitMinutes === null && b.visitMinutes === null) {
        return a.originalIndex - b.originalIndex;
      }
      if (a.visitMinutes === null) return 1;
      if (b.visitMinutes === null) return -1;
      if (a.visitMinutes === b.visitMinutes) {
        return a.originalIndex - b.originalIndex;
      }
      return a.visitMinutes - b.visitMinutes;
    });

const normalizeMediaInput = (type: 'image' | 'video', url: string, caption: string) => ({
  id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  url: url.trim(),
  caption: caption.trim(),
});

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });

export default function HomePage() {
  const router = useRouter();
  const { user, logout, updateProfile } = useAuth();
  const finishedEditorRef = useRef<HTMLDivElement | null>(null);

  const [pane, setPane] = useState<Pane>('create');
  const [step, setStep] = useState<Step>('destination');
  const [savedMode, setSavedMode] = useState<SavedMode>('itinerary');

  const [trips, setTrips] = useState<any[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [finishedTripId, setFinishedTripId] = useState('');

  const [publicTrips, setPublicTrips] = useState<any[]>([]);
  const [publicTripsLoading, setPublicTripsLoading] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discoverMode, setDiscoverMode] = useState<DiscoverMode>('list');
  const [discoverViewedTrip, setDiscoverViewedTrip] = useState<any>(null);
  const [discoverViewLoading, setDiscoverViewLoading] = useState(false);
  const [discoverMapDay, setDiscoverMapDay] = useState<number | null>(null);
  const [discoverTripRouteLocations, setDiscoverTripRouteLocations] = useState<TripMapLocation[]>([]);
  const [discoverTripRouteLoading, setDiscoverTripRouteLoading] = useState(false);

  const [destination, setDestination] = useState('');
  const [title, setTitle] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createDestinationFocused, setCreateDestinationFocused] = useState(false);
  const [createStartLocationFocused, setCreateStartLocationFocused] = useState(false);
  const [destinationSuggestions, setDestinationSuggestions] = useState<LocationSuggestion[]>([]);
  const [startLocationSuggestions, setStartLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [destinationSuggestLoading, setDestinationSuggestLoading] = useState(false);
  const [startLocationSuggestLoading, setStartLocationSuggestLoading] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [finishedPublic, setFinishedPublic] = useState(false);
  const [finishedChecked, setFinishedChecked] = useState(false);
  const [finishedCoverImage, setFinishedCoverImage] = useState('');
  const [finishedFeedback, setFinishedFeedback] = useState('');
  const [finishedSaving, setFinishedSaving] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileUsername, setProfileUsername] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const [openedTrip, setOpenedTrip] = useState<any>(null);
  const [openedTripLoading, setOpenedTripLoading] = useState(false);
  const [openedDay, setOpenedDay] = useState(1);
  const [openedRecommendations, setOpenedRecommendations] = useState<any[]>([]);
  const [openedRecLoading, setOpenedRecLoading] = useState(false);
  const [openedSelectedRecKeys, setOpenedSelectedRecKeys] = useState<string[]>([]);
  const [openedAddingSelected, setOpenedAddingSelected] = useState(false);
  const [openedRemovingName, setOpenedRemovingName] = useState('');
  const [openedMapMode, setOpenedMapMode] = useState<'tripRoute' | 'addedRoute'>('addedRoute');
  const [openedTripRouteLocations, setOpenedTripRouteLocations] = useState<TripMapLocation[]>([]);
  const [openedTripRouteLoading, setOpenedTripRouteLoading] = useState(false);
  const [manualPlaceName, setManualPlaceName] = useState('');
  const [manualPlaceDescription, setManualPlaceDescription] = useState('');
  const [savedMapDay, setSavedMapDay] = useState<number | null>(null);
  const [savedTripRouteLocations, setSavedTripRouteLocations] = useState<TripMapLocation[]>([]);
  const [savedTripRouteLoading, setSavedTripRouteLoading] = useState(false);

  const selectedTrip = useMemo(
    () => trips.find((trip) => tripId(trip) === selectedTripId),
    [trips, selectedTripId]
  );
  const finishedSelectedTrip = useMemo(
    () => trips.find((trip) => tripId(trip) === finishedTripId),
    [trips, finishedTripId]
  );

  const openedCurrentDay = useMemo(
    () => openedTrip?.itinerary?.[openedDay - 1] || null,
    [openedTrip, openedDay]
  );
  const openedTripPlaceNames = useMemo(
    () =>
      new Set(
        (openedTrip?.itinerary || []).flatMap((day: any) =>
          (day?.places || []).map((place: any) => normalizePlaceName(place?.name))
        )
      ),
    [openedTrip]
  );
  const visibleOpenedRecommendations = useMemo(
    () =>
      openedRecommendations.filter(
        (place: any) => !openedTripPlaceNames.has(normalizePlaceName(place?.name))
      ),
    [openedRecommendations, openedTripPlaceNames]
  );

  const openedMapLocations: TripMapLocation[] = useMemo(() => {
    if (!openedCurrentDay?.places) return [];
    return placesToMapLocations(openedCurrentDay.places);
  }, [openedCurrentDay]);

  const savedMapDayLocations: TripMapLocation[] = useMemo(() => {
    if (!selectedTrip || savedMapDay === null) return [];
    const itinerary = selectedTrip.itinerary || [];
    const dayData =
      itinerary.find((day: any) => Number(day?.day) === savedMapDay) ||
      itinerary[savedMapDay - 1];
    return placesToMapLocations(dayData?.places || []);
  }, [selectedTrip, savedMapDay]);

  const savedRenderedMapLocations: TripMapLocation[] = useMemo(() => {
    if (savedMapDay === null) return savedTripRouteLocations;
    return savedMapDayLocations.length > 0 ? savedMapDayLocations : savedTripRouteLocations;
  }, [savedMapDay, savedMapDayLocations, savedTripRouteLocations]);

  const discoverMapDayLocations: TripMapLocation[] = useMemo(() => {
    if (!discoverViewedTrip || discoverMapDay === null) return [];
    const itinerary = discoverViewedTrip.itinerary || [];
    const dayData =
      itinerary.find((day: any) => Number(day?.day) === discoverMapDay) ||
      itinerary[discoverMapDay - 1];
    return placesToMapLocations(dayData?.places || []);
  }, [discoverViewedTrip, discoverMapDay]);

  const discoverRenderedMapLocations: TripMapLocation[] = useMemo(() => {
    if (discoverMapDay === null) return discoverTripRouteLocations;
    return discoverMapDayLocations.length > 0 ? discoverMapDayLocations : discoverTripRouteLocations;
  }, [discoverMapDay, discoverMapDayLocations, discoverTripRouteLocations]);

  const openedRenderedMapLocations = useMemo(
    () => (openedMapMode === 'tripRoute' ? openedTripRouteLocations : openedMapLocations),
    [openedMapMode, openedTripRouteLocations, openedMapLocations]
  );

  const filteredPublicTrips = useMemo(() => {
    const q = discoverQuery.toLowerCase().trim();
    if (!q) return publicTrips;
    return publicTrips.filter((trip) =>
      (trip.title || '').toLowerCase().includes(q) ||
      (trip.start_location || '').toLowerCase().includes(q) ||
      (trip.end_location || '').toLowerCase().includes(q)
    );
  }, [publicTrips, discoverQuery]);

  const finishedTripMedia = useMemo(() => getTripGallery(finishedSelectedTrip), [finishedSelectedTrip]);
  const finishedTripThumbnail = useMemo(() => getTripThumbnail(finishedSelectedTrip), [finishedSelectedTrip]);
  const finishedPaneTrips = useMemo(
    () =>
      [...trips].sort((a, b) => {
        const aFinished = a?.is_finished ? 1 : 0;
        const bFinished = b?.is_finished ? 1 : 0;
        if (aFinished !== bFinished) return bFinished - aFinished;
        return String(b?.updated_at || b?.created_at || '').localeCompare(String(a?.updated_at || a?.created_at || ''));
      }),
    [trips]
  );

  const publicTripsCount = useMemo(
    () => trips.filter((trip) => !!trip?.is_public && !!trip?.is_finished).length,
    [trips]
  );

  const finishedTripsCount = useMemo(
    () => trips.filter((trip) => !!trip?.is_finished).length,
    [trips]
  );

  const profileInitial = ((user?.username || user?.email || 'U').charAt(0) || 'U').toUpperCase();

  useEffect(() => {
    setProfileUsername(user?.username || '');
    setProfileBio(user?.profile?.bio || '');
    setProfilePhotoUrl(user?.profile?.profile_picture || '');
  }, [user?.username, user?.profile?.bio, user?.profile?.profile_picture]);

  useEffect(() => {
    if (user?.id) loadTrips();
  }, [user?.id]);

  useEffect(() => {
    if ((user?.email || '').toLowerCase() === 'admin@gmail.com') {
      router.replace('/admin');
    }
  }, [user?.email, router]);

  useEffect(() => {
    if (!selectedTripId && trips.length > 0) setSelectedTripId(tripId(trips[0]));
  }, [trips, selectedTripId]);

  useEffect(() => {
    if (!selectedTrip) return;
    setEditTitle(selectedTrip.title || '');
    setEditDescription(selectedTrip.description || '');
    if (!(pane === 'saved' && savedMode === 'details')) {
      setSavedMode('itinerary');
    }
    setSavedMapDay(null);
    setMessage('');
  }, [
    selectedTrip?.title,
    selectedTrip?.description,
    selectedTripId,
    pane,
    savedMode,
  ]);

  useEffect(() => {
    if (!finishedSelectedTrip) return;
    setFinishedPublic(!!finishedSelectedTrip.is_public);
    setFinishedChecked(!!finishedSelectedTrip.is_finished);
    setFinishedCoverImage(getTripThumbnail(finishedSelectedTrip));
    setFinishedFeedback(String(finishedSelectedTrip.feedback || ''));
  }, [
    finishedSelectedTrip?.title,
    finishedSelectedTrip?.feedback,
    finishedSelectedTrip?.is_public,
    finishedSelectedTrip?.is_finished,
    finishedSelectedTrip?.cover_image,
    finishedSelectedTrip?.media_gallery,
    finishedTripId,
  ]);

  useEffect(() => {
    if (pane === 'discover' && publicTrips.length === 0) loadPublicTrips();
  }, [pane]);

  useEffect(() => {
    if (!openedTrip?.end_location || pane !== 'openTrip') {
      return;
    }
    loadOpenedRecommendations(openedTrip.end_location);
  }, [openedTrip?.end_location, pane, openedDay]);

  useEffect(() => {
    setOpenedSelectedRecKeys((prev) =>
      prev.filter((key) => visibleOpenedRecommendations.some((place: any) => recommendationKey(place) === key))
    );
  }, [visibleOpenedRecommendations]);

  useEffect(() => {
    if (pane !== 'openTrip' || !openedTrip?.start_location || !openedTrip?.end_location) {
      setOpenedTripRouteLocations([]);
      return;
    }
    loadOpenedTripRouteLocations(openedTrip.start_location, openedTrip.end_location);
  }, [pane, openedTrip?.start_location, openedTrip?.end_location]);

  useEffect(() => {
    if (pane !== 'saved' || savedMode !== 'itinerary' || !selectedTrip?.start_location || !selectedTrip?.end_location) {
      setSavedTripRouteLocations([]);
      return;
    }
    loadSavedTripRouteLocations(selectedTrip.start_location, selectedTrip.end_location);
  }, [pane, savedMode, selectedTrip?.start_location, selectedTrip?.end_location, selectedTripId]);

  useEffect(() => {
    if (
      pane !== 'discover' ||
      discoverMode !== 'view' ||
      !discoverViewedTrip?.start_location ||
      !discoverViewedTrip?.end_location
    ) {
      setDiscoverTripRouteLocations([]);
      return;
    }
    loadDiscoverTripRouteLocations(discoverViewedTrip.start_location, discoverViewedTrip.end_location);
  }, [
    pane,
    discoverMode,
    discoverViewedTrip?.start_location,
    discoverViewedTrip?.end_location,
    discoverViewedTrip?._id,
    discoverViewedTrip?.id,
  ]);

  useEffect(() => {
    if (pane !== 'create') {
      setCreateDestinationFocused(false);
      setCreateStartLocationFocused(false);
      setDestinationSuggestions([]);
      setStartLocationSuggestions([]);
      return;
    }
    if (step !== 'destination') {
      setCreateDestinationFocused(false);
      setDestinationSuggestions([]);
    }
    if (step !== 'details') {
      setCreateStartLocationFocused(false);
      setStartLocationSuggestions([]);
    }
  }, [pane, step]);

  useEffect(() => {
    if (pane !== 'create' || step !== 'destination') return;
    const q = destination.trim();
    if (q.length < 2) {
      setDestinationSuggestions([]);
      setDestinationSuggestLoading(false);
      return;
    }
    const timer = setTimeout(async () => {
      setDestinationSuggestLoading(true);
      const next = await searchLocationSuggestions(q);
      setDestinationSuggestions(next);
      setDestinationSuggestLoading(false);
    }, 220);
    return () => clearTimeout(timer);
  }, [pane, step, destination]);

  useEffect(() => {
    if (pane !== 'create' || step !== 'details') return;
    const q = startLocation.trim();
    if (q.length < 2) {
      setStartLocationSuggestions([]);
      setStartLocationSuggestLoading(false);
      return;
    }
    const timer = setTimeout(async () => {
      setStartLocationSuggestLoading(true);
      const next = await searchLocationSuggestions(q);
      setStartLocationSuggestions(next);
      setStartLocationSuggestLoading(false);
    }, 220);
    return () => clearTimeout(timer);
  }, [pane, step, startLocation]);

  const loadTrips = async () => {
    try {
      setError('');
      setTripsLoading(true);
      const res = await tripsApi.getMyTrips();
      setTrips(res.data.trips || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load trips');
    } finally {
      setTripsLoading(false);
    }
  };

  const loadPublicTrips = async () => {
    try {
      setError('');
      setPublicTripsLoading(true);
      const res = await tripsApi.getPublicTrips(50, 0);
      setPublicTrips(res.data.trips || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load discover trips');
    } finally {
      setPublicTripsLoading(false);
    }
  };

  const syncTripLocally = (updatedTrip: any) => {
    const id = tripId(updatedTrip);
    if (!id) return;
    setTrips((prev) => prev.map((trip) => (tripId(trip) === id ? { ...trip, ...updatedTrip } : trip)));
    if (openedTrip && tripId(openedTrip) === id) {
      setOpenedTrip((prev: any) => ({ ...(prev || {}), ...updatedTrip }));
    }
    if (discoverViewedTrip && tripId(discoverViewedTrip) === id) {
      setDiscoverViewedTrip((prev: any) => ({ ...(prev || {}), ...updatedTrip }));
    }
  };

  const loadOpenedRecommendations = async (location: string) => {
    try {
      setOpenedRecLoading(true);
      const res = await placesApi.getRecommendations(location, 15, Date.now());
      setOpenedRecommendations(res.data.places || []);
      setOpenedSelectedRecKeys([]);
    } catch {
      setOpenedRecommendations([]);
    } finally {
      setOpenedRecLoading(false);
    }
  };

  const searchLocationSuggestions = async (query: string): Promise<LocationSuggestion[]> => {
    if (!query?.trim()) return [];
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6`
      );
      const data = await response.json();
      if (!Array.isArray(data)) return [];
      return data
        .map((item: any) => ({ label: item?.display_name || '' }))
        .filter((item: LocationSuggestion) => !!item.label);
    } catch {
      return [];
    }
  };

  const geocodeMapLocation = async (location: string): Promise<TripMapLocation | null> => {
    if (!location?.trim()) return null;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`
      );
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        return null;
      }
      const lat = Number(data[0].lat);
      const lng = Number(data[0].lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }
      return {
        name: location,
        lat,
        lng,
      };
    } catch {
      return null;
    }
  };

  const loadOpenedTripRouteLocations = async (startLocation: string, endLocation: string) => {
    try {
      setOpenedTripRouteLoading(true);
      const [start, end] = await Promise.all([
        geocodeMapLocation(startLocation),
        geocodeMapLocation(endLocation),
      ]);
      const nextLocations = [
        ...(start ? [start] : []),
        ...(end ? [end] : []),
      ];
      setOpenedTripRouteLocations(nextLocations);
    } finally {
      setOpenedTripRouteLoading(false);
    }
  };

  const loadSavedTripRouteLocations = async (startLocation: string, endLocation: string) => {
    try {
      setSavedTripRouteLoading(true);
      const [start, end] = await Promise.all([
        geocodeMapLocation(startLocation),
        geocodeMapLocation(endLocation),
      ]);
      const nextLocations = [
        ...(start ? [start] : []),
        ...(end ? [end] : []),
      ];
      setSavedTripRouteLocations(nextLocations);
    } finally {
      setSavedTripRouteLoading(false);
    }
  };

  const loadDiscoverTripRouteLocations = async (startLocation: string, endLocation: string) => {
    try {
      setDiscoverTripRouteLoading(true);
      const [start, end] = await Promise.all([
        geocodeMapLocation(startLocation),
        geocodeMapLocation(endLocation),
      ]);
      const nextLocations = [
        ...(start ? [start] : []),
        ...(end ? [end] : []),
      ];
      setDiscoverTripRouteLocations(nextLocations);
    } finally {
      setDiscoverTripRouteLoading(false);
    }
  };

  const openDiscoverTripView = async (id: string) => {
    if (!id) return;
    try {
      setError('');
      setDiscoverMode('view');
      setDiscoverViewLoading(true);
      setDiscoverMapDay(null);
      const res = await tripsApi.getTrip(id);
      setDiscoverViewedTrip(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load discover itinerary');
      setDiscoverViewedTrip(null);
      setDiscoverMode('list');
    } finally {
      setDiscoverViewLoading(false);
    }
  };

  const openTripInPanel = async (id: string) => {
    if (!id) return;
    try {
      setError('');
      setMessage('');
      setOpenedTripLoading(true);
      const res = await tripsApi.getTrip(id);
      setOpenedTrip(res.data);
      setOpenedDay(1);
      setOpenedMapMode('addedRoute');
      setPane('openTrip');
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to open trip');
    } finally {
      setOpenedTripLoading(false);
    }
  };

  const openFinishedPane = () => {
    setFinishedTripId('');
    setPane('finished');
    setError('');
    setMessage('');
  };

  const handleFinishedTileSelect = (id: string) => {
    setFinishedTripId(id);
    setTimeout(() => {
      finishedEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const refreshOpenedTrip = async () => {
    if (!openedTrip) return;
    try {
      const id = tripId(openedTrip);
      if (!id) return;
      const res = await tripsApi.getTrip(id);
      setOpenedTrip(res.data);
      setTrips((prev) => prev.map((trip) => (tripId(trip) === id ? { ...trip, ...res.data } : trip)));
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to refresh opened trip');
    }
  };

  const addPlaceToOpenedTripDay = async (place: any) => {
    if (!openedTrip?._id && !openedTrip?.id) return false;
    try {
      const id = tripId(openedTrip);
      const res = await tripsApi.addPlaceToTrip(id, openedDay, place);
      setOpenedTrip(res.data);
      setTrips((prev) => prev.map((trip) => (tripId(trip) === id ? { ...trip, ...res.data } : trip)));
      return true;
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to add place');
      return false;
    }
  };

  const removePlaceFromOpenedTripDay = async (placeName: string) => {
    if (!openedTrip?._id && !openedTrip?.id) return;
    try {
      setOpenedRemovingName(placeName);
      const id = tripId(openedTrip);
      const res = await tripsApi.removePlaceFromTrip(id, openedDay, placeName);
      setOpenedTrip(res.data);
      setTrips((prev) => prev.map((trip) => (tripId(trip) === id ? { ...trip, ...res.data } : trip)));
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to remove place');
    } finally {
      setOpenedRemovingName('');
    }
  };

  const addSelectedRecommendations = async () => {
    if (openedSelectedRecKeys.length === 0) return;
    setOpenedAddingSelected(true);
    const existing = new Set(
      (openedTrip?.itinerary || []).flatMap((day: any) => (day?.places || []).map((place: any) => place.name))
    );
    try {
      for (const place of visibleOpenedRecommendations) {
        const key = recommendationKey(place);
        if (!openedSelectedRecKeys.includes(key)) continue;
        if (existing.has(place.name)) continue;
        const added = await addPlaceToOpenedTripDay(place);
        if (added) existing.add(place.name);
      }
      setOpenedSelectedRecKeys([]);
      setMessage('Selected places added.');
    } finally {
      setOpenedAddingSelected(false);
    }
  };

  const addManualPlaceToOpenedTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPlaceName.trim()) return;
    const place = {
      name: manualPlaceName.trim(),
      description: manualPlaceDescription.trim(),
      coordinates: { lat: 0, lng: 0 },
      rating: 0,
      category: 'Manual',
      image_url: null,
    };

    const added = await addPlaceToOpenedTripDay(place);
    if (added) {
      setManualPlaceName('');
      setManualPlaceDescription('');
      setMessage('Manual place added.');
    }
  };

  const openCreate = () => {
    setPane('create');
    setStep('destination');
    setCreateDestinationFocused(false);
    setCreateStartLocationFocused(false);
    setDestinationSuggestions([]);
    setStartLocationSuggestions([]);
    setDestinationSuggestLoading(false);
    setStartLocationSuggestLoading(false);
    setError('');
    setMessage('');
  };

  const continueCreate = () => {
    if (!destination.trim()) {
      setError('Enter destination first.');
      return;
    }
    if (!title.trim()) setTitle(`${destination.trim()} Trip`);
    setCreateDestinationFocused(false);
    setError('');
    setStep('details');
  };

  const createTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!destination.trim() || !startLocation.trim() || !startDate || !endDate) {
      setError('Fill start location, destination and dates.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date must be before end date.');
      return;
    }

    setCreating(true);
    try {
      const res = await tripsApi.createTrip({
        title: title.trim() || `${destination.trim()} Trip`,
        description: description.trim(),
        start_location: startLocation.trim(),
        end_location: destination.trim(),
        start_date: startDate,
        end_date: endDate,
        is_public: false,
      });
      const id = tripId(res.data);
      await loadTrips();
      if (id) {
        setSelectedTripId(id);
        setPane('saved');
        setSavedMode('details');
        setStep('destination');
        setMessage('Trip created. Continue editing in Saved Trip Details.');
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to create trip');
    } finally {
      setCreating(false);
    }
  };

  const saveSelectedTrip = async () => {
    if (!selectedTripId) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await tripsApi.updateTrip(selectedTripId, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      });
      syncTripLocally(res.data);
      await loadPublicTrips();
      setPane('create');
      setStep('destination');
      setDestination('');
      setTitle('');
      setStartLocation('');
      setStartDate('');
      setEndDate('');
      setDescription('');
      setCreateDestinationFocused(false);
      setCreateStartLocationFocused(false);
      setDestinationSuggestions([]);
      setStartLocationSuggestions([]);
      setDestinationSuggestLoading(false);
      setStartLocationSuggestLoading(false);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to save trip');
    } finally {
      setSaving(false);
    }
  };

  const saveFinishedTrip = async (nextGallery?: any[], nextCoverImage?: string) => {
    if (!finishedTripId) return;
    const gallery = nextGallery || finishedTripMedia;
    const normalizedCover = (nextCoverImage ?? finishedCoverImage).trim();
    setFinishedSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await tripsApi.updateTrip(finishedTripId, {
        feedback: finishedFeedback.trim(),
        is_finished: finishedChecked,
        is_public: finishedChecked ? finishedPublic : false,
        cover_image: normalizedCover || getTripThumbnail({ media_gallery: gallery }) || null,
        media_gallery: gallery,
      });
      syncTripLocally(res.data);
      await loadPublicTrips();
      setMessage(finishedChecked ? 'Finished trip updated.' : 'Trip saved without publishing.');
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to update finished trip');
    } finally {
      setFinishedSaving(false);
    }
  };

  const removeFinishedMedia = async (mediaId: string) => {
    if (!finishedSelectedTrip) return;
    const nextGallery = finishedTripMedia.filter((item: any) => item.id !== mediaId);
    const nextCover = finishedCoverImage.trim();
    if (nextCover && !nextGallery.some((item: any) => item.type === 'image' && item.url === nextCover)) {
      setFinishedCoverImage(nextGallery.find((item: any) => item.type === 'image')?.url || '');
    }
    await saveFinishedTrip(
      nextGallery,
      nextCover && nextGallery.some((item: any) => item.type === 'image' && item.url === nextCover)
        ? nextCover
        : nextGallery.find((item: any) => item.type === 'image')?.url || ''
    );
  };

  const uploadFinishedMedia = async (type: 'image' | 'video', files: FileList | null) => {
    const fileItems = files ? Array.from(files) : [];
    if (fileItems.length === 0) return;
    try {
      const uploaded: any[] = [];
      for (const file of fileItems) {
        const dataUrl = await readFileAsDataUrl(file);
        if (!dataUrl) {
          setError(`Failed to read ${type} file.`);
          return;
        }
        uploaded.push(normalizeMediaInput(type, dataUrl, file.name));
      }

      const nextGallery = [...finishedTripMedia, ...uploaded];
      const nextCover =
        type === 'image' && !finishedCoverImage.trim() ? uploaded[0]?.url || finishedCoverImage : finishedCoverImage;
      setFinishedCoverImage(nextCover);
      await saveFinishedTrip(nextGallery, nextCover);
    } catch (e: any) {
      setError(e?.message || `Failed to upload ${type}.`);
    }
  };

  const uploadFinishedThumbnail = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl) {
        setError('Failed to read thumbnail image.');
        return;
      }
      setFinishedCoverImage(dataUrl);
      await saveFinishedTrip(undefined, dataUrl);
    } catch (e: any) {
      setError(e?.message || 'Failed to upload thumbnail image.');
    }
  };

  const setFinishedThumbnail = async (url: string) => {
    setFinishedCoverImage(url);
    await saveFinishedTrip(undefined, url);
  };

  const deleteSelectedTrip = async () => {
    if (!selectedTripId) return;
    if (!confirm('Delete this trip permanently?')) return;
    setDeleting(true);
    setError('');
    setMessage('');
    try {
      await tripsApi.deleteTrip(selectedTripId);
      const next = trips.filter((trip) => tripId(trip) !== selectedTripId);
      setTrips(next);
      if (finishedTripId === selectedTripId) {
        setFinishedTripId('');
      }
      setSelectedTripId(next.length ? tripId(next[0]) : '');
      await loadPublicTrips();
      setMessage('Trip deleted.');
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to delete trip');
    } finally {
      setDeleting(false);
    }
  };

  const saveProfileChanges = async () => {
    const nextUsername = profileUsername.trim();
    if (!nextUsername) {
      setError('Username cannot be empty.');
      return;
    }

    setProfileSaving(true);
    setError('');
    setMessage('');
    try {
      await updateProfile({
        username: nextUsername,
        bio: profileBio.trim(),
        profile_picture: profilePhotoUrl.trim(),
      });
      setProfileEditing(false);
      setMessage('Profile updated.');
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0f1216] text-slate-100">
        <div className="flex min-h-screen">
          <aside className="w-[300px] shrink-0 border-r border-white/10 bg-[#0b0d10] px-3 py-4 flex flex-col">
            <div className="px-2 mb-4 text-lg font-semibold tracking-wide">TripPlan</div>

            <button
              type="button"
              onClick={openCreate}
              className={`w-full rounded-xl px-3 py-3 text-left transition flex items-center gap-3 ${
                pane === 'create' ? 'bg-white/12 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <PlusSquare size={18} />
              <span className="font-medium">Create Trip</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPane('discover');
                setDiscoverMode('list');
              }}
              className={`w-full mt-2 rounded-xl px-3 py-3 text-left transition flex items-center gap-3 ${
                pane === 'discover' ? 'bg-white/12 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Compass size={18} />
              <span className="font-medium">Discover</span>
            </button>

            <button
              type="button"
              onClick={openFinishedPane}
              className={`w-full mt-2 rounded-xl px-3 py-3 text-left transition flex items-center gap-3 ${
                pane === 'finished' ? 'bg-white/12 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Flag size={18} />
              <span className="font-medium">Finished Trip</span>
            </button>

            <div className="mt-5 px-2 text-xs uppercase tracking-[0.12em] text-slate-500">Saved Trips</div>
            <div className="mt-2 flex-1 overflow-y-auto pr-1 space-y-1">
              {tripsLoading ? (
                <div className="px-2 py-2 text-sm text-slate-500">Loading trips...</div>
              ) : trips.length > 0 ? (
                trips.map((trip) => {
                  const id = tripId(trip);
                  const active = selectedTripId === id && pane === 'saved';
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSelectedTripId(id);
                        setPane('saved');
                        setSavedMode('itinerary');
                        setError('');
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                        active ? 'bg-white/14 text-white' : 'text-slate-300 hover:bg-white/8'
                      }`}
                    >
                      <div className="truncate font-medium">{trip.title}</div>
                      <div className="truncate text-xs text-slate-500">{trip.start_location} to {trip.end_location}</div>
                    </button>
                  );
                })
              ) : (
                <div className="px-2 py-2 text-sm text-slate-500">No saved trips yet.</div>
              )}
            </div>

            <div className="pt-3 mt-3 border-t border-white/10 px-2 text-sm text-slate-300 truncate">
              {user?.username || user?.email}
            </div>
          </aside>

          <main className="relative flex-1 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.08),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.08),transparent_32%)]" />

            <header className="relative z-10 flex items-center justify-end gap-3 p-4">
              <button
                type="button"
                onClick={() => setPane('profile')}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10"
              >
                <UserCircle2 size={16} />
                Profile
              </button>
              <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/20 px-3 py-1.5 text-sm text-red-200 hover:bg-red-500/30">
                <LogOut size={15} />
                Logout
              </button>
            </header>

            <section className="relative z-10 h-[calc(100vh-80px)] overflow-y-auto px-6 pb-10">
              {pane === 'create' && (
                <div className="min-h-full flex items-center justify-center py-6">
                  <div className="w-full max-w-4xl">
                    {step === 'destination' ? (
                      <div className="max-w-3xl mx-auto">
                        <h1 className="text-5xl font-semibold tracking-tight text-center">Plan your next route</h1>
                        <p className="mt-4 text-center text-slate-400 text-lg">Enter destination first, then continue.</p>

                        <div className="relative mt-8">
                          <input
                            type="text"
                            value={destination}
                            onFocus={() => setCreateDestinationFocused(true)}
                            onBlur={() => setTimeout(() => setCreateDestinationFocused(false), 140)}
                            onChange={(e) => setDestination(e.target.value)}
                            placeholder="Enter destination city or place"
                            className="w-full rounded-full border border-white/15 bg-white/8 px-6 pr-36 py-4 text-lg text-slate-100 placeholder:text-slate-400 outline-none focus:border-sky-400/50 focus:bg-white/10"
                          />
                          <button
                            type="button"
                            onClick={continueCreate}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-400"
                          >
                            Continue
                          </button>

                          {createDestinationFocused && destination.trim().length >= 2 && (
                            <div className="absolute left-0 right-0 z-20 mt-2 rounded-xl border border-white/10 bg-[#0f1520]/95 shadow-xl max-h-60 overflow-y-auto">
                              {destinationSuggestLoading ? (
                                <div className="px-4 py-3 text-sm text-slate-300">Loading suggestions...</div>
                              ) : destinationSuggestions.length > 0 ? (
                                destinationSuggestions.map((suggestion, idx) => (
                                  <button
                                    key={`${suggestion.label}-${idx}`}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setDestination(suggestion.label);
                                      setCreateDestinationFocused(false);
                                    }}
                                    className="block w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-white/10"
                                  >
                                    <span className="block truncate">{suggestion.label}</span>
                                  </button>
                                ))
                              ) : (
                                <div className="px-4 py-3 text-sm text-slate-400">No location match found.</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#12161d]/90 p-6 md:p-8">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h2 className="text-2xl font-semibold">Create trip details</h2>
                            <p className="text-sm text-slate-400">Destination: {destination}</p>
                          </div>
                          <button type="button" onClick={() => setStep('destination')} className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10">
                            Change destination
                          </button>
                        </div>

                        <form onSubmit={createTrip} className="mt-6 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm text-slate-300 mb-1">Start Location</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={startLocation}
                                  onFocus={() => setCreateStartLocationFocused(true)}
                                  onBlur={() => setTimeout(() => setCreateStartLocationFocused(false), 140)}
                                  onChange={(e) => setStartLocation(e.target.value)}
                                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-sky-400/50"
                                />
                                {createStartLocationFocused && startLocation.trim().length >= 2 && (
                                  <div className="absolute left-0 right-0 z-20 mt-2 rounded-xl border border-white/10 bg-[#0f1520]/95 shadow-xl max-h-60 overflow-y-auto">
                                    {startLocationSuggestLoading ? (
                                      <div className="px-4 py-3 text-sm text-slate-300">Loading suggestions...</div>
                                    ) : startLocationSuggestions.length > 0 ? (
                                      startLocationSuggestions.map((suggestion, idx) => (
                                        <button
                                          key={`${suggestion.label}-${idx}`}
                                          type="button"
                                          onMouseDown={(e) => e.preventDefault()}
                                          onClick={() => {
                                            setStartLocation(suggestion.label);
                                            setCreateStartLocationFocused(false);
                                          }}
                                          className="block w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-white/10"
                                        >
                                          <span className="block truncate">{suggestion.label}</span>
                                        </button>
                                      ))
                                    ) : (
                                      <div className="px-4 py-3 text-sm text-slate-400">No location match found.</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-1">Trip Title</label>
                              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-sky-400/50" />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-1">Start Date</label>
                              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-sky-400/50" />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-1">End Date</label>
                              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-sky-400/50" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm text-slate-300 mb-1">Notes</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-sky-400/50" />
                          </div>
                          <div className="flex items-center justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setStep('destination')} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/10">Back</button>
                            <button type="submit" disabled={creating} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60">
                              {creating && <Loader2 size={15} className="animate-spin" />}
                              {creating ? 'Creating...' : 'Create and Continue'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {pane === 'openTrip' && (
                <div className="max-w-6xl mx-auto py-6 space-y-5">
                  {openedTripLoading ? (
                    <div className="text-center text-slate-400 py-10">Opening trip...</div>
                  ) : openedTrip ? (
                    <>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setPane('saved');
                              setSavedMode('details');
                            }}
                            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
                          >
                            Back to Saved Trip
                          </button>
                          <div>
                            <h2 className="text-2xl font-semibold">{openedTrip.title}</h2>
                            <p className="text-sm text-slate-400">
                              {openedTrip.start_location} to {openedTrip.end_location}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPane('builder')}
                          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
                        >
                          Move to Itinerary Builder
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        <div className="lg:col-span-8 rounded-2xl border border-white/10 bg-[#12161d]/90 p-3">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <button
                              type="button"
                              onClick={() => setOpenedMapMode('tripRoute')}
                              className={`rounded-md px-2.5 py-1.5 text-xs border transition ${
                                openedMapMode === 'tripRoute'
                                  ? 'bg-sky-500/25 border-sky-400 text-white'
                                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                              }`}
                            >
                              1. Trip Route
                            </button>
                            <button
                              type="button"
                              onClick={() => setOpenedMapMode('addedRoute')}
                              className={`rounded-md px-2.5 py-1.5 text-xs border transition ${
                                openedMapMode === 'addedRoute'
                                  ? 'bg-sky-500/25 border-sky-400 text-white'
                                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                              }`}
                            >
                              2. Added Locations Route
                            </button>
                            {openedMapMode === 'tripRoute' && openedTripRouteLoading && (
                              <span className="text-[11px] text-slate-400">Loading trip route...</span>
                            )}
                          </div>
                          <div className="h-[49vh] rounded-xl overflow-hidden border border-white/10">
                            <TripMap
                              locations={openedRenderedMapLocations}
                              title={
                                openedMapMode === 'tripRoute'
                                  ? `${openedTrip.start_location} to ${openedTrip.end_location}`
                                  : `Day ${openedDay} Added Locations Route`
                              }
                              showRouteList={false}
                            />
                          </div>
                        </div>
                        <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-[#12161d]/90 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold">Selected Places</h3>
                            <span className="text-[11px] text-slate-400">
                              {(openedCurrentDay?.places || []).length}
                            </span>
                          </div>

                          <div className="mb-3">
                            <div className="text-[11px] text-slate-400 mb-1">Days</div>
                            <div className="flex items-center gap-1 overflow-x-auto pb-1">
                              {(openedTrip.itinerary || []).map((day: any, idx: number) => (
                                <button
                                  key={day.day}
                                  type="button"
                                  onClick={() => setOpenedDay(idx + 1)}
                                  className={`shrink-0 rounded-md px-2 py-1 text-[10px] border transition ${
                                    openedDay === idx + 1
                                      ? 'bg-sky-500/25 border-sky-400 text-white'
                                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                  }`}
                                  title={fmtDate(day.date)}
                                >
                                  D{day.day}
                                </button>
                              ))}
                            </div>
                          </div>

                          {(openedCurrentDay?.places || []).length > 0 ? (
                            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                              {(openedCurrentDay?.places || []).map((place: any, idx: number) => (
                                <div
                                  key={`${place.name}-${idx}`}
                                  className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2 border border-white/10"
                                >
                                  <div className="w-5 h-5 rounded-full bg-sky-500 text-white text-[10px] font-semibold flex items-center justify-center">
                                    {idx + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="truncate text-xs">{place.name}</div>
                                    <div className="truncate text-[11px] text-slate-400">{place.category || 'Place'}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removePlaceFromOpenedTripDay(place.name)}
                                    disabled={openedRemovingName === place.name}
                                    className="text-red-300 hover:text-red-200 disabled:opacity-60"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400">No places selected for this day yet.</div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-[#12161d]/90 p-4">
                        <h3 className="text-lg font-semibold mb-3">Enter Manual Place</h3>
                        <form onSubmit={addManualPlaceToOpenedTrip} className="grid grid-cols-1 md:grid-cols-6 gap-3">
                          <input
                            type="text"
                            value={manualPlaceName}
                            onChange={(e) => setManualPlaceName(e.target.value)}
                            placeholder="Place name"
                            className="md:col-span-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-sky-400/50"
                          />
                          <input
                            type="text"
                            value={manualPlaceDescription}
                            onChange={(e) => setManualPlaceDescription(e.target.value)}
                            placeholder="Short description (optional)"
                            className="md:col-span-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-sky-400/50"
                          />
                          <button
                            type="submit"
                            className="md:col-span-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400"
                          >
                            <Plus size={14} />
                            Add
                          </button>
                        </form>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-[#12161d]/90 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold">Recommended Places to Visit</h3>
                          <button
                            type="button"
                            onClick={addSelectedRecommendations}
                            disabled={openedSelectedRecKeys.length === 0 || openedAddingSelected}
                            className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
                          >
                            {openedAddingSelected ? 'Adding...' : `Add Selected (${openedSelectedRecKeys.length})`}
                          </button>
                        </div>
                        {openedRecLoading ? (
                          <div className="text-sm text-slate-400">Loading recommendations...</div>
                        ) : visibleOpenedRecommendations.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                            {visibleOpenedRecommendations.map((place: any, idx: number) => {
                              const key = recommendationKey(place);
                              const selected = openedSelectedRecKeys.includes(key);
                              return (
                                <button
                                  key={`${key}-${idx}`}
                                  type="button"
                                  onClick={() =>
                                    setOpenedSelectedRecKeys((prev) =>
                                      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
                                    )
                                  }
                                  className={`rounded-lg border px-3 py-2 text-left transition ${
                                    selected
                                      ? 'border-sky-400 bg-sky-500/20'
                                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                                  }`}
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="pt-0.5 text-slate-300">
                                      {selected ? <CheckSquare size={14} /> : <Square size={14} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-semibold truncate">{place.name}</div>
                                      <div className="text-xs text-slate-400 truncate">{place.description}</div>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : openedRecommendations.length > 0 ? (
                          <div className="text-sm text-slate-400">All recommended places are already added to this trip.</div>
                        ) : (
                          <div className="text-sm text-slate-400">No recommendations available.</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-slate-400 py-10">No trip opened.</div>
                  )}
                </div>
              )}

              {pane === 'builder' && (
                <div className="max-w-6xl mx-auto py-6">
                  {openedTrip ? (
                    <ItineraryBuilder
                      tripId={tripId(openedTrip)}
                      trip={openedTrip}
                      onUpdate={refreshOpenedTrip}
                      theme="dark"
                      onBack={() => setPane('openTrip')}
                      backLabel="Back to Open Trip"
                      onViewItinerary={() => {
                        setPane('saved');
                        setSavedMode('itinerary');
                      }}
                      viewItineraryLabel="View Itinerary"
                    />
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-[#12161d]/90 p-6 text-center text-slate-400">
                      No trip selected for itinerary builder.
                    </div>
                  )}
                </div>
              )}

              {pane === 'saved' && (
                <div className="max-w-6xl mx-auto py-6">
                  {selectedTrip ? (
                    <div className="rounded-3xl border border-white/10 bg-[#12161d]/90 p-6 md:p-8 space-y-5">
                      {savedMode === 'details' ? (
                        <>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Saved Trip Details</div>
                              <h2 className="mt-1 text-3xl font-semibold">
                                {selectedTrip.start_location} to {selectedTrip.end_location}
                              </h2>
                              <p className="mt-1 text-sm text-slate-400">
                                {fmtDate(selectedTrip.start_date)} to {fmtDate(selectedTrip.end_date)} | {selectedTrip.itinerary?.length || 0} days
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSavedMode('itinerary')}
                                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
                              >
                                Back to Itinerary
                              </button>
                              <button
                                type="button"
                                onClick={deleteSelectedTrip}
                                disabled={deleting}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                              >
                                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm text-slate-300 mb-1">Title</label>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-sky-400/50"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-1">Finished Trip</label>
                              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-300">
                                Photos, videos, thumbnail, and public discovery settings now live in `Finished Trip`.
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm text-slate-300 mb-1">Description</label>
                            <textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              rows={3}
                              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-sky-400/50"
                            />
                          </div>

                          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                            {selectedTrip.start_location} to {selectedTrip.end_location}
                            <div className="mt-1 text-xs text-slate-400">
                              {fmtDate(selectedTrip.start_date)} to {fmtDate(selectedTrip.end_date)} | {selectedTrip.itinerary?.length || 0} days
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={saveSelectedTrip}
                              disabled={saving}
                              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
                            >
                              {saving ? <Loader2 size={15} className="animate-spin" /> : <Pencil size={15} />} Save Details
                            </button>
                            <button
                              type="button"
                              onClick={() => openTripInPanel(selectedTripId)}
                              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
                            >
                              Open Trip Editor
                            </button>
                            <button
                              type="button"
                              onClick={openFinishedPane}
                              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
                            >
                              Manage Finished Trip
                            </button>
                            <button
                              type="button"
                              onClick={() => setSavedMode('itinerary')}
                              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
                            >
                              View Itinerary
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Saved Itinerary</div>
                              <h2 className="mt-1 text-3xl font-semibold">{selectedTrip.title}</h2>
                              <p className="mt-1 text-sm text-slate-300">
                                {selectedTrip.start_location} to {selectedTrip.end_location}
                              </p>
                              <p className="text-xs text-slate-400">
                                {fmtDate(selectedTrip.start_date)} to {fmtDate(selectedTrip.end_date)} | {selectedTrip.itinerary?.length || 0} days
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSavedMode('details')}
                                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
                              >
                                Edit Trip
                              </button>
                              <button
                                type="button"
                                onClick={deleteSelectedTrip}
                                disabled={deleting}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                              >
                                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                            <div className="order-2 lg:order-1 lg:col-span-7 space-y-4">
                              <div className="rounded-xl border border-white/10 bg-[#11161f] px-4 py-3 text-xs text-slate-300">
                                Click a day card to preview that day route on the map.
                              </div>

                              {(selectedTrip.itinerary || []).length > 0 ? (
                                <div className="space-y-4">
                                  {(selectedTrip.itinerary || []).map((day: any, idx: number) => {
                                    const dayNumber = Number(day?.day) || idx + 1;
                                    const daySchedule = buildDaySchedule(day);
                                    const activeDay = savedMapDay === dayNumber;
                                    return (
                                      <section
                                        key={dayNumber}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setSavedMapDay(dayNumber)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setSavedMapDay(dayNumber);
                                          }
                                        }}
                                        className={`rounded-2xl border p-4 md:p-5 transition cursor-pointer outline-none ${
                                          activeDay
                                            ? 'border-sky-400/60 bg-[#172133] shadow-[0_0_0_1px_rgba(56,189,248,0.35)]'
                                            : 'border-white/10 bg-[#161c26] hover:border-white/20'
                                        }`}
                                      >
                                        <h3 className="text-xl font-extrabold tracking-wide uppercase text-slate-100">
                                          Day {dayNumber} - Destination
                                        </h3>

                                        {daySchedule.length > 0 ? (
                                          <div className="relative mt-4 pl-9">
                                            <div className="absolute left-3 top-1 bottom-1 w-px bg-sky-400/50" />
                                            {daySchedule.map((entry: any, placeIdx: number) => (
                                              <div key={`${dayNumber}-${entry.place.name}-${placeIdx}`} className={`${placeIdx === daySchedule.length - 1 ? '' : 'pb-6'} relative`}>
                                                <span className="absolute -left-[26px] top-1.5 w-2.5 h-2.5 rounded-full bg-sky-400" />
                                                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                                  <div className="md:col-span-2">
                                                    <div className="text-xs font-extrabold tracking-wide uppercase text-sky-300">
                                                      {entry.place.visit_time || 'Time not set'}
                                                    </div>
                                                    <div className="text-xs font-semibold text-slate-300">
                                                      {Number.isFinite(Number(entry.place?.duration_minutes)) && Number(entry.place.duration_minutes) > 0
                                                        ? `${Math.round(Number(entry.place.duration_minutes))} min`
                                                        : 'Duration not set'}
                                                    </div>
                                                  </div>
                                                  <div className="md:col-span-3">
                                                    <div className="text-sm font-semibold text-slate-100">{entry.place.name}</div>
                                                    <div className="text-sm text-slate-300">
                                                      {entry.place.notes || entry.place.description || 'Destination added to itinerary.'}
                                                    </div>
                                                    {placeIdx > 0 && Number.isFinite(Number(entry.place?.travel_minutes_from_previous)) && Number(entry.place.travel_minutes_from_previous) > 0 && (
                                                      <div className="mt-1 text-[11px] text-slate-400">
                                                        Travel from previous: {Math.round(Number(entry.place.travel_minutes_from_previous))} min
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="mt-3 text-sm text-slate-300">No destinations added for this day.</div>
                                        )}

                                        {day?.notes && (
                                          <div className="mt-4 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200">
                                            {day.notes}
                                          </div>
                                        )}
                                      </section>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                                  No itinerary generated yet.
                                </div>
                              )}
                            </div>

                            <div className="order-1 lg:order-2 lg:col-span-5">
                              <div className="rounded-2xl border border-white/10 bg-[#12161d]/95 p-3 lg:sticky lg:top-4">
                                <div className="flex items-center justify-between gap-3 mb-2">
                                  <div>
                                    <div className="text-xs uppercase tracking-[0.12em] text-slate-400">Route Preview</div>
                                    <div className="text-sm font-semibold text-slate-100">
                                      {savedMapDay === null ? 'Start to End Route' : `Day ${savedMapDay} Route`}
                                    </div>
                                  </div>
                                  {savedTripRouteLoading && savedMapDay === null && (
                                    <span className="text-[11px] text-slate-400">Loading base route...</span>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  <button
                                    type="button"
                                    onClick={() => setSavedMapDay(null)}
                                    className={`rounded-md px-2.5 py-1 text-[11px] border transition ${
                                      savedMapDay === null
                                        ? 'bg-sky-500/25 border-sky-400 text-white'
                                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                    }`}
                                  >
                                    Start to End
                                  </button>
                                  {(selectedTrip.itinerary || []).map((day: any, idx: number) => {
                                    const dayNumber = Number(day?.day) || idx + 1;
                                    return (
                                      <button
                                        key={`map-day-${dayNumber}`}
                                        type="button"
                                        onClick={() => setSavedMapDay(dayNumber)}
                                        className={`rounded-md px-2.5 py-1 text-[11px] border transition ${
                                          savedMapDay === dayNumber
                                            ? 'bg-sky-500/25 border-sky-400 text-white'
                                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                        }`}
                                      >
                                        Day {dayNumber}
                                      </button>
                                    );
                                  })}
                                </div>

                                {savedMapDay !== null && savedMapDayLocations.length === 0 && (
                                  <div className="mb-3 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                                    This day has no mapped coordinates yet. Showing start to end route instead.
                                  </div>
                                )}

                                <div className="h-[54vh] rounded-xl overflow-hidden border border-white/10">
                                  <TripMap
                                    locations={savedRenderedMapLocations}
                                    title={
                                      savedMapDay === null
                                        ? `${selectedTrip.start_location} to ${selectedTrip.end_location}`
                                        : `Day ${savedMapDay} Route`
                                    }
                                    showRouteList={false}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400">No saved trip selected.</div>
                  )}
                </div>
              )}
              {pane === 'finished' && (
                <div className="max-w-6xl mx-auto py-6">
                  {finishedTripId && finishedSelectedTrip ? (
                    <div ref={finishedEditorRef} className="rounded-3xl border border-white/10 bg-[#12161d]/90 p-6 md:p-8 space-y-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Finished Trip</div>
                          <h2 className="mt-1 text-3xl font-semibold">{finishedSelectedTrip.title}</h2>
                          <p className="mt-2 text-sm text-slate-300">
                            {finishedSelectedTrip.start_location} to {finishedSelectedTrip.end_location}
                          </p>
                          <p className="text-xs text-slate-400">
                            {fmtDate(finishedSelectedTrip.start_date)} to {fmtDate(finishedSelectedTrip.end_date)} | {finishedSelectedTrip.itinerary?.length || 0} days
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setFinishedTripId('')}
                            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
                          >
                            Back
                          </button>
                          <button
                            type="button"
                            onClick={() => saveFinishedTrip()}
                            disabled={finishedSaving}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
                          >
                            {finishedSaving ? <Loader2 size={15} className="animate-spin" /> : <Flag size={15} />}
                            Save Finished Trip
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        <div className="lg:col-span-7 space-y-4">
                          <div className="rounded-2xl border border-white/10 bg-[#11161f] p-4 md:p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                <div className="text-sm font-semibold text-slate-100">Thumbnail Source</div>
                                <p className="mt-2 text-xs text-slate-500">
                                  Discovery uses the selected thumbnail image below. If none is chosen, the first uploaded photo is used automatically.
                                </p>
                                <label className="mt-4 block rounded-xl border border-dashed border-white/15 bg-[#0d1118] px-3 py-3 text-sm text-slate-300 cursor-pointer hover:border-sky-400/40">
                                  Upload thumbnail from device
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      void uploadFinishedThumbnail(e.target.files);
                                      e.currentTarget.value = '';
                                    }}
                                  />
                                </label>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                                <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Thumbnail Preview</div>
                                <div className="mt-3 aspect-video overflow-hidden rounded-lg border border-white/10 bg-[#0d1118]">
                                  {finishedCoverImage.trim() || finishedTripThumbnail ? (
                                    <img
                                      src={finishedCoverImage.trim() || finishedTripThumbnail}
                                      alt={`${finishedSelectedTrip.title} thumbnail`}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                                      Add a photo to generate a thumbnail.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                                  <Image size={16} className="text-sky-300" />
                                  Add Picture
                                </div>
                                <div className="mt-3 space-y-3">
                                  <p className="text-xs text-slate-500">
                                    Browse image files from your PC and upload them to this finished trip.
                                  </p>
                                  <label className="block rounded-xl border border-dashed border-white/15 bg-[#0d1118] px-3 py-3 text-sm text-slate-300 cursor-pointer hover:border-sky-400/40">
                                    Upload image file
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      className="hidden"
                                      onChange={(e) => {
                                        void uploadFinishedMedia('image', e.target.files);
                                        e.currentTarget.value = '';
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>

                              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                                  <Video size={16} className="text-sky-300" />
                                  Add Video
                                </div>
                                <div className="mt-3 space-y-3">
                                  <p className="text-xs text-slate-500">
                                    Browse video files from your PC and upload them to this finished trip.
                                  </p>
                                  <label className="block rounded-xl border border-dashed border-white/15 bg-[#0d1118] px-3 py-3 text-sm text-slate-300 cursor-pointer hover:border-sky-400/40">
                                    Upload video file
                                    <input
                                      type="file"
                                      accept="video/*"
                                      multiple
                                      className="hidden"
                                      onChange={(e) => {
                                        void uploadFinishedMedia('video', e.target.files);
                                        e.currentTarget.value = '';
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                              <div className="text-sm font-semibold text-slate-100">Current Media</div>
                              {finishedTripMedia.length > 0 ? (
                                <div className="mt-3 space-y-2">
                                  {finishedTripMedia.map((item: any) => {
                                    const isThumbnail = (finishedCoverImage.trim() || finishedTripThumbnail) === item.url;
                                    return (
                                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0d1118] px-3 py-2.5">
                                        <div className="min-w-0">
                                          <div className="text-sm text-slate-100">
                                            {item.caption || (item.type === 'image' ? 'Trip photo' : 'Trip video')}
                                          </div>
                                          <div className="truncate text-xs text-slate-400">
                                            {item.type === 'image' ? 'Image file' : 'Video file'}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {item.type === 'image' && (
                                            <button
                                              type="button"
                                              onClick={() => void setFinishedThumbnail(item.url)}
                                              className={`rounded-lg px-3 py-1.5 text-xs ${
                                                isThumbnail
                                                  ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                                                  : 'border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                                              }`}
                                            >
                                              {isThumbnail ? 'Thumbnail' : 'Set Thumbnail'}
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => removeFinishedMedia(item.id)}
                                            className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/20"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="mt-3 text-sm text-slate-400">No pictures or videos added yet.</div>
                              )}
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                              <div className="text-sm font-semibold text-slate-100">Feedback</div>
                              <p className="mt-2 text-xs text-slate-500">
                                Add your finished-trip feedback or overall experience for this itinerary.
                              </p>
                              <textarea
                                value={finishedFeedback}
                                onChange={(e) => setFinishedFeedback(e.target.value)}
                                rows={5}
                                placeholder="Share your feedback about the trip..."
                                className="mt-3 w-full rounded-xl border border-white/10 bg-[#0d1118] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-400/50"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-5 space-y-4">
                          <div className="rounded-2xl border border-white/10 bg-[#11161f] p-4 md:p-5 space-y-4">
                            <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Publishing</div>
                            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                              <input
                                type="checkbox"
                                checked={finishedChecked}
                                onChange={(e) => {
                                  const next = e.target.checked;
                                  setFinishedChecked(next);
                                  if (!next) setFinishedPublic(false);
                                }}
                                className="accent-sky-500"
                              />
                              Mark this trip as finished
                            </label>
                            <label className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                              finishedChecked
                                ? 'border-white/10 bg-white/5 text-slate-200'
                                : 'border-white/5 bg-white/[0.03] text-slate-500'
                            }`}>
                              <input
                                type="checkbox"
                                checked={finishedPublic}
                                disabled={!finishedChecked}
                                onChange={(e) => setFinishedPublic(e.target.checked)}
                                className="accent-sky-500"
                              />
                              Show this finished trip in Discovery
                            </label>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                <div className="text-xs uppercase tracking-[0.1em] text-slate-500">Media Items</div>
                                <div className="mt-2 text-2xl font-semibold text-slate-100">{finishedTripMedia.length}</div>
                              </div>
                              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                <div className="text-xs uppercase tracking-[0.1em] text-slate-500">Discovery Status</div>
                                <div className="mt-2 text-sm font-semibold text-slate-100">
                                  {finishedChecked ? (finishedPublic ? 'Public' : 'Private') : 'Not finished'}
                                </div>
                              </div>
                            </div>

                            <div className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                              Discovery now shows only trips marked as finished and then made public here.
                            </div>
                          </div>
                        </div>
                      </div>

                      <TripMediaGallery
                        trip={{
                          ...finishedSelectedTrip,
                          cover_image: finishedCoverImage.trim() || finishedSelectedTrip.cover_image,
                        }}
                        title="Finished Trip Gallery"
                        emptyText="Add images or videos above to build the finished trip gallery."
                      />
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-white/10 bg-[#12161d]/90 p-6 md:p-8 space-y-5">
                      <div>
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Trip Tiles</div>
                        <div className="mt-1 text-sm text-slate-300">
                          Click a tile to replace this view with that trip&apos;s finished-trip editor.
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {finishedPaneTrips.map((trip) => {
                          const id = tripId(trip);
                          const thumb = getTripThumbnail(trip);
                          const mediaCount = getTripGallery(trip).length;
                          return (
                            <button
                              key={`finished-tile-${id}`}
                              type="button"
                              onClick={() => handleFinishedTileSelect(id)}
                              className="overflow-hidden rounded-2xl border border-white/10 bg-[#11161f] text-left transition hover:border-white/20"
                            >
                              <div className="aspect-[16/8] border-b border-white/10 bg-[#0d1118]">
                                {thumb ? (
                                  <img src={thumb} alt={trip.title} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                                    No thumbnail
                                  </div>
                                )}
                              </div>
                              <div className="p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="text-base font-semibold text-slate-100">{trip.title}</div>
                                  {trip?.is_finished && (
                                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                                      Finished
                                    </span>
                                  )}
                                  {trip?.is_public && trip?.is_finished && (
                                    <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200">
                                      Public
                                    </span>
                                  )}
                                </div>
                                <div className="mt-2 text-sm text-slate-300">{trip.start_location} to {trip.end_location}</div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {fmtDate(trip.start_date)} to {fmtDate(trip.end_date)} | {mediaCount} media item{mediaCount === 1 ? '' : 's'}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {pane === 'discover' && (
                <div className="max-w-6xl mx-auto py-6">
                  {discoverMode === 'view' ? (
                    discoverViewLoading ? (
                      <div className="text-center text-slate-400 py-10">Loading itinerary...</div>
                    ) : discoverViewedTrip ? (
                      <div className="space-y-5">
                        <button
                          type="button"
                          onClick={() => {
                            setDiscoverMode('list');
                            setDiscoverMapDay(null);
                          }}
                          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
                        >
                          Back to Discover Trips
                        </button>

                        <div className="rounded-3xl border border-white/10 bg-[#12161d]/90 p-6 md:p-8 space-y-5">
                          <div>
                            <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Discover Itinerary</div>
                            <h2 className="mt-1 text-3xl font-semibold">{discoverViewedTrip.title}</h2>
                            <p className="mt-1 text-sm text-slate-300">
                              {discoverViewedTrip.start_location} to {discoverViewedTrip.end_location}
                            </p>
                            <p className="text-xs text-slate-400">
                              {fmtDate(discoverViewedTrip.start_date)} to {fmtDate(discoverViewedTrip.end_date)} | {discoverViewedTrip.itinerary?.length || 0} days
                            </p>
                            {discoverViewedTrip.description && (
                              <p className="mt-2 text-sm text-slate-300 leading-relaxed">{discoverViewedTrip.description}</p>
                            )}
                            {discoverViewedTrip.feedback && (
                              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                                <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Traveler Feedback</div>
                                <p className="mt-2 text-sm text-slate-200 leading-relaxed">{discoverViewedTrip.feedback}</p>
                              </div>
                            )}
                          </div>

                          <TripMediaGallery
                            trip={discoverViewedTrip}
                            title="Trip Gallery"
                            emptyText="This finished trip does not have photos or videos yet."
                          />

                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                            <div className="order-2 lg:order-1 lg:col-span-7 space-y-4">
                              <div className="rounded-xl border border-white/10 bg-[#11161f] px-4 py-3 text-xs text-slate-300">
                                Click a day card to preview that day route on the map.
                              </div>

                              {(discoverViewedTrip.itinerary || []).length > 0 ? (
                                <div className="space-y-4">
                                  {(discoverViewedTrip.itinerary || []).map((day: any, idx: number) => {
                                    const dayNumber = Number(day?.day) || idx + 1;
                                    const daySchedule = buildDaySchedule(day);
                                    const activeDay = discoverMapDay === dayNumber;
                                    return (
                                      <section
                                        key={dayNumber}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setDiscoverMapDay(dayNumber)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setDiscoverMapDay(dayNumber);
                                          }
                                        }}
                                        className={`rounded-2xl border p-4 md:p-5 transition cursor-pointer outline-none ${
                                          activeDay
                                            ? 'border-sky-400/60 bg-[#172133] shadow-[0_0_0_1px_rgba(56,189,248,0.35)]'
                                            : 'border-white/10 bg-[#161c26] hover:border-white/20'
                                        }`}
                                      >
                                        <h3 className="text-xl font-extrabold tracking-wide uppercase text-slate-100">
                                          Day {dayNumber} - Destination
                                        </h3>

                                        {daySchedule.length > 0 ? (
                                          <div className="relative mt-4 pl-9">
                                            <div className="absolute left-3 top-1 bottom-1 w-px bg-sky-400/50" />
                                            {daySchedule.map((entry: any, placeIdx: number) => (
                                              <div key={`${dayNumber}-${entry.place.name}-${placeIdx}`} className={`${placeIdx === daySchedule.length - 1 ? '' : 'pb-6'} relative`}>
                                                <span className="absolute -left-[26px] top-1.5 w-2.5 h-2.5 rounded-full bg-sky-400" />
                                                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                                  <div className="md:col-span-2">
                                                    <div className="text-xs font-extrabold tracking-wide uppercase text-sky-300">
                                                      {entry.place.visit_time || 'Time not set'}
                                                    </div>
                                                    <div className="text-xs font-semibold text-slate-300">
                                                      {Number.isFinite(Number(entry.place?.duration_minutes)) && Number(entry.place.duration_minutes) > 0
                                                        ? `${Math.round(Number(entry.place.duration_minutes))} min`
                                                        : 'Duration not set'}
                                                    </div>
                                                  </div>
                                                  <div className="md:col-span-3">
                                                    <div className="text-sm font-semibold text-slate-100">{entry.place.name}</div>
                                                    <div className="text-sm text-slate-300">
                                                      {entry.place.notes || entry.place.description || 'Destination added to itinerary.'}
                                                    </div>
                                                    {placeIdx > 0 && Number.isFinite(Number(entry.place?.travel_minutes_from_previous)) && Number(entry.place.travel_minutes_from_previous) > 0 && (
                                                      <div className="mt-1 text-[11px] text-slate-400">
                                                        Travel from previous: {Math.round(Number(entry.place.travel_minutes_from_previous))} min
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="mt-3 text-sm text-slate-300">No destinations added for this day.</div>
                                        )}

                                        {day?.notes && (
                                          <div className="mt-4 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200">
                                            {day.notes}
                                          </div>
                                        )}
                                      </section>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                                  No itinerary generated yet.
                                </div>
                              )}
                            </div>

                            <div className="order-1 lg:order-2 lg:col-span-5">
                              <div className="rounded-2xl border border-white/10 bg-[#12161d]/95 p-3 lg:sticky lg:top-4">
                                <div className="flex items-center justify-between gap-3 mb-2">
                                  <div>
                                    <div className="text-xs uppercase tracking-[0.12em] text-slate-400">Route Preview</div>
                                    <div className="text-sm font-semibold text-slate-100">
                                      {discoverMapDay === null ? 'Start to End Route' : `Day ${discoverMapDay} Route`}
                                    </div>
                                  </div>
                                  {discoverTripRouteLoading && discoverMapDay === null && (
                                    <span className="text-[11px] text-slate-400">Loading base route...</span>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  <button
                                    type="button"
                                    onClick={() => setDiscoverMapDay(null)}
                                    className={`rounded-md px-2.5 py-1 text-[11px] border transition ${
                                      discoverMapDay === null
                                        ? 'bg-sky-500/25 border-sky-400 text-white'
                                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                    }`}
                                  >
                                    Start to End
                                  </button>
                                  {(discoverViewedTrip.itinerary || []).map((day: any, idx: number) => {
                                    const dayNumber = Number(day?.day) || idx + 1;
                                    return (
                                      <button
                                        key={`discover-map-day-${dayNumber}`}
                                        type="button"
                                        onClick={() => setDiscoverMapDay(dayNumber)}
                                        className={`rounded-md px-2.5 py-1 text-[11px] border transition ${
                                          discoverMapDay === dayNumber
                                            ? 'bg-sky-500/25 border-sky-400 text-white'
                                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                        }`}
                                      >
                                        Day {dayNumber}
                                      </button>
                                    );
                                  })}
                                </div>

                                {discoverMapDay !== null && discoverMapDayLocations.length === 0 && (
                                  <div className="mb-3 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                                    This day has no mapped coordinates yet. Showing start to end route instead.
                                  </div>
                                )}

                                <div className="h-[54vh] rounded-xl overflow-hidden border border-white/10">
                                  <TripMap
                                    locations={discoverRenderedMapLocations}
                                    title={
                                      discoverMapDay === null
                                        ? `${discoverViewedTrip.start_location} to ${discoverViewedTrip.end_location}`
                                        : `Day ${discoverMapDay} Route`
                                    }
                                    showRouteList={false}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-slate-400 py-10">No discover trip selected.</div>
                    )
                  ) : (
                    <div className="max-w-5xl mx-auto">
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                        <div>
                          <h2 className="text-3xl font-semibold">Discover Trips</h2>
                          <p className="text-sm text-slate-400">Browse finished trips that travelers have chosen to publish.</p>
                        </div>
                        <button type="button" onClick={loadPublicTrips} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/10">Refresh</button>
                      </div>

                      <div className="relative mb-5">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={discoverQuery}
                          onChange={(e) => setDiscoverQuery(e.target.value)}
                          placeholder="Search by title or location"
                          className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 py-2.5 text-sm outline-none focus:border-sky-400/50"
                        />
                      </div>

                      {publicTripsLoading ? (
                        <div className="text-center text-slate-400 py-10">Loading discover trips...</div>
                      ) : filteredPublicTrips.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {filteredPublicTrips.map((trip) => {
                            const id = tripId(trip);
                            const thumbnail = getTripThumbnail(trip);
                            return (
                              <div key={id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#12161d]/90">
                                <div className="aspect-[16/8] border-b border-white/10 bg-[#0d1118]">
                                  {thumbnail ? (
                                    <img src={thumbnail} alt={trip.title} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                                      No thumbnail yet
                                    </div>
                                  )}
                                </div>
                                <div className="p-5">
                                  <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-xl font-semibold">{trip.title}</h3>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                                      <Globe2 size={12} />
                                      Finished
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm text-slate-300">{trip.start_location} to {trip.end_location}</p>
                                  <p className="text-xs text-slate-400 mt-1">{fmtDate(trip.start_date)} to {fmtDate(trip.end_date)} | {trip.itinerary?.length || 0} days</p>
                                  <p className="mt-3 line-clamp-2 text-sm text-slate-400">
                                    {trip.description || 'Published finished itinerary with media and route details.'}
                                  </p>
                                  <div className="mt-3 text-xs text-slate-500">
                                    {getTripGallery(trip).length} media item{getTripGallery(trip).length === 1 ? '' : 's'}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 border-t border-white/10 px-5 py-4">
                                  <button type="button" onClick={() => openDiscoverTripView(id)} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-400"><Eye size={13} />View</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center text-slate-400 py-10">No public finished trips found.</div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {pane === 'profile' && (
                <div className="max-w-5xl mx-auto py-6">
                  <div className="rounded-3xl border border-white/10 bg-[#12161d]/90 p-6 md:p-8 space-y-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {user?.profile?.profile_picture ? (
                          <img
                            src={user.profile.profile_picture}
                            alt="Profile"
                            className="w-16 h-16 rounded-2xl border border-sky-400/30 object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-sky-500/20 border border-sky-400/30 text-sky-200 text-2xl font-bold flex items-center justify-center">
                            {profileInitial}
                          </div>
                        )}
                        <div>
                          <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Profile</div>
                          <h2 className="mt-1 text-3xl font-semibold">{user?.username || 'Traveler'}</h2>
                          <p className="text-sm text-slate-300">{user?.email || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPane('saved')}
                          className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
                        >
                          Saved Trips
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPane('discover');
                            setDiscoverMode('list');
                          }}
                          className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400"
                        >
                          Discover Trips
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileEditing((prev) => !prev);
                            if (profileEditing) {
                              setProfileUsername(user?.username || '');
                              setProfileBio(user?.profile?.bio || '');
                              setProfilePhotoUrl(user?.profile?.profile_picture || '');
                            }
                          }}
                          className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
                        >
                          {profileEditing ? 'Close Edit' : 'Edit Profile'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs text-slate-400 uppercase tracking-[0.1em]">Saved Trips</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-100">{trips.length}</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs text-slate-400 uppercase tracking-[0.1em]">Finished Trips</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-100">{finishedTripsCount}</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs text-slate-400 uppercase tracking-[0.1em]">Public Finished Trips</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-100">{publicTripsCount}</div>
                      </div>
                    </div>

                    {profileEditing ? (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-slate-400 uppercase tracking-[0.1em] mb-2">Username</div>
                            <input
                              type="text"
                              value={profileUsername}
                              onChange={(e) => setProfileUsername(e.target.value)}
                              maxLength={40}
                              className="w-full rounded-lg border border-white/15 bg-[#0d1118] px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/60"
                              placeholder="Enter username"
                            />
                          </div>
                          <div>
                            <div className="text-xs text-slate-400 uppercase tracking-[0.1em] mb-2">Photo URL</div>
                            <input
                              type="url"
                              value={profilePhotoUrl}
                              onChange={(e) => setProfilePhotoUrl(e.target.value)}
                              className="w-full rounded-lg border border-white/15 bg-[#0d1118] px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/60"
                              placeholder="https://..."
                            />
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-slate-400 uppercase tracking-[0.1em] mb-2">Bio</div>
                          <textarea
                            value={profileBio}
                            onChange={(e) => setProfileBio(e.target.value)}
                            rows={4}
                            maxLength={400}
                            className="w-full rounded-lg border border-white/15 bg-[#0d1118] px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/60"
                            placeholder="Add your bio"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={saveProfileChanges}
                            disabled={profileSaving}
                            className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-60"
                          >
                            {profileSaving ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
                            Save Profile
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setProfileEditing(false);
                              setProfileUsername(user?.username || '');
                              setProfileBio(user?.profile?.bio || '');
                              setProfilePhotoUrl(user?.profile?.profile_picture || '');
                            }}
                            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                        <div>
                          <div className="text-xs text-slate-400 uppercase tracking-[0.1em] mb-1">Username</div>
                          <p className="text-sm text-slate-100">{user?.username || 'Traveler'}</p>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 uppercase tracking-[0.1em] mb-1">Photo</div>
                          <p className="text-sm text-slate-300 break-all">
                            {user?.profile?.profile_picture || 'No profile photo added.'}
                          </p>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 uppercase tracking-[0.1em] mb-1">Bio</div>
                          <p className="text-sm text-slate-200 leading-relaxed">
                            {user?.profile?.bio || 'No bio added yet.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {(error || message) && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg border px-4 py-2 text-sm">
                {error ? <span className="text-red-200">{error}</span> : <span className="text-emerald-300">{message}</span>}
              </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
