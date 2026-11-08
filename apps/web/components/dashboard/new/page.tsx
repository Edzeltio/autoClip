import { DashboardHeader } from '@/components/dashboard/Header';
import { VideoImportForm } from '@/components/dashboard/VideoImportForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewProjectPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <DashboardHeader userEmail="user@example.com" />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">Import Video</h1>
          <p className="mt-2 text-sm text-slate-400">
            Paste a YouTube URL or upload a long-form video to automatically extract short clips[cite: 1].
          </p>
        </div>

        <VideoImportForm />
      </main>
    </div>
  );
}