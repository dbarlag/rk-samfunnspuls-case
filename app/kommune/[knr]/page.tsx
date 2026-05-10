import { notFound } from "next/navigation";

import { KommuneDetail } from "@/components/KommuneDetail";
import { ACTIVITY_KEYS, type ActivityKey } from "@/lib/activities";
import type { CoverageRow } from "@/lib/coverage";
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

  // Plukk ut coverage-rad for denne kommunen for hver aktivitet
  const kommuneCoverage = {} as Record<ActivityKey, CoverageRow>;
  for (const key of ACTIVITY_KEYS) {
    const row = coverageByActivity[key].find(
      (c) => c.kommunenummer === knr,
    );
    if (!row) notFound();
    kommuneCoverage[key] = row;
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
      branches={kommuneBranches}
    />
  );
}
