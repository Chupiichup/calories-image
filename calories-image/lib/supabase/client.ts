import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "@/lib/env";

export function createClient() {
  if (!isSupabaseConfigured()) {
    // Returns null if Supabase is not yet configured, allowing seamless offline/demo mode
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createBrowserClient(supabaseUrl, supabaseKey);
}

