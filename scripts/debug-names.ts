/**
 * Sjekk hva kommunenavn ser ut som i DB for de 31 unmatched.
 */
import { createAdminClient } from "../lib/supabase";

const UNMATCHED = [
  "Kåfjord", "Trondheim", "Namsos", "Tjeldsund", "Lavangen",
  "Fauske", "Levanger", "Snåsa", "Kautokeino", "Røros",
  "Rana", "Sortland", "Porsanger", "Steinkjer", "Nordreisa",
  "Gratangen", "Lyngen", "Hamarøy", "Harstad", "Nesseby",
  "Svalbard", "Herøy", "Oslo", "Sørfold", "Hammerfest",
];

async function main() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("municipalities")
    .select("kommunenummer, kommunenavn, kommunenavn_normalized");
  if (error) throw error;

  console.log("=== Søk i DB etter de unmatched navnene ===\n");
  for (const name of UNMATCHED) {
    const norm = name.toLowerCase().trim();
    const exact = data.find((m) => m.kommunenavn_normalized === norm);
    if (exact) {
      console.log(`✓ ${name} → finnes som "${exact.kommunenavn}" (${exact.kommunenummer})`);
    } else {
      // Søk fuzzy: inneholder
      const fuzzy = data.filter((m) =>
        m.kommunenavn.toLowerCase().includes(norm) ||
        norm.includes(m.kommunenavn.toLowerCase()),
      );
      if (fuzzy.length > 0) {
        console.log(
          `✗ ${name} → IKKE eksakt, men finnes som: ${fuzzy.map((f) => `"${f.kommunenavn}" (${f.kommunenummer})`).join(", ")}`,
        );
      } else {
        console.log(`✗ ${name} → IKKE i DB i det hele tatt`);
      }
    }
  }
}

main().catch(console.error);
