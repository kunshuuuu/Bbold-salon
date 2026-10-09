import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(raw: string | undefined): string {
  if (!raw) return '';
  const cleaned = raw.trim().replace(/^['"]+|['"]+$/g, '');
  // Extract first valid https://<project>.supabase.co URL if pasted twice or with path suffixes
  const supabaseMatch = cleaned.match(/https?:\/\/[a-z0-9-]+\.supabase\.co/i);
  if (supabaseMatch) {
    return supabaseMatch[0].replace(/\/+$/, '');
  }
  // Fallback for custom domains: if http(s):// appears multiple times, take the first one
  const secondHttpIdx = cleaned.indexOf('http', 8);
  const singleUrl = secondHttpIdx > 0 ? cleaned.slice(0, secondHttpIdx) : cleaned;
  return singleUrl.replace(/\/+$/, '');
}

function normalizeSupabaseKey(raw: string | undefined): string {
  if (!raw) return '';
  const cleaned = raw.trim().replace(/^['"]+|['"]+$/g, '');
  // Handle accidentally double-pasted sb_publishable_ key
  if (cleaned.startsWith('sb_publishable_')) {
    const secondIdx = cleaned.indexOf('sb_publishable_', 15);
    if (secondIdx > 0) {
      return cleaned.slice(0, secondIdx).trim();
    }
  }
  return cleaned;
}

export const supabaseUrl = normalizeSupabaseUrl(
  import.meta.env.VITE_SUPABASE_URL as string | undefined
);
export const supabaseAnonKey = normalizeSupabaseKey(
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
);

export function isSupabaseConfigured(): boolean {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project-id') &&
    supabaseAnonKey !== 'your-public-anon-key'
  );
}

// Create client using public anon key only; fallback placeholder URL prevents throw when unconfigured
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? supabaseUrl : 'https://placeholder-unconfigured.supabase.co',
  isSupabaseConfigured() ? supabaseAnonKey : 'public-anon-placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

