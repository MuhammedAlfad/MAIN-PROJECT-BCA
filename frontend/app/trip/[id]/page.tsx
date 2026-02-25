'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, CalendarDays, MapPin } from 'lucide-react';
import { tripsApi } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';

type PeriodKey = 'morning' | 'afternoon' | 'evening';

const PERIOD_ORDER: PeriodKey[] = ['morning', 'afternoon', 'evening'];

const PERIOD_META: Record<
  PeriodKey,
  {
    label: string;
    defaultStart: number;
    defaultEnd: number;
  }
> = {
  morning: { label: 'Morning', defaultStart: 6 * 60, defaultEnd: 12 * 60 },
  afternoon: { label: 'Afternoon', defaultStart: 12 * 60, defaultEnd: 17 * 60 },
  evening: { label: 'Evening', defaultStart: 17 * 60, defaultEnd: 21 * 60 },
};

const toMinutes = (value?: string | null) => {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(':').map((part) => parseInt(part, 10));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

const toDotTime = (minutes: number) => {
  const dayMinutes = 24 * 60;
  const normalized = ((Math.round(minutes) % dayMinutes) + dayMinutes) % dayMinutes;
  const hours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, '0');
  const mins = (normalized % 60).toString().padStart(2, '0');
  return `${hours}.${mins}`;
};

const getPeriodFromMinutes = (minutes: number): PeriodKey => {
  const hour = Math.floor(minutes / 60);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

const getPeriodWithoutTime = (index: number, totalPlaces: number): PeriodKey => {
  if (totalPlaces <= 2) {
    return index === 0 ? 'morning' : 'afternoon';
  }
  if (index < Math.ceil(totalPlaces / 2)) {
    return 'morning';
  }
  if (index < Math.ceil((totalPlaces * 4) / 5)) {
    return 'afternoon';
  }
  return 'evening';
};

interface GroupedTimelineItem {
  place: any;
}

interface GroupedTimeline {
  key: PeriodKey;
  label: string;
  timeRange: string;
  places: GroupedTimelineItem[];
}

const groupPlacesByPeriod = (places: any[]): GroupedTimeline[] => {
  const grouped: Record<
    PeriodKey,
    {
      places: GroupedTimelineItem[];
      start: number | null;
      end: number | null;
    }
  > = {
    morning: { places: [], start: null, end: null },
    afternoon: { places: [], start: null, end: null },
    evening: { places: [], start: null, end: null },
  };

  places.forEach((place, index) => {
    const visitMinutes = toMinutes(place?.visit_time);
    const durationRaw = Number(place?.duration_minutes);
    const durationMinutes =
      Number.isFinite(durationRaw) && durationRaw > 0 ? Math.round(durationRaw) : 90;

    const period = visitMinutes !== null
      ? getPeriodFromMinutes(visitMinutes)
      : getPeriodWithoutTime(index, places.length);

    grouped[period].places.push({ place });

    if (visitMinutes !== null) {
      const endMinutes = visitMinutes + durationMinutes;
      grouped[period].start =
        grouped[period].start === null ? visitMinutes : Math.min(grouped[period].start, visitMinutes);
      grouped[period].end =
        grouped[period].end === null ? endMinutes : Math.max(grouped[period].end, endMinutes);
    }
  });

  return PERIOD_ORDER.filter((key) => grouped[key].places.length > 0).map((key) => {
    const meta = PERIOD_META[key];
    const startMinutes = grouped[key].start ?? meta.defaultStart;
    const endMinutes = grouped[key].end ?? meta.defaultEnd;

    return {
      key,
      label: meta.label,
      timeRange: `${toDotTime(startMinutes)} - ${toDotTime(endMinutes)}`,
      places: grouped[key].places,
    };
  });
};

export default function TripViewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  const loadTrip = async () => {
    try {
      setError('');
      const response = await tripsApi.getTrip(tripId);
      setTrip(response.data);
    } catch (loadError) {
      console.error('Failed to load trip:', loadError);
      setError('Unable to load this itinerary.');
    } finally {
      setIsLoading(false);
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

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-xl font-semibold">Loading itinerary...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-100">
        <div className="bg-white border-b">
          <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => router.push('/discover')}
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
              <ChevronLeft size={20} />
              Back to Discover
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {!error && (!trip || !canViewTrip) && (
            <div className="bg-white border rounded-xl p-8 text-center text-slate-600">
              This itinerary is not available.
            </div>
          )}

          {!error && trip && canViewTrip && (
            <div className="space-y-6">
              <div className="bg-white border rounded-xl p-6">
                <h1 className="text-3xl font-bold text-slate-800">{trip.title}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={15} />
                    {trip.start_location} to {trip.end_location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={15} />
                    {new Date(trip.start_date).toLocaleDateString()} to{' '}
                    {new Date(trip.end_date).toLocaleDateString()}
                  </span>
                </div>
                {trip.description && (
                  <p className="mt-3 text-sm text-slate-700 leading-relaxed">{trip.description}</p>
                )}
              </div>

              {(trip.itinerary || []).map((day: any) => {
                const places = day?.places || [];
                const grouped = groupPlacesByPeriod(places);

                return (
                  <section key={day.day} className="bg-white border rounded-xl p-6">
                    <h2 className="text-2xl font-extrabold uppercase tracking-wide text-slate-700">
                      Day {day.day} - Destination
                    </h2>

                    {grouped.length === 0 ? (
                      <p className="mt-4 text-sm text-slate-500">No destinations added for this day.</p>
                    ) : (
                      <div className="relative mt-5 pl-10">
                        <div className="absolute left-4 top-1 bottom-1 w-px bg-amber-300" />

                        {grouped.map((slot, slotIndex) => (
                          <div
                            key={`${day.day}-${slot.key}`}
                            className={`relative ${slotIndex === grouped.length - 1 ? '' : 'pb-8'}`}
                          >
                            <span className="absolute -left-[30px] top-1.5 w-3 h-3 rounded-full bg-amber-500" />
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div className="md:col-span-1">
                                <p className="text-sm font-extrabold uppercase text-slate-700">{slot.label}</p>
                                <p className="text-xs font-semibold text-slate-500">({slot.timeRange})</p>
                              </div>
                              <div className="md:col-span-3 space-y-3">
                                {slot.places.map((entry, entryIndex) => (
                                  <div key={`${slot.key}-${entry.place?.name}-${entryIndex}`}>
                                    <p className="text-sm font-semibold text-slate-800">{entry.place?.name}</p>
                                    {entry.place?.notes ? (
                                      <p className="text-sm text-slate-600">{entry.place.notes}</p>
                                    ) : entry.place?.description ? (
                                      <p className="text-sm text-slate-600">{entry.place.description}</p>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {day?.notes && (
                      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide font-bold text-slate-500 mb-1">Day Notes</p>
                        <p className="text-sm text-slate-700">{day.notes}</p>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
