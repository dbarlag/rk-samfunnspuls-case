"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Tag } from "rk-designsystem";

import type { ActivityConfig } from "@/lib/activities";
import type { CoverageRow } from "@/lib/coverage";
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
};

export function MunicipalityMap({
  paths,
  coverage,
  config,
  viewBoxWidth,
  viewBoxHeight,
  highlightedKnr,
}: Props) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);

  const coverageByKnr = useMemo(
    () => new Map(coverage.map((c) => [c.kommunenummer, c])),
    [coverage],
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

  function colorFor(c: CoverageRow | undefined): string {
    if (!c) return "#f5f5f5";
    if (c.no_coverage) return "#D7282F";
    if ((c.need_per_service ?? 0) >= p66) return "#F4A1A4";
    if ((c.need_per_service ?? 0) >= p33) return "#FBDADA";
    return "#FDEDEE";
  }

  const hoveredCov = hovered ? coverageByKnr.get(hovered) : null;
  const hoveredName = hovered ? paths.find((p) => p.knr === hovered)?.name : null;

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
              const isHovered = hovered === knr;
              const isDimmed =
                highlightedKnr != null && !highlightedKnr.has(knr);
              return (
                <path
                  key={knr}
                  d={d}
                  fill={colorFor(cov)}
                  fillOpacity={isDimmed ? 0.15 : 1}
                  stroke={isHovered ? "#171717" : "#fff"}
                  strokeWidth={isHovered ? 1.5 : 0.4}
                  tabIndex={0}
                  role="link"
                  aria-label={`${ariaLabel(name, cov, config)}. Klikk for detaljer.`}
                  className={styles.path}
                  onMouseEnter={() => setHovered(knr)}
                  onFocus={() => setHovered(knr)}
                  onBlur={() => setHovered(null)}
                  onClick={() => router.push(`/kommune/${knr}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/kommune/${knr}`);
                    }
                  }}
                />
              );
            })}
          </g>
        </svg>
        <MapLegend label={config.label} />
      </div>

      <HoverPanel name={hoveredName} cov={hoveredCov} config={config} />
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
    </div>
  );
}

function MapLegend({ label }: { label: string }) {
  const items = [
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
