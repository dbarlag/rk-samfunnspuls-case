"use client";

import Link from "next/link";
import { Card, Heading, Paragraph, Tag } from "rk-designsystem";

import {
  ACTIVITY_CONFIGS,
  ACTIVITY_KEYS,
  type ActivityKey,
} from "@/lib/activities";
import type { CoverageRow } from "@/lib/coverage";
import type { Branch, Municipality } from "@/lib/database.types";
import styles from "./KommuneDetail.module.css";

const HIGHLIGHTED_ACTIVITIES = new Set(
  ACTIVITY_KEYS.map((k) => ACTIVITY_CONFIGS[k].activityName as string),
);

type Props = {
  kommune: Municipality;
  coverageByActivity: Record<ActivityKey, CoverageRow>;
  branches: Array<{
    branch: Branch;
    activities: string[];
  }>;
};

export function KommuneDetail({
  kommune,
  coverageByActivity,
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
            return (
              <StatCard
                key={key}
                label={cfg.needLabelLong}
                value={need.toLocaleString("nb-NO")}
                source={cfg.needSource}
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
            return (
              <CoverageCard
                key={key}
                label={cfg.label}
                needLabel={cfg.needLabel}
                cov={cov}
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

function StatCard({
  label,
  value,
  source,
}: {
  label: string;
  value: string;
  source?: string;
}) {
  return (
    <Card>
      <Card.Block>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.statValue}>{value}</div>
        {source && <div className={styles.statSource}>Kilde: {source}</div>}
      </Card.Block>
    </Card>
  );
}

function CoverageCard({
  label,
  needLabel,
  cov,
}: {
  label: string;
  needLabel: string;
  cov: CoverageRow;
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
          <Tag data-color="danger">Ingen dekning</Tag>
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
