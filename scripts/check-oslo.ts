import { createAdminClient } from "../lib/supabase";

async function main() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("red_cross_branches")
    .select("branch_id, name, branch_type")
    .eq("kommunenummer", "0301");
  if (error) throw error;

  console.log(`Branches i Oslo (kommunenummer 0301): ${data.length}`);
  for (const b of data) {
    const { data: acts } = await supabase
      .from("branch_activities")
      .select("activity_name")
      .eq("branch_id", b.branch_id);
    const hasBesok = acts?.some((a) => a.activity_name === "Besøkstjeneste");
    console.log(
      `  ${b.branch_id} [${b.branch_type}] ${b.name} — ${acts?.length ?? 0} activities, Besøkstjeneste=${hasBesok}`,
    );
  }
}

main().catch(console.error);
