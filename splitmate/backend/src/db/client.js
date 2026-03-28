// =============================================================================
// db/client.js — Supabase JS client (HTTPS, IPv4 compatible)
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

const supabaseUrl = `https://${config.SUPABASE_PROJECT_REF}.supabase.co`;
const supabaseKey = config.SUPABASE_SERVICE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  db: { schema: 'public' },
});

export default supabase;
