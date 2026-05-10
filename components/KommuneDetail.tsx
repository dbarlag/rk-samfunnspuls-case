"use client";

import Link from "next/link";
import { Card, Heading, Tag } from "rk-designsystem";

import {
  ACTIVITY_CONFIGS,
  ACTIVITY_KEYS,
  type ActivityKey,
} from "@/lib/activities";
import type { CoverageRow } from "@/lib/coverage";
import type { Branch, Municipality } from "@/lib/database.types";

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
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "2rem 1.5rem 4rem",
      }}
    >
      <nav style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/"
          style={{
            color: "#555",
            textDecoration: "none",
            fontSize: "0.95rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          ← Tilbake til oversikt
        </Link>
      </nav>

      <header style={{ marginBottom: "2.5rem" }}>
        <p
          style={{
            color: "#777",
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontSize: "0.875rem",
            marginBottom: "0.5rem",
          }}
        >
          {kommune.fylkesnavn} • Kommune {kommune.kommunenummer}
        </p>
        <Heading level={1}>{kommune.kommunenavn}</Heading>
      </header>

      {/* Behov-tall per metrikk */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <Heading level={2}>Befolkning og humanitære behov</Heading>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
          }}
        >
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

      {/* Coverage status per aktivitet */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <Heading level={2}>Røde Kors-dekning per aktivitet</Heading>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
          }}
        >
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

      {/* Røde Kors-foreninger i kommunen */}
      <section>
        <div style={{ marginBottom: "1rem" }}>
          <Heading level={2}>
            Røde Kors i {kommune.kommunenavn} ({branches.length})
          </Heading>
        </div>

        {branches.length === 0 ? (
          <Card>
            <Card.Block>
              <p style={{ color: "#777" }}>
                Ingen aktive Røde Kors-foreninger registrert i denne kommunen.
              </p>
            </Card.Block>
          </Card>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "1rem",
            }}
          >
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
        <div
          style={{
            fontSize: "0.75rem",
            color: "#777",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "0.5rem",
            minHeight: "2.4rem",
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{value}</div>
        {source && (
          <div
            style={{
              marginTop: "0.5rem",
              fontSize: "0.75rem",
              color: "#999",
            }}
          >
            Kilde: {source}
          </div>
        )}
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
          style={{
            fontSize: "0.75rem",
            color: cov.no_coverage
              ? "var(--ds-color-accent-base-default, #D7282F)"
              : "#777",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "0.75rem",
          }}
        >
          {label}
        </div>
        {cov.no_coverage ? (
          <Tag data-color="danger">Ingen dekning</Tag>
        ) : (
          <>
            <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>
              {cov.antall_grupper}
            </div>
            <div style={{ color: "#777", fontSize: "0.875rem" }}>
              {cov.antall_grupper === 1 ? "gruppe" : "grupper"}
            </div>
            <div
              style={{
                marginTop: "0.75rem",
                fontSize: "0.875rem",
                color: "#555",
              }}
            >
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
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
            marginBottom: "0.75rem",
          }}
        >
          <div>
            <div style={{ fontSize: "1.125rem", fontWeight: 600 }}>
              {branch.name}
            </div>
            {branch.parent_name && (
              <div style={{ color: "#777", fontSize: "0.875rem" }}>
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
          <div style={{ marginBottom: "0.75rem" }}>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#777",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.5rem",
              }}
            >
              Aktiviteter ({activities.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {activities.map((a) => {
                const isHighlighted = ["Besøkstjeneste", "Leksehjelp", "Norsktrening"].includes(a);
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
          <div
            style={{
              display: "flex",
              gap: "1.25rem",
              flexWrap: "wrap",
              fontSize: "0.875rem",
              color: "#555",
            }}
          >
            {branch.email && (
              <a
                href={`mailto:${branch.email}`}
                style={{ color: "#555", textDecoration: "none" }}
              >
                ✉ {branch.email}
              </a>
            )}
            {branch.phone && (
              <a
                href={`tel:${branch.phone.replace(/\s+/g, "")}`}
                style={{ color: "#555", textDecoration: "none" }}
              >
                ☎ {branch.phone}
              </a>
            )}
            {branch.web && (
              <a
                href={branch.web}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "var(--ds-color-accent-base-default, #D7282F)",
                  textDecoration: "none",
                }}
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
