'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { tripsApi } from '@/lib/api';
import { ArrowDown, ArrowUp, ChevronLeft, Clock3, RotateCcw, Save, Sparkles } from 'lucide-react';

interface ItineraryBuilderProps {
  tripId: string;
  trip: any;
  onUpdate: () => void | Promise<void>;
  theme?: 'light' | 'dark';
  onBack?: () => void;
  backLabel?: string;
  onViewItinerary?: () => void;
  viewItineraryLabel?: string;
}

const DEFAULT_DAY_START_MINUTES = 9 * 60;
const DEFAULT_STOP_DURATION_MINUTES = 90;

const toMinutes = (timeValue?: string | null) => {
  if (!timeValue || !/^\d{2}:\d{2}$/.test(timeValue)) {
    return null;
  }

  const [hours, minutes] = timeValue.split(':').map((value) => parseInt(value, 10));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

const toTimeValue = (minutes: number) => {
  const dayMinutes = 24 * 60;
  const normalized = ((Math.round(minutes) % dayMinutes) + dayMinutes) % dayMinutes;
  const hours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, '0');
  const mins = (normalized % 60).toString().padStart(2, '0');
  return `${hours}:${mins}`;
};

const getCoordinates = (place: any): { lat: number; lng: number } | null => {
  const lat = Number(place?.coordinates?.lat);
  const lng = Number(place?.coordinates?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }

  if (lat === 0 && lng === 0) {
    return null;
  }

  return { lat, lng };
};

const getDistanceKm = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
  const earthRadiusKm = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const estimateTravelMinutes = (previousPlace: any, currentPlace: any) => {
  const from = getCoordinates(previousPlace);
  const to = getCoordinates(currentPlace);

  if (!from || !to) {
    return 30;
  }

  const distanceKm = getDistanceKm(from, to);
  if (!Number.isFinite(distanceKm)) {
    return 30;
  }

  if (distanceKm < 1) {
    return 10;
  }

  const speedKmh = distanceKm > 120 ? 70 : 35;
  const travelMinutes = Math.round((distanceKm / speedKmh) * 60);
  return Math.max(10, Math.min(480, travelMinutes));
};

