import { type NextRequest } from "next/server";

import { getData } from "@/lib/data";

/**
 * GET /api/coverage
 *
 * Eksponerer dekningsgap-listen som et JSON-API. Oppfyller oppgavens krav om
 * "API som server data" mellom database og frontend.
 *
 * Query params:
 *   - fylke=<navn>          filter på fylkesnavn (eks. ?fylke=Akershus)
 *   - only_undekket=true    kun kommuner uten besøkstjeneste
 *   - limit=<n>             antall rader (default alle 357)
 *
 * Response:
 *   {
 *     "data":  [ { kommunenummer, kommunenavn, fylkesnavn,
 *                  antall_67plus_alene, antall_besokstjenester,
 *                  no_coverage, need_per_service }, ... ],
 *     "meta":  { count, data_year, fetched_at }
 *   }
 */
export async function GET(req: NextRequest) {
  const { coverage } = await getData();

  const { searchParams } = req.nextUrl;
  const fylke = searchParams.get("fylke");
  const onlyUndekket = searchParams.get("only_undekket") === "true";
  const limit = Number(searchParams.get("limit")) || coverage.length;

  let rows = coverage;
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
        count: rows.length,
        data_year: 2025,
        fetched_at: new Date().toISOString(),
      },
    },
    {
      headers: {
        // Cache i 1 time ved CDN, revalidate ved bygg
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
