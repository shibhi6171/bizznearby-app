import { supabase } from '../config/supabase.js';
import { run } from '../utils/db.js';

const PUBLIC_COLS =
  'id,owner_id,name,description,address,phone,whatsapp,email,website,opening_hours,latitude,longitude,avg_rating,review_count,is_active,created_at,' +
  'categories(slug,name),business_images(id,url,is_cover,created_at),' +
  'deals(id,title,description,discount_percent,banner_url,is_active,starts_at,expires_at)';

export const nearby = (params) => run(supabase.rpc('get_nearby_businesses', params));

export const categories = () => run(supabase.from('categories').select('id,slug,name').order('id'));

export async function categoryId(slug) {
  const row = await run(supabase.from('categories').select('id').eq('slug', slug).maybeSingle());
  return row?.id ?? null;
}

export const getById = (id) => run(supabase.from('businesses').select(PUBLIC_COLS).eq('id', id).maybeSingle());

// Minimal row for ownership checks
export const basic = (id) => run(supabase.from('businesses').select('id,owner_id,name').eq('id', id).maybeSingle());

export const listByOwner = (ownerId) =>
  run(
    supabase
      .from('businesses')
      .select('id,name,address,avg_rating,review_count,is_active,created_at,categories(slug,name),business_images(url,is_cover),deals(id,is_active,expires_at)')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
  );

export const create = (row) => run(supabase.from('businesses').insert(row).select('id').single());
export const update = (id, patch) => run(supabase.from('businesses').update(patch).eq('id', id).select('id').single());
export const remove = (id) => run(supabase.from('businesses').delete().eq('id', id));

// ----- images -----
export const images = (businessId) =>
  run(supabase.from('business_images').select('id,url,public_id,is_cover').eq('business_id', businessId));
export const addImages = (rows) => run(supabase.from('business_images').insert(rows).select('id,url,is_cover'));
export const image = (id, businessId) =>
  run(supabase.from('business_images').select('id,public_id,is_cover').eq('id', id).eq('business_id', businessId).maybeSingle());
export const removeImage = (id) => run(supabase.from('business_images').delete().eq('id', id));
export const setCover = (businessId, imageId) =>
  run(supabase.from('business_images').update({ is_cover: true }).eq('id', imageId).eq('business_id', businessId));

// ----- deals -----
export const dealBannerIds = (businessId) =>
  run(supabase.from('deals').select('banner_public_id').eq('business_id', businessId).not('banner_public_id', 'is', null));
export const createDeal = (row) => run(supabase.from('deals').insert(row).select('*').single());
export const dealWithOwner = (dealId) =>
  run(supabase.from('deals').select('id,business_id,banner_public_id,starts_at,expires_at,businesses!inner(owner_id)').eq('id', dealId).maybeSingle());
export const updateDeal = (dealId, patch) => run(supabase.from('deals').update(patch).eq('id', dealId).select('*').single());
export const removeDeal = (dealId) => run(supabase.from('deals').delete().eq('id', dealId));
