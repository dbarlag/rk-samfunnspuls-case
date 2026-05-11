import { notFound } from "next/navigation";

import { KommuneDetail } from "@/components/KommuneDetail";
import { type ActivityKey } from "@/lib/activities";
import { apiFetch } from "@/lib/api-client";
import { type CoverageRow, type NationalAverage } from "@/lib/coverage";
import { type Branch, type Municipality } from "@/lib/database.types";

// SSR — sidene rendres per request så self-fetch til /api/* fungerer.
export const dynamic = "force-dynamic";

type KommuneDetailResponse = {
  data: {
    kommune: Municipality;
    coverageByActivity: Record<ActivityKey, CoverageRow>;
    nationalAverages: Record<ActivityKey, NationalAverage>;
    ranks: Record<ActivityKey, number>;
    branches: Array<{ branch: Branch; activities: string[] }>;
  };
};

export default async function KommunePage({
  params,
}: {
  params: Promise<{ knr: string }>;
}) {
  const { knr } = await params;

  try {
    const { data } = await apiFetch<KommuneDetailResponse>(
      `/api/kommune/${knr}`,
    );
    return (
      <KommuneDetail
        kommune={data.kommune}
        coverageByActivity={data.coverageByActivity}
        nationalAverages={data.nationalAverages}
        ranks={data.ranks}
        branches={data.branches}
      />
    );
  } catch {
    notFound();
  }
}
