'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Plus, Trash2, X } from 'lucide-react';
import { tripsApi, placesApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const TripMap = dynamic(() => import('./TripMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-200 flex items-center justify-center">Loading map...</div>,
});

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated: () => void;
}

interface PlaceSuggestion {
  name: string;
  display_name: string;
  lat: number;
  lon: number;
}

export const CreateTripModal: React.FC<CreateTripModalProps> = ({ isOpen, onClose, onTripCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [startSuggestions, setStartSuggestions] = useState<PlaceSuggestion[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [startCoords, setStartCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [endCoords, setEndCoords] = useState<{ lat: number; lng: number } | null>(null);
  const router = useRouter();

  const searchPlaces = async (query: string) => {
    if (query.length < 2) {
      return [];
    }
    
    setLoadingSuggestions(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`
      );
      const data = await response.json();
      return data.map((item: any) => ({
        name: item.name,
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      }));
    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleStartLocationChange = async (value: string) => {
    setStartLocation(value);
    if (value.length >= 2) {
      const suggestions = await searchPlaces(value);
      setStartSuggestions(suggestions);
      setShowStartSuggestions(true);
    } else {
      setStartSuggestions([]);
      setShowStartSuggestions(false);
      setStartCoords(null);
    }
  };

  const handleEndLocationChange = async (value: string) => {
    setEndLocation(value);
    if (value.length >= 2) {
      const suggestions = await searchPlaces(value);
      setEndSuggestions(suggestions);
      setShowEndSuggestions(true);
    } else {
      setEndSuggestions([]);
      setShowEndSuggestions(false);
      setEndCoords(null);
    }
  };

  const selectStartLocation = (suggestion: PlaceSuggestion) => {
    setStartLocation(suggestion.name);
    setStartCoords({ lat: suggestion.lat, lng: suggestion.lon });
    setShowStartSuggestions(false);
    setStartSuggestions([]);
  };

  const selectEndLocation = (suggestion: PlaceSuggestion) => {
    setEndLocation(suggestion.name);
    setEndCoords({ lat: suggestion.lat, lng: suggestion.lon });
    setShowEndSuggestions(false);
    setEndSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date must be before end date');
      return;
    }

    setIsLoading(true);

    try {
      const response = await tripsApi.createTrip({
        title,
        description,
        start_location: startLocation,
        end_location: endLocation,
        start_date: startDate,
        end_date: endDate,
        is_public: false,
      });

      const tripId = response.data._id;
      
      setTitle('');
      setDescription('');
      setStartLocation('');
      setEndLocation('');
      setStartDate('');
      setEndDate('');
      setStartCoords(null);
      setEndCoords(null);
      onClose();
      onTripCreated();

      router.push(`/trip/${tripId}/edit`);
    } catch (err: any) {
      console.error('Trip creation error:', err);
      const errorMsg = err?.response?.data?.detail || err?.message || 'Failed to create trip';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const mapLocations = [
    ...(startCoords ? [{ name: startLocation, lat: startCoords.lat, lng: startCoords.lng }] : []),
    ...(endCoords ? [{ name: endLocation, lat: endCoords.lat, lng: endCoords.lng }] : []),
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full mx-4 h-[90vh] flex overflow-hidden">
        {/* Left Side - Map */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gray-100">
          <TripMap locations={mapLocations} title="Trip Route Preview" />
          <button
            onClick={onClose}
            className="absolute top-4 left-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 z-10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 overflow-y-auto p-8 flex flex-col">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-6">Create New Trip</h2>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Trip Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Summer Adventure 2026"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What's this trip about?"
                  rows={2}
                />
              </div>

              <div className="relative">
                <label className="block text-gray-700 text-sm font-bold mb-2">Start Location *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={startLocation}
                    onChange={(e) => handleStartLocationChange(e.target.value)}
                    onFocus={() => startSuggestions.length > 0 && setShowStartSuggestions(true)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Where do you start?"
                  />
                  {startCoords && (
                    <div className="text-xs text-green-600 mt-1">
                      ✓ Location selected
                    </div>
                  )}
                  {showStartSuggestions && startSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 shadow-lg z-20 max-h-48 overflow-y-auto">
                      {startSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => selectStartLocation(suggestion)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0 flex items-center gap-2"
                          type="button"
                        >
                          <MapPin size={16} className="text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800">{suggestion.name}</div>
                            <div className="text-xs text-gray-500 truncate">{suggestion.display_name.split(',').slice(-2).join(',')}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="relative">
                <label className="block text-gray-700 text-sm font-bold mb-2">End Location *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={endLocation}
                    onChange={(e) => handleEndLocationChange(e.target.value)}
                    onFocus={() => endSuggestions.length > 0 && setShowEndSuggestions(true)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Where do you end?"
                  />
                  {endCoords && (
                    <div className="text-xs text-green-600 mt-1">
                      ✓ Location selected
                    </div>
                  )}
                  {showEndSuggestions && endSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 shadow-lg z-20 max-h-48 overflow-y-auto">
                      {endSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => selectEndLocation(suggestion)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0 flex items-center gap-2"
                          type="button"
                        >
                          <MapPin size={16} className="text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800">{suggestion.name}</div>
                            <div className="text-xs text-gray-500 truncate">{suggestion.display_name.split(',').slice(-2).join(',')}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">End Date *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-300 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {isLoading ? 'Creating...' : 'Create Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
