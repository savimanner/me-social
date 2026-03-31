create table if not exists workspace_connections (
  id text primary key,
  user_id text not null unique,
  workspace_name text not null,
  notion_workspace_id text not null,
  notion_database_id text not null,
  notion_database_title text not null,
  notion_access_token_ref text not null,
  mapping jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  last_synced_at timestamptz
);

create table if not exists source_items (
  id text primary key,
  workspace_id text not null references workspace_connections(id) on delete cascade,
  notion_page_id text not null unique,
  title text not null,
  content text not null,
  kind text not null,
  status text not null,
  tags text[] not null default '{}',
  author text,
  source_title text,
  source_url text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists feed_cards (
  id text primary key,
  workspace_id text not null references workspace_connections(id) on delete cascade,
  user_id text not null,
  headline text not null,
  body text not null,
  rationale text not null,
  status text not null,
  score double precision not null,
  source_signature text not null,
  media_prompt text,
  sources jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (user_id, source_signature)
);

create table if not exists user_feedback (
  id text primary key,
  card_id text not null references feed_cards(id) on delete cascade,
  user_id text not null,
  action text not null,
  created_at timestamptz not null
);

create table if not exists draft_edits (
  id text primary key,
  workspace_id text not null references workspace_connections(id) on delete cascade,
  user_id text not null,
  intent text not null,
  title text not null,
  body text not null,
  origin_card_id text,
  origin_source_item_id text,
  prompt text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
