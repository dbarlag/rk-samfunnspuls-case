"use client";

import Link from "next/link";
import { Card, Heading, Paragraph, Tag } from "rk-designsystem";

import {
  ACTIVITY_CONFIGS,
  ACTIVITY_KEYS,
  type ActivityKey,
} from "@/lib/activities";
import type { CoverageRow, NationalAverage } from "@/lib/coverage";
import type { Branch, Municipality } from "@/lib/database.types";
import styles from "./KommuneDetail.module.css";

const HIGHLIGHTED_ACTIVITIES = new Set(
  ACTIVITY_KEYS.map((k) => ACTIVITY_CONFIGS[k].activityName as string),
);

type Props = {
  kommune: Municipality;
  coverageByActivity: Record<ActivityKey, CoverageRow>;
  nationalAverages: Record<ActivityKey, NationalAverage>;
  ranks: Record<ActivityKey, number>;
  branches: Array<{
    branch: Branch;
    activities: string[];
  }>;
};

export function KommuneDetail({
  kommune,
  coverageByActivity,
  nationalAverages,
  ranks,
  branches,
}: Props) {
  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.backLink}>
          ← Tilbake til oversikt
        </Link>
      </nav>

      <header className={styles.header}>
        <div className={styles.eyebrow}>
          {kommune.fylkesnavn} • Kommune {kommune.kommunenummer}
        </div>
        <Heading level={1}>{kommune.kommunenavn}</Heading>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <Heading level={2} data-size="md">
            Befolkning og humanitære behov
          </Heading>
        </div>
        <div className={styles.cardGrid}>
          {ACTIVITY_KEYS.map((key) => {
            const cfg = ACTIVITY_CONFIGS[key];
            const need = cfg.needAccessor(kommune);
            const avg = nationalAverages[key];
            return (
              <StatCard
                key={key}
                label={cfg.needLabelLong}
                value={need.toLocaleString("nb-NO")}
                source={cfg.needSource}
                comparison={describeComparison(need, avg.meanNeedPerKommune)}
              />
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <Heading level={2} data-size="md">
            Røde Kors-dekning per aktivitet
          </Heading>
        </div>
        <div className={styles.cardGrid}>
          {ACTIVITY_KEYS.map((key) => {
            const cfg = ACTIVITY_CONFIGS[key];
            const cov = coverageByActivity[key];
            const avg = nationalAverages[key];
            const rank = ranks[key];
            return (
              <CoverageCard
                key={key}
                label={cfg.label}
                needLabel={cfg.needLabel}
                cov={cov}
                avg={avg}
                rank={rank}
              />
            );
          })}
        </div>
      </section>

      <section>
        <div className={styles.sectionHeading}>
          <Heading level={2} data-size="md">
            Røde Kors i {kommune.kommunenavn} ({branches.length})
          </Heading>
        </div>

        {branches.length === 0 ? (
          <Card>
            <Card.Block>
              <Paragraph data-size="sm">
                Ingen aktive Røde Kors-foreninger registrert i denne kommunen.
              </Paragraph>
            </Card.Block>
          </Card>
        ) : (
          <div className={styles.branchList}>
            {branches.map(({ branch, activities }) => (
              <BranchCard
                key={branch.branch_id}
                branch={branch}
                activities={activities}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

type Comparison = {
  text: string;
  variant: "above" | "below" | "neutral";
};

/**
 * Beskriv om en verdi er over/under nasjonalt snitt.
 *
 * For BEHOV: høyere = mer behov = "over snitt" (rødt — handlingsrettet).
 * Lavere = mindre behov = "under snitt" (grønt — mindre kritisk).
 */
function describeComparison(value: number, mean: number): Comparison | null {
  if (mean === 0 || value === 0) return null;
  const ratio = value / mean;
  const pct = Math.round((ratio - 1) * 100);
  if (Math.abs(pct) < 5) {
    return { text: `≈ nasjonalt snitt (${formatNumber(mean)})`, variant: "neutral" };
  }
  if (pct > 0) {
    return {
      text: `+${pct}% over snitt (${formatNumber(mean)})`,
      variant: "above",
    };
  }
  return {
    text: `${pct}% under snitt (${formatNumber(mean)})`,
    variant: "below",
  };
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("nb-NO");
}

function StatCard({
  label,
  value,
  source,
  comparison,
}: {
  label: string;
  value: string;
  source?: string;
  comparison?: Comparison | null;
}) {
  return (
    <Card>
      <Card.Block>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.statValue}>{value}</div>
        {comparison && (
          <div className={styles.statBenchmark}>
            <span className={benchmarkClass(comparison.variant)}>
              {comparison.text}
            </span>
          </div>
        )}
        {source && <div className={styles.statSource}>Kilde: {source}</div>}
      </Card.Block>
    </Card>
  );
}

function benchmarkClass(variant: Comparison["variant"]): string {
  if (variant === "above") return styles.benchmarkAbove;
  if (variant === "below") return styles.benchmarkBelow;
  return styles.benchmarkNeutral;
}

function CoverageCard({
  label,
  needLabel,
  cov,
  avg,
  rank,
}: {
  label: string;
  needLabel: string;
  cov: CoverageRow;
  avg: NationalAverage;
  rank: number;
}) {
  return (
    <Card variant={cov.no_coverage ? "tinted" : "default"}>
      <Card.Block>
        <div
          className={
            cov.no_coverage ? styles.coverageLabelDanger : styles.coverageLabel
          }
        >
          {label}
        </div>
        {cov.no_coverage ? (
          <>
            <Tag data-color="danger">Ingen dekning</Tag>
            <div className={styles.coverageBenchmark}>
              {avg.totalUncovered} av {avg.totalKommuner} kommuner mangler
              dekning. Plass {rank} av {avg.totalKommuner} i prioritet.
            </div>
          </>
        ) : (
          <>
            <div className={styles.coverageValue}>{cov.antall_grupper}</div>
            <div className={styles.coverageUnit}>
              {cov.antall_grupper === 1 ? "gruppe" : "grupper"}
            </div>
            <div className={styles.coverageDescription}>
              ≈{" "}
              {Math.round(cov.need_per_service ?? 0).toLocaleString("nb-NO")}{" "}
              {needLabel} per gruppe
            </div>
            <div className={styles.coverageBenchmark}>
              Nasjonalt snitt:{" "}
              <strong>
                ≈ {formatNumber(avg.meanNeedPerService)} per gruppe
              </strong>{" "}
              · plass {rank} av {avg.totalKommuner}
            </div>
          </>
        )}
      </Card.Block>
    </Card>
  );
}

function BranchCard({
  branch,
  activities,
}: {
  branch: Branch;
  activities: string[];
}) {
  return (
    <Card>
      <Card.Block>
        <div className={styles.branchHeader}>
          <div>
            <div className={styles.branchName}>{branch.name}</div>
            {branch.parent_name && (
              <div className={styles.branchParent}>
                Underlagt {branch.parent_name}
              </div>
            )}
          </div>
          <Tag
            data-color={branch.branch_type === "Distrikt" ? "info" : "neutral"}
          >
            {branch.branch_type}
          </Tag>
        </div>

        {activities.length > 0 && (
          <div className={styles.branchActivities}>
            <div className={styles.activitiesLabel}>
              Aktiviteter ({activities.length})
            </div>
            <div className={styles.activitiesTags}>
              {activities.map((a) => {
                const isHighlighted = HIGHLIGHTED_ACTIVITIES.has(a);
                return (
                  <Tag
                    key={a}
                    data-color={isHighlighted ? "success" : "neutral"}
                    variant="outline"
                  >
                    {a}
                  </Tag>
                );
              })}
            </div>
          </div>
        )}

        {(branch.email || branch.phone || branch.web) && (
          <div className={styles.contactRow}>
            {branch.email && (
              <a href={`mailto:${branch.email}`} className={styles.contactLink}>
                ✉ {branch.email}
              </a>
            )}
            {branch.phone && (
              <a
                href={`tel:${branch.phone.replace(/\s+/g, "")}`}
                className={styles.contactLink}
              >
                ☎ {branch.phone}
              </a>
            )}
            {branch.web && (
              <a
                href={branch.web}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.webLink}
              >
                🔗 nettside ↗
              </a>
            )}
          </div>
        )}
      </Card.Block>
    </Card>
  );
}
