-- PSGC All Projects Status Dashboard
-- Run this in Supabase SQL Editor → New query

drop table if exists audit_log cascade;
drop table if exists projects cascade;

create table projects (
  id             uuid primary key default gen_random_uuid(),
  display_order  integer not null,
  project_name   text    not null,
  pm             text    not null default '',
  stage          text    not null default '',
  attention_flag text    not null default 'MONITOR',
  wpr_count      integer,
  last_meeting   text    default '',
  key_risk       text    default '',
  notes          text    default '',
  status         text    default 'Normal',
  go_live_date   date,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects(id) on delete cascade,
  field_name  text,
  old_value   text,
  new_value   text,
  created_at  timestamptz default now()
);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_updated_at
  before update on projects
  for each row execute function set_updated_at();
