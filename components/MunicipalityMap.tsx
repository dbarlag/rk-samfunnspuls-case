"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Tag } from "rk-designsystem";

import type { ActivityConfig } from "@/lib/activities";
import type { CoverageRow, FylkeRow } from "@/lib/coverage";
import styles from "./MunicipalityMap.module.css";

export type KommunePath = { knr: string; name: string; d: string };

type Props = {
  paths: KommunePath[];
  coverage: CoverageRow[];
  config: ActivityConfig;
  viewBoxWidth: number;
  viewBoxHeight: number;
  /** Hvis satt: kommuner i settet vises full opacity, andre dimmes ut. */
  highlightedKnr?: Set<string> | null;
  /** Når satt vises fylke-aggregat: alle kommuner i samme fylke får
   *  samme farge basert på fylke-status. Hover/click handler er da
   *  fylke-orientert. */
  fylkeRows?: FylkeRow[] | null;
  /** Callback for fylke-click (drill-down til fylke-filter). */
  onFylkeClick?: (fylkesnavn: string) => void;
};

export function MunicipalityMap({
  paths,
  coverage,
  config,
  viewBoxWidth,
  viewBoxHeight,
  highlightedKnr,
  fylkeRows,
  onFylkeClick,
}: Props) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);
  const fylkeMode = fylkeRows != null;

  const coverageByKnr = useMemo(
    () => new Map(coverage.map((c) => [c.kommunenummer, c])),
    [coverage],
  );

  /** kommunenummer → fylkesnavn (for fylke-fargelegging) */
  const fylkesnavnByKnr = useMemo(
    () => new Map(coverage.map((c) => [c.kommunenummer, c.fylkesnavn])),
    [coverage],
  );

  const fylkeByName = useMemo(
    () => new Map((fylkeRows ?? []).map((r) => [r.fylkesnavn, r])),
    [fylkeRows],
  );

  const { p33, p66 } = useMemo(() => {
    const dekkedeNeeds = coverage
      .filter((c) => c.need_per_service !== null)
      .map((c) => c.need_per_service as number)
      .sort((a, b) => a - b);
    return {
      p33: dekkedeNeeds[Math.floor(dekkedeNeeds.length * 0.33)] ?? 0,
      p66: dekkedeNeeds[Math.floor(dekkedeNeeds.length * 0.66)] ?? 0,
    };
  }, [coverage]);

  /** Dynamiske fylke-fargeterskler — basert på faktisk fordeling av
   *  pct_uten_dekning blant fylkene. Med statiske terskler (0.5/0.25) ble
   *  nesten alle fylker rosa. Percentile gir visuell distribusjon
   *  selv når absolutte tall er små. */
  const fylkeThresholds = useMemo(() => {
    if (!fylkeRows) return null;
    const pcts = fylkeRows
      .filter((r) => r.pct_uten_dekning > 0)
      .map((r) => r.pct_uten_dekning)
      .sort((a, b) => a - b);
    return {
      p33: pcts[Math.floor(pcts.length * 0.33)] ?? 0,
      p66: pcts[Math.floor(pcts.length * 0.66)] ?? 0,
    };
  }, [fylkeRows]);

  function colorForKommune(c: CoverageRow | undefined): string {
    if (!c) return "#f5f5f5";
    if (c.no_coverage) return "#D7282F";
    if ((c.need_per_service ?? 0) >= p66) return "#F4A1A4";
    if ((c.need_per_service ?? 0) >= p33) return "#FBDADA";
    return "#FDEDEE";
  }

  function colorForFylke(row: FylkeRow | undefined): string {
    if (!row) return "#f5f5f5";
    if (row.pct_uten_dekning === 0) return "#FDEDEE";
    if (!fylkeThresholds) return "#FBDADA";
    if (row.pct_uten_dekning >= fylkeThresholds.p66) return "#D7282F";
    if (row.pct_uten_dekning >= fylkeThresholds.p33) return "#F4A1A4";
    return "#FBDADA";
  }

  function colorFor(knr: string): string {
    if (fylkeMode) {
      const navn = fylkesnavnByKnr.get(knr) ?? null;
      return navn ? colorForFylke(fylkeByName.get(navn)) : "#f5f5f5";
    }
    return colorForKommune(coverageByKnr.get(knr));
  }

  const hoveredCov = hovered ? coverageByKnr.get(hovered) : null;
  const hoveredName = hovered ? paths.find((p) => p.knr === hovered)?.name : null;
  const hoveredFylkesnavn = hovered ? fylkesnavnByKnr.get(hovered) ?? null : null;
  const hoveredFylke = hoveredFylkesnavn ? fylkeByName.get(hoveredFylkesnavn) : null;

  return (
    <div className={styles.layout}>
      <div>
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          width="100%"
          className={styles.svg}
          role="img"
          aria-label={`Kart over Norge med kommuner farget etter dekningsgap for ${config.label}`}
          onMouseLeave={() => setHovered(null)}
        >
          <g>
            {paths.map(({ knr, name, d }) => {
              const cov = coverageByKnr.get(knr);
              const fylkesnavn = fylkesnavnByKnr.get(knr) ?? null;
              const isHovered = fylkeMode
                ? hovered != null &&
                  fylkesnavnByKnr.get(hovered) === fylkesnavn
                : hovered === knr;
              const isDimmed =
                highlightedKnr != null && !highlightedKnr.has(knr);
              const handleActivate = () => {
                if (fylkeMode) {
                  if (fylkesnavn && onFylkeClick) onFylkeClick(fylkesnavn);
                } else {
                  router.push(`/kommune/${knr}`);
                }
              };
              return (
                <path
                  key={knr}
                  d={d}
                  fill={colorFor(knr)}
                  fillOpacity={isDimmed ? 0.15 : 1}
                  stroke={isHovered ? "#171717" : "#fff"}
                  strokeWidth={isHovered ? 1.5 : 0.4}
                  tabIndex={0}
                  role="link"
                  aria-label={
                    fylkeMode
                      ? fylkeAriaLabel(fylkesnavn, fylkeByName, config)
                      : `${ariaLabel(name, cov, config)}. Klikk for detaljer.`
                  }
                  className={styles.path}
                  onMouseEnter={() => setHovered(knr)}
                  onFocus={() => setHovered(knr)}
                  onBlur={() => setHovered(null)}
                  onClick={handleActivate}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleActivate();
                    }
                  }}
                />
              );
            })}
          </g>
        </svg>
        <MapLegend label={config.label} fylkeMode={fylkeMode} />
      </div>

      {fylkeMode ? (
        <FylkePanel fylke={hoveredFylke ?? null} config={config} />
      ) : (
        <HoverPanel name={hoveredName} cov={hoveredCov} config={config} />
      )}
    </div>
  );
}

