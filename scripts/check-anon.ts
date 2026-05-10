// Test hva anon-klienten (samme som RSC bruker) faktisk returnerer.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function main() {
  const r1 = await supabase.from("branch_activities").select("*");
  console.log(`Default select (no .limit): ${r1.data?.length} rader`);

  const r2 = await supabase.from("branch_activities").select("*").limit(10000);
  console.log(`.limit(10000):              ${r2.data?.length} rader`);

  const r3 = await supabase.from("branch_activities").select("*").range(0, 4999);
  console.log(`.range(0, 4999):            ${r3.data?.length} rader`);
}

main().catch(console.error);
