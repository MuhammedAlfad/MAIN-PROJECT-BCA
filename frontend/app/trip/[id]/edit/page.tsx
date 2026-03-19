'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { tripsApi } from '@/lib/api';
import { ItineraryEditor } from '@/components/ItineraryEditor';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ChevronLeft } from 'lucide-react';

export default function EditTripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  const loadTrip = async () => {
    try {
      const response = await tripsApi.getTrip(tripId);
      setTrip(response.data);
    } catch (error) {
      console.error('Failed to load trip:', error);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-xl font-semibold">Loading trip...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-lg sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <ChevronLeft size={24} />
                Back
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">{trip?.title}</h1>
                <p className="text-gray-600">
                  {trip?.start_location} → {trip?.end_location}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
              Publish settings now live in the Finished Trip module.
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-12">
          {trip && (
            <ItineraryEditor
              tripId={tripId}
              trip={trip}
              onUpdate={loadTrip}
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
