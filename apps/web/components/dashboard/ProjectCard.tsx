'use client';

import Link from 'next/link';
import { Project } from '@/types/project';
import { Film, Clock, AlertCircle, CheckCircle2, Loader2, Trash2 } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" /> Ready
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-400 border border-violet-500/20">
            <Loader2 className="h-3 w-3 animate-spin" /> Processing
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-400 border border-rose-500/20">
            <AlertCircle className="h-3 w-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-400 border border-slate-500/20">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition-all duration-200 hover:border-slate-700 hover:bg-slate-900 hover:shadow-xl hover:shadow-violet-950/10">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          {getStatusBadge(project.status)}
          <button
            onClick={() => onDelete(project.id)}
            className="text-slate-500 hover:text-rose-400 transition-colors p-1 rounded-md"
            title="Delete Project"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <h3 className="line-clamp-1 text-lg font-semibold text-white group-hover:text-violet-400 transition-colors">
          {project.title}
        </h3>
        <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {new Date(project.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-800/80 pt-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Film className="h-4 w-4 text-violet-500" />
          <span>{project.generated_clips?.length || 0} Clips</span>
        </div>

        <Link
          href={`/dashboard/projects/${project.id}`}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-violet-600 hover:text-white transition-all"
        >
          View Project
        </Link>
      </div>
    </div>
  );
}