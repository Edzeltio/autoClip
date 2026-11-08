-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  tier text default 'free' check (tier in ('free', 'pro', 'enterprise')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Projects Table
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  status text default 'draft' check (status in ('draft', 'processing', 'completed', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Source Videos Table
create table public.source_videos (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  original_filename text,
  file_size bigint,
  duration float,
  storage_path text not null,
  source_type text check (source_type in ('youtube', 'upload', 'cloud')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Transcripts Table
create table public.transcripts (
  id uuid default uuid_generate_v4() primary key,
  source_video_id uuid references public.source_videos(id) on delete cascade not null,
  transcript_json jsonb not null, -- Stores timestamped words and segments
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Clip Candidates Table
create table public.clip_candidates (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  source_video_id uuid references public.source_videos(id) on delete cascade not null,
  start_time float not null,
  end_time float not null,
  duration float not null,
  ai_score float not null,
  hook_text text,
  suggested_title text,
  explanation text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Generated Clips Table
create table public.generated_clips (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  candidate_id uuid references public.clip_candidates(id) on delete set null,
  title text,
  aspect_ratio text default '9:16' check (aspect_ratio in ('9:16', '1:1', '16:9')),
  storage_path text,
  status text default 'pending' check (status in ('pending', 'rendering', 'ready', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Captions Table
create table public.captions (
  id uuid default uuid_generate_v4() primary key,
  clip_id uuid references public.generated_clips(id) on delete cascade not null,
  platform text check (platform in ('tiktok', 'shorts', 'reels')) not null,
  caption_text text not null,
  hashtags text[] not null,
  cta text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Brand Kits Table
create table public.brand_kits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade unique not null,
  logo_url text,
  primary_color text default '#7c3aed',
  secondary_color text default '#3b82f6',
  font_family text default 'Inter',
  watermark_enabled boolean default false,
  watermark_text text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Processing Jobs Table
create table public.processing_jobs (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  job_type text not null,
  status text default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  progress int default 0,
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security on all tables
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.source_videos enable row level security;
alter table public.transcripts enable row level security;
alter table public.clip_candidates enable row level security;
alter table public.generated_clips enable row level security;
alter table public.captions enable row level security;
alter table public.brand_kits enable row level security;
alter table public.processing_jobs enable row level security;

-- RLS Policies (Users can only access their own records)
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users manage own projects" on public.projects for all using (auth.uid() = user_id);
create policy "Users manage own source_videos" on public.source_videos for all using (auth.uid() = user_id);
create policy "Users manage own transcripts" on public.transcripts for all using (
  exists (select 1 from public.source_videos where source_videos.id = transcripts.source_video_id and source_videos.user_id = auth.uid())
);
create policy "Users manage own clip_candidates" on public.clip_candidates for all using (
  exists (select 1 from public.projects where projects.id = clip_candidates.project_id and projects.user_id = auth.uid())
);
create policy "Users manage own generated_clips" on public.generated_clips for all using (
  exists (select 1 from public.projects where projects.id = generated_clips.project_id and projects.user_id = auth.uid())
);
create policy "Users manage own captions" on public.captions for all using (
  exists (select 1 from public.generated_clips join public.projects on projects.id = generated_clips.project_id where generated_clips.id = captions.clip_id and projects.user_id = auth.uid())
);
create policy "Users manage own brand_kits" on public.brand_kits for all using (auth.uid() = user_id);
create policy "Users manage own processing_jobs" on public.processing_jobs for all using (
  exists (select 1 from public.projects where projects.id = processing_jobs.project_id and projects.user_id = auth.uid())
);