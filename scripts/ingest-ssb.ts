/**
 * Ingest SSB tabell 06844 → municipalities-tabell.
 *
 * Henter "Personer 67 år og over i privathusholdninger" per kommune,
 * splittet på alder (67-79, 80+) og bofelleskap (Aleneboende).
 *
 * Kjøres med: npm run ingest:ssb
 */

import { readFileSync } from "node:fs";
import { createAdminClient } from "../lib/supabase";
import type { MunicipalityInsert } from "../lib/database.types";

// ---- Konstanter ------------------------------------------------------

const SSB_TABLE_URL = "https://data.ssb.no/api/v0/no/table/06844";

const SSB_QUERY = {
  query: [
    {
      code: "Region",
      selection: { filter: "all", values: ["*"] },
    },
    {
      code: "Alder",
      selection: { filter: "item", values: ["67-79", "80+"] },
    },
    {
      code: "ContentsCode",
      selection: { filter: "item", values: ["Aleneboende"] },
    },
    {
      code: "Tid",
      selection: { filter: "top", values: ["1"] },
    },
  ],
  response: { format: "json-stat2" },
};

// 2024-fylkesnumre (15 fylker etter siste reform)
const FYLKE_MAP: Record<string, string> = {
  "03": "Oslo",
  "11": "Rogaland",
  "15": "Møre og Romsdal",
  "18": "Nordland",
  "31": "Østfold",
  "32": "Akershus",
  "33": "Buskerud",
  "34": "Innlandet",
  "39": "Vestfold",
  "40": "Telemark",
  "42": "Agder",
  "46": "Vestland",
  "50": "Trøndelag",
  "55": "Troms",
  "56": "Finnmark",
};

// ---- JSON-stat2 helpers ---------------------------------------------

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

function flatIndex(positions: number[], sizes: number[]): number {
  let idx = 0;
  for (let i = 0; i < positions.length; i++) {
    let multiplier = 1;
    for (let j = i + 1; j < sizes.length; j++) multiplier *= sizes[j];
    idx += positions[i] * multiplier;
  }
  return idx;
}

// ---- Hovedlogikk ----------------------------------------------------

