/**
 * Ingest data/redcross-organizations.json → red_cross_branches + branch_activities.
 *
 * Filtrerer til kun aktive Lokalforeninger. Slår opp kommunenummer ved å matche
 * på normalisert kommune-navn mot municipalities-tabellen.
 *
 * Kjøres med: npm run ingest:redcross
 */

import { readFileSync } from "node:fs";
import { createAdminClient } from "../lib/supabase";
import type { BranchInsert, BranchActivity } from "../lib/database.types";

const JSON_PATH = "data/redcross-organizations.json";

// ---- Typer som matcher RK-JSON-strukturen ---------------------------

type RkBranch = {
  branchId: string;
  branchNumber?: string;
  branchType: string;
  branchName: string;
  branchStatus: { isActive: boolean; isTerminated: boolean };
  branchParent?: { branchName?: string };
  branchLocation?: {
    municipality?: string;
    county?: string;
    postalAddress?: { postalCode?: string };
  };
  communicationChannels?: { phone?: string; email?: string; web?: string };
  branchActivities?: Array<{ globalActivityName: string }>;
};

type RkJson = { data: { branches: RkBranch[] } };

// ---- Logikk --------------------------------------------------------

function loadJson(): RkBranch[] {
  const json = JSON.parse(readFileSync(JSON_PATH, "utf-8")) as RkJson;
  return json.data.branches;
}

type KommuneCandidate = { knr: string; county: string | null };

/**
 * Bygg lookup-map fra kommunenavn → kandidater.
 *
 * SSB returnerer flerspråklige navn ("Trondheim - Tråante",
 * "Guovdageaidnu - Kautokeino") og parenteser ved tvetydighet
 * ("Herøy (Møre og Romsdal)"). Vi indekserer alle varianter.
 *
 * Verdi er en LISTE fordi enkelte navn (f.eks. "herøy") matcher
 * flere kommuner. Da disambiguerer vi på fylke ved oppslag.
 */
async function buildKommuneMap(): Promise<Map<string, KommuneCandidate[]>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("municipalities")
    .select("kommunenummer, kommunenavn, fylkesnavn");
  if (error) throw error;

  const map = new Map<string, KommuneCandidate[]>();

  const addVariant = (name: string, candidate: KommuneCandidate) => {
    const norm = name.toLowerCase().trim();
    if (!norm) return;
    const list = map.get(norm) ?? [];
    if (!list.some((c) => c.knr === candidate.knr)) list.push(candidate);
    map.set(norm, list);
  };

  for (const m of data) {
    const cand = { knr: m.kommunenummer, county: m.fylkesnavn };

    // Variant 1: full navn
    addVariant(m.kommunenavn, cand);

    // Variant 2: hver del split på " - " (bilingual)
    for (const part of m.kommunenavn.split(" - ")) {
      addVariant(part, cand);

      // Variant 3: strip parentes ("Herøy (Møre og Romsdal)" → "Herøy")
      const stripped = part.replace(/\s*\([^)]*\)\s*/g, "").trim();
      if (stripped !== part.trim()) addVariant(stripped, cand);
    }
  }

  return map;
}

function lookupKommune(
  map: Map<string, KommuneCandidate[]>,
  name: string,
  county: string | null,
): string | null {
  const norm = name.toLowerCase().trim();
  const candidates = map.get(norm);
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0].knr;

  // Disambiguer på fylke
  if (county) {
    const countyNorm = county.toLowerCase().trim();
    const byCounty = candidates.find(
      (c) => c.county?.toLowerCase().trim() === countyNorm,
    );
    if (byCounty) return byCounty.knr;
  }
  // Tvetydig og ingen county-match → første kandidat (med warning)
  console.warn(
    `⚠ Tvetydig kommunenavn "${name}" (county=${county}). Velger ${candidates[0].knr}.`,
  );
  return candidates[0].knr;
}

