import { HomeView } from "@/components/HomeView";
import { type KommunePath } from "@/components/MunicipalityMap";
import { type ActivityKey } from "@/lib/activities";
import { apiFetch } from "@/lib/api-client";
import { type CoverageRow } from "@/lib/coverage";

// SSR — sidene rendres per request så self-fetch til /api/* fungerer
// (under build er ikke API-rutene ferdig deployet).
export const dynamic = "force-dynamic";

type CoverageAllResponse = {
  data: Record<ActivityKey, CoverageRow[]>;
};

type GeoResponse = {
  data: {
    paths: KommunePath[];
    viewBoxWidth: number;
    viewBoxHeight: number;
  };
};

export default async function HomePage() {
  const [coverage, geo] = await Promise.all([
    apiFetch<CoverageAllResponse>("/api/coverage"),
    apiFetch<GeoResponse>("/api/geo"),
  ]);

  return (
    <HomeView
      coverageByActivity={coverage.data}
      paths={geo.data.paths}
      viewBoxWidth={geo.data.viewBoxWidth}
      viewBoxHeight={geo.data.viewBoxHeight}
    />
  );
}
