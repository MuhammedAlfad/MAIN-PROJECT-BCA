'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  useEffect(() => {
    setUsername(user?.username || '');
    setBio(user?.profile?.bio || '');
    setPhotoUrl(user?.profile?.profile_picture || '');
  }, [user?.username, user?.profile?.bio, user?.profile?.profile_picture]);

  const initial = ((user?.username || user?.email || 'U').charAt(0) || 'U').toUpperCase();

  const handleSave = async () => {
    const nextUsername = username.trim();
    if (!nextUsername) {
      setError('Username cannot be empty.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateProfile({
        username: nextUsername,
        bio: bio.trim(),
        profile_picture: photoUrl.trim(),
      });
      setEditing(false);
      setMessage('Profile updated.');
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0f1216] text-slate-100 py-10 px-4">
        <div className="max-w-4xl mx-auto rounded-3xl border border-white/10 bg-[#12161d]/90 p-6 md:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {user?.profile?.profile_picture ? (
                <img
                  src={user.profile.profile_picture}
                  alt="Profile"
                  className="w-16 h-16 rounded-2xl border border-sky-400/30 object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-sky-500/20 border border-sky-400/30 text-sky-200 text-2xl font-bold flex items-center justify-center">
                  {initial}
                </div>
              )}
              <div>
                <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Profile</div>
                <h1 className="mt-1 text-3xl font-semibold">{user?.username || 'Traveler'}</h1>
                <p className="text-sm text-slate-300">{user?.email || '-'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditing((prev) => !prev);
                if (editing) {
                  setUsername(user?.username || '');
                  setBio(user?.profile?.bio || '');
                  setPhotoUrl(user?.profile?.profile_picture || '');
                }
              }}
              className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              {editing ? 'Close Edit' : 'Edit Profile'}
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {message}
            </div>
          )}

          {editing ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-[0.1em] mb-2">Username</div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={40}
                    className="w-full rounded-lg border border-white/15 bg-[#0d1118] px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/60"
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-[0.1em] mb-2">Photo URL</div>
                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-[#0d1118] px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/60"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 uppercase tracking-[0.1em] mb-2">Bio</div>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  maxLength={400}
                  className="w-full rounded-lg border border-white/15 bg-[#0d1118] px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/60"
                  placeholder="Add your bio"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
                  Save Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setUsername(user?.username || '');
                    setBio(user?.profile?.bio || '');
                    setPhotoUrl(user?.profile?.profile_picture || '');
                  }}
                  className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-[0.1em] mb-1">Username</div>
                <p className="text-sm text-slate-100">{user?.username || 'Traveler'}</p>
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-[0.1em] mb-1">Photo</div>
                <p className="text-sm text-slate-300 break-all">
                  {user?.profile?.profile_picture || 'No profile photo added.'}
                </p>
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-[0.1em] mb-1">Bio</div>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {user?.profile?.bio || 'No bio added yet.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
