import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Manglende Supabase env vars. Sjekk at .env.local har NEXT_PUBLIC_SUPABASE_URL og NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

// Public klient — brukes av RSC og browser. Respekterer RLS.
export const supabase = createClient<Database>(url, anonKey);

// Admin-klient — bruker service-role-key, bypasser RLS.
// Kun for server-side bruk (ETL-scripts). Aldri importer fra klient-komponenter.
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY mangler. Trengs kun i ETL-scripts.",
    );
  }
  return createClient<Database>(url!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