function ariaLabel(
  name: string,
  c: CoverageRow | undefined,
  config: ActivityConfig,
): string {
  if (!c) return `${name}: ingen data`;
  const need = c.needValue.toLocaleString("nb-NO");
  if (c.no_coverage)
    return `${name}: ${need} ${config.needLabel}, ingen ${config.label.toLowerCase()}`;
  return `${name}: ${need} ${config.needLabel}, ${c.antall_grupper} ${config.label.toLowerCase()}-gruppe${c.antall_grupper !== 1 ? "r" : ""}`;
}

function fylkeAriaLabel(
  fylkesnavn: string | null,
  fylkeByName: Map<string, FylkeRow>,
  config: ActivityConfig,
): string {
  if (!fylkesnavn) return "Ingen fylke";
  const row = fylkeByName.get(fylkesnavn);
  if (!row) return `${fylkesnavn}: ingen data`;
  const pct = Math.round(row.pct_uten_dekning * 100);
  return `${fylkesnavn}: ${row.kommuner_uten_dekning} av ${row.kommuner_totalt} kommuner mangler ${config.label.toLowerCase()} (${pct}%). Klikk for å filtrere på fylket.`;
}

function HoverPanel({
  name,
  cov,
  config,
}: {
  name: string | null | undefined;
  cov: CoverageRow | null | undefined;
  config: ActivityConfig;
}) {
  return (
    <aside className={styles.panel} aria-live="polite">
      {!name || !cov ? (
        <div className={styles.panelEmpty}>
          <div className={styles.panelEmptyTitle}>Velg en kommune</div>
          Hold musa over kartet, eller tab deg gjennom kommunene med tastatur,
          for å se detaljer.
        </div>
      ) : (
        <>
          <div className={styles.panelEyebrow}>{cov.fylkesnavn}</div>
          <div className={styles.panelTitle}>{name}</div>

          <Stat
            label={config.needLabelLong}
            value={cov.needValue.toLocaleString("nb-NO")}
          />

          <div className={styles.statBlock}>
            {cov.no_coverage ? (
              <Tag data-color="danger">Ingen {config.label.toLowerCase()}</Tag>
            ) : (
              <>
                <Stat
                  label={`${config.label}-grupper`}
                  value={cov.antall_grupper.toString()}
                />
                <div className={styles.statSpacer}>
                  <Stat
                    label={`${config.needLabel} per gruppe`}
                    value={`≈ ${Math.round(cov.need_per_service ?? 0).toLocaleString("nb-NO")}`}
                  />
                </div>
              </>
            )}
          </div>

          <Link
            href={`/kommune/${cov.kommunenummer}`}
            className={styles.detailLink}
          >
            Se detaljer →
          </Link>
        </>
      )}
    </aside>
  );
}

