alter table profiles add column if not exists notify_email text;
alter table profiles add column if not exists notify_enabled boolean default false;
