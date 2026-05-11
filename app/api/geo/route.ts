import { getKommunePaths, MAP_HEIGHT, MAP_WIDTH } from "@/lib/geo";

/**
 * GET /api/geo
 *
 * Eksponerer kommune-grensene som forhånds-projiserte SVG-paths.
 * Frontend bruker dette til å rendre Norgeskartet uten å laste hele
 * GeoJSON-en (~1 MB) i klienten.
 */
export async function GET() {
  const pathsMap = getKommunePaths();
  const paths = Array.from(pathsMap.entries()).map(([knr, { name, d }]) => ({
    knr,
    name,
    d,
  }));

  return Response.json(
    {
      data: {
        paths,
        viewBoxWidth: MAP_WIDTH,
        viewBoxHeight: MAP_HEIGHT,
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
