import { createAdminClient } from "../lib/supabase";
import { computeCoverage } from "../lib/coverage";

async function main() {
  const supabase = createAdminClient();

  // 1. Sjekk L019 sin row i branch_activities
  const { data: l019Acts, error: e1 } = await supabase
    .from("branch_activities")
    .select("*")
    .eq("branch_id", "L019");
  if (e1) throw e1;
  console.log(`L019 i branch_activities: ${l019Acts?.length} rader`);
  l019Acts?.slice(0, 5).forEach((a) => console.log(`  - ${a.activity_name}`));

  // 2. Sjekk hvor mange besøk-rader DB har med matchende branch_id
  const { data: allBesok } = await supabase
    .from("branch_activities")
    .select("branch_id")
    .eq("activity_name", "Besøkstjeneste");
  console.log(`\nTotal besøk-rader: ${allBesok?.length}`);

  // 3. Hvor mange av disse branch_ids matcher en branch som faktisk eksisterer + har kommunenummer
  const { data: branches } = await supabase
    .from("red_cross_branches")
    .select("branch_id, kommunenummer");
  const branchKnr = new Map(
    branches?.map((b) => [b.branch_id, b.kommunenummer]) ?? [],
  );

  let matched = 0;
  let nullKnr = 0;
  let unmatched = 0;
  for (const a of allBesok ?? []) {
    if (!branchKnr.has(a.branch_id)) {
      unmatched++;
    } else if (branchKnr.get(a.branch_id) === null) {
      nullKnr++;
    } else {
      matched++;
    }
  }
  console.log(`Besøk-aktivitet → branch m/ kommunenummer:  ${matched}`);
  console.log(`Besøk-aktivitet → branch m/ NULL kommunenr: ${nullKnr}`);
  console.log(`Besøk-aktivitet → branch finnes IKKE:       ${unmatched}`);

  // 4. Kjør hele computeCoverage og se hvor mange som er covered
  const { data: muns } = await supabase.from("municipalities").select("*");
  const { data: allBranches } = await supabase
    .from("red_cross_branches")
    .select("*");
  const { data: besokFull } = await supabase
    .from("branch_activities")
    .select("*")
    .eq("activity_name", "Besøkstjeneste");

  if (!muns || !allBranches || !besokFull) throw new Error("missing data");

  const { ACTIVITY_CONFIGS } = await import("../lib/activities");
  const cov = computeCoverage(
    muns,
    allBranches,
    besokFull,
    ACTIVITY_CONFIGS.besokstjeneste,
  );
  const utenDekning = cov.filter((c) => c.no_coverage).length;
  console.log(`\nVia computeCoverage: ${utenDekning} av ${cov.length} uten dekning`);

  // Bærum spesifikt
  const baerum = cov.find((c) => c.kommunenummer === "3201");
  console.log("Bærum coverage:", baerum);
}

main().catch(console.error);