function transform(
  raw: RkBranch[],
  kommuneMap: Map<string, KommuneCandidate[]>,
): { branches: BranchInsert[]; activities: BranchActivity[] } {
  const branches: BranchInsert[] = [];
  const activities: BranchActivity[] = [];
  const seenActivities = new Set<string>();
  const unmatched: string[] = [];

  for (const b of raw) {
    if (b.branchType !== "Lokalforening") continue;
    if (!b.branchStatus.isActive) continue;

    const muniRaw = b.branchLocation?.municipality?.trim() ?? null;
    const county = b.branchLocation?.county ?? null;
    const knr = muniRaw ? lookupKommune(kommuneMap, muniRaw, county) : null;

    if (muniRaw && !knr) {
      unmatched.push(`${b.branchId} ${b.branchName} → ${muniRaw} (${county})`);
    }

    branches.push({
      branch_id: b.branchId,
      branch_number: b.branchNumber ?? null,
      name: b.branchName,
      branch_type: b.branchType,
      parent_name: b.branchParent?.branchName ?? null,
      municipality_name: muniRaw,
      kommunenummer: knr,
      county: b.branchLocation?.county ?? null,
      postal_code: b.branchLocation?.postalAddress?.postalCode ?? null,
      email: b.communicationChannels?.email ?? null,
      phone: b.communicationChannels?.phone ?? null,
      web: b.communicationChannels?.web ?? null,
      is_active: true,
    });

    for (const a of b.branchActivities ?? []) {
      const key = `${b.branchId}|${a.globalActivityName}`;
      if (seenActivities.has(key)) continue;
      seenActivities.add(key);
      activities.push({
        branch_id: b.branchId,
        activity_name: a.globalActivityName,
      });
    }
  }

  if (unmatched.length > 0) {
    console.warn(
      `⚠ ${unmatched.length} lokalforeninger uten kommune-match:`,
    );
    unmatched.forEach((u) => console.warn(`   ${u}`));
  }

  return { branches, activities };
}

const BATCH_SIZE = 200;

async function upsertBranches(rows: BranchInsert[]) {
  const supabase = createAdminClient();
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("red_cross_branches")
      .upsert(batch, { onConflict: "branch_id" });
    if (error) {
      console.error("Feil ved red_cross_branches:", error);
      throw error;
    }
    console.log(`   ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }
}

async function insertActivities(rows: BranchActivity[]) {
  const supabase = createAdminClient();
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("branch_activities").insert(batch);
    if (error) {
      console.error("Feil ved branch_activities:", error);
      throw error;
    }
    console.log(`   ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }
}

async function syncToDb(
  branches: BranchInsert[],
  activities: BranchActivity[],
) {
  const supabase = createAdminClient();

  // 1. Upsert branches (oppdater eksisterende, sett inn nye)
  console.log(`→ Upserting ${branches.length} branches...`);
  await upsertBranches(branches);

  // 2. Slett stale branches (de som ikke er i denne kjøringen).
  //    branch_activities har ON DELETE CASCADE → ryddes med
  const validIds = new Set(branches.map((b) => b.branch_id));
  const { data: existing, error: selErr } = await supabase
    .from("red_cross_branches")
    .select("branch_id");
  if (selErr) throw selErr;
  const stale = existing
    .map((b) => b.branch_id)
    .filter((id) => !validIds.has(id));
  if (stale.length > 0) {
    console.log(`→ Sletter ${stale.length} stale branches (cascader til activities)`);
    const { error } = await supabase
      .from("red_cross_branches")
      .delete()
      .in("branch_id", stale);
    if (error) throw error;
  }

  // 3. Slett alle activities for current branches og re-insert fra scratch.
  //    Enklest måte å håndtere "hvilke aktiviteter er fjernet siden sist".
  console.log(`→ Resetter activities for ${branches.length} branches...`);
  const { error: delErr } = await supabase
    .from("branch_activities")
    .delete()
    .in("branch_id", [...validIds]);
  if (delErr) throw delErr;

  console.log(`→ Inserting ${activities.length} activities...`);
  await insertActivities(activities);
}

async function main() {
  const raw = loadJson();
  console.log(`→ Lastet ${raw.length} branches fra JSON`);

  const kommuneMap = await buildKommuneMap();
  console.log(`→ Bygget kommune-map med ${kommuneMap.size} oppslag`);

  const { branches, activities } = transform(raw, kommuneMap);
  console.log(
    `→ Etter filtrering: ${branches.length} aktive lokalforeninger, ${activities.length} aktivitets-instanser`,
  );

  // Sample
  console.log("→ Eksempel branch:", branches[0]);

  await syncToDb(branches, activities);
  console.log("✓ Done.");
}

main().catch((err) => {
  console.error("✗ Feilet:", err);
  process.exit(1);
});
