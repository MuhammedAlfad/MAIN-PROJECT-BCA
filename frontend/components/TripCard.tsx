'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Edit, Trash2, Eye, Lock } from 'lucide-react';

interface TripCardProps {
  trip: any;
  onDelete?: () => void;
}

export const TripCard: React.FC<TripCardProps> = ({ trip, onDelete }) => {
  const startDate = new Date(trip.start_date).toLocaleDateString();
  const endDate = new Date(trip.end_date).toLocaleDateString();

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition">
      {/* Cover Image */}
      <div className="h-40 bg-gradient-to-r from-blue-400 to-blue-600 relative">
        {trip.cover_image && (
          <img src={trip.cover_image} alt={trip.title} className="w-full h-full object-cover" />
        )}
        <div className="absolute top-4 right-4">
          {trip.is_public ? (
            <Eye className="text-white" size={20} />
          ) : (
            <Lock className="text-white" size={20} />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-xl font-bold text-gray-800 mb-2">{trip.title}</h3>
        
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <MapPin size={16} />
          <span>{trip.start_location} → {trip.end_location}</span>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {startDate} to {endDate}
        </p>

        {trip.description && (
          <p className="text-sm text-gray-700 mb-4 line-clamp-2">{trip.description}</p>
        )}

        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          📍 {trip.itinerary?.length || 0} days
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            href={`/trip/${trip._id}/edit`}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
          >
            <Edit size={16} />
            Edit
          </Link>
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition"
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
