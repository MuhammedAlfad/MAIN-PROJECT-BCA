'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { CalendarDays, ChevronLeft, Loader2, MapPin } from 'lucide-react';
import { tripsApi } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';

type TripMapLocation = { name: string; lat: number; lng: number };

const TripMap = dynamic(() => import('@/components/TripMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-white/5 flex items-center justify-center text-slate-400">
      Loading map...
    </div>
  ),
});

const fmtDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : '-');

const toDotTime = (minutes: number) => {
  const dayMinutes = 24 * 60;
  const normalized = ((Math.round(minutes) % dayMinutes) + dayMinutes) % dayMinutes;
  const hours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, '0');
  const mins = (normalized % 60).toString().padStart(2, '0');
  return `${hours}.${mins}`;
};

const toMinutes = (value?: string | null) => {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map((part) => parseInt(part, 10));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
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
    const duration =
      Number.isFinite(Number(place?.duration_minutes)) && Number(place?.duration_minutes) > 0
        ? Math.round(Number(place.duration_minutes))
        : 90;
    const slot =
      visitMinutes !== null
        ? visitMinutes < 12 * 60
          ? 'morning'
          : 'afternoon'
        : index < Math.ceil(places.length / 2)
          ? 'morning'
          : 'afternoon';
    slots[slot].push(place);

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

  return [
    {
      key: 'morning',
      label: 'MORNING',
      range:
        morningStart !== null && morningEnd !== null
          ? `${toDotTime(morningStart)} - ${toDotTime(morningEnd)}`
          : '06.00 - 09.00',
      places: slots.morning,
    },
    {
      key: 'afternoon',
      label: 'AFTERNOON',
      range:
        afternoonStart !== null && afternoonEnd !== null
          ? `${toDotTime(afternoonStart)} - ${toDotTime(afternoonEnd)}`
          : '15.00 - 17.00',
      places: slots.afternoon,
    },
  ].filter((slot) => slot.places.length > 0);
};

const placesToMapLocations = (places: any[] = []): TripMapLocation[] =>
  places
    .filter((place: any) => Number.isFinite(place?.coordinates?.lat) && Number.isFinite(place?.coordinates?.lng))
    .filter((place: any) => !(Number(place.coordinates.lat) === 0 && Number(place.coordinates.lng) === 0))
    .map((place: any) => ({
      name: place.name,
      lat: Number(place.coordinates.lat),
      lng: Number(place.coordinates.lng),
    }));

