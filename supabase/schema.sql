-- Run once in the Supabase SQL editor. All user data is private by default.
create extension if not exists pg_trgm;

create table if not exists public.diaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null default '',
  content text not null default '',
  mood text not null check (mood in ('happy','sad','calm','angry','tired','excited')),
  weather text check (weather is null or weather in ('sunny','cloudy','rainy','snowy','windy')),
  image_paths text[] not null default '{}',
  diary_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  display_name text,
  theme text not null default 'system' check (theme in ('light','dark','system')),
  lock_timeout_seconds integer not null default 0 check (lock_timeout_seconds between 0 and 3600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diaries_user_date_idx on public.diaries (user_id, diary_date desc);
create index if not exists diaries_user_mood_idx on public.diaries (user_id, mood);
create index if not exists diaries_search_idx on public.diaries using gin ((title || ' ' || content) gin_trgm_ops);

create or replace function public.touch_updated_at() returns trigger language plpgsql security invoker set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists diaries_touch on public.diaries;
create trigger diaries_touch before update on public.diaries for each row execute function public.touch_updated_at();
drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings for each row execute function public.touch_updated_at();

alter table public.diaries enable row level security;
alter table public.settings enable row level security;
create policy "diaries_select_own" on public.diaries for select using (auth.uid() = user_id);
create policy "diaries_insert_own" on public.diaries for insert with check (auth.uid() = user_id);
create policy "diaries_update_own" on public.diaries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "diaries_delete_own" on public.diaries for delete using (auth.uid() = user_id);
create policy "settings_select_own" on public.settings for select using (auth.uid() = user_id);
create policy "settings_insert_own" on public.settings for insert with check (auth.uid() = user_id);
create policy "settings_update_own" on public.settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "settings_delete_own" on public.settings for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('diary-images', 'diary-images', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update set public = false;

-- Object names must be: <authenticated-user-id>/<random-file-name>.
create policy "images_select_own" on storage.objects for select to authenticated
using (bucket_id = 'diary-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "images_insert_own" on storage.objects for insert to authenticated
with check (bucket_id = 'diary-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "images_update_own" on storage.objects for update to authenticated
using (bucket_id = 'diary-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'diary-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "images_delete_own" on storage.objects for delete to authenticated
using (bucket_id = 'diary-images' and (storage.foldername(name))[1] = auth.uid()::text);