export const ItineraryBuilder: React.FC<ItineraryBuilderProps> = ({
  tripId,
  trip,
  onUpdate,
  theme = 'light',
  onBack,
  backLabel = 'Back',
  onViewItinerary,
  viewItineraryLabel = 'View Itinerary',
}) => {
  const [localTrip, setLocalTrip] = useState<any>(trip);
  const [selectedDay, setSelectedDay] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    setLocalTrip(trip);
    setSelectedDay(1);
    setHasUnsavedChanges(false);
    setSaveStatus('idle');
  }, [trip]);

  const isDark = theme === 'dark';
  const panelClass = isDark
    ? 'rounded-2xl border border-white/10 bg-[#12161d]/90 p-4 md:p-5'
    : 'rounded-xl border bg-white p-4 md:p-5';
  const cardClass = isDark
    ? 'rounded-xl border border-white/10 bg-white/5 p-4'
    : 'rounded-xl border border-gray-200 bg-gray-50 p-4';
  const textPrimary = isDark ? 'text-slate-100' : 'text-gray-800';
  const textSecondary = isDark ? 'text-slate-400' : 'text-gray-600';
  const borderMuted = isDark ? 'border-white/15' : 'border-gray-300';
  const inputClass = isDark
    ? 'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400/50'
    : 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-500';
  const iconMuted = isDark ? 'text-slate-400' : 'text-gray-400';
  const dayCardActive = isDark
    ? 'bg-sky-500/25 border-sky-400 text-white'
    : 'bg-blue-600 border-blue-600 text-white';
  const dayCardMuted = isDark
    ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
    : 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100';

  const itinerary = localTrip?.itinerary || [];
  const currentDayIndex = selectedDay - 1;
  const currentDay = itinerary[currentDayIndex];

  const totalPlaces = useMemo(
    () =>
      itinerary.reduce((count: number, day: any) => {
        return count + (day?.places?.length || 0);
      }, 0),
    [itinerary]
  );

  const setDayPlaces = (dayIndex: number, places: any[]) => {
    setLocalTrip((prev: any) => {
      if (!prev?.itinerary) return prev;

      const nextItinerary = prev.itinerary.map((day: any, index: number) =>
        index === dayIndex ? { ...day, places } : day
      );

      return { ...prev, itinerary: nextItinerary };
    });
    setHasUnsavedChanges(true);
    setSaveStatus('idle');
  };

  const updatePlace = (dayIndex: number, placeIndex: number, updates: Record<string, any>) => {
    const day = itinerary[dayIndex];
    if (!day?.places) return;

    const nextPlaces = day.places.map((place: any, index: number) => {
      if (index !== placeIndex) return place;
      return {
        ...place,
        ...updates,
        auto_generated_time:
          updates.auto_generated_time !== undefined ? updates.auto_generated_time : false,
      };
    });

    setDayPlaces(dayIndex, nextPlaces);
  };

  const updateDayNotes = (dayIndex: number, notes: string) => {
    setLocalTrip((prev: any) => {
      if (!prev?.itinerary) return prev;
      const nextItinerary = prev.itinerary.map((day: any, index: number) =>
        index === dayIndex ? { ...day, notes } : day
      );
      return { ...prev, itinerary: nextItinerary };
    });
    setHasUnsavedChanges(true);
    setSaveStatus('idle');
  };

  const movePlace = (dayIndex: number, placeIndex: number, direction: 'up' | 'down') => {
    const day = itinerary[dayIndex];
    if (!day?.places || day.places.length < 2) return;

    const targetIndex = direction === 'up' ? placeIndex - 1 : placeIndex + 1;
    if (targetIndex < 0 || targetIndex >= day.places.length) return;

    const nextPlaces = [...day.places];
    [nextPlaces[placeIndex], nextPlaces[targetIndex]] = [nextPlaces[targetIndex], nextPlaces[placeIndex]];
    setDayPlaces(dayIndex, nextPlaces);
  };

  const reverseOrder = (dayIndex: number) => {
    const day = itinerary[dayIndex];
    if (!day?.places || day.places.length < 2) return;
    setDayPlaces(dayIndex, [...day.places].reverse());
  };

  const autoGenerateTimes = (dayIndex: number) => {
    const day = itinerary[dayIndex];
    if (!day?.places || day.places.length === 0) return;

    const places = day.places;
    let currentMinutes = toMinutes(places[0]?.visit_time) ?? DEFAULT_DAY_START_MINUTES;

    const nextPlaces = places.map((place: any, index: number) => {
      const rawDuration = Number(place?.duration_minutes);
      const durationMinutes =
        Number.isFinite(rawDuration) && rawDuration > 0
          ? Math.round(rawDuration)
          : DEFAULT_STOP_DURATION_MINUTES;

      let travelMinutes = 0;
      if (index > 0) {
        travelMinutes = estimateTravelMinutes(places[index - 1], place);
        currentMinutes += travelMinutes;
      }

      const nextPlace = {
        ...place,
        visit_time: toTimeValue(currentMinutes),
        duration_minutes: durationMinutes,
        travel_minutes_from_previous: travelMinutes,
        auto_generated_time: true,
      };

      currentMinutes += durationMinutes;
      return nextPlace;
    });

    setDayPlaces(dayIndex, nextPlaces);
  };

  const handleSave = async () => {
    if (!localTrip?.itinerary) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const response = await tripsApi.updateTrip(tripId, { itinerary: localTrip.itinerary });
      if (response?.data) {
        setLocalTrip(response.data);
      }
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      await Promise.resolve(onUpdate());
    } catch (error) {
      console.error('Failed to save itinerary plan:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs ${borderMuted} ${textSecondary} hover:bg-white/10`}
              >
                <ChevronLeft size={14} />
                {backLabel}
              </button>
            )}
            <div>
              <h2 className={`text-xl font-semibold ${textPrimary}`}>Itinerary Builder</h2>
              <p className={`text-sm ${textSecondary}`}>
                {itinerary.length} days | {totalPlaces} selected places
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onViewItinerary && (
              <button
                type="button"
                onClick={onViewItinerary}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs ${borderMuted} ${textSecondary} hover:bg-white/10`}
              >
                {viewItineraryLabel}
              </button>
            )}
            {saveStatus === 'saved' && <span className="text-xs text-emerald-400">Saved</span>}
            {saveStatus === 'error' && <span className="text-xs text-red-400">Save failed</span>}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-50"
            >
              <Save size={15} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {itinerary.map((day: any, index: number) => (
            <button
              key={day.day}
              type="button"
              onClick={() => setSelectedDay(index + 1)}
              className={`shrink-0 w-[170px] rounded-xl border px-3 py-3 text-left transition ${
                selectedDay === index + 1 ? dayCardActive : dayCardMuted
              }`}
            >
              <div className="font-semibold text-sm">Day {day.day}</div>
              <div className={`text-xs mt-1 ${selectedDay === index + 1 ? 'text-white/90' : textSecondary}`}>
                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div className={`text-xs mt-1 ${selectedDay === index + 1 ? 'text-white/90' : textSecondary}`}>
                {day?.places?.length || 0} places
              </div>
            </button>
          ))}
        </div>
      </div>

      {!currentDay ? (
        <div className={panelClass}>
          <div className={`text-sm ${textSecondary}`}>No itinerary day available.</div>
        </div>
      ) : (
        <div className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className={`text-2xl font-semibold ${textPrimary}`}>Day {currentDay.day}</h3>
              <p className={`text-sm ${textSecondary}`}>
                {new Date(currentDay.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => reverseOrder(currentDayIndex)}
                disabled={!currentDay?.places || currentDay.places.length < 2}
                className={`px-3 py-2 rounded-lg border ${borderMuted} ${textSecondary} hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 text-sm`}
              >
                <RotateCcw size={14} />
                Toggle Order
              </button>
              <button
                type="button"
                onClick={() => autoGenerateTimes(currentDayIndex)}
                disabled={!currentDay?.places || currentDay.places.length === 0}
                className="px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                <Sparkles size={14} />
                Auto Generate Time
              </button>
            </div>
          </div>

          <div className="mb-5">
            <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>Day Notes (optional)</label>
            <textarea
              value={currentDay?.notes || ''}
              onChange={(event) => updateDayNotes(currentDayIndex, event.target.value)}
              rows={2}
              className={inputClass}
              placeholder="Add notes for this day..."
            />
          </div>

          {currentDay?.places?.length > 0 ? (
            <div className="space-y-3">
              {currentDay.places.map((place: any, placeIndex: number) => (
                <div key={`${place.name}-${placeIndex}`} className={cardClass}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-sky-500 text-white text-xs font-semibold flex items-center justify-center">
                        {placeIndex + 1}
                      </div>
                      <div>
                        <div className={`font-semibold ${textPrimary}`}>{place.name}</div>
                        <div className={`text-xs ${textSecondary}`}>{place.category || 'Place'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => movePlace(currentDayIndex, placeIndex, 'up')}
                        disabled={placeIndex === 0}
                        className={`p-2 rounded border ${borderMuted} ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-gray-100'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="Move up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePlace(currentDayIndex, placeIndex, 'down')}
                        disabled={placeIndex === currentDay.places.length - 1}
                        className={`p-2 rounded border ${borderMuted} ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-gray-100'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="Move down"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Visit Time</label>
                      <div className="relative">
                        <Clock3 size={14} className={`absolute left-3 top-2.5 ${iconMuted}`} />
                        <input
                          type="time"
                          value={place?.visit_time || ''}
                          onChange={(event) =>
                            updatePlace(currentDayIndex, placeIndex, {
                              visit_time: event.target.value,
                              auto_generated_time: false,
                            })
                          }
                          className={`${inputClass} pl-9`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Duration (minutes)</label>
                      <input
                        type="number"
                        min={15}
                        step={15}
                        value={place?.duration_minutes ?? ''}
                        onChange={(event) =>
                          updatePlace(currentDayIndex, placeIndex, {
                            duration_minutes:
                              event.target.value === '' ? null : Math.max(15, Number(event.target.value)),
                            auto_generated_time: false,
                          })
                        }
                        className={inputClass}
                        placeholder="e.g. 90"
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Travel From Previous</label>
                      <input
                        type="number"
                        min={0}
                        step={5}
                        value={place?.travel_minutes_from_previous ?? ''}
                        onChange={(event) =>
                          updatePlace(currentDayIndex, placeIndex, {
                            travel_minutes_from_previous:
                              event.target.value === '' ? null : Math.max(0, Number(event.target.value)),
                            auto_generated_time: false,
                          })
                        }
                        className={inputClass}
                        placeholder={placeIndex === 0 ? '0' : 'Auto/Manual'}
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className={`block text-xs font-semibold mb-1 ${textSecondary}`}>Place Notes (optional)</label>
                    <textarea
                      value={place?.notes || ''}
                      onChange={(event) =>
                        updatePlace(currentDayIndex, placeIndex, {
                          notes: event.target.value,
                          auto_generated_time: false,
                        })
                      }
                      rows={2}
                      className={inputClass}
                      placeholder="Add notes for this place..."
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-sm ${textSecondary} border ${borderMuted} rounded-lg p-4 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
              No places selected for this day yet. Add places in the trip editor, then continue building.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ItineraryBuilder;
