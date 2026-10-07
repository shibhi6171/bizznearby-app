-- Proximity search. Node calls: supabase.rpc('get_nearby_businesses', {...})
-- Input names differ from output column names on purpose (Postgres rejects duplicates).
create or replace function get_nearby_businesses(
  user_lat        double precision,
  user_lng        double precision,
  radius_meters   integer default 5000,
  filter_category text    default null,
  search_text     text    default null,
  min_rating      numeric default 0,
  result_limit    integer default 20,
  result_offset   integer default 0
)
returns table (
  id                 uuid,
  name               text,
  description        text,
  category_slug      text,
  category_name      text,
  address            text,
  phone              text,
  latitude           double precision,
  longitude          double precision,
  avg_rating         numeric,
  review_count       integer,
  cover_image_url    text,
  distance_meters    double precision,
  active_deals_count bigint,
  max_discount       integer
)
language sql stable set search_path = public, extensions
as $$
  with origin as (
    select st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography as g
  )
  select
    b.id, b.name, b.description,
    c.slug, c.name,
    b.address, b.phone,
    b.latitude, b.longitude,
    b.avg_rating, b.review_count,
    img.url,
    st_distance(b.location, o.g),
    coalesce(dl.cnt, 0),
    dl.max_discount
  from businesses b
  cross join origin o
  join categories c on c.id = b.category_id
  left join lateral (
    select bi.url from business_images bi
    where bi.business_id = b.id
    order by bi.is_cover desc, bi.created_at asc
    limit 1
  ) img on true
  left join lateral (
    select count(*) as cnt, max(d.discount_percent) as max_discount
    from deals d
    where d.business_id = b.id and d.is_active and now() between d.starts_at and d.expires_at
  ) dl on true
  where b.is_active
    and st_dwithin(b.location, o.g, radius_meters)
    and (filter_category is null or c.slug = filter_category)
    and b.avg_rating >= coalesce(min_rating, 0)
    and (
      search_text is null or search_text = ''
      or b.name ilike '%' || search_text || '%'
      or b.description ilike '%' || search_text || '%'
      or similarity(b.name, search_text) > 0.3
    )
  order by 13 asc
  limit least(coalesce(result_limit, 20), 100)
  offset greatest(coalesce(result_offset, 0), 0);
$$;

revoke all on function get_nearby_businesses from public, anon, authenticated;
grant execute on function get_nearby_businesses to service_role;

-- Test: select * from get_nearby_businesses(28.6139, 77.2090, 5000);
