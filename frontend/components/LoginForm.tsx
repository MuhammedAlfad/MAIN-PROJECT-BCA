'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (email.trim().toLowerCase() === 'admin@gmail.com') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-white/15 bg-[#0b1018]/85 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-sm p-6 md:p-7">
        <h1 className="text-3xl font-semibold text-center text-slate-100 tracking-tight">Sign In To Your Account</h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Welcome back. Enter your credentials to continue.
        </p>

        {error && (
          <div className="mt-5 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5">
          <div className="mb-3">
            <label className="block text-xs uppercase tracking-[0.1em] text-slate-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-white/20 bg-[#070c14] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-400/60"
              placeholder="Enter your email"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs uppercase tracking-[0.1em] text-slate-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-white/20 bg-[#070c14] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-400/60"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 py-2.5 px-4 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-400">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-sky-300 hover:text-sky-200 underline-offset-2 hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};
