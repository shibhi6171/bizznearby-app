// Supabase Edge Function entry point. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createApp } from './app.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

Deno.serve((await createApp(sb, key)).fetch);
