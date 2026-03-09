'use client';

import React from 'react';
import { LoginForm } from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-[#05070d] overflow-hidden flex items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(59,130,246,0.28),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.22),transparent_30%),radial-gradient(circle_at_50%_90%,rgba(14,116,255,0.16),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[1px] -translate-x-1/2 bg-gradient-to-b from-transparent via-sky-300/20 to-transparent" />
      <div className="relative z-10 w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
