/**
 * Ingest tilleggs-metrikker fra SSB → municipalities (UPDATE eksisterende rader).
 *
 * - Tabell 07459: Befolkning per alder per kommune → sum av ungdom 13-19
 *   (proxy for "Leksehjelp"-behov — RK Leksehjelp er for ungdomsskole+VGS).
 * - Tabell 09817 + Landbakgrunn=Alle: Innvandrere per kommune
 *   (proxy for "Norsktrening"-behov)
 * - Tabell 09817 + Landbakgrunn=flyktningland: sum innvandrere fra
 *   klassiske flyktningland (Syria, Afghanistan, Eritrea, Somalia, Ukraina,
 *   Irak, Iran, Etiopia, Sudan, Sør-Sudan, Kosovo, Myanmar, Russland)
 *   som proxy for "Flyktningguide"-behov. SSB publiserer ikke
 *   flyktningstatus på kommune-nivå (personvern), så landbakgrunn-proxy
 *   er standardmetoden.
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

// ---- Tabell 07459: ungdom 13-19 -------------------------------------

async function fetchUngdom13_19(validKnr: Set<string>): Promise<Map<string, number>> {
  // SSB bruker 3-sifret padded alder ("013", "014", ..., "019") i 07459.
  // 13-19 dekker ungdomsskole (13-15) + VGS (16-19) — målgruppen for
  // RK Leksehjelp.
  const aldre = Array.from({ length: 7 }, (_, i) => String(i + 13).padStart(3, "0"));

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
  console.log(`   → ${result.size} kommuner med ungdom-13-19-tall`);
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

// ---- Tabell 09817 + utvalgte land: flyktning-proxy ------------------

/**
 * Klassiske flyktningland (SSB landkode → navn).
 * Listen er basert på UDI/IMDi sin praksis: land som dominerer
 * flyktning-tilstrømming til Norge de siste tiårene.
 *
 * Vi summerer "Innvandrere" (InnvandrKat=B) fra disse landene per
 * kommune som proxy for personer med flyktningbakgrunn.
 *
 * Begrensning: dette overestimerer noe (også arbeidsinnvandrere fra
 * disse landene telles) og underestimerer (flyktninger fra andre land
 * telles ikke). Men det er den beste tilnærmingen kommune-nivå
 * SSB-data tillater.
 */
const FLYKTNINGLAND: Record<string, string> = {
  "404": "Afghanistan",
  "672": "Eritrea",
  "612": "Etiopia",
  "815": "Iran",
  "812": "Irak",
  "162": "Kosovo",
  "839": "Myanmar",
  "140": "Russland",
  "684": "Somalia",
  "685": "Sudan",
  "686": "Sør-Sudan",
  "816": "Syria",
  "132": "Ukraina",
};

async function fetchFlyktningProxy(
  validKnr: Set<string>,
): Promise<Map<string, number>> {
  const data = await fetchSSB("09817", {
    query: [
      { code: "Region", selection: { filter: "all", values: ["*"] } },
      { code: "InnvandrKat", selection: { filter: "item", values: ["B"] } },
      {
        code: "Landbakgrunn",
        selection: { filter: "item", values: Object.keys(FLYKTNINGLAND) },
      },
      { code: "ContentsCode", selection: { filter: "item", values: ["Personer1"] } },
      { code: "Tid", selection: { filter: "top", values: ["1"] } },
    ],
    response: { format: "json-stat2" },
  });

  console.log(
    `   sizes: ${data.size.join(" × ")}, year: ${Object.values(data.dimension.Tid.category.label)[0]}`,
  );
  console.log(
    `   land i utvalget: ${Object.values(FLYKTNINGLAND).join(", ")}`,
  );

  const dimOrder = data.id;
  const sizes = data.size;
  const regionIdx = data.dimension.Region.category.index;
  const landIdx = data.dimension.Landbakgrunn.category.index;

  const result = new Map<string, number>();
  for (const [regionCode, rPos] of Object.entries(regionIdx)) {
    if (!validKnr.has(regionCode)) continue;
    let sum = 0;
    for (const lPos of Object.values(landIdx)) {
      const pos: Record<string, number> = {
        Region: rPos,
        InnvandrKat: 0,
        Landbakgrunn: lPos,
        ContentsCode: 0,
        Tid: 0,
      };
      const v = data.value[flatIndex(dimOrder.map((d) => pos[d]), sizes)];
      if (v != null) sum += v;
    }
    result.set(regionCode, sum);
  }
  console.log(`   → ${result.size} kommuner med flyktning-proxy-tall`);
  return result;
}

// ---- Update DB ------------------------------------------------------

async function updateMunicipalities(
  ungdom: Map<string, number>,
  innvandrere: Map<string, number>,
  flyktninger: Map<string, number>,
) {
  const supabase = createAdminClient();

  const updates: Array<{
    kommunenummer: string;
    antall_ungdom_13_19: number | null;
    antall_innvandrere: number | null;
    antall_flyktninger: number | null;
  }> = [];

  const allKnr = new Set([
    ...ungdom.keys(),
    ...innvandrere.keys(),
    ...flyktninger.keys(),
  ]);
  for (const knr of allKnr) {
    updates.push({
      kommunenummer: knr,
      antall_ungdom_13_19: ungdom.get(knr) ?? null,
      antall_innvandrere: innvandrere.get(knr) ?? null,
      antall_flyktninger: flyktninger.get(knr) ?? null,
    });
  }

  console.log(`→ Updating ${updates.length} kommuner (tre tilleggs-kolonner)`);
  // Bruker eksplisitt UPDATE per kommune. .upsert() med sparse cols vil ellers
  // INSERT med NULL-er og bryte NOT NULL-constraints på kommunenavn osv.
  for (let i = 0; i < updates.length; i++) {
    const u = updates[i];
    const { error } = await supabase
      .from("municipalities")
      .update({
        antall_ungdom_13_19: u.antall_ungdom_13_19,
        antall_innvandrere: u.antall_innvandrere,
        antall_flyktninger: u.antall_flyktninger,
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

  console.log("\n=== Tabell 07459 (ungdom 13-19) ===");
  const ungdom = await fetchUngdom13_19(validKnr);

  console.log("\n=== Tabell 09817 (innvandrere alle land) ===");
  const innvandrere = await fetchInnvandrere(validKnr);

  console.log("\n=== Tabell 09817 (flyktning-proxy: 13 klassiske flyktningland) ===");
  const flyktninger = await fetchFlyktningProxy(validKnr);

  console.log("\n=== Skriv til Supabase ===");
  await updateMunicipalities(ungdom, innvandrere, flyktninger);

  console.log("\n✓ Done.");
}

main().catch((err) => {
  console.error("✗ Feilet:", err);
  process.exit(1);
});
