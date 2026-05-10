"use client";

import type { ReactNode } from "react";
import { Card, Heading, Table, Tag } from "rk-designsystem";

import type { CoverageRow } from "@/lib/coverage";

export function HomeView({
  coverage,
  map,
}: {
  coverage: CoverageRow[];
  map: ReactNode;
}) {
  const top10 = coverage.slice(0, 10);
  const utenDekning = coverage.filter((c) => c.no_coverage).length;
  const totalEldreAlene = coverage.reduce(
    (sum, c) => sum + c.antall_67plus_alene,
    0,
  );

  return (
    <main
      style={{
        maxWidth: 1200,
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
          <Heading level={1}>Hvor mangler vi besøkstjeneste?</Heading>
        </div>
        <p style={{ maxWidth: 720, fontSize: "1.05rem", color: "#555" }}>
          Datadrevet beslutningsstøtte for fagansvarlige. Kombinerer SSB-data
          om eldre som bor alene med Røde Kors&rsquo; egen oversikt over
          aktive lokalforeninger.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
          marginBottom: "2.5rem",
        }}
      >
        <StatCard label="Kommuner totalt" value={coverage.length} />
        <StatCard label="Uten besøkstjeneste" value={utenDekning} highlight />
        <StatCard
          label="Eldre som bor alene (67+)"
          value={totalEldreAlene.toLocaleString("nb-NO")}
        />
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.5fr)",
          gap: "2rem",
          alignItems: "start",
        }}
      >
        <div>
          <div style={{ marginBottom: "1rem" }}>
            <Heading level={2}>Norgeskart</Heading>
          </div>
          <div
            style={{
              padding: "1rem",
              background: "#fafafa",
              border: "1px solid #e5e5e5",
              borderRadius: 8,
            }}
          >
            {map}
            <MapLegend />
          </div>
        </div>

        <div>
          <div style={{ marginBottom: "1rem" }}>
            <Heading level={2}>Topp 10 — størst dekningsgap</Heading>
          </div>
          <Table zebra hover border>
            <Table.Head>
              <Table.Row>
                <Table.HeaderCell style={{ width: "3rem" }}>#</Table.HeaderCell>
                <Table.HeaderCell>Kommune</Table.HeaderCell>
                <Table.HeaderCell style={{ textAlign: "right" }}>
                  Eldre alene (67+)
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
                    <div style={{ fontWeight: 600 }}>{row.kommunenavn}</div>
                    <div style={{ color: "#777", fontSize: "0.875rem" }}>
                      {row.fylkesnavn}
                    </div>
                  </Table.Cell>
                  <Table.Cell style={{ textAlign: "right" }}>
                    {row.antall_67plus_alene.toLocaleString("nb-NO")}
                  </Table.Cell>
                  <Table.Cell>
                    {row.no_coverage ? (
                      <Tag data-color="danger">Ingen dekning</Tag>
                    ) : (
                      <span style={{ fontSize: "0.875rem", color: "#555" }}>
                        {row.antall_besokstjenester} gruppe
                        {row.antall_besokstjenester !== 1 ? "r" : ""}{" "}
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
        </div>
      </section>
    </main>
  );
}

function MapLegend() {
  const items = [
    { color: "#D7282F", label: "Ingen dekning" },
    { color: "#F4A1A4", label: "Mye behov per gruppe" },
    { color: "#FBDADA", label: "Moderat behov" },
    { color: "#FDEDEE", label: "God dekning" },
  ];
  return (
    <div
      style={{
        marginTop: "1rem",
        display: "flex",
        flexWrap: "wrap",
        gap: "0.75rem",
        fontSize: "0.8125rem",
        color: "#555",
      }}
    >
      {items.map((it) => (
        <div
          key={it.label}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              background: it.color,
              border: "1px solid #ccc",
              display: "inline-block",
              borderRadius: 2,
            }}
          />
          {it.label}
        </div>
      ))}
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
