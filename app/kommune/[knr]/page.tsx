import { notFound } from "next/navigation";

import { KommuneDetail } from "@/components/KommuneDetail";
import { getData } from "@/lib/data";

/**
 * Pre-genererer alle 357 detaljsider ved `next build` (full SSG).
 * Hver kommunenummer fra municipalities-tabellen blir et statisk endpoint.
 */
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
  const { municipalities, branches, activities, coverage } = await getData();

  const kommune = municipalities.find((m) => m.kommunenummer === knr);
  const cov = coverage.find((c) => c.kommunenummer === knr);
  if (!kommune || !cov) notFound();

  // Lokalforeninger + distrikter i denne kommunen, med deres aktiviteter
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
      coverage={cov}
      branches={kommuneBranches}
    />
  );
}
