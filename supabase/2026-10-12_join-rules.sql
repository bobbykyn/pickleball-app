-- Pickle Kitchen — join rules (approval / invite only) + private-session fix
-- Paste ALL of this into Supabase → SQL Editor → New query → Run. Safe to run twice.

-- 1. New session settings ----------------------------------------------------
alter table public.sessions
  add column if not exists requires_approval boolean not null default false,
  add column if not exists invite_only       boolean not null default false,
  add column if not exists invite_token      text;

create unique index if not exists sessions_invite_token_key
  on public.sessions (invite_token) where invite_token is not null;

-- 2. Allow 'pending' as an RSVP status ---------------------------------------
do $$
declare col record; c record;
begin
  select data_type, udt_name into col
  from information_schema.columns
  where table_schema = 'public' and table_name = 'rsvps' and column_name = 'status';

  if col.data_type = 'USER-DEFINED' then
    execute format('alter type %I add value if not exists %L', col.udt_name, 'pending');
  else
    for c in
      select conname from pg_constraint
      where conrelid = 'public.rsvps'::regclass and contype = 'c'
        and pg_get_constraintdef(oid) ilike '%status%'
    loop
      execute format('alter table public.rsvps drop constraint %I', c.conname);
    end loop;
    alter table public.rsvps
      add constraint rsvps_status_check check (status in ('yes', 'maybe', 'no', 'pending'));
  end if;
end $$;

-- 3. Admins (Bobby + Waldo) --------------------------------------------------
create or replace function public.pk_is_admin() returns boolean
language sql stable as $$
  select coalesce(lower(auth.jwt() ->> 'email') in ('bobbykyn@gmail.com', 'dewingpoint200@gmail.com'), false)
$$;

-- 4. Join rules enforced by the database (can't be bypassed from the browser) --
create or replace function public.pk_rsvp_join_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s      record;
  caller uuid := auth.uid();
begin
  -- Server routes (service key) are trusted: approvals, invite redemption.
  if caller is null then return new; end if;
  -- Leaving or "maybe" is always allowed.
  if new.status not in ('yes', 'pending') then return new; end if;

  select created_by, requires_approval, invite_only, invited_users
    into s from sessions where id = new.session_id;
  if not found then return new; end if;

  -- Host and admins add people directly.
  if s.created_by = caller or pk_is_admin() then return new; end if;

  -- Already in: editing guests keeps the spot.
  if tg_op = 'UPDATE' and old.status = 'yes' then
    new.status := 'yes';
    return new;
  end if;

  -- Invite only: the person adding must have opened the invite link.
  if s.invite_only then
    if not (coalesce(to_jsonb(s.invited_users), '[]'::jsonb) ? caller::text) then
      raise exception 'This session is invite only';
    end if;
    return new;
  end if;

  -- Approval: every new join becomes a request.
  if s.requires_approval then
    new.status := 'pending';
  end if;
  return new;
end $$;

drop trigger if exists pk_rsvp_join_rules on public.rsvps;
create trigger pk_rsvp_join_rules
  before insert or update on public.rsvps
  for each row execute function public.pk_rsvp_join_rules();

-- 5. Private sessions: only the host, invited players and admins can read them --
do $$
declare p record;
begin
  -- If row security was off, keep today's create/edit/delete behaviour before switching it on.
  if not (select relrowsecurity from pg_class where oid = 'public.sessions'::regclass) then
    create policy pk_sessions_insert on public.sessions for insert to authenticated with check (true);
    create policy pk_sessions_update on public.sessions for update to authenticated using (true) with check (true);
    create policy pk_sessions_delete on public.sessions for delete to authenticated using (true);
    alter table public.sessions enable row level security;
  end if;

  -- An existing "ALL" policy also lets everyone read: split it so only reading changes.
  for p in select * from pg_policies where schemaname = 'public' and tablename = 'sessions' and cmd = 'ALL' loop
    execute format('create policy %I on public.sessions for insert to %s with check (%s)',
      p.policyname || '_ins', array_to_string(p.roles, ','), coalesce(p.with_check, p.qual, 'true'));
    execute format('create policy %I on public.sessions for update to %s using (%s) with check (%s)',
      p.policyname || '_upd', array_to_string(p.roles, ','), coalesce(p.qual, 'true'), coalesce(p.with_check, p.qual, 'true'));
    execute format('create policy %I on public.sessions for delete to %s using (%s)',
      p.policyname || '_del', array_to_string(p.roles, ','), coalesce(p.qual, 'true'));
    execute format('drop policy %I on public.sessions', p.policyname);
  end loop;

  -- Replace every read policy with the private-aware one.
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'sessions' and cmd = 'SELECT' loop
    execute format('drop policy %I on public.sessions', p.policyname);
  end loop;
end $$;

create policy pk_sessions_select on public.sessions for select to authenticated using (
  not coalesce(is_private, false)
  or created_by = auth.uid()
  or public.pk_is_admin()
  or coalesce(to_jsonb(invited_users), '[]'::jsonb) ? auth.uid()::text
);

-- 6. Check: any other Waldo accounts? (results show at the bottom)
select email, created_at, last_sign_in_at from auth.users where email ilike '%dewingpoint%';
