'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Edit, MapPin } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(user?.profile?.bio || '');

  useEffect(() => {
    setBio(user?.profile?.bio || '');
  }, [user]);

  const handleSaveBio = () => {
    // TODO: Implement bio update API
    setIsEditing(false);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          {/* Profile Header */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-8">
              {/* Profile Picture */}
              <div>
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-400 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Basic Info */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-800 mb-2">{user?.username}</h1>
                <p className="text-gray-600 mb-4">{user?.email}</p>

                {isEditing ? (
                  <div className="space-y-4">
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveBio}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setBio(user?.profile?.bio || '');
                        }}
                        className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-700 mb-4">{bio || 'No bio yet'}</p>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      <Edit size={18} />
                      Edit Bio
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-gray-200">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">0</div>
                <div className="text-gray-600">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">0</div>
                <div className="text-gray-600">Following</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">0</div>
                <div className="text-gray-600">Trips</div>
              </div>
            </div>
          </div>

          {/* Coming Soon Features */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Profile Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-bold text-gray-800 mb-2">Profile Picture</h3>
                <p className="text-gray-600 text-sm mb-4">Upload and manage your profile photo</p>
                <button className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg cursor-not-allowed">
                  Coming Soon
                </button>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-bold text-gray-800 mb-2">Follow Travelers</h3>
                <p className="text-gray-600 text-sm mb-4">Follow other travelers and see their journeys</p>
                <button className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg cursor-not-allowed">
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
