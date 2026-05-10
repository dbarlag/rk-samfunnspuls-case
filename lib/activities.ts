// Sentralisert kilde for aktivitetsnavn-strenger fra Røde Kors-JSON.
// Strenger med æ/ø/å er typo-felle hvis de gjentas overalt i kodebasen —
// importer herfra istedenfor å skrive dem inline.

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
