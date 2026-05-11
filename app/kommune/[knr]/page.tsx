import { notFound } from "next/navigation";

import { KommuneDetail } from "@/components/KommuneDetail";
import { ACTIVITY_KEYS, type ActivityKey } from "@/lib/activities";
import {
  computeNationalAverages,
  findRank,
  type CoverageRow,
  type NationalAverage,
} from "@/lib/coverage";
import { getData } from "@/lib/data";

export async function generateStaticParams() {
  const { municipalities } = await getData();
  return municipalities.map((m) => ({ knr: m.kommunenummer }));
}

export default async function KommunePage({
  params,
}: {
  params: Promise<{ knr: string }>;
}) {
  const { knr } = await params;
  const { municipalities, branches, activities, coverageByActivity } =
    await getData();

  const kommune = municipalities.find((m) => m.kommunenummer === knr);
  if (!kommune) notFound();

  const kommuneCoverage = {} as Record<ActivityKey, CoverageRow>;
  const nationalAverages = {} as Record<ActivityKey, NationalAverage>;
  const ranks = {} as Record<ActivityKey, number>;

  for (const key of ACTIVITY_KEYS) {
    const fullCoverage = coverageByActivity[key];
    const row = fullCoverage.find((c) => c.kommunenummer === knr);
    if (!row) notFound();
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

  return (
    <KommuneDetail
      kommune={kommune}
      coverageByActivity={kommuneCoverage}
      nationalAverages={nationalAverages}
      ranks={ranks}
      branches={kommuneBranches}
    />
  );
}