async function fetchSSB(): Promise<JsonStat2> {
  console.log("→ POST", SSB_TABLE_URL);
  const res = await fetch(SSB_TABLE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(SSB_QUERY),
  });
  if (!res.ok) {
    throw new Error(`SSB returnerte ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as JsonStat2;
}

/**
 * Last GeoJSON og bygg sett av gyldige 2024-kommunenummer.
 * SSB returnerer historiske/merged kommuner (med "(-2019)" o.l. i navnet)
 * som ikke har polygoner i kartet — vi vil ikke ha dem i DB.
 */
function loadValidKommunenummer(): Set<string> {
  const geojson = JSON.parse(
    readFileSync("public/geo/kommuner-2024.geojson", "utf-8"),
  ) as { features: Array<{ properties: { kommunenummer: string } }> };
  return new Set(geojson.features.map((f) => f.properties.kommunenummer));
}

function parseToRows(
  data: JsonStat2,
  validKnr: Set<string>,
): MunicipalityInsert[] {
  const dimOrder = data.id; // f.eks. ["Region", "Alder", "ContentsCode", "Tid"]
  const sizes = data.size;

  const regionDim = data.dimension.Region.category;
  const alderDim = data.dimension.Alder.category;
  const tidDim = data.dimension.Tid.category;

  // Hent året (Tid har bare én verdi pga. "filter: top, values: 1")
  const tidLabel = Object.values(tidDim.label)[0];
  const dataYear = parseInt(String(tidLabel), 10);
  console.log(`→ Data fra år: ${dataYear}`);

  // Bygg position-mappers per dimensjon
  const dimPos: Record<string, number> = {};

  const rows: MunicipalityInsert[] = [];
  let skipped = 0;

  for (const [regionCode, regionPos] of Object.entries(regionDim.index)) {
    const regionLabel = regionDim.label[regionCode] ?? regionCode;

    // Filter: kun nåværende 2024-kommuner (autoritativ liste fra GeoJSON).
    // Dette filtrerer bort 60+ historiske/merged kommuner som SSB beholder
    // for tidsserier (f.eks. "1502 Molde (-2019)").
    if (!validKnr.has(regionCode)) {
      skipped++;
      continue;
    }
    const fylkesnummer = regionCode.substring(0, 2);
    const fylkesnavn = FYLKE_MAP[fylkesnummer] ?? null;

    // Hent verdier for hver aldersgruppe
    let antall_67_79_alene: number | null = null;
    let antall_80plus_alene: number | null = null;

    for (const [alderCode, alderPos] of Object.entries(alderDim.index)) {
      dimPos.Region = regionPos;
      dimPos.Alder = alderPos;
      dimPos.ContentsCode = 0;
      dimPos.Tid = 0;
      const positions = dimOrder.map((d) => dimPos[d]);
      const v = data.value[flatIndex(positions, sizes)];

      if (alderCode === "067-079" || alderCode === "67-79") {
        antall_67_79_alene = v;
      } else if (alderCode === "F80" || alderCode === "80+") {
        antall_80plus_alene = v;
      }
    }

    rows.push({
      kommunenummer: regionCode,
      kommunenavn: regionLabel,
      kommunenavn_normalized: regionLabel.toLowerCase().trim(),
      fylkesnummer,
      fylkesnavn,
      antall_67_79_alene,
      antall_80plus_alene,
      total_befolkning: null,
      data_year: dataYear,
    });
  }

  console.log(
    `→ Ferdig parset: ${rows.length} kommuner (hoppet over ${skipped} ikke-kommune-rader)`,
  );
  return rows;
}

async function upsertMunicipalities(rows: MunicipalityInsert[]) {
  const supabase = createAdminClient();
  console.log(`→ Upserting ${rows.length} rader til municipalities...`);

  // Batch i bolker av 200 for å unngå evt. timeout / payload-grenser
  const batchSize = 200;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from("municipalities")
      .upsert(batch, { onConflict: "kommunenummer" });
    if (error) {
      console.error("Supabase upsert-feil:", error);
      throw error;
    }
    console.log(
      `   ${Math.min(i + batchSize, rows.length)}/${rows.length}`,
    );
  }
}

async function cleanupStaleRows(validKnr: Set<string>) {
  const supabase = createAdminClient();
  const { data: existing, error } = await supabase
    .from("municipalities")
    .select("kommunenummer");
  if (error) throw error;

  const stale = existing
    .map((r) => r.kommunenummer)
    .filter((knr) => !validKnr.has(knr));

  if (stale.length === 0) {
    console.log("→ Ingen stale rader å slette");
    return;
  }

  console.log(`→ Sletter ${stale.length} stale rader (ikke i 2024-listen)`);
  const { error: delError } = await supabase
    .from("municipalities")
    .delete()
    .in("kommunenummer", stale);
  if (delError) throw delError;
}

async function main() {
  const validKnr = loadValidKommunenummer();
  console.log(`→ Gyldige 2024-kommuner (fra GeoJSON): ${validKnr.size}`);

  const data = await fetchSSB();
  console.log(`→ Dimensjoner: ${data.id.join(", ")}`);
  console.log(`→ Sizes:       ${data.size.join(" × ")}`);
  console.log(
    `→ Aldersgrupper i respons:`,
    Object.keys(data.dimension.Alder.category.index),
  );

  const rows = parseToRows(data, validKnr);

  if (rows.length === 0) {
    throw new Error(
      "Ingen rader å skrive — sjekk at parsingen faktisk fant kommuner.",
    );
  }
  console.log("→ Eksempel første rad:", rows[0]);

  await upsertMunicipalities(rows);
  await cleanupStaleRows(validKnr);
  console.log("✓ Done.");
}

main().catch((err) => {
  console.error("✗ Feilet:", err);
  process.exit(1);
});