function FylkePanel({
  fylke,
  config,
}: {
  fylke: FylkeRow | null;
  config: ActivityConfig;
}) {
  return (
    <aside className={styles.panel} aria-live="polite">
      {!fylke ? (
        <div className={styles.panelEmpty}>
          <div className={styles.panelEmptyTitle}>Velg et fylke</div>
          Hold musa over kartet, eller tab deg gjennom fylkene med tastatur,
          for å se aggregert dekning.
        </div>
      ) : (
        <>
          <div className={styles.panelEyebrow}>Fylke-aggregat</div>
          <div className={styles.panelTitle}>{fylke.fylkesnavn}</div>

          <Stat
            label="Kommuner uten dekning"
            value={`${fylke.kommuner_uten_dekning} av ${fylke.kommuner_totalt} (${Math.round(fylke.pct_uten_dekning * 100)}%)`}
          />

          <div className={styles.statBlock}>
            <Stat
              label={`${config.needLabel} totalt`}
              value={fylke.total_need.toLocaleString("nb-NO")}
            />
            {fylke.need_per_gruppe != null && (
              <div className={styles.statSpacer}>
                <Stat
                  label={`Snitt ${config.needLabel} per gruppe`}
                  value={`≈ ${Math.round(fylke.need_per_gruppe).toLocaleString("nb-NO")}`}
                />
              </div>
            )}
          </div>

          <div className={styles.detailLink}>Klikk for å filtrere ↓</div>
        </>
      )}
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
    </div>
  );
}

function MapLegend({
  label,
  fylkeMode,
}: {
  label: string;
  fylkeMode: boolean;
}) {
  const items = fylkeMode
    ? [
        { color: "#D7282F", label: "Verst stilte tredjedel" },
        { color: "#F4A1A4", label: "Mellom-tredjedel" },
        { color: "#FBDADA", label: "Best stilte tredjedel (med udekkede)" },
        { color: "#FDEDEE", label: "Full dekning" },
      ]
    : [
        { color: "#D7282F", label: `Ingen ${label.toLowerCase()}` },
        { color: "#F4A1A4", label: "Mye behov per gruppe" },
        { color: "#FBDADA", label: "Moderat behov" },
        { color: "#FDEDEE", label: "God dekning" },
      ];
  return (
    <div className={styles.legend}>
      {items.map((it) => (
        <div key={it.label} className={styles.legendItem}>
          <span
            className={styles.legendSwatch}
            style={{ background: it.color }}
          />
          {it.label}
        </div>
      ))}
    </div>
  );
}
