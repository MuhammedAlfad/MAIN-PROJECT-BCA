'use client';

import React, { useState, useEffect } from 'react';
import { tripsApi, placesApi } from '@/lib/api';
import { Plus, Trash2, MapPin, Star, CheckSquare, Square, ArrowRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const TripMap = dynamic(() => import('./TripMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-200 flex items-center justify-center">Loading map...</div>,
});

interface ItineraryEditorProps {
  tripId: string;
  trip: any;
  onUpdate: () => void;
}

interface PlaceSuggestion {
  name: string;
  display_name: string;
  lat: number;
  lon: number;
}

export const ItineraryEditor: React.FC<ItineraryEditorProps> = ({ tripId, trip, onUpdate }) => {
  const router = useRouter();
  const [localTrip, setLocalTrip] = useState<any>(trip);
  const [selectedDay, setSelectedDay] = useState(1);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceDesc, setNewPlaceDesc] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<PlaceSuggestion | null>(null);
  const [showPlaceSuggestions, setShowPlaceSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedRecKeys, setSelectedRecKeys] = useState<string[]>([]);
  const [isAddingSelected, setIsAddingSelected] = useState(false);
  const [removingPlaceName, setRemovingPlaceName] = useState<string | null>(null);
  const [mapView, setMapView] = useState<'tripPath' | 'suggested'>('tripPath');
  const [tripPathLocations, setTripPathLocations] = useState<any[]>([]);
  const [isLoadingTripPath, setIsLoadingTripPath] = useState(false);

  useEffect(() => {
    setLocalTrip(trip);
  }, [trip]);

  const currentDay = localTrip?.itinerary?.[selectedDay - 1];
  const normalizePlaceName = (value: string) => value.toLowerCase().trim();
  const currentDayPlaceNames = new Set((currentDay?.places || []).map((p: any) => p.name));
  const tripPlaceNames = new Set(
    (localTrip?.itinerary || []).flatMap((day: any) =>
      (day?.places || []).map((place: any) => normalizePlaceName(place?.name || ''))
    )
  );
  const totalAddedPlaces =
    localTrip?.itinerary?.reduce((total: number, day: any) => total + (day?.places?.length || 0), 0) || 0;

  const getPlaceKey = (place: any) =>
    `${place.name}|${place.coordinates?.lat ?? ''}|${place.coordinates?.lng ?? ''}`;
  const visibleRecommendations = recommendations.filter(
    (place: any) => !tripPlaceNames.has(normalizePlaceName(place?.name || ''))
  );

  // Load recommendations when end location changes - based on end location for better suggestions
  useEffect(() => {
    if (localTrip?.end_location) {
      // Clear old recommendations when end location changes
      setRecommendations([]);
      loadRecommendations(localTrip.end_location);
    }
  }, [localTrip?.end_location]);

  useEffect(() => {
    setSelectedRecKeys([]);
  }, [selectedDay, localTrip?.end_location, recommendations.length]);

  useEffect(() => {
    setSelectedRecKeys((prev) =>
      prev.filter((key) => visibleRecommendations.some((place: any) => getPlaceKey(place) === key))
    );
  }, [localTrip?.itinerary, selectedDay, recommendations]);

  useEffect(() => {
    loadTripPathLocations();
  }, [localTrip?.start_location, localTrip?.end_location]);

  const loadRecommendations = async (location: string) => {
    setIsLoadingRecs(true);
    try {
      // Destination-only recommendations to avoid cross-city mixing.
      const timestamp = Date.now();
      const response = await placesApi.getRecommendations(location, 15, timestamp);
      const destPlaces = response.data.places || [];
      setRecommendations(destPlaces);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      setRecommendations([]);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const searchPlaces = async (query: string) => {
    if (query.length < 2) {
      setPlaceSuggestions([]);
      return;
    }
    
    setLoadingSuggestions(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8`
      );
      const data = await response.json();
      setPlaceSuggestions(
        data.map((item: any) => ({
          name: item.name,
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        }))
      );
    } catch (error) {
      console.error('Error searching places:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handlePlaceSearch = (value: string) => {
    setNewPlaceName(value);
    if (selectedSuggestion && value !== selectedSuggestion.name) {
      setSelectedSuggestion(null);
    }
    if (value.length >= 2) {
      searchPlaces(value);
      setShowPlaceSuggestions(true);
    } else {
      setPlaceSuggestions([]);
      setShowPlaceSuggestions(false);
    }
  };

  const selectPlaceSuggestion = (suggestion: PlaceSuggestion) => {
    setNewPlaceName(suggestion.name);
    setSelectedSuggestion(suggestion);
    setPlaceSuggestions([]);
    setShowPlaceSuggestions(false);
  };

  const geocodeLocation = async (location: string): Promise<{ name: string; lat: number; lng: number } | null> => {
    if (!location) return null;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`
      );
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        return null;
      }
      return {
        name: location,
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    } catch (error) {
      console.error('Error geocoding trip path location:', error);
      return null;
    }
  };

  const loadTripPathLocations = async () => {
    const startLocation = localTrip?.start_location;
    const endLocation = localTrip?.end_location;

    if (!startLocation && !endLocation) {
      setTripPathLocations([]);
      return;
    }

    setIsLoadingTripPath(true);
    try {
      const [startCoords, endCoords] = await Promise.all([
        geocodeLocation(startLocation),
        geocodeLocation(endLocation),
      ]);

      const pathLocations = [
        ...(startCoords ? [startCoords] : []),
        ...(endCoords ? [endCoords] : []),
      ];
      setTripPathLocations(pathLocations);
    } finally {
      setIsLoadingTripPath(false);
    }
  };

  const handleAddPlace = async (place: any, refreshAfter = true) => {
    try {
      const response = await tripsApi.addPlaceToTrip(tripId, selectedDay, place);
      if (response?.data) {
        setLocalTrip(response.data);
      }
      if (refreshAfter) {
        await Promise.resolve(onUpdate());
      }
      return true;
    } catch (error) {
      console.error('Failed to add place:', error);
      return false;
    }
  };

  const toggleSelectRecommendation = (place: any) => {
    const key = getPlaceKey(place);
    setSelectedRecKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleAddSelectedRecommendations = async () => {
    if (selectedRecKeys.length === 0) return;

    const selectedPlaces = visibleRecommendations.filter((place) => selectedRecKeys.includes(getPlaceKey(place)));
    if (selectedPlaces.length === 0) return;

    setIsAddingSelected(true);
    try {
      const existingNames = new Set(currentDayPlaceNames);
      for (const place of selectedPlaces) {
        if (existingNames.has(place.name)) continue;
        const added = await handleAddPlace(place, false);
        if (added) {
          existingNames.add(place.name);
        }
      }
      setSelectedRecKeys([]);
      await Promise.resolve(onUpdate());
    } catch (error) {
      console.error('Failed to add selected recommendations:', error);
    } finally {
      setIsAddingSelected(false);
    }
  };

  const handleRemovePlace = async (placeName: string) => {
    try {
      setRemovingPlaceName(placeName);
      const response = await tripsApi.removePlaceFromTrip(tripId, selectedDay, placeName);
      if (response?.data) {
        setLocalTrip(response.data);
      }
      await Promise.resolve(onUpdate());
    } catch (error) {
      console.error('Failed to remove place:', error);
    } finally {
      setRemovingPlaceName(null);
    }
  };

  const handleAddCustomPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaceName) return;

    // Find matching suggestion for coordinates
    const matchingSuggestion = selectedSuggestion || placeSuggestions.find((s) => s.name === newPlaceName);

    const customPlace = {
      name: newPlaceName,
      description: newPlaceDesc,
      coordinates: matchingSuggestion
        ? { lat: matchingSuggestion.lat, lng: matchingSuggestion.lon }
        : { lat: 0, lng: 0 },
      rating: 0,
      category: 'Custom',
      image_url: null,
    };

    await handleAddPlace(customPlace);
    setNewPlaceName('');
    setNewPlaceDesc('');
    setSelectedSuggestion(null);
    setPlaceSuggestions([]);
    setShowPlaceSuggestions(false);
  };
  const recommendationNameSet = new Set(
    recommendations.map((place: any) => (place?.name || '').toLowerCase().trim())
  );
  const addedSuggestedLocations = (currentDay?.places || [])
    .filter((place: any) => place.coordinates?.lat && place.coordinates?.lng)
    .filter((place: any) => recommendationNameSet.has((place?.name || '').toLowerCase().trim()))
    .map((place: any) => ({
      name: place.name,
      lat: place.coordinates.lat,
      lng: place.coordinates.lng,
    }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Day Selector */}
      <div className="lg:col-span-3">
        <h3 className="text-xl font-bold mb-4">Select Day</h3>
        <div className="space-y-2">
          {localTrip?.itinerary?.map((day: any, index: number) => (
            <button
              key={index}
              onClick={() => setSelectedDay(index + 1)}
              className={`w-full p-3 rounded-lg text-left transition ${
                selectedDay === index + 1
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              <div className="font-bold">Day {index + 1}</div>
              <div className="text-sm">
                {new Date(day.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Map Display */}
      <div className="lg:col-span-5 h-96 lg:h-auto">
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => setMapView('tripPath')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                mapView === 'tripPath'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Trip Path
            </button>
            <button
              type="button"
              onClick={() => setMapView('suggested')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                mapView === 'suggested'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Itinerary Destination Map
            </button>
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">
              {mapView === 'tripPath' ? 'Trip Path Map' : 'Suggested Destinations Map'}
            </h3>
            {mapView === 'tripPath' && isLoadingTripPath && (
              <span className="text-xs text-gray-500">Loading path...</span>
            )}
          </div>
        </div>
        <TripMap
          locations={mapView === 'tripPath' ? tripPathLocations : addedSuggestedLocations}
          title={
            mapView === 'tripPath'
              ? `${localTrip?.start_location || 'Start'} to ${localTrip?.end_location || 'End'}`
              : `Added Suggested Places - Day ${selectedDay}`
          }
          showRouteList={false}
        />
      </div>

      {/* Itinerary Content */}
      <div className="lg:col-span-4">
        {currentDay && (
          <div>
            <h2 className="text-2xl font-bold mb-6">
              Day {currentDay.day} - {new Date(currentDay.date).toLocaleDateString()}
            </h2>

            {/* Add Place with Autocomplete */}
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3">Add Custom Place</h3>
              <form onSubmit={handleAddCustomPlace} className="bg-gray-50 p-3 rounded-lg space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={newPlaceName}
                    onChange={(e) => handlePlaceSearch(e.target.value)}
                    onFocus={() => placeSuggestions.length > 0 && setShowPlaceSuggestions(true)}
                    placeholder="Search for a place..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                  {showPlaceSuggestions && placeSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 shadow-lg z-20 max-h-32 overflow-y-auto">
                      {placeSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => selectPlaceSuggestion(suggestion)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 text-sm flex items-center gap-2"
                          type="button"
                        >
                          <MapPin size={12} className="text-gray-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 truncate">{suggestion.name}</div>
                            <div className="text-xs text-gray-500 truncate">{suggestion.display_name.split(',').slice(-2).join(',')}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedSuggestion && (
                  <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                    Coordinates selected for: {selectedSuggestion.display_name}
                  </div>
                )}
                <textarea
                  value={newPlaceDesc}
                  onChange={(e) => setNewPlaceDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  rows={2}
                />
                <button
                  type="submit"
                  className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Plus size={16} />
                  Add Place
                </button>
              </form>
            </div>

            {/* Recommendations */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">Suggested Places</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={selectedRecKeys.length === 0 || isAddingSelected}
                    onClick={handleAddSelectedRecommendations}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:bg-gray-300"
                  >
                    {isAddingSelected ? 'Adding...' : `Add Selected (${selectedRecKeys.length})`}
                  </button>
                  <button
                    type="button"
                    disabled={totalAddedPlaces === 0}
                    onClick={() => router.push(`/trip/${tripId}/build`)}
                    className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:bg-gray-300 flex items-center gap-1"
                  >
                    Build Itinerary
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-2">Select one or more places, then click "Add Selected".</p>
              {isLoadingRecs ? (
                <p className="text-sm text-gray-600">Loading...</p>
              ) : visibleRecommendations.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {visibleRecommendations.map((place: any, index: number) => (
                    <div key={index} className="bg-white p-2 rounded-lg shadow hover:shadow-md transition text-sm">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => toggleSelectRecommendation(place)}
                          className="text-gray-600 hover:text-blue-600 mt-0.5"
                        >
                          {selectedRecKeys.includes(getPlaceKey(place)) ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-800 truncate">{place.name}</h4>
                          <p className="text-xs text-gray-600 truncate">{place.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="bg-gray-200 px-2 py-0.5 rounded text-xs">{place.category}</span>
                            {place.rating && (
                              <div className="flex items-center gap-0.5">
                                <Star size={12} className="text-yellow-400" />
                                <span className="text-xs">{place.rating}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recommendations.length > 0 ? (
                <p className="text-sm text-gray-600">All recommended places are already added to this trip</p>
              ) : (
                <p className="text-sm text-gray-600">No recommendations available</p>
              )}
            </div>

            {/* Added Places */}
            <div>
              <h3 className="text-lg font-bold mb-4">Added Places ({currentDay.places?.length || 0})</h3>
              {currentDay.places?.length > 0 ? (
                <div className="space-y-3">
                  <div className="bg-white border rounded-lg p-3">
                    <div className="font-semibold text-sm text-gray-700 mb-2">
                      Route ({currentDay.places.length} stops)
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {currentDay.places.map((place: any, index: number) => (
                        <div key={`route-${index}`} className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-center text-xs leading-5 font-bold flex-shrink-0">
                            {index + 1}
                          </div>
                          <span className="text-sm text-gray-700 truncate flex-1">{place.name}</span>
                          <button
                            onClick={() => handleRemovePlace(place.name)}
                            disabled={removingPlaceName === place.name}
                            className="text-red-600 hover:bg-red-100 p-1 rounded flex-shrink-0 disabled:opacity-60"
                            title="Remove place"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  {currentDay.places.map((place: any, index: number) => (
                    <div key={index} className="bg-white p-3 rounded-lg shadow border-l-4 border-blue-600">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-800 text-sm break-words">{place.name}</h4>
                          <p className="text-xs text-gray-600">{place.category}</p>
                        </div>
                        <button
                          onClick={() => handleRemovePlace(place.name)}
                          disabled={removingPlaceName === place.name}
                          className="text-red-600 hover:bg-red-100 p-1 rounded flex-shrink-0 disabled:opacity-60"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {place.description && (
                        <p className="text-xs text-gray-700 mt-1">{place.description}</p>
                      )}
                      {place.rating && (
                        <div className="flex items-center gap-1 text-xs mt-1">
                          <Star size={12} className="text-yellow-400" />
                          <span>{place.rating}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No places added yet</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
