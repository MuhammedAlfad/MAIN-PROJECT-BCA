'use client';

import React, { useState, useEffect } from 'react';
import { tripsApi } from '@/lib/api';
import { TripCard } from '@/components/TripCard';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Globe, Search } from 'lucide-react';

export default function DiscoverPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPublicTrips();
  }, []);

  const loadPublicTrips = async () => {
    try {
      const response = await tripsApi.getPublicTrips(20, 0);
      setTrips(response.data.trips);
    } catch (error) {
      console.error('Failed to load trips:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTrips = trips.filter((trip) =>
    trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trip.start_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trip.end_location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-12">
          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-4xl font-bold mb-4 flex items-center gap-2">
              <Globe size={36} />
              Discover Trips
            </h1>
            <p className="text-xl">Explore published journeys that travelers have chosen to share</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Search Bar */}
          <div className="mb-12">
            <div className="relative">
              <Search className="absolute left-4 top-3 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search trips by location or title..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Trips Grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading trips...</p>
            </div>
          ) : filteredTrips.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTrips.map((trip) => (
                <TripCard key={trip._id} trip={trip} mode="discover" />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg p-12 text-center">
              <Globe size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">No published trips found</h3>
              <p className="text-gray-600">Try adjusting your search</p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
