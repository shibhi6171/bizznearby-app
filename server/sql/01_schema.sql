-- BizzNearby schema. Run in Supabase: SQL Editor > New query > paste > Run.
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create type user_role as enum ('customer', 'seller', 'admin');

-- USERS (custom JWT auth, passwords hashed with bcrypt in the API)
create table users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null,
  password_hash text not null,
  role          user_role not null default 'customer',
  phone         text,
  business_name text,
  created_at    timestamptz not null default now()
);
create unique index users_email_key on users (lower(email));

create table categories (
  id   serial primary key,
  slug text not null unique,
  name text not null
);
insert into categories (slug, name) values
  ('dining','Dining'), ('retail','Retail'), ('services','Services'),
  ('healthcare','Healthcare'), ('entertainment','Entertainment');

-- BUSINESSES
create table businesses (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references users(id) on delete cascade,
  category_id   int  not null references categories(id),
  name          text not null check (char_length(name) between 2 and 120),
  description   text,
  address       text not null,
  phone         text,
  whatsapp      text,
  email         text,
  website       text,
  opening_hours jsonb not null default '{}'::jsonb,   -- {"mon":{"open":"09:00","close":"21:00"}, ...}
  latitude      double precision not null check (latitude  between -90  and 90),
  longitude     double precision not null check (longitude between -180 and 180),
  location      geography(point, 4326),               -- derived by trigger; PostGIS order is (lng, lat)
  avg_rating    numeric(2,1) not null default 0,
  review_count  int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create or replace function set_business_location() returns trigger
language plpgsql set search_path = public, extensions as $$
begin
  new.location := st_setsrid(st_makepoint(new.longitude, new.latitude), 4326)::geography;
  new.updated_at := now();
  return new;
end $$;

create trigger trg_business_location
before insert or update of latitude, longitude on businesses
for each row execute function set_business_location();

create index businesses_location_gix on businesses using gist (location);
create index businesses_owner_idx    on businesses (owner_id);
create index businesses_category_idx on businesses (category_id);
create index businesses_name_trgm    on businesses using gin (name extensions.gin_trgm_ops);

-- BUSINESS IMAGES (public_id kept so Cloudinary assets can be deleted)
create table business_images (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  url         text not null,
  public_id   text not null,
  is_cover    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index business_images_business_idx on business_images (business_id);

-- DEALS (active = is_active AND now() between starts_at and expires_at; no cron needed)
create table deals (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses(id) on delete cascade,
  title            text not null,
  description      text,
  discount_percent int  not null check (discount_percent between 1 and 100),
  banner_url       text,
  banner_public_id text,
  is_active        boolean not null default true,
  starts_at        timestamptz not null default now(),
  expires_at       timestamptz not null,
  created_at       timestamptz not null default now(),
  check (expires_at > starts_at)
);
create index deals_business_idx on deals (business_id);
create index deals_active_idx   on deals (is_active, expires_at);

-- REVIEWS (one per customer per business; the API offers no edit or delete)
create table reviews (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  rating      int  not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique (business_id, user_id)
);

create or replace function refresh_business_rating() returns trigger
language plpgsql set search_path = public as $$
declare bid uuid;
begin
  if tg_op = 'DELETE' then bid := old.business_id; else bid := new.business_id; end if;
  update businesses b set
    avg_rating   = coalesce((select round(avg(rating)::numeric, 1) from reviews where business_id = bid), 0),
    review_count = (select count(*) from reviews where business_id = bid)
  where b.id = bid;
  return null;
end $$;

create trigger trg_reviews_rating
after insert or update or delete on reviews
for each row execute function refresh_business_rating();

-- LEADS (customer taps Call / WhatsApp / Directions / Website)
create table leads (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id     uuid references users(id) on delete set null,
  type        text not null check (type in ('call','whatsapp','directions','website')),
  created_at  timestamptz not null default now()
);
create index leads_business_idx on leads (business_id, created_at desc);

-- RLS enabled with no policies: only the backend (service-role key) can read or write.
alter table users           enable row level security;
alter table categories      enable row level security;
alter table businesses      enable row level security;
alter table business_images enable row level security;
alter table deals           enable row level security;
alter table reviews         enable row level security;
alter table leads           enable row level security;
