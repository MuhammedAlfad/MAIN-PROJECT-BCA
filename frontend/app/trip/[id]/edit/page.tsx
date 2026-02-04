'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { tripsApi } from '@/lib/api';
import { ItineraryEditor } from '@/components/ItineraryEditor';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Save, ChevronLeft } from 'lucide-react';

export default function EditTripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  const loadTrip = async () => {
    try {
      const response = await tripsApi.getTrip(tripId);
      setTrip(response.data);
      setIsPublic(response.data.is_public);
    } catch (error) {
      console.error('Failed to load trip:', error);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await tripsApi.updateTrip(tripId, { is_public: isPublic });
      alert('Trip saved successfully!');
    } catch (error) {
      console.error('Failed to save trip:', error);
      alert('Failed to save trip');
    } finally {
      setIsSaving(false);
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

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">Make Public</span>
              </label>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                <Save size={20} />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
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
