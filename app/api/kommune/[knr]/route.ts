import { type NextRequest } from "next/server";

import { ACTIVITY_KEYS, type ActivityKey } from "@/lib/activities";
import {
  computeNationalAverages,
  findRank,
  type CoverageRow,
  type NationalAverage,
} from "@/lib/coverage";
import { getData } from "@/lib/data";

/**
 * GET /api/kommune/[knr]
 *
 * Komplett dataset for én kommune-detaljside:
 *   - kommune-rad (Municipality)
 *   - coverage per aktivitet (én rad per aktivitet)
 *   - nasjonalt snitt + plass-rangering per aktivitet
 *   - alle lokalforeninger i kommunen + deres aktiviteter
 *
 * Returns 404 hvis kommunenummer ikke finnes.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ knr: string }> },
) {
  const { knr } = await params;
  const { municipalities, branches, activities, coverageByActivity } =
    await getData();

  const kommune = municipalities.find((m) => m.kommunenummer === knr);
  if (!kommune) {
    return Response.json({ error: "Kommune ikke funnet" }, { status: 404 });
  }

  const kommuneCoverage = {} as Record<ActivityKey, CoverageRow>;
  const nationalAverages = {} as Record<ActivityKey, NationalAverage>;
  const ranks = {} as Record<ActivityKey, number>;

  for (const key of ACTIVITY_KEYS) {
    const fullCoverage = coverageByActivity[key];
    const row = fullCoverage.find((c) => c.kommunenummer === knr);
    if (!row) {
      return Response.json(
        { error: `Mangler coverage-data for ${key}` },
        { status: 500 },
      );
    }
    kommuneCoverage[key] = row;
    nationalAverages[key] = computeNationalAverages(fullCoverage);
    ranks[key] = findRank(fullCoverage, knr) ?? 0;
  }

  const kommuneBranches = branches
    .filter((b) => b.kommunenummer === knr)
    .map((branch) => ({
      branch,
      activities: Array.from(
        new Set(
          activities
            .filter((a) => a.branch_id === branch.branch_id)
            .map((a) => a.activity_name),
        ),
      ).sort(),
    }))
    .sort((a, b) => a.branch.name.localeCompare(b.branch.name, "nb"));

  return Response.json(
    {
      data: {
        kommune,
        coverageByActivity: kommuneCoverage,
        nationalAverages,
        ranks,
        branches: kommuneBranches,
      },
      meta: {
        kommunenummer: knr,
        data_year: 2026,
        fetched_at: new Date().toISOString(),
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
