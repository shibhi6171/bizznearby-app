import { supabase } from '../config/supabase.js';
import { run } from '../utils/db.js';

export const create = (row) => run(supabase.from('leads').insert(row));

export const forOwner = (ownerId) =>
  run(
    supabase
      .from('leads')
      .select('id,type,created_at,businesses!inner(id,name,owner_id),users(name)')
      .eq('businesses.owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(100)
  );
