import { supabase } from '../config/supabase.js';
import { run } from '../utils/db.js';

export function list({ businessId, limit, offset }) {
  let q = supabase
    .from('reviews')
    .select('id,rating,comment,created_at,business_id,users(name),businesses(name)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (businessId) q = q.eq('business_id', businessId);
  return run(q);
}

export const ratings = (businessId) => run(supabase.from('reviews').select('rating').eq('business_id', businessId));
export const create = (row) => run(supabase.from('reviews').insert(row).select('id,rating,comment,created_at').single());
