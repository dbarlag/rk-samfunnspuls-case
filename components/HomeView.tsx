"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, Heading, Table, Tag } from "rk-designsystem";

import {
  ACTIVITY_CONFIGS,
  ACTIVITY_KEYS,
  type ActivityKey,
} from "@/lib/activities";
import type { CoverageRow } from "@/lib/coverage";
import {
  type KommunePath,
  MunicipalityMap,
} from "./MunicipalityMap";

type Props = {
  coverageByActivity: Record<ActivityKey, CoverageRow[]>;
  paths: KommunePath[];
  viewBoxWidth: number;
  viewBoxHeight: number;
};

export function HomeView({
  coverageByActivity,
  paths,
  viewBoxWidth,
  viewBoxHeight,
}: Props) {
  const [activity, setActivity] = useState<ActivityKey>("besokstjeneste");
  const config = ACTIVITY_CONFIGS[activity];
  const coverage = coverageByActivity[activity];

  const top10 = coverage.slice(0, 10);
  const utenDekning = coverage.filter((c) => c.no_coverage).length;
  const totalNeed = coverage.reduce((sum, c) => sum + c.needValue, 0);

  return (
    <main
      style={{
        maxWidth: 1300,
        margin: "0 auto",
        padding: "2rem 1.5rem 4rem",
      }}
    >
      <header style={{ marginBottom: "2.5rem" }}>
        <p
          style={{
            color: "var(--ds-color-accent-base-default, #D7282F)",
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontSize: "0.875rem",
            marginBottom: "0.5rem",
          }}
        >
          Røde Kors Samfunnspuls
        </p>
        <div style={{ marginBottom: "0.75rem" }}>
          <Heading level={1}>
            Hvor mangler vi {config.label.toLowerCase()}?
          </Heading>
        </div>
        <p style={{ maxWidth: 720, fontSize: "1.05rem", color: "#555" }}>
          Datadrevet beslutningsstøtte for fagansvarlige. Kombinerer SSB-data
          om {config.needLabelLong.toLowerCase()} med Røde Kors&rsquo; egen
          oversikt over aktive lokalforeninger og distrikter.
        </p>
      </header>

      <ActivityToggle current={activity} onChange={setActivity} />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
          marginBottom: "2.5rem",
        }}
      >
        <StatCard label="Kommuner totalt" value={coverage.length} />
        <StatCard
          label={`Uten ${config.label.toLowerCase()}`}
          value={utenDekning}
          highlight
        />
        <StatCard
          label={config.needLabelLong}
          value={totalNeed.toLocaleString("nb-NO")}
        />
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <Heading level={2}>Norgeskart — interaktivt</Heading>
        </div>
        <p style={{ color: "#777", marginBottom: "1.5rem" }}>
          Hold over en kommune for å se detaljer, eller bruk Tab for å
          navigere med tastatur. Klikk for full kommuneside.
        </p>
        <div
          style={{
            padding: "1.5rem",
            background: "#fafafa",
            border: "1px solid #e5e5e5",
            borderRadius: 8,
          }}
        >
          <MunicipalityMap
            paths={paths}
            coverage={coverage}
            config={config}
            viewBoxWidth={viewBoxWidth}
            viewBoxHeight={viewBoxHeight}
          />
        </div>
      </section>

      <section>
        <div style={{ marginBottom: "1rem" }}>
          <Heading level={2}>Topp 10 — størst dekningsgap</Heading>
        </div>
        <Table zebra hover border>
          <Table.Head>
            <Table.Row>
              <Table.HeaderCell style={{ width: "3rem" }}>#</Table.HeaderCell>
              <Table.HeaderCell>Kommune</Table.HeaderCell>
              <Table.HeaderCell style={{ textAlign: "right" }}>
                {config.needLabel}
              </Table.HeaderCell>
              <Table.HeaderCell>Dekning</Table.HeaderCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {top10.map((row, i) => (
              <Table.Row key={row.kommunenummer}>
                <Table.Cell style={{ color: "#888", fontWeight: 600 }}>
                  {i + 1}
                </Table.Cell>
                <Table.Cell>
                  <Link
                    href={`/kommune/${row.kommunenummer}`}
                    style={{
                      color: "inherit",
                      textDecoration: "none",
                      display: "block",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        color: "var(--ds-color-accent-base-default, #D7282F)",
                      }}
                    >
                      {row.kommunenavn} →
                    </div>
                    <div style={{ color: "#777", fontSize: "0.875rem" }}>
                      {row.fylkesnavn}
                    </div>
                  </Link>
                </Table.Cell>
                <Table.Cell style={{ textAlign: "right" }}>
                  {row.needValue.toLocaleString("nb-NO")}
                </Table.Cell>
                <Table.Cell>
                  {row.no_coverage ? (
                    <Tag data-color="danger">Ingen dekning</Tag>
                  ) : (
                    <span style={{ fontSize: "0.875rem", color: "#555" }}>
                      {row.antall_grupper} gruppe
                      {row.antall_grupper !== 1 ? "r" : ""}{" "}
                      <span style={{ color: "#888" }}>
                        · ≈{Math.round(row.need_per_service ?? 0)} per gruppe
                      </span>
                    </span>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </section>
    </main>
  );
}

function ActivityToggle({
  current,
  onChange,
}: {
  current: ActivityKey;
  onChange: (k: ActivityKey) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Velg Røde Kors-aktivitet"
      style={{
        display: "flex",
        gap: "0.5rem",
        marginBottom: "1.5rem",
        padding: "0.4rem",
        background: "#f5f5f5",
        borderRadius: 8,
        width: "fit-content",
      }}
    >
      {ACTIVITY_KEYS.map((key) => {
        const cfg = ACTIVITY_CONFIGS[key];
        const isActive = key === current;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(key)}
            style={{
              padding: "0.5rem 1rem",
              border: "none",
              borderRadius: 6,
              background: isActive ? "#fff" : "transparent",
              color: isActive
                ? "var(--ds-color-accent-base-default, #D7282F)"
                : "#555",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.95rem",
              boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              fontFamily: "inherit",
            }}
          >
            {cfg.label}
            <span
              style={{
                color: "#999",
                fontWeight: 400,
                marginLeft: "0.5rem",
                fontSize: "0.85rem",
              }}
            >
              · {cfg.needLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <Card variant={highlight ? "tinted" : "default"}>
      <Card.Block>
        <div
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: highlight
              ? "var(--ds-color-accent-base-default, #D7282F)"
              : "#777",
            marginBottom: "0.5rem",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "2rem",
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
