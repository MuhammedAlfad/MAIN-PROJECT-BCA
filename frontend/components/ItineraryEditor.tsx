'use client';

import React, { useState, useEffect } from 'react';
import { tripsApi, placesApi } from '@/lib/api';
import { Plus, Trash2, MapPin, Star, X } from 'lucide-react';
import dynamic from 'next/dynamic';

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
  const [selectedDay, setSelectedDay] = useState(1);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceDesc, setNewPlaceDesc] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showPlaceSuggestions, setShowPlaceSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [dayLocations, setDayLocations] = useState<any[]>([]);

  // Load recommendations when end location changes - based on end location for better suggestions
  useEffect(() => {
    if (trip?.end_location) {
      // Clear old recommendations when end location changes
      setRecommendations([]);
      loadRecommendations(trip.end_location);
    }
  }, [trip?.end_location]);

  // Update day locations for map whenever itinerary changes
  useEffect(() => {
    const currentDay = trip?.itinerary?.[selectedDay - 1];
    if (currentDay?.places && currentDay.places.length > 0) {
      const locations = currentDay.places
        .filter((place: any) => place.coordinates?.lat && place.coordinates?.lng)
        .map((place: any, index: number) => ({
          name: place.name,
          lat: place.coordinates.lat,
          lng: place.coordinates.lng,
        }));
      setDayLocations(locations);
    } else {
      setDayLocations([]);
    }
  }, [trip?.itinerary, selectedDay]);

  const loadRecommendations = async (location: string) => {
    setIsLoadingRecs(true);
    try {
      // Get recommendations for the destination location with cache-busting parameter
      const timestamp = Date.now();
      const response = await placesApi.getRecommendations(location, 15, timestamp);
      const destPlaces = response.data.places || [];
      
      // Also get recommendations for starting location for variety
      let allPlaces = destPlaces;
      if (trip?.start_location && trip.start_location !== location) {
        try {
          const startResponse = await placesApi.getRecommendations(trip.start_location, 8, timestamp);
          const startPlaces = startResponse.data.places || [];
          // Combine with destination places taking more from destination
          allPlaces = [...destPlaces.slice(0, 12), ...startPlaces.slice(0, 3)];
        } catch (error) {
          console.error('Failed to load start location recommendations:', error);
          allPlaces = destPlaces;
        }
      }
      
      setRecommendations(allPlaces);
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
    setPlaceSuggestions([]);
    setShowPlaceSuggestions(false);
  };

  const handleAddPlace = async (place: any) => {
    try {
      await tripsApi.addPlaceToTrip(tripId, selectedDay, place);
      onUpdate();
    } catch (error) {
      console.error('Failed to add place:', error);
    }
  };

  const handleRemovePlace = async (placeName: string) => {
    try {
      await tripsApi.removePlaceFromTrip(tripId, selectedDay, placeName);
      onUpdate();
    } catch (error) {
      console.error('Failed to remove place:', error);
    }
  };

  const handleAddCustomPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaceName) return;

    // Find matching suggestion for coordinates
    const matchingSuggestion = placeSuggestions.find((s) => s.name === newPlaceName);

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
    setPlaceSuggestions([]);
    setShowPlaceSuggestions(false);
  };

  const currentDay = trip?.itinerary?.[selectedDay - 1];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Day Selector */}
      <div className="lg:col-span-1">
        <h3 className="text-xl font-bold mb-4">Select Day</h3>
        <div className="space-y-2">
          {trip?.itinerary?.map((day: any, index: number) => (
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
      <div className="lg:col-span-1 h-96 lg:h-auto">
        <TripMap 
          locations={dayLocations} 
          title={`Day ${selectedDay} Route`}
        />
      </div>

      {/* Itinerary Content */}
      <div className="lg:col-span-1">
        {currentDay && (
          <div>
            <h2 className="text-2xl font-bold mb-6">
              Day {currentDay.day} - {new Date(currentDay.date).toLocaleDateString()}
            </h2>

            {/* Current Places */}
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4">Places ({currentDay.places?.length || 0})</h3>
              {currentDay.places?.length > 0 ? (
                <div className="space-y-2">
                  {currentDay.places.map((place: any, index: number) => (
                    <div key={index} className="bg-white p-3 rounded-lg shadow border-l-4 border-blue-600">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-800 text-sm break-words">{place.name}</h4>
                          <p className="text-xs text-gray-600">{place.category}</p>
                        </div>
                        <button
                          onClick={() => handleRemovePlace(place.name)}
                          className="text-red-600 hover:bg-red-100 p-1 rounded flex-shrink-0"
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

            {/* Add Place with Autocomplete */}
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3">Add Place</h3>
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
            <div>
              <h3 className="text-lg font-bold mb-3">Suggested Places</h3>
              {isLoadingRecs ? (
                <p className="text-sm text-gray-600">Loading...</p>
              ) : recommendations.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {recommendations.map((place: any, index: number) => (
                    <div key={index} className="bg-white p-2 rounded-lg shadow hover:shadow-md transition text-sm">
                      <div className="flex gap-2">
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
                        <button
                          onClick={() => handleAddPlace(place)}
                          className="bg-blue-600 text-white p-1.5 rounded hover:bg-blue-700 flex-shrink-0"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No recommendations available</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
