"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Heading,
  Paragraph,
  Search,
  Select,
  Table,
  Tag,
  ToggleGroup,
} from "rk-designsystem";

import {
  ACTIVITY_CONFIGS,
  ACTIVITY_KEYS,
  type ActivityKey,
} from "@/lib/activities";
import { aggregateByFylke, type CoverageRow, type FylkeRow } from "@/lib/coverage";
import {
  type KommunePath,
  MunicipalityMap,
} from "./MunicipalityMap";
import styles from "./HomeView.module.css";

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
  const [search, setSearch] = useState("");
  const [fylkeFilter, setFylkeFilter] = useState("");
  const [onlyUndekket, setOnlyUndekket] = useState(false);
  const [tableMode, setTableMode] = useState<"kommune" | "fylke">("kommune");

  const config = ACTIVITY_CONFIGS[activity];
  const coverage = coverageByActivity[activity];

  const fylker = useMemo(
    () =>
      Array.from(
        new Set(coverage.map((c) => c.fylkesnavn).filter((f): f is string => !!f)),
      ).sort((a, b) => a.localeCompare(b, "nb")),
    [coverage],
  );

  const filteredKnr = useMemo(() => {
    const s = search.toLowerCase().trim();
    const matched = coverage.filter((c) => {
      if (s && !c.kommunenavn.toLowerCase().includes(s)) return false;
      if (fylkeFilter && c.fylkesnavn !== fylkeFilter) return false;
      if (onlyUndekket && !c.no_coverage) return false;
      return true;
    });
    return new Set(matched.map((c) => c.kommunenummer));
  }, [coverage, search, fylkeFilter, onlyUndekket]);

  const filteredCoverage = coverage.filter((c) => filteredKnr.has(c.kommunenummer));
  const isFiltered = filteredCoverage.length !== coverage.length;
  const top10 = filteredCoverage.slice(0, 10);
  const utenDekning = coverage.filter((c) => c.no_coverage).length;
  const totalNeed = coverage.reduce((sum, c) => sum + c.needValue, 0);

  // Fylke-aggregering bruker hele coverage (ikke filtrert), siden poenget
  // er nasjonal sammenligning. Filter-bar handler om kommune-view.
  const fylkeRows = useMemo(() => aggregateByFylke(coverage), [coverage]);
  const fylkerMedUdekkede = fylkeRows.filter(
    (r) => r.kommuner_uten_dekning > 0,
  ).length;

  const isFylkeMode = tableMode === "fylke";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>Røde Kors Samfunnspuls</div>
        <div className={styles.headingSpacer}>
          <Heading level={1}>
            {isFylkeMode
              ? `Hvilke fylker har størst dekningsgap for ${config.label.toLowerCase()}?`
              : `Hvor mangler vi ${config.label.toLowerCase()}?`}
          </Heading>
        </div>
        <Paragraph data-size="lg" className={styles.lede}>
          Datadrevet beslutningsstøtte for fagansvarlige. Kombinerer SSB-data
          om {config.needLabelLong.toLowerCase()} med Røde Kors’ egen
          oversikt over aktive lokalforeninger og distrikter.
        </Paragraph>
      </header>

      <div className={styles.togglesRow}>
        <ToggleGroup
          value={activity}
          onChange={(v: string) => setActivity(v as ActivityKey)}
          data-toggle-group="Velg aktivitet"
        >
          {ACTIVITY_KEYS.map((key) => {
            const cfg = ACTIVITY_CONFIGS[key];
            return (
              <ToggleGroup.Item key={key} value={key}>
                {cfg.label}
              </ToggleGroup.Item>
            );
          })}
        </ToggleGroup>

        <div className={styles.togglesRowSpacer} />

        <ToggleGroup
          value={tableMode}
          onChange={(v: string) => setTableMode(v as "kommune" | "fylke")}
          data-toggle-group="Velg granularitet"
        >
          <ToggleGroup.Item value="kommune">Per kommune</ToggleGroup.Item>
          <ToggleGroup.Item value="fylke">Per fylke</ToggleGroup.Item>
        </ToggleGroup>
      </div>

      {!isFylkeMode && (
        <FilterBar
          search={search}
          setSearch={setSearch}
          fylkeFilter={fylkeFilter}
          setFylkeFilter={setFylkeFilter}
          fylker={fylker}
          onlyUndekket={onlyUndekket}
          setOnlyUndekket={setOnlyUndekket}
          matchCount={filteredCoverage.length}
          totalCount={coverage.length}
        />
      )}

      {!isFylkeMode && fylkeFilter !== "" && (
        <div className={styles.filterBanner}>
          <span className={styles.filterBannerLabel}>
            📍 Viser kun kommuner i <strong>{fylkeFilter}</strong> ·{" "}
            {filteredCoverage.length} kommuner
          </span>
          <Button
            variant="secondary"
            data-size="sm"
            onClick={() => setFylkeFilter("")}
          >
            Fjern fylke-filter
          </Button>
        </div>
      )}

      <section className={styles.statGrid}>
        {isFylkeMode ? (
          <>
            <StatCard
              label="Fylker totalt"
              value={fylkeRows.length.toString()}
            />
            <StatCard
              label="Med ≥ 1 udekket kommune"
              value={fylkerMedUdekkede.toString()}
              highlight
            />
            <StatCard
              label={config.needLabelLong}
              value={totalNeed.toLocaleString("nb-NO")}
            />
          </>
        ) : (
          <>
            <StatCard
              label="Kommuner totalt"
              value={coverage.length.toString()}
            />
            <StatCard
              label={`Uten ${config.label.toLowerCase()}`}
              value={utenDekning.toString()}
              highlight
            />
            <StatCard
              label={config.needLabelLong}
              value={totalNeed.toLocaleString("nb-NO")}
            />
          </>
        )}
      </section>

      <section className={styles.mapSection}>
        <div className={styles.sectionHeading}>
          <Heading level={2} data-size="md">
            {isFylkeMode
              ? "Norgeskart — fargelagt per fylke"
              : "Norgeskart — interaktivt"}
          </Heading>
        </div>
        <Paragraph data-size="sm" className={styles.mapHelp}>
          {isFylkeMode
            ? "Hold over et område for å se aggregert fylke-status. Klikk for å filtrere ned til kommunene i fylket."
            : "Hold over en kommune for å se detaljer, eller bruk Tab for å navigere med tastatur. Klikk for full kommuneside."}
        </Paragraph>
        <div className={styles.mapFrame}>
          <MunicipalityMap
            paths={paths}
            coverage={coverage}
            config={config}
            viewBoxWidth={viewBoxWidth}
            viewBoxHeight={viewBoxHeight}
            highlightedKnr={isFiltered ? filteredKnr : null}
            fylkeRows={isFylkeMode ? fylkeRows : null}
            onFylkeClick={(navn) => {
              setFylkeFilter(navn);
              setTableMode("kommune");
            }}
          />
        </div>
      </section>

      <section>
        <div className={styles.tableHeading}>
          <Heading level={2} data-size="md">
            {isFylkeMode
              ? "Fylker — andel kommuner uten dekning"
              : "Topp 10 — størst dekningsgap"}
            {!isFylkeMode && isFiltered && (
              <span className={styles.tableHeadingMeta}>
                (av {filteredCoverage.length} matchende)
              </span>
            )}
          </Heading>
        </div>
        {!isFylkeMode ? (
          top10.length === 0 ? (
            <Card>
              <Card.Block>
                <Paragraph data-size="sm">
                  Ingen kommuner matcher filtret. Prøv å fjerne søk eller
                  fylke-valg.
                </Paragraph>
              </Card.Block>
            </Card>
          ) : (
            <Table zebra hover border>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell className={styles.rankCell}>#</Table.HeaderCell>
                  <Table.HeaderCell>Kommune</Table.HeaderCell>
                  <Table.HeaderCell className={styles.numericCell}>
                    {config.needLabel}
                  </Table.HeaderCell>
                  <Table.HeaderCell>Dekning</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {top10.map((row, i) => (
                  <Table.Row key={row.kommunenummer}>
                    <Table.Cell className={styles.rankCell}>{i + 1}</Table.Cell>
                    <Table.Cell>
                      <Link
                        href={`/kommune/${row.kommunenummer}`}
                        className={styles.kommuneLink}
                      >
                        <div className={styles.kommuneName}>
                          {row.kommunenavn} →
                        </div>
                        <div className={styles.kommuneFylke}>
                          {row.fylkesnavn}
                        </div>
                      </Link>
                    </Table.Cell>
                    <Table.Cell className={styles.numericCell}>
                      {row.needValue.toLocaleString("nb-NO")}
                    </Table.Cell>
                    <Table.Cell>
                      {row.no_coverage ? (
                        <Tag data-color="danger">Ingen dekning</Tag>
                      ) : (
                        <span className={styles.coverageMeta}>
                          {row.antall_grupper} gruppe
                          {row.antall_grupper !== 1 ? "r" : ""}{" "}
                          <span className={styles.coverageDim}>
                            · ≈{Math.round(row.need_per_service ?? 0)} per gruppe
                          </span>
                        </span>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )
        ) : (
          <FylkeTable
            rows={fylkeRows}
            needLabel={config.needLabel}
            onSelectFylke={(navn) => {
              setFylkeFilter(navn);
              setTableMode("kommune");
            }}
          />
        )}
      </section>
    </main>
  );
}

function FilterBar({
  search,
  setSearch,
  fylkeFilter,
  setFylkeFilter,
  fylker,
  onlyUndekket,
  setOnlyUndekket,
  matchCount,
  totalCount,
}: {
  search: string;
  setSearch: (s: string) => void;
  fylkeFilter: string;
  setFylkeFilter: (s: string) => void;
  fylker: string[];
  onlyUndekket: boolean;
  setOnlyUndekket: (b: boolean) => void;
  matchCount: number;
  totalCount: number;
}) {
  const isFiltered = search !== "" || fylkeFilter !== "" || onlyUndekket;
  const reset = () => {
    setSearch("");
    setFylkeFilter("");
    setOnlyUndekket(false);
  };
  return (
    <div className={styles.filterBar}>
      <Search>
        <Search.Input
          aria-label="Søk på kommune-navn"
          placeholder="Søk kommune…"
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearch(e.target.value)
          }
        />
        {search !== "" && <Search.Clear onClick={() => setSearch("")} />}
      </Search>
      <Select
        aria-label="Filtrer på fylke"
        value={fylkeFilter}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
          setFylkeFilter(e.target.value)
        }
      >
        <Select.Option value="">Alle fylker</Select.Option>
        {fylker.map((f) => (
          <Select.Option key={f} value={f}>
            {f}
          </Select.Option>
        ))}
      </Select>
      <Checkbox
        label="Kun udekket"
        checked={onlyUndekket}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setOnlyUndekket(e.target.checked)
        }
      />
      <div className={styles.filterSpacer} />
      <span className={styles.filterCount}>
        {matchCount} av {totalCount} kommuner
      </span>
      {isFiltered && (
        <Button variant="secondary" data-size="sm" onClick={reset}>
          Nullstill
        </Button>
      )}
    </div>
  );
}

