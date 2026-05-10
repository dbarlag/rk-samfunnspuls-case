/**
 * Diagnose-script: cross-check SSB-data vs GeoJSON-kommunelista.
 * Forventer 357 kommuner i GeoJSON, men SSB ga oss 417.
 */

import { readFileSync } from "node:fs";
import { createAdminClient } from "../lib/supabase";

type GeoJsonFeature = {
  properties: { kommunenummer: string; kommunenavn: string };
};

async function main() {
  const geo = JSON.parse(
    readFileSync("public/geo/kommuner-2024.geojson", "utf-8"),
  ) as { features: GeoJsonFeature[] };
  const geoKnr = new Set(geo.features.map((f) => f.properties.kommunenummer));
  console.log(`GeoJSON: ${geoKnr.size} kommuner`);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("municipalities")
    .select("kommunenummer, kommunenavn, fylkesnavn, antall_67plus_alene")
    .order("kommunenummer");
  if (error) throw error;

  console.log(`Supabase: ${data.length} kommuner`);

  const inSsbNotGeo = data
    .filter((m) => !geoKnr.has(m.kommunenummer))
    .map((m) => `${m.kommunenummer} ${m.kommunenavn} (${m.fylkesnavn}, ${m.antall_67plus_alene} alene)`);

  const supKnr = new Set(data.map((m) => m.kommunenummer));
  const inGeoNotSsb = [...geoKnr].filter((k) => !supKnr.has(k));

  console.log(`\nI SSB men ikke GeoJSON (${inSsbNotGeo.length}):`);
  inSsbNotGeo.slice(0, 80).forEach((s) => console.log(`  ${s}`));
  if (inSsbNotGeo.length > 80) console.log(`  ... +${inSsbNotGeo.length - 80} til`);

  console.log(`\nI GeoJSON men ikke SSB (${inGeoNotSsb.length}):`);
  inGeoNotSsb.forEach((k) => console.log(`  ${k}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
