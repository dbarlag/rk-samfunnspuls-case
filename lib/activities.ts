// Sentralisert kilde for aktivitetsnavn-strenger fra Røde Kors-JSON.
// Strenger med æ/ø/å er typo-felle hvis de gjentas overalt i kodebasen —
// importer herfra istedenfor å skrive dem inline.

import type { Municipality } from "./database.types";

export const ACTIVITIES = {
  BESOKSTJENESTE: "Besøkstjeneste",
  BESOKSVENN_MED_HUND: "Besøksvenn med hund",
  VENNEFAMILIE: "Vennefamilie",
  HJELPEKORPS: "Hjelpekorps",
  LEKSEHJELP: "Leksehjelp",
  NORSKTRENING: "Norsktrening",
  FLYKTNINGGUIDE: "Flyktningguide",
  BARNAS_RODE_KORS: "Barnas Røde Kors",
  MOTEPLASSER: "Møteplasser",
  BEREDSKAP: "Beredskap",
} as const;

export type ActivityName = (typeof ACTIVITIES)[keyof typeof ACTIVITIES];

// ---- Multi-aktivitet config ----------------------------------------
//
// For dashboard-toggle: hver aktivitet har en "behov-metrikk" som er
// den befolkningen den retter seg mot. Coverage-beregningen bruker
// `needAccessor` for å hente riktig tall fra Municipality.

export type ActivityKey =
  | "besokstjeneste"
  | "leksehjelp"
  | "norsktrening"
  | "flyktningguide";

export type ActivityConfig = {
  key: ActivityKey;
  activityName: ActivityName; // brukt for å filtrere branch_activities
  label: string; // visningsnavn
  needLabel: string; // kort label på y-aksen, f.eks. "eldre alene"
  needLabelLong: string; // lengre label, f.eks. "67+ som bor alene"
  needSource: string; // "SSB tabell 06844" osv.
  needAccessor: (m: Municipality) => number;
};

export const ACTIVITY_CONFIGS: Record<ActivityKey, ActivityConfig> = {
  besokstjeneste: {
    key: "besokstjeneste",
    activityName: ACTIVITIES.BESOKSTJENESTE,
    label: "Besøkstjeneste",
    needLabel: "eldre alene",
    needLabelLong: "Personer 67+ som bor alene",
    needSource: "SSB tabell 06844",
    needAccessor: (m) => m.antall_67plus_alene,
  },
  leksehjelp: {
    key: "leksehjelp",
    activityName: ACTIVITIES.LEKSEHJELP,
    label: "Leksehjelp",
    needLabel: "ungdom 13-19",
    needLabelLong: "Ungdom i ungdomsskole + VGS-alder (13-19 år)",
    needSource: "SSB tabell 07459",
    needAccessor: (m) => m.antall_ungdom_13_19 ?? 0,
  },
  norsktrening: {
    key: "norsktrening",
    activityName: ACTIVITIES.NORSKTRENING,
    label: "Norsktrening",
    needLabel: "innvandrere",
    needLabelLong: "Innvandrere bosatt i kommunen",
    needSource: "SSB tabell 09817",
    needAccessor: (m) => m.antall_innvandrere ?? 0,
  },
  flyktningguide: {
    key: "flyktningguide",
    activityName: ACTIVITIES.FLYKTNINGGUIDE,
    label: "Flyktningguide",
    needLabel: "flyktninger",
    needLabelLong: "Innvandrere fra klassiske flyktningland",
    needSource: "SSB 09817 (proxy: 13 land)",
    needAccessor: (m) => m.antall_flyktninger ?? 0,
  },
};

export const ACTIVITY_KEYS = Object.keys(ACTIVITY_CONFIGS) as ActivityKey[];
