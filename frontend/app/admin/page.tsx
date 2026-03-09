'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  Download,
  Globe2,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { tripsApi } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';

const tripId = (trip: any) => trip?._id || trip?.id || '';
const fmtDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : '-');

const countPlaces = (trip: any) =>
  (trip?.itinerary || []).reduce((sum: number, day: any) => sum + ((day?.places || []).length || 0), 0);

const csvValue = (value: unknown) => {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
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

export default function AdminPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const isAdmin = (user?.email || '').toLowerCase() === 'admin@gmail.com';

  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<AdminSummary>({
    total_trips: 0,
    public_trips: 0,
    private_trips: 0,
    total_days: 0,
    total_places: 0,
    unique_users: 0,
  });
  const [topDestinations, setTopDestinations] = useState<DestinationCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [query, setQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadReportData = async () => {
    try {
      setError('');
      setLoading(true);
      const res = await tripsApi.getAdminReport();
      setRows(res.data?.trips || []);
      setSummary(
        res.data?.summary || {
          total_trips: 0,
          public_trips: 0,
          private_trips: 0,
          total_days: 0,
          total_places: 0,
          unique_users: 0,
        }
      );
      setTopDestinations(res.data?.top_destinations || []);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load admin report data.');
      setRows([]);
      setTopDestinations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setRows([]);
      setLoading(false);
      return;
    }
    loadReportData();
  }, [isAdmin]);

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

  const publicRatio = summary.total_trips > 0
    ? Math.round((summary.public_trips / summary.total_trips) * 100)
    : 0;

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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0d13] text-slate-100">
        <div className="max-w-7xl mx-auto px-5 py-5">
          {!isAdmin ? (
            <div className="max-w-xl mx-auto mt-14 rounded-2xl border border-red-400/40 bg-red-500/10 p-6 text-center">
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
              <div className="rounded-2xl border border-white/10 bg-[#111826]/90 px-4 py-3 mb-4">
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
                    <div className="inline-flex items-center gap-2 rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sky-200 text-sm">
                      <ShieldCheck size={16} />
                      Admin Control Center
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={loadReportData}
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
                  Logged in as {user?.email || user?.username || 'admin'} • Last updated {lastUpdated ? lastUpdated.toLocaleTimeString() : '-'}
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
                <div className="rounded-xl border border-white/10 bg-[#121a2a] p-3">
                  <div className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Trips</div>
                  <div className="mt-1 text-2xl font-semibold">{summary.total_trips}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#121a2a] p-3">
                  <div className="text-[11px] uppercase tracking-[0.1em] text-slate-400 inline-flex items-center gap-1">
                    <Globe2 size={12} />
                    Public
                  </div>
                  <div className="mt-1 text-2xl font-semibold">{summary.public_trips}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#121a2a] p-3">
                  <div className="text-[11px] uppercase tracking-[0.1em] text-slate-400 inline-flex items-center gap-1">
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
                  <div className="text-[11px] uppercase tracking-[0.1em] text-slate-400 inline-flex items-center gap-1">
                    <Users size={12} />
                    Users
                  </div>
                  <div className="mt-1 text-2xl font-semibold">{summary.unique_users}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-4 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-[#111826]/90 p-4">
                    <div className="text-sm font-semibold mb-3 inline-flex items-center gap-2">
                      <BarChart3 size={15} />
                      Visibility Split
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-emerald-400"
                        style={{ width: `${publicRatio}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      Public {publicRatio}% • Private {100 - publicRatio}%
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#111826]/90 p-4">
                    <div className="text-sm font-semibold mb-3">Top Destinations</div>
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
                              <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
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

                <div className="lg:col-span-8 rounded-2xl border border-white/10 bg-[#111826]/90 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="text-sm font-semibold">Trips Explorer</div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search title, route or user"
                          className="rounded-lg border border-white/10 bg-white/5 pl-8 pr-3 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-400/50"
                        />
                      </div>
                      <select
                        value={visibilityFilter}
                        onChange={(e) => setVisibilityFilter(e.target.value as 'all' | 'public' | 'private')}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-100 outline-none"
                      >
                        <option value="all">All</option>
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 mb-3">
                      {error}
                    </div>
                  )}

                  {loading ? (
                    <div className="text-sm text-slate-400 py-6">Loading report data...</div>
                  ) : filteredRows.length > 0 ? (
                    <div className="overflow-auto max-h-[65vh] rounded-lg border border-white/10">
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-[#0f1520] text-slate-300">
                          <tr>
                            <th className="text-left px-3 py-2 border-b border-white/10">Title</th>
                            <th className="text-left px-3 py-2 border-b border-white/10">Route</th>
                            <th className="text-left px-3 py-2 border-b border-white/10">Dates</th>
                            <th className="text-left px-3 py-2 border-b border-white/10">Days</th>
                            <th className="text-left px-3 py-2 border-b border-white/10">Stops</th>
                            <th className="text-left px-3 py-2 border-b border-white/10">Public</th>
                            <th className="text-left px-3 py-2 border-b border-white/10">User</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRows.map((trip, idx) => (
                            <tr key={`${tripId(trip)}-${idx}`} className="odd:bg-white/[0.02]">
                              <td className="px-3 py-2 border-b border-white/5 text-slate-100">{trip?.title || '-'}</td>
                              <td className="px-3 py-2 border-b border-white/5 text-slate-300">
                                {trip?.start_location || '-'} to {trip?.end_location || '-'}
                              </td>
                              <td className="px-3 py-2 border-b border-white/5 text-slate-300">
                                {fmtDate(trip?.start_date)} to {fmtDate(trip?.end_date)}
                              </td>
                              <td className="px-3 py-2 border-b border-white/5 text-slate-300">{(trip?.itinerary || []).length || 0}</td>
                              <td className="px-3 py-2 border-b border-white/5 text-slate-300">{countPlaces(trip)}</td>
                              <td className="px-3 py-2 border-b border-white/5 text-slate-300">{trip?.is_public ? 'Yes' : 'No'}</td>
                              <td className="px-3 py-2 border-b border-white/5 text-slate-300">{trip?.user_id || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400 py-6">No matching trips found.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
