'use client';

import Link from 'next/link';
import { Video, Plus, User, LogOut } from 'lucide-react';

export function DashboardHeader({ userEmail }: { userEmail: string }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white shadow-lg shadow-violet-600/30">
              <Video className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              ClipForge<span className="text-violet-500">AI</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/new"
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-violet-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>New Project</span>
          </Link>

          <div className="flex items-center gap-2 border-l border-slate-800 pl-4 text-slate-300">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400">
              <User className="h-4 w-4" />
            </div>
            <span className="hidden text-sm font-medium sm:inline">{userEmail}</span>
          </div>
        </div>
      </div>
    </header>
  );
}