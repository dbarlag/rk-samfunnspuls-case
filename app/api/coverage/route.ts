import { type NextRequest } from "next/server";

import { ACTIVITY_KEYS, type ActivityKey } from "@/lib/activities";
import { getData } from "@/lib/data";

/**
 * GET /api/coverage
 *
 * Uten activity-param: returnerer coverage for ALLE aktiviteter som
 * `{ activityKey: rows[] }`. Brukes av forsiden som trenger alle 4
 * for å mate kart, tabell og toggle.
 *
 * Med activity=<key>: returnerer kun den valgte aktiviteten som array.
 * Da gjelder også filter-params:
 *   - fylke=<navn>           filter på fylkesnavn
 *   - only_undekket=true     kun kommuner uten dekning
 *   - limit=<n>              antall rader
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const activityParam = searchParams.get("activity");
  const { coverageByActivity } = await getData();

  if (!activityParam) {
    return Response.json(
      {
        data: coverageByActivity,
        meta: {
          activities: ACTIVITY_KEYS,
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

  if (!ACTIVITY_KEYS.includes(activityParam as ActivityKey)) {
    return Response.json(
      {
        error: `Invalid activity. Must be one of: ${ACTIVITY_KEYS.join(", ")}`,
      },
      { status: 400 },
    );
  }

  let rows = coverageByActivity[activityParam as ActivityKey];

  const fylke = searchParams.get("fylke");
  const onlyUndekket = searchParams.get("only_undekket") === "true";
  const limit = Number(searchParams.get("limit")) || rows.length;

  if (fylke) {
    const f = fylke.toLowerCase().trim();
    rows = rows.filter((r) => r.fylkesnavn?.toLowerCase() === f);
  }
  if (onlyUndekket) {
    rows = rows.filter((r) => r.no_coverage);
  }
  rows = rows.slice(0, limit);

  return Response.json(
    {
      data: rows,
      meta: {
        activity: activityParam,
        count: rows.length,
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
