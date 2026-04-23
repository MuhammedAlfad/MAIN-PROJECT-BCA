'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Download,
  FileText,
  Globe2,
  ImageIcon,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import { authApi, tripsApi, type AdminUser, type AdminUsersResponse } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';

const tripId = (trip: any) => trip?._id || trip?.id || '';
const fmtDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : '-');
const fmtDateTime = (value?: string) => (value ? new Date(value).toLocaleString() : '-');

const countPlaces = (trip: any) =>
  (trip?.itinerary || []).reduce((sum: number, day: any) => sum + ((day?.places || []).length || 0), 0);

const csvValue = (value: unknown) => {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const getInitials = (user?: AdminUser | null) => {
  const name = `${user?.username || ''}`.trim();
  if (!name) return 'U';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

type AdminSummary = {
  total_trips: number;
  public_trips: number;
  private_trips: number;
  total_days: number;
  total_places: number;
  unique_users: number;
};

type DestinationCount = { name: string; count: number };
type AdminUsersSummary = AdminUsersResponse['summary'];

type UserFormState = {
  email: string;
  username: string;
  bio: string;
  profile_picture: string;
};

const emptyTripSummary: AdminSummary = {
  total_trips: 0,
  public_trips: 0,
  private_trips: 0,
  total_days: 0,
  total_places: 0,
  unique_users: 0,
};

const emptyUsersSummary: AdminUsersSummary = {
  total_users: 0,
  admin_users: 0,
  regular_users: 0,
  total_trips: 0,
};

const emptyUserForm: UserFormState = {
  email: '',
  username: '',
  bio: '',
  profile_picture: '',
};

const createUserForm = (user?: AdminUser | null): UserFormState => ({
  email: user?.email || '',
  username: user?.username || '',
  bio: user?.profile?.bio || '',
  profile_picture: user?.profile?.profile_picture || '',
});

const normalizeUserForm = (form: UserFormState) => ({
  email: form.email.trim().toLowerCase(),
  username: form.username.trim(),
  bio: form.bio.trim(),
  profile_picture: form.profile_picture.trim(),
});

export default function AdminPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const isAdmin = (user?.email || '').toLowerCase() === 'admin@gmail.com';

  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<AdminSummary>(emptyTripSummary);
  const [topDestinations, setTopDestinations] = useState<DestinationCount[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [tripError, setTripError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [query, setQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');

  const [userRows, setUserRows] = useState<AdminUser[]>([]);
  const [userSummary, setUserSummary] = useState<AdminUsersSummary>(emptyUsersSummary);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userError, setUserError] = useState('');
  const [userNotice, setUserNotice] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm);
  const [savingUserId, setSavingUserId] = useState('');
  const [deletingUserId, setDeletingUserId] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadAdminData = async () => {
    setTripError('');
    setUserError('');
    setLoadingTrips(true);
    setLoadingUsers(true);

    const [reportResult, usersResult] = await Promise.allSettled([
      tripsApi.getAdminReport(),
      authApi.getAdminUsers(),
    ]);

    if (reportResult.status === 'fulfilled') {
      setRows(reportResult.value.data?.trips || []);
      setSummary(reportResult.value.data?.summary || emptyTripSummary);
      setTopDestinations(reportResult.value.data?.top_destinations || []);
    } else {
      const message =
        (reportResult.reason as any)?.response?.data?.detail ||
        (reportResult.reason as any)?.message ||
        'Failed to load admin report data.';
      setTripError(message);
      setRows([]);
      setSummary(emptyTripSummary);
      setTopDestinations([]);
    }

    if (usersResult.status === 'fulfilled') {
      setUserRows(usersResult.value.data?.users || []);
      setUserSummary(usersResult.value.data?.summary || emptyUsersSummary);
    } else {
      const message =
        (usersResult.reason as any)?.response?.data?.detail ||
        (usersResult.reason as any)?.message ||
        'Failed to load admin users.';
      setUserError(message);
      setUserRows([]);
      setUserSummary(emptyUsersSummary);
    }

    setLoadingTrips(false);
    setLoadingUsers(false);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    if (!isAdmin) {
      setRows([]);
      setSummary(emptyTripSummary);
      setTopDestinations([]);
      setUserRows([]);
      setUserSummary(emptyUsersSummary);
      setLoadingTrips(false);
      setLoadingUsers(false);
      return;
    }
    loadAdminData();
  }, [isAdmin]);

  useEffect(() => {
    if (!userRows.length) {
      setSelectedUserId('');
      return;
    }
    if (!selectedUserId || !userRows.some((entry) => entry.id === selectedUserId)) {
      setSelectedUserId(userRows[0].id);
    }
  }, [userRows, selectedUserId]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((trip) => {
      const visOk =
        visibilityFilter === 'all' ||
        (visibilityFilter === 'public' && !!trip?.is_public) ||
        (visibilityFilter === 'private' && !trip?.is_public);
      if (!visOk) return false;
      if (!q) return true;
      return (
        String(trip?.title || '').toLowerCase().includes(q) ||
        String(trip?.start_location || '').toLowerCase().includes(q) ||
        String(trip?.end_location || '').toLowerCase().includes(q) ||
        String(trip?.user_id || '').toLowerCase().includes(q)
      );
    });
  }, [rows, query, visibilityFilter]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    return userRows.filter((entry) => {
      if (!q) return true;
      return (
        String(entry.username || '').toLowerCase().includes(q) ||
        String(entry.email || '').toLowerCase().includes(q) ||
        String(entry.id || '').toLowerCase().includes(q) ||
        String(entry.profile?.bio || '').toLowerCase().includes(q)
      );
    });
  }, [userRows, userQuery]);

  const selectedUser = useMemo(
    () => userRows.find((entry) => entry.id === selectedUserId) || null,
    [userRows, selectedUserId]
  );

  useEffect(() => {
    setUserForm(createUserForm(selectedUser));
  }, [
    selectedUser?.id,
    selectedUser?.email,
    selectedUser?.username,
    selectedUser?.profile?.bio,
    selectedUser?.profile?.profile_picture,
  ]);

  const normalizedSelectedUser = selectedUser
    ? {
        email: (selectedUser.email || '').trim().toLowerCase(),
        username: (selectedUser.username || '').trim(),
        bio: (selectedUser.profile?.bio || '').trim(),
        profile_picture: (selectedUser.profile?.profile_picture || '').trim(),
      }
    : null;

  const normalizedForm = normalizeUserForm(userForm);
  const isUserFormDirty = !!selectedUser && (
    normalizedSelectedUser?.email !== normalizedForm.email ||
    normalizedSelectedUser?.username !== normalizedForm.username ||
    normalizedSelectedUser?.bio !== normalizedForm.bio ||
    normalizedSelectedUser?.profile_picture !== normalizedForm.profile_picture
  );

  const publicRatio = summary.total_trips > 0
    ? Math.round((summary.public_trips / summary.total_trips) * 100)
    : 0;

  const activeUsers = useMemo(
    () => userRows.filter((entry) => (entry.trip_count || 0) > 0).length,
    [userRows]
  );

  const selectedUserBusy = !!selectedUser && (savingUserId === selectedUser.id || deletingUserId === selectedUser.id);

  const handleRefresh = async () => {
    setUserNotice('');
    await loadAdminData();
  };

  const downloadCsvReport = () => {
    setDownloading(true);
    try {
      const headers = [
        'trip_id',
        'title',
        'start_location',
        'end_location',
        'start_date',
        'end_date',
        'days',
        'total_places',
        'is_public',
        'user_id',
        'created_at',
        'updated_at',
        'description',
      ];

      const lines = [headers.join(',')];
      rows.forEach((trip) => {
        const data = [
          tripId(trip),
          trip?.title || '',
          trip?.start_location || '',
          trip?.end_location || '',
          trip?.start_date || '',
          trip?.end_date || '',
          (trip?.itinerary || []).length || 0,
          countPlaces(trip),
          trip?.is_public ? 'true' : 'false',
          trip?.user_id || '',
          trip?.created_at || '',
          trip?.updated_at || '',
          trip?.description || '',
        ].map(csvValue);

        lines.push(data.join(','));
      });

      const csv = lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `tripplan_admin_report_${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    if (!isUserFormDirty) {
      setUserNotice('No changes to save for this user.');
      return;
    }

    setUserError('');
    setUserNotice('');
    setSavingUserId(selectedUser.id);

    try {
      const response = await authApi.updateAdminUser(selectedUser.id, {
        email: normalizedForm.email,
        username: normalizedForm.username,
        bio: normalizedForm.bio,
        profile_picture: normalizedForm.profile_picture || null,
      });

      const updatedUser = response.data;
      setUserRows((current) =>
        current.map((entry) => (entry.id === updatedUser.id ? updatedUser : entry))
      );
      setUserNotice(`Saved changes for ${updatedUser.username || updatedUser.email}.`);
    } catch (error: any) {
      setUserError(error?.response?.data?.detail || error?.message || 'Failed to update user.');
    } finally {
      setSavingUserId('');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || selectedUser.is_admin) return;

    const confirmed = window.confirm(
      `Delete ${selectedUser.email}? This will also remove ${selectedUser.trip_count || 0} trip(s).`
    );
    if (!confirmed) return;

    setUserError('');
    setUserNotice('');
    setDeletingUserId(selectedUser.id);

    try {
      const response = await authApi.deleteAdminUser(selectedUser.id);
      const deletedTripCount = response.data?.deleted_trip_count ?? selectedUser.trip_count ?? 0;
      const deletedLabel = selectedUser.username || selectedUser.email;
      await loadAdminData();
      setUserNotice(`Deleted ${deletedLabel} and removed ${deletedTripCount} trip(s).`);
    } catch (error: any) {
      setUserError(error?.response?.data?.detail || error?.message || 'Failed to delete user.');
    } finally {
      setDeletingUserId('');
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0d13] text-slate-100">
        <div className="mx-auto max-w-7xl px-5 py-5">
          {!isAdmin ? (
            <div className="mx-auto mt-14 max-w-xl rounded-2xl border border-red-400/40 bg-red-500/10 p-6 text-center">
              <div className="text-lg font-semibold text-red-200">Admin Access Required</div>
              <p className="mt-2 text-sm text-red-100/90">
                This page is only available for `admin@gmail.com`.
              </p>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10"
              >
                <ArrowLeft size={15} />
                Back to Home
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-2xl border border-white/10 bg-[#111826]/90 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => router.push('/')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
                    >
                      <ArrowLeft size={15} />
                      Back
                    </button>
                    <div className="inline-flex items-center gap-2 rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-200">
                      <ShieldCheck size={16} />
                      Admin Control Center
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRefresh}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
                    >
                      <RefreshCw size={14} />
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={downloadCsvReport}
                      disabled={rows.length === 0 || downloading}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-50"
                    >
                      <Download size={14} />
                      {downloading ? 'Preparing...' : 'Download Report'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        router.push('/login');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-400"
                    >
                      <LogOut size={14} />
                      Logout
                    </button>
                  </div>
                </div>

                <div className="mt-2 text-xs text-slate-400">
                  Logged in as {user?.email || user?.username || 'admin'} | Last updated {lastUpdated ? lastUpdated.toLocaleTimeString() : '-'}
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
                <div className="rounded-xl border border-white/10 bg-[#121a2a] p-3">
                  <div className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Trips</div>
                  <div className="mt-1 text-2xl font-semibold">{summary.total_trips}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#121a2a] p-3">
                  <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.1em] text-slate-400">
                    <Globe2 size={12} />
                    Public
                  </div>
                  <div className="mt-1 text-2xl font-semibold">{summary.public_trips}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#121a2a] p-3">
                  <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.1em] text-slate-400">
                    <Lock size={12} />
                    Private
                  </div>
                  <div className="mt-1 text-2xl font-semibold">{summary.private_trips}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#121a2a] p-3">
                  <div className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Days</div>
                  <div className="mt-1 text-2xl font-semibold">{summary.total_days}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#121a2a] p-3">
                  <div className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Stops</div>
                  <div className="mt-1 text-2xl font-semibold">{summary.total_places}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#121a2a] p-3">
                  <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.1em] text-slate-400">
                    <Users size={12} />
                    Trip Owners
                  </div>
                  <div className="mt-1 text-2xl font-semibold">{summary.unique_users}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="space-y-4 lg:col-span-4">
                  <div className="rounded-2xl border border-white/10 bg-[#111826]/90 p-4">
                    <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold">
                      <BarChart3 size={15} />
                      Visibility Split
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-emerald-400"
                        style={{ width: `${publicRatio}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      Public {publicRatio}% | Private {100 - publicRatio}%
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#111826]/90 p-4">
                    <div className="mb-3 text-sm font-semibold">Top Destinations</div>
                    {topDestinations.length > 0 ? (
                      <div className="space-y-2">
                        {topDestinations.map((row, idx) => {
                          const base = topDestinations[0]?.count || 1;
                          const width = Math.max(12, Math.round((row.count / base) * 100));
                          return (
                            <div key={`${row.name}-${idx}`}>
                              <div className="flex items-center justify-between text-xs text-slate-300">
                                <span className="truncate pr-3">{row.name}</span>
                                <span>{row.count}</span>
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                                <div className="h-full bg-sky-400" style={{ width: `${width}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400">No destination data available.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#111826]/90 p-4 lg:col-span-8">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold">Trips Explorer</div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Search title, route or user"
                          className="rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-3 text-xs text-slate-100 outline-none focus:border-sky-400/50"
                        />
                      </div>
                      <select
                        value={visibilityFilter}
                        onChange={(event) => setVisibilityFilter(event.target.value as 'all' | 'public' | 'private')}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-100 outline-none"
                      >
                        <option value="all">All</option>
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                  </div>

                  {tripError && (
                    <div className="mb-3 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                      {tripError}
                    </div>
                  )}

                  {loadingTrips ? (
                    <div className="py-6 text-sm text-slate-400">Loading report data...</div>
                  ) : filteredRows.length > 0 ? (
                    <div className="max-h-[65vh] overflow-auto rounded-lg border border-white/10">
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-[#0f1520] text-slate-300">
                          <tr>
                            <th className="border-b border-white/10 px-3 py-2 text-left">Title</th>
                            <th className="border-b border-white/10 px-3 py-2 text-left">Route</th>
                            <th className="border-b border-white/10 px-3 py-2 text-left">Dates</th>
                            <th className="border-b border-white/10 px-3 py-2 text-left">Days</th>
                            <th className="border-b border-white/10 px-3 py-2 text-left">Stops</th>
                            <th className="border-b border-white/10 px-3 py-2 text-left">Public</th>
                            <th className="border-b border-white/10 px-3 py-2 text-left">User</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRows.map((trip, idx) => (
                            <tr key={`${tripId(trip)}-${idx}`} className="odd:bg-white/[0.02]">
                              <td className="border-b border-white/5 px-3 py-2 text-slate-100">{trip?.title || '-'}</td>
                              <td className="border-b border-white/5 px-3 py-2 text-slate-300">
                                {trip?.start_location || '-'} to {trip?.end_location || '-'}
                              </td>
                              <td className="border-b border-white/5 px-3 py-2 text-slate-300">
                                {fmtDate(trip?.start_date)} to {fmtDate(trip?.end_date)}
                              </td>
                              <td className="border-b border-white/5 px-3 py-2 text-slate-300">{(trip?.itinerary || []).length || 0}</td>
                              <td className="border-b border-white/5 px-3 py-2 text-slate-300">{countPlaces(trip)}</td>
                              <td className="border-b border-white/5 px-3 py-2 text-slate-300">{trip?.is_public ? 'Yes' : 'No'}</td>
                              <td className="border-b border-white/5 px-3 py-2 text-slate-300">{trip?.user_id || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-6 text-sm text-slate-400">No matching trips found.</div>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-[#111826]/90 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 text-sm font-semibold">
                      <Users size={16} />
                      User Management
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      View user counts, inspect profiles, edit details, and remove accounts from one place.
                    </div>
                  </div>

                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={userQuery}
                      onChange={(event) => setUserQuery(event.target.value)}
                      placeholder="Search email, username, bio or id"
                      className="w-full min-w-[250px] rounded-lg border border-white/10 bg-white/5 py-2 pl-8 pr-3 text-xs text-slate-100 outline-none focus:border-sky-400/50"
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-[#121a2a] p-3">
                    <div className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Total Users</div>
                    <div className="mt-1 text-2xl font-semibold">{userSummary.total_users}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#121a2a] p-3">
                    <div className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Regular Users</div>
                    <div className="mt-1 text-2xl font-semibold">{userSummary.regular_users}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#121a2a] p-3">
                    <div className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Admins</div>
                    <div className="mt-1 text-2xl font-semibold">{userSummary.admin_users}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#121a2a] p-3">
                    <div className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Users With Trips</div>
                    <div className="mt-1 text-2xl font-semibold">{activeUsers}</div>
                  </div>
                </div>

                {userNotice && (
                  <div className="mt-4 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                    {userNotice}
                  </div>
                )}

                {userError && (
                  <div className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {userError}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_360px]">
                  <div className="rounded-2xl border border-white/10 bg-[#0f1520]/80 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">
                        Users Directory
                      </div>
                      <div className="text-xs text-slate-400">
                        Showing {filteredUsers.length} of {userRows.length}
                      </div>
                    </div>

                    {loadingUsers ? (
                      <div className="py-6 text-sm text-slate-400">Loading users...</div>
                    ) : filteredUsers.length > 0 ? (
                      <div className="max-h-[65vh] overflow-auto rounded-lg border border-white/10">
                        <table className="min-w-full text-sm">
                          <thead className="sticky top-0 bg-[#0b111b] text-slate-300">
                            <tr>
                              <th className="border-b border-white/10 px-3 py-2 text-left">User</th>
                              <th className="border-b border-white/10 px-3 py-2 text-left">Email</th>
                              <th className="border-b border-white/10 px-3 py-2 text-left">Trips</th>
                              <th className="border-b border-white/10 px-3 py-2 text-left">Joined</th>
                              <th className="border-b border-white/10 px-3 py-2 text-left">Role</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUsers.map((entry) => {
                              const active = entry.id === selectedUserId;
                              return (
                                <tr
                                  key={entry.id}
                                  onClick={() => {
                                    setSelectedUserId(entry.id);
                                    setUserNotice('');
                                    setUserError('');
                                  }}
                                  className={`cursor-pointer transition ${active ? 'bg-sky-500/10' : 'odd:bg-white/[0.02] hover:bg-white/[0.04]'}`}
                                >
                                  <td className="border-b border-white/5 px-3 py-2 text-slate-100">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/15 text-xs font-semibold text-sky-200">
                                        {getInitials(entry)}
                                      </div>
                                      <div>
                                        <div className="font-medium">{entry.username || '-'}</div>
                                        <div className="text-xs text-slate-400">{entry.id}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="border-b border-white/5 px-3 py-2 text-slate-300">{entry.email || '-'}</td>
                                  <td className="border-b border-white/5 px-3 py-2 text-slate-300">{entry.trip_count || 0}</td>
                                  <td className="border-b border-white/5 px-3 py-2 text-slate-300">{fmtDate(entry.created_at)}</td>
                                  <td className="border-b border-white/5 px-3 py-2 text-slate-300">
                                    <span className={`rounded-full px-2 py-1 text-[11px] ${entry.is_admin ? 'bg-amber-500/15 text-amber-200' : 'bg-white/10 text-slate-300'}`}>
                                      {entry.is_admin ? 'Admin' : 'User'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-6 text-sm text-slate-400">No users matched your search.</div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#0f1520]/80 p-4">
                    {selectedUser ? (
                      <>
                        <div className="flex items-start gap-3">
                          {selectedUser.profile?.profile_picture ? (
                            <img
                              src={selectedUser.profile.profile_picture}
                              alt={selectedUser.username}
                              className="h-14 w-14 rounded-full border border-white/10 object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-500/15 text-sm font-semibold text-sky-200">
                              {getInitials(selectedUser)}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-lg font-semibold text-slate-100">
                                {selectedUser.username || 'Unnamed User'}
                              </div>
                              <span className={`rounded-full px-2 py-1 text-[11px] ${selectedUser.is_admin ? 'bg-amber-500/15 text-amber-200' : 'bg-white/10 text-slate-300'}`}>
                                {selectedUser.is_admin ? 'Admin account' : 'User account'}
                              </span>
                            </div>
                            <div className="mt-1 truncate text-sm text-slate-400">{selectedUser.email}</div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-slate-400">
                              <UserRound size={12} />
                              User ID
                            </div>
                            <div className="mt-1 break-all text-sm text-slate-200">{selectedUser.id}</div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-slate-400">
                              <CalendarDays size={12} />
                              Joined
                            </div>
                            <div className="mt-1 text-sm text-slate-200">{fmtDateTime(selectedUser.created_at)}</div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-slate-400">
                              <BarChart3 size={12} />
                              Trips
                            </div>
                            <div className="mt-1 text-sm text-slate-200">{selectedUser.trip_count || 0}</div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-slate-400">
                              <Users size={12} />
                              Followers
                            </div>
                            <div className="mt-1 text-sm text-slate-200">{selectedUser.profile?.followers || 0}</div>
                          </div>
                        </div>

                        <div className="mt-5 space-y-4">
                          <div>
                            <label className="mb-1 inline-flex items-center gap-2 text-xs font-medium text-slate-300">
                              <Mail size={12} />
                              Email
                            </label>
                            <input
                              type="email"
                              value={userForm.email}
                              disabled={selectedUser.is_admin || selectedUserBusy}
                              onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
                              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/50 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </div>

                          <div>
                            <label className="mb-1 inline-flex items-center gap-2 text-xs font-medium text-slate-300">
                              <UserRound size={12} />
                              Username
                            </label>
                            <input
                              type="text"
                              value={userForm.username}
                              disabled={selectedUserBusy}
                              onChange={(event) => setUserForm((current) => ({ ...current, username: event.target.value }))}
                              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/50 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </div>

                          <div>
                            <label className="mb-1 inline-flex items-center gap-2 text-xs font-medium text-slate-300">
                              <ImageIcon size={12} />
                              Profile Picture URL
                            </label>
                            <input
                              type="text"
                              value={userForm.profile_picture}
                              disabled={selectedUserBusy}
                              onChange={(event) => setUserForm((current) => ({ ...current, profile_picture: event.target.value }))}
                              placeholder="https://example.com/avatar.png"
                              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/50 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </div>

                          <div>
                            <label className="mb-1 inline-flex items-center gap-2 text-xs font-medium text-slate-300">
                              <FileText size={12} />
                              Bio
                            </label>
                            <textarea
                              value={userForm.bio}
                              disabled={selectedUserBusy}
                              onChange={(event) => setUserForm((current) => ({ ...current, bio: event.target.value }))}
                              rows={4}
                              className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/50 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleSaveUser}
                            disabled={!isUserFormDirty || selectedUserBusy}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Save size={14} />
                            {savingUserId === selectedUser.id ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setUserForm(createUserForm(selectedUser));
                              setUserNotice('');
                              setUserError('');
                            }}
                            disabled={!isUserFormDirty || selectedUserBusy}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <RefreshCw size={14} />
                            Reset
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteUser}
                            disabled={selectedUser.is_admin || selectedUserBusy}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                            {deletingUserId === selectedUser.id ? 'Deleting...' : 'Delete User'}
                          </button>
                        </div>

                        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-400">
                          {selectedUser.is_admin
                            ? 'The built-in admin account can be edited, but its email address cannot be changed or deleted.'
                            : 'Deleting a user also deletes their trips so the trip report and user count stay in sync.'}
                        </div>
                      </>
                    ) : (
                      <div className="py-10 text-center text-sm text-slate-400">
                        Select a user to view details and manage the account.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