function FylkeTable({
  rows,
  needLabel,
  onSelectFylke,
}: {
  rows: FylkeRow[];
  needLabel: string;
  onSelectFylke: (fylkesnavn: string) => void;
}) {
  return (
    <Table zebra hover border>
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell className={styles.rankCell}>#</Table.HeaderCell>
          <Table.HeaderCell>Fylke</Table.HeaderCell>
          <Table.HeaderCell>Uten dekning</Table.HeaderCell>
          <Table.HeaderCell className={styles.numericCell}>
            {needLabel} totalt
          </Table.HeaderCell>
          <Table.HeaderCell>Snitt per gruppe</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {rows.map((row, i) => (
          <Table.Row key={row.fylkesnavn}>
            <Table.Cell className={styles.rankCell}>{i + 1}</Table.Cell>
            <Table.Cell>
              <button
                type="button"
                onClick={() => onSelectFylke(row.fylkesnavn)}
                className={styles.fylkeButton}
              >
                <span className={styles.kommuneName}>
                  {row.fylkesnavn} →
                </span>
                <span className={styles.kommuneFylke}>
                  {row.kommuner_totalt} kommuner
                </span>
              </button>
            </Table.Cell>
            <Table.Cell>
              {row.kommuner_uten_dekning > 0 ? (
                <Tag data-color="danger">
                  {row.kommuner_uten_dekning} av {row.kommuner_totalt} (
                  {Math.round(row.pct_uten_dekning * 100)}%)
                </Tag>
              ) : (
                <Tag data-color="success">Full dekning</Tag>
              )}
            </Table.Cell>
            <Table.Cell className={styles.numericCell}>
              {row.total_need.toLocaleString("nb-NO")}
            </Table.Cell>
            <Table.Cell>
              {row.need_per_gruppe == null ? (
                <span className={styles.coverageDim}>—</span>
              ) : (
                <span className={styles.coverageMeta}>
                  ≈{" "}
                  {Math.round(row.need_per_gruppe).toLocaleString("nb-NO")}{" "}
                  {needLabel}
                </span>
              )}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
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
    <Card
      variant={highlight ? "tinted" : "default"}
      data-color={highlight ? "accent" : undefined}
    >
      <Card.Block>
        <div
          className={highlight ? styles.statLabelHighlight : styles.statLabel}
        >
          {label}
        </div>
        <div className={highlight ? styles.statValueHighlight : styles.statValue}>
          {value}
        </div>
      </Card.Block>
    </Card>
  );
}
