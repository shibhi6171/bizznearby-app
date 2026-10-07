import { supabase } from '../config/supabase.js';
import { run } from '../utils/db.js';

export const findByEmail = (email) =>
  run(supabase.from('users').select('*').eq('email', email.toLowerCase()).maybeSingle());

export const findById = (id) =>
  run(supabase.from('users').select('id,name,email,role,phone,business_name,created_at').eq('id', id).maybeSingle());

export const create = (row) => run(supabase.from('users').insert(row).select('*').single());
