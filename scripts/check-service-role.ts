import { createAdminClient } from "../lib/supabase";

async function main() {
  const supabase = createAdminClient();
  const r1 = await supabase.from("branch_activities").select("*");
  console.log(`service-role default:        ${r1.data?.length} rader`);

  const r2 = await supabase.from("branch_activities").select("*").limit(10000);
  console.log(`service-role .limit(10000):  ${r2.data?.length} rader`);

  const r3 = await supabase
    .from("branch_activities")
    .select("*")
    .range(0, 9999);
  console.log(`service-role .range(0,9999): ${r3.data?.length} rader`);
}

main().catch(console.error);
