export type ProjectStatus = 'draft' | 'processing' | 'completed' | 'failed';

export interface Project {
  id: string;
  user_id: string;
  title: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  source_videos?: {
    storage_path: string;
    duration: number | null;
    source_type: 'youtube' | 'upload' | 'cloud';
  }[];
  generated_clips?: { id: string }[];
}