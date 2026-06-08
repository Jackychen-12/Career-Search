-- 用户画像
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  school text,
  major text,
  degree text,
  skills text[] default '{}',
  target_roles text[] default '{}',
  resume_keywords text[] default '{}',
  categories text[] default '{}',
  job_types text[] default '{}',
  cities text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 投递追踪
create table if not exists tracking (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  job_id text not null,
  status text not null default 'saved',
  priority text,
  applied_at date,
  interview_at date,
  offer_at date,
  channel text,
  contact text,
  salary text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, job_id)
);

-- 岗位统计
create table if not exists job_stats (
  job_id text primary key,
  save_count int default 0,
  apply_count int default 0,
  view_count int default 0,
  updated_at timestamptz default now()
);

-- RLS policies
alter table profiles enable row level security;
alter table tracking enable row level security;
alter table job_stats enable row level security;

create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Users can read own tracking" on tracking for select using (auth.uid() = user_id);
create policy "Users can insert own tracking" on tracking for insert with check (auth.uid() = user_id);
create policy "Users can update own tracking" on tracking for update using (auth.uid() = user_id);
create policy "Users can delete own tracking" on tracking for delete using (auth.uid() = user_id);

create policy "Anyone can read job stats" on job_stats for select using (true);
create policy "Authenticated can upsert job stats" on job_stats for insert with check (auth.role() = 'authenticated');
create policy "Authenticated can update job stats" on job_stats for update using (auth.role() = 'authenticated');