export default function TripViewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMapDay, setSelectedMapDay] = useState<number | null>(null);
  const [tripRouteLocations, setTripRouteLocations] = useState<TripMapLocation[]>([]);
  const [tripRouteLoading, setTripRouteLoading] = useState(false);

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  useEffect(() => {
    if (!trip?.start_location || !trip?.end_location) {
      setTripRouteLocations([]);
      return;
    }
    loadTripRouteLocations(trip.start_location, trip.end_location);
  }, [trip?.start_location, trip?.end_location, trip?._id, trip?.id]);

  const loadTrip = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await tripsApi.getTrip(tripId);
      setTrip(response.data);
      setSelectedMapDay(null);
    } catch (loadError) {
      console.error('Failed to load trip:', loadError);
      setError('Unable to load this itinerary.');
    } finally {
      setIsLoading(false);
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
      return { name: location, lat, lng };
    } catch {
      return null;
    }
  };

  const loadTripRouteLocations = async (startLocation: string, endLocation: string) => {
    try {
      setTripRouteLoading(true);
      const [start, end] = await Promise.all([
        geocodeMapLocation(startLocation),
        geocodeMapLocation(endLocation),
      ]);
      const nextLocations = [...(start ? [start] : []), ...(end ? [end] : [])];
      setTripRouteLocations(nextLocations);
    } finally {
      setTripRouteLoading(false);
    }
  };

  const isOwner = useMemo(() => {
    if (!trip?.user_id || !user?.id) return false;
    return trip.user_id === user.id;
  }, [trip?.user_id, user?.id]);

  const canViewTrip = useMemo(() => {
    if (!trip) return false;
    return !!trip.is_public || isOwner;
  }, [trip, isOwner]);

  const selectedDayMapLocations: TripMapLocation[] = useMemo(() => {
    if (!trip || selectedMapDay === null) return [];
    const itinerary = trip.itinerary || [];
    const dayData =
      itinerary.find((day: any) => Number(day?.day) === selectedMapDay) ||
      itinerary[selectedMapDay - 1];
    return placesToMapLocations(dayData?.places || []);
  }, [trip, selectedMapDay]);

  const renderedMapLocations: TripMapLocation[] = useMemo(() => {
    if (selectedMapDay === null) return tripRouteLocations;
    return selectedDayMapLocations.length > 0 ? selectedDayMapLocations : tripRouteLocations;
  }, [selectedMapDay, selectedDayMapLocations, tripRouteLocations]);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#0f1216] text-slate-100 flex items-center justify-center gap-2">
          <Loader2 size={18} className="animate-spin" />
          <p className="text-lg font-medium">Loading itinerary...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0f1216] text-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="mb-5">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10"
            >
              <ChevronLeft size={18} />
              Back to Discover
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {!error && (!trip || !canViewTrip) && (
            <div className="rounded-2xl border border-white/10 bg-[#12161d]/90 p-8 text-center text-slate-300">
              This itinerary is not available.
            </div>
          )}

          {!error && trip && canViewTrip && (
            <div className="rounded-3xl border border-white/10 bg-[#12161d]/90 p-6 md:p-8 space-y-5">
              <div>
                <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Discover Itinerary</div>
                <h1 className="mt-1 text-3xl font-semibold">{trip.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={15} />
                    {trip.start_location} to {trip.end_location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={15} />
                    {fmtDate(trip.start_date)} to {fmtDate(trip.end_date)}
                  </span>
                </div>
                {trip.description && (
                  <p className="mt-3 text-sm text-slate-300 leading-relaxed">{trip.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="order-2 lg:order-1 lg:col-span-7 space-y-4">
                  <div className="rounded-xl border border-white/10 bg-[#11161f] px-4 py-3 text-xs text-slate-300">
                    Click a day card to preview that day route on the map.
                  </div>

                  {(trip.itinerary || []).length > 0 ? (
                    <div className="space-y-4">
                      {(trip.itinerary || []).map((day: any, idx: number) => {
                        const dayNumber = Number(day?.day) || idx + 1;
                        const timelineSlots = buildDayTimeline(day);
                        const activeDay = selectedMapDay === dayNumber;
                        return (
                          <section
                            key={dayNumber}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedMapDay(dayNumber)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedMapDay(dayNumber);
                              }
                            }}
                            className={`rounded-2xl border p-4 md:p-5 transition cursor-pointer outline-none ${
                              activeDay
                                ? 'border-sky-400/60 bg-[#172133] shadow-[0_0_0_1px_rgba(56,189,248,0.35)]'
                                : 'border-white/10 bg-[#161c26] hover:border-white/20'
                            }`}
                          >
                            <h2 className="text-xl font-extrabold tracking-wide uppercase text-slate-100">
                              Day {dayNumber} - Destination
                            </h2>

                            {timelineSlots.length > 0 ? (
                              <div className="relative mt-4 pl-9">
                                <div className="absolute left-3 top-1 bottom-1 w-px bg-sky-400/50" />
                                {timelineSlots.map((slot, slotIndex) => (
                                  <div
                                    key={`${dayNumber}-${slot.key}`}
                                    className={`${slotIndex === timelineSlots.length - 1 ? '' : 'pb-6'} relative`}
                                  >
                                    <span className="absolute -left-[26px] top-1.5 w-2.5 h-2.5 rounded-full bg-sky-400" />
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                      <div className="md:col-span-2">
                                        <div className="text-xs font-extrabold tracking-wide uppercase text-slate-100">
                                          {slot.label}
                                        </div>
                                        <div className="text-xs font-semibold text-slate-300">({slot.range})</div>
                                      </div>
                                      <div className="md:col-span-3 space-y-2">
                                        {slot.places.map((place: any, placeIdx: number) => (
                                          <div key={`${slot.key}-${place.name}-${placeIdx}`}>
                                            <div className="text-sm font-semibold text-slate-100">{place.name}</div>
                                            <div className="text-sm text-slate-300">
                                              {place.notes || place.description || 'Destination added to itinerary.'}
                                            </div>
                                          </div>
                                        ))}
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
                          {selectedMapDay === null ? 'Start to End Route' : `Day ${selectedMapDay} Route`}
                        </div>
                      </div>
                      {tripRouteLoading && selectedMapDay === null && (
                        <span className="text-[11px] text-slate-400">Loading base route...</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <button
                        type="button"
                        onClick={() => setSelectedMapDay(null)}
                        className={`rounded-md px-2.5 py-1 text-[11px] border transition ${
                          selectedMapDay === null
                            ? 'bg-sky-500/25 border-sky-400 text-white'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        Start to End
                      </button>
                      {(trip.itinerary || []).map((day: any, idx: number) => {
                        const dayNumber = Number(day?.day) || idx + 1;
                        return (
                          <button
                            key={`discover-map-day-${dayNumber}`}
                            type="button"
                            onClick={() => setSelectedMapDay(dayNumber)}
                            className={`rounded-md px-2.5 py-1 text-[11px] border transition ${
                              selectedMapDay === dayNumber
                                ? 'bg-sky-500/25 border-sky-400 text-white'
                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            Day {dayNumber}
                          </button>
                        );
                      })}
                    </div>

                    {selectedMapDay !== null && selectedDayMapLocations.length === 0 && (
                      <div className="mb-3 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                        This day has no mapped coordinates yet. Showing start to end route instead.
                      </div>
                    )}

                    <div className="h-[54vh] rounded-xl overflow-hidden border border-white/10">
                      <TripMap
                        locations={renderedMapLocations}
                        title={
                          selectedMapDay === null
                            ? `${trip.start_location} to ${trip.end_location}`
                            : `Day ${selectedMapDay} Route`
                        }
                        showRouteList={false}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
