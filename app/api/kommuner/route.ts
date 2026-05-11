import { getData } from "@/lib/data";

/**
 * GET /api/kommuner
 *
 * Liste over alle kommuner — kun identifikator + navn + fylke.
 * Brukes av `generateStaticParams` for å bygge detalj-sidene.
 */
export async function GET() {
  const { municipalities } = await getData();
  return Response.json(
    {
      data: municipalities.map((m) => ({
        kommunenummer: m.kommunenummer,
        kommunenavn: m.kommunenavn,
        fylkesnavn: m.fylkesnavn,
      })),
      meta: { count: municipalities.length },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
