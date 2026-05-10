"use client";

import Link from "next/link";
import { Card, Heading, Tag } from "rk-designsystem";

import type { CoverageRow } from "@/lib/coverage";
import type { Branch, Municipality } from "@/lib/database.types";

type Props = {
  kommune: Municipality;
  coverage: CoverageRow;
  branches: Array<{
    branch: Branch;
    activities: string[];
  }>;
};

export function KommuneDetail({ kommune, coverage, branches }: Props) {
  const totalActivities = new Set(
    branches.flatMap((b) => b.activities),
  );

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

      {/* Befolkningsstats */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <Heading level={2}>Befolkning som bor alene (67+)</Heading>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
          }}
        >
          <StatCard
            label="Aldersgruppe 67–79"
            value={(kommune.antall_67_79_alene ?? 0).toLocaleString("nb-NO")}
          />
          <StatCard
            label="Aldersgruppe 80+"
            value={(kommune.antall_80plus_alene ?? 0).toLocaleString("nb-NO")}
          />
          <StatCard
            label="Total 67+ alene"
            value={kommune.antall_67plus_alene.toLocaleString("nb-NO")}
            highlight
          />
        </div>
        <p style={{ marginTop: "0.75rem", color: "#777", fontSize: "0.875rem" }}>
          Datakilde: SSB tabell 06844 ({kommune.data_year ?? "—"})
        </p>
      </section>

      {/* Coverage status */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <Heading level={2}>Besøkstjeneste-dekning</Heading>
        </div>
        <Card variant={coverage.no_coverage ? "tinted" : "default"}>
          <Card.Block>
            {coverage.no_coverage ? (
              <div>
                <Tag data-color="danger">Ingen besøkstjeneste</Tag>
                <p style={{ marginTop: "0.75rem", color: "#555" }}>
                  Ingen aktive Røde Kors-grupper tilbyr besøkstjeneste i denne
                  kommunen i dag. {totalActivities.size > 0 && (
                    <>
                      Kommunen har imidlertid {branches.length} aktiv
                      {branches.length !== 1 ? "e" : ""} lokalforening
                      {branches.length !== 1 ? "er" : ""} med andre
                      aktiviteter — utvidelses-potensial.
                    </>
                  )}
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  gap: "2rem",
                  alignItems: "baseline",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: "2rem", fontWeight: 700 }}>
                    {coverage.antall_besokstjenester}
                  </div>
                  <div style={{ color: "#777", fontSize: "0.875rem" }}>
                    grupper med besøkstjeneste
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "2rem", fontWeight: 700 }}>
                    ≈ {Math.round(coverage.need_per_service ?? 0).toLocaleString(
                      "nb-NO",
                    )}
                  </div>
                  <div style={{ color: "#777", fontSize: "0.875rem" }}>
                    eldre alene per gruppe
                  </div>
                </div>
              </div>
            )}
          </Card.Block>
        </Card>
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
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card variant={highlight ? "tinted" : "default"}>
      <Card.Block>
        <div
          style={{
            fontSize: "0.75rem",
            color: highlight
              ? "var(--ds-color-accent-base-default, #D7282F)"
              : "#777",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "0.5rem",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            color: highlight
              ? "var(--ds-color-accent-base-default, #D7282F)"
              : "inherit",
          }}
        >
          {value}
        </div>
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
              {activities.map((a) => (
                <Tag
                  key={a}
                  data-color={a === "Besøkstjeneste" ? "success" : "neutral"}
                  variant="outline"
                >
                  {a}
                </Tag>
              ))}
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
