'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { tripsApi } from '@/lib/api';
import { TripCard } from '@/components/TripCard';
import { CreateTripModal } from '@/components/CreateTripModal';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Plus, MapPin, Globe } from 'lucide-react';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const [trips, setTrips] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadTrips();
    }
  }, [user]);

  const loadTrips = async () => {
    try {
      setError('');
      const response = await tripsApi.getMyTrips();
      setTrips(response.data.trips);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || error?.message || 'Failed to load trips';
      setError(errorMsg);
      console.error('Failed to load trips:', error);
    } finally {
      setTripsLoading(false);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm('Are you sure you want to delete this trip?')) return;

    try {
      await tripsApi.deleteTrip(tripId);
      setTrips(trips.filter((t) => t._id !== tripId));
    } catch (error) {
      console.error('Failed to delete trip:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-12">
          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-4xl font-bold mb-4">Welcome back, {user?.username}! 👋</h1>
            <p className="text-xl mb-8">Plan your next adventure with ease</p>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-white text-blue-600 font-bold py-3 px-6 rounded-lg hover:bg-gray-100 transition"
            >
              <Plus size={24} />
              Create New Trip
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
              <button
                onClick={() => setError('')}
                className="ml-4 text-red-700 font-bold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Your Trips Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-2">
              <MapPin size={32} />
              Your Trips
            </h2>

            {tripsLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading your trips...</p>
              </div>
            ) : trips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trips.map((trip) => (
                  <TripCard
                    key={trip._id}
                    trip={trip}
                    onDelete={() => handleDeleteTrip(trip._id)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg p-12 text-center">
                <MapPin size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">No trips yet</h3>
                <p className="text-gray-600 mb-6">Create your first trip to get started!</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700"
                >
                  Create Trip
                </button>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/discover"
              className="bg-white rounded-lg p-8 shadow-lg hover:shadow-xl transition text-center"
            >
              <Globe size={48} className="mx-auto text-blue-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-800">Discover Trips</h3>
              <p className="text-gray-600 mt-2">Explore public trips from other travelers</p>
            </Link>

            <Link
              href="/profile"
              className="bg-white rounded-lg p-8 shadow-lg hover:shadow-xl transition text-center"
            >
              <MapPin size={48} className="mx-auto text-indigo-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-800">Your Profile</h3>
              <p className="text-gray-600 mt-2">View and edit your profile information</p>
            </Link>
          </div>
        </div>

        {/* Create Trip Modal */}
        <CreateTripModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onTripCreated={loadTrips}
        />
      </div>
    </ProtectedRoute>
  );
}
