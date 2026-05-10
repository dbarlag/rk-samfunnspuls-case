import { type NextRequest } from "next/server";

import { ACTIVITY_KEYS, type ActivityKey } from "@/lib/activities";
import { getData } from "@/lib/data";

/**
 * GET /api/coverage
 *
 * Eksponerer dekningsgap-listen som et JSON-API.
 *
 * Query params:
 *   - activity=<key>         besokstjeneste | leksehjelp | norsktrening
 *                            (default: besokstjeneste)
 *   - fylke=<navn>           filter på fylkesnavn
 *   - only_undekket=true     kun kommuner uten dekning for valgt aktivitet
 *   - limit=<n>              antall rader (default alle)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const activityParam = (searchParams.get("activity") ??
    "besokstjeneste") as ActivityKey;

  if (!ACTIVITY_KEYS.includes(activityParam)) {
    return Response.json(
      {
        error: `Invalid activity. Must be one of: ${ACTIVITY_KEYS.join(", ")}`,
      },
      { status: 400 },
    );
  }

  const { coverageByActivity } = await getData();
  let rows = coverageByActivity[activityParam];

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
