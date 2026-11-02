create table users (
  id text primary key, email text not null, name text,
  role text not null default 'user' check (role in ('user','admin')),
  can_upload boolean not null default false, created_at timestamptz not null default now());
create table waitlist (
  id uuid primary key default gen_random_uuid(), email text not null, user_id text,
  kind text not null check (kind in ('uploads','institution')), institution_name text, note text,
  ip_hash text,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  created_at timestamptz not null default now(), decided_at timestamptz, decided_by text);
create unique index waitlist_email_kind on waitlist (lower(email), kind);
create index waitlist_ip_recent on waitlist (ip_hash, created_at);
create table sources (
  id serial primary key, name text not null, kind text not null check (kind in ('rss','scrape')),
  url text not null unique, homepage text not null,
  category text not null check (category in ('government','university','media')),
  parser text, active boolean not null default true,
  last_fetched_at timestamptz, last_ok_at timestamptz, last_error text);
create table feed_items (
  id bigserial primary key, source_id int not null references sources(id),
  url text not null unique, title text not null, summary text not null default '',
  published_at timestamptz, fetched_at timestamptz not null default now(),
  title_key text not null, why text);
create index feed_items_recent on feed_items ((coalesce(published_at, fetched_at)) desc);
create index feed_items_title_key on feed_items (source_id, title_key);
create table locks (name text primary key, until timestamptz not null default 'epoch');
insert into locks (name) values ('feed');
create table files (
  id uuid primary key, owner_id text not null, b2_key text not null, filename text not null,
  mime text not null default 'application/pdf', bytes int not null, pages int,
  status text not null default 'uploaded' check (status in ('uploaded','processing','ready','failed')),
  error text, created_at timestamptz not null default now());
create index files_owner on files (owner_id, created_at desc);
create table file_pages (
  file_id uuid not null references files(id) on delete cascade, page_no int not null, text text not null,
  tsv tsvector generated always as (to_tsvector('english', text)) stored,
  primary key (file_id, page_no));
create index file_pages_tsv on file_pages using gin (tsv);
create table file_outputs (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references files(id) on delete cascade,
  kind text not null check (kind in ('notes','questions')), content jsonb not null,
  model text not null, created_at timestamptz not null default now());
create table asks (
  id bigserial primary key, owner_id text not null,
  file_id uuid not null references files(id) on delete cascade,
  page_no int not null, created_at timestamptz not null default now());
create index asks_owner_recent on asks (owner_id, created_at);
