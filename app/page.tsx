import { HomeView } from "@/components/HomeView";
import { type KommunePath } from "@/components/MunicipalityMap";
import { type ActivityKey } from "@/lib/activities";
import { apiFetch } from "@/lib/api-client";
import { type CoverageRow } from "@/lib/coverage";

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
  // All data hentes via vårt eget API (server-side fetch).
  // Frontend gjør ingen direkte DB-kall.
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
