/**
 * Ingest tilleggs-metrikker fra SSB → municipalities (UPDATE eksisterende rader).
 *
 * - Tabell 07459: Befolkning per alder per kommune → sum av barn 6-16
 *   (proxy for "Leksehjelp"-behov)
 * - Tabell 09817: Innvandrere per kommune
 *   (proxy for "Norsktrening"-behov)
 *
 * Forutsetter at ingest-ssb.ts allerede er kjørt så de 357 kommunene finnes.
 *
 * Kjøres med: npm run ingest:ssb-extra
 */

import { readFileSync } from "node:fs";
import { createAdminClient } from "../lib/supabase";

// ---- Typer ----------------------------------------------------------

type JsonStat2 = {
  id: string[];
  size: number[];
  dimension: Record<
    string,
    {
      category: {
        index: Record<string, number>;
        label: Record<string, string>;
      };
    }
  >;
  value: (number | null)[];
};

// ---- Helpers --------------------------------------------------------

function loadValidKommunenummer(): Set<string> {
  const geojson = JSON.parse(
    readFileSync("public/geo/kommuner-2024.geojson", "utf-8"),
  ) as { features: Array<{ properties: { kommunenummer: string } }> };
  return new Set(geojson.features.map((f) => f.properties.kommunenummer));
}

function flatIndex(positions: number[], sizes: number[]): number {
  let idx = 0;
  for (let i = 0; i < positions.length; i++) {
    let multiplier = 1;
    for (let j = i + 1; j < sizes.length; j++) multiplier *= sizes[j];
    idx += positions[i] * multiplier;
  }
  return idx;
}

async function fetchSSB(
  tableId: string,
  query: object,
): Promise<JsonStat2> {
  const url = `https://data.ssb.no/api/v0/no/table/${tableId}`;
  console.log(`→ POST ${url}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
  if (!res.ok) {
    throw new Error(`SSB ${tableId} returnerte ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as JsonStat2;
}

// ---- Tabell 07459: barn 6-16 ----------------------------------------

async function fetchBarn6_16(validKnr: Set<string>): Promise<Map<string, number>> {
  // SSB bruker 3-sifret padded alder ("006", "007", ..., "016") i 07459.
  const aldre = Array.from({ length: 11 }, (_, i) => String(i + 6).padStart(3, "0"));

  const data = await fetchSSB("07459", {
    query: [
      { code: "Region", selection: { filter: "all", values: ["*"] } },
      { code: "Kjonn", selection: { filter: "all", values: ["*"] } },
      { code: "Alder", selection: { filter: "item", values: aldre } },
      { code: "ContentsCode", selection: { filter: "item", values: ["Personer1"] } },
      { code: "Tid", selection: { filter: "top", values: ["1"] } },
    ],
    response: { format: "json-stat2" },
  });

  console.log(`   sizes: ${data.size.join(" × ")}, year: ${Object.values(data.dimension.Tid.category.label)[0]}`);

  const dimOrder = data.id;
  const sizes = data.size;
  const regionIdx = data.dimension.Region.category.index;
  const kjonnIdx = data.dimension.Kjonn.category.index;
  const alderIdx = data.dimension.Alder.category.index;

  const result = new Map<string, number>();
  for (const [regionCode, rPos] of Object.entries(regionIdx)) {
    if (!validKnr.has(regionCode)) continue;
    let sum = 0;
    for (const kPos of Object.values(kjonnIdx)) {
      for (const aPos of Object.values(alderIdx)) {
        const pos: Record<string, number> = {
          Region: rPos,
          Kjonn: kPos,
          Alder: aPos,
          ContentsCode: 0,
          Tid: 0,
        };
        const v = data.value[flatIndex(dimOrder.map((d) => pos[d]), sizes)];
        if (v != null) sum += v;
      }
    }
    result.set(regionCode, sum);
  }
  console.log(`   → ${result.size} kommuner med barn-6-16-tall`);
  return result;
}

// ---- Tabell 09817: innvandrere --------------------------------------

async function fetchInnvandrere(
  validKnr: Set<string>,
): Promise<Map<string, number>> {
  const data = await fetchSSB("09817", {
    query: [
      { code: "Region", selection: { filter: "all", values: ["*"] } },
      { code: "InnvandrKat", selection: { filter: "item", values: ["B"] } },
      { code: "Landbakgrunn", selection: { filter: "item", values: ["999"] } },
      { code: "ContentsCode", selection: { filter: "item", values: ["Personer1"] } },
      { code: "Tid", selection: { filter: "top", values: ["1"] } },
    ],
    response: { format: "json-stat2" },
  });

  console.log(`   sizes: ${data.size.join(" × ")}, year: ${Object.values(data.dimension.Tid.category.label)[0]}`);

  const dimOrder = data.id;
  const sizes = data.size;
  const regionIdx = data.dimension.Region.category.index;

  const result = new Map<string, number>();
  for (const [regionCode, rPos] of Object.entries(regionIdx)) {
    if (!validKnr.has(regionCode)) continue;
    const pos: Record<string, number> = {
      Region: rPos,
      InnvandrKat: 0,
      Landbakgrunn: 0,
      ContentsCode: 0,
      Tid: 0,
    };
    const v = data.value[flatIndex(dimOrder.map((d) => pos[d]), sizes)];
    if (v != null) result.set(regionCode, v);
  }
  console.log(`   → ${result.size} kommuner med innvandrer-tall`);
  return result;
}

// ---- Update DB ------------------------------------------------------

async function updateMunicipalities(
  barn: Map<string, number>,
  innvandrere: Map<string, number>,
) {
  const supabase = createAdminClient();

  const updates: Array<{
    kommunenummer: string;
    antall_barn_6_16: number | null;
    antall_innvandrere: number | null;
  }> = [];

  const allKnr = new Set([...barn.keys(), ...innvandrere.keys()]);
  for (const knr of allKnr) {
    updates.push({
      kommunenummer: knr,
      antall_barn_6_16: barn.get(knr) ?? null,
      antall_innvandrere: innvandrere.get(knr) ?? null,
    });
  }

  console.log(`→ Updating ${updates.length} kommuner (kun de to nye kolonnene)`);
  // Bruker eksplisitt UPDATE per kommune. .upsert() med sparse cols vil ellers
  // INSERT med NULL-er og bryte NOT NULL-constraints på kommunenavn osv.
  for (let i = 0; i < updates.length; i++) {
    const u = updates[i];
    const { error } = await supabase
      .from("municipalities")
      .update({
        antall_barn_6_16: u.antall_barn_6_16,
        antall_innvandrere: u.antall_innvandrere,
      })
      .eq("kommunenummer", u.kommunenummer);
    if (error) throw error;
    if ((i + 1) % 50 === 0 || i === updates.length - 1) {
      console.log(`   ${i + 1}/${updates.length}`);
    }
  }
}

async function main() {
  const validKnr = loadValidKommunenummer();
  console.log(`→ Gyldige 2024-kommuner: ${validKnr.size}`);

  console.log("\n=== Tabell 07459 (barn 6-16) ===");
  const barn = await fetchBarn6_16(validKnr);

  console.log("\n=== Tabell 09817 (innvandrere) ===");
  const innvandrere = await fetchInnvandrere(validKnr);

  console.log("\n=== Skriv til Supabase ===");
  await updateMunicipalities(barn, innvandrere);

  console.log("\n✓ Done.");
}

main().catch((err) => {
  console.error("✗ Feilet:", err);
  process.exit(1);
});
