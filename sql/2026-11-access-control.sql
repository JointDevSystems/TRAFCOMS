-- Gargo: sub-section access (tabs inside a section) + protection of access columns.
-- Run once in the Supabase SQL editor. Safe to re-run.

-- 1. Where denied tabs are stored, e.g. ["hr:payroll","finance:bills"]
alter table public.profiles
  add column if not exists denied_subs jsonb not null default '[]'::jsonb;

-- 2. OPTIONAL BUT RECOMMENDED: stop non-administrators changing access columns.
-- Every user updates their own profile row (last_login), so unless your RLS policy limits the columns,
-- a user could edit their own role / nav_sections / denied_subs from the browser console.
-- This trigger blocks that. Requests from the service role (your /api routes, the dashboard) have no auth.uid() and are not affected.
create or replace function public.guard_profile_access_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.active) then return new; end if;
  if new.role          is distinct from old.role
  or new.active        is distinct from old.active
  or new.nav_sections  is distinct from old.nav_sections
  or new.admin_sections is distinct from old.admin_sections
  or new.denied_subs   is distinct from old.denied_subs then
    raise exception 'Only an administrator can change access settings';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_profile_access on public.profiles;
create trigger trg_guard_profile_access
  before update on public.profiles
  for each row execute function public.guard_profile_access_columns();
