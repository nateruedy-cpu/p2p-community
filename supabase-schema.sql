-- P2P Community — Full schema (v2)
-- This REPLACES the earlier wins-only schema. If you already ran the first
-- schema and haven't put real data in yet, drop those tables first:
--   drop table if exists public.reactions cascade;
--   drop table if exists public.wins cascade;
-- Then run everything below in Supabase SQL Editor.

-- ============ PROFILES ============
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  can_announce boolean not null default false, -- can post in Team Announcements
  is_admin boolean not null default false,      -- can grant can_announce to others (manual for now, see README)
  has_clients boolean not null default true,     -- toggles whether "Checked in with clients" shows in their daily check-in
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Members can view all profiles" on public.profiles for select using ( true );
create policy "Members can update their own profile" on public.profiles for update using ( auth.uid() = id );

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============ POSTS (Wins / Board / Announcements) ============
create table if not exists public.posts (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  channel text not null check (channel in ('wins','board','announcements')),
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz default now()
);

alter table public.posts enable row level security;

create policy "Members can view all posts" on public.posts for select using ( true );

-- Anyone can post to wins/board; only approved members can post to announcements
create policy "Members can create posts" on public.posts for insert
  with check (
    auth.uid() = user_id
    and (
      channel in ('wins','board')
      or (
        channel = 'announcements'
        and exists (
          select 1 from public.profiles
          where id = auth.uid() and (can_announce = true or is_admin = true)
        )
      )
    )
  );

create policy "Members can delete their own posts" on public.posts for delete using ( auth.uid() = user_id );

-- ============ COMMENTS ============
create table if not exists public.comments (
  id bigint generated always as identity primary key,
  post_id bigint references public.posts on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz default now()
);

alter table public.comments enable row level security;

create policy "Members can view all comments" on public.comments for select using ( true );
create policy "Members can add their own comments" on public.comments for insert with check ( auth.uid() = user_id );
create policy "Members can delete their own comments" on public.comments for delete using ( auth.uid() = user_id );

-- ============ REACTIONS (shared by posts) ============
create table if not exists public.reactions (
  id bigint generated always as identity primary key,
  post_id bigint references public.posts on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  emoji text not null check (emoji in ('🔥','💪','🏆','👍','😂')),
  created_at timestamptz default now(),
  unique (post_id, user_id, emoji)
);

alter table public.reactions enable row level security;

create policy "Members can view all reactions" on public.reactions for select using ( true );
create policy "Members can add their own reactions" on public.reactions for insert with check ( auth.uid() = user_id );
create policy "Members can remove their own reactions" on public.reactions for delete using ( auth.uid() = user_id );

-- ============ CHAT MESSAGES ============
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  content text not null check (char_length(content) between 1 and 1000),
  reply_to_id bigint references public.messages on delete set null,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Members can view all messages" on public.messages for select using ( true );
create policy "Members can send their own messages" on public.messages for insert with check ( auth.uid() = user_id );
create policy "Members can delete their own messages" on public.messages for delete using ( auth.uid() = user_id );

-- ============ DAILY CHECK-INS ============
create table if not exists public.checkins (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  checkin_date date not null,
  items jsonb not null default '{}'::jsonb, -- { "item_id": true, ... }
  completed boolean not null default false,  -- all items checked that day
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, checkin_date)
);

alter table public.checkins enable row level security;

create policy "Members can view all checkins" on public.checkins for select using ( true ); -- lets teammates see each other's streaks; change to auth.uid() = user_id to make check-ins private
create policy "Members can create their own checkins" on public.checkins for insert with check ( auth.uid() = user_id );
create policy "Members can update their own checkins" on public.checkins for update using ( auth.uid() = user_id );

-- ============ REALTIME ============
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.checkins;
