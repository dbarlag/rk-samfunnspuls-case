import { createAdminClient } from "../lib/supabase";

async function main() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("municipalities")
    .select(
      "kommunenavn, antall_67plus_alene, antall_barn_6_16, antall_innvandrere",
    )
    .order("antall_67plus_alene", { ascending: false })
    .limit(10);
  console.log("Topp 10 kommuner etter eldre alene:");
  data?.forEach((m) => {
    console.log(
      `  ${m.kommunenavn.padEnd(30)} eldre=${String(m.antall_67plus_alene).padStart(6)}  barn=${String(m.antall_barn_6_16 ?? "-").padStart(6)}  innv=${String(m.antall_innvandrere ?? "-").padStart(6)}`,
    );
  });
}

main().catch(console.error);
