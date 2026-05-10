import { readFileSync } from "node:fs";
import path from "node:path";

// Norge sin bounding box (lng, lat) — beskåret slik at fastlandet fyller mest mulig.
const BOUNDS = {
  minLng: 4.5,
  maxLng: 31.5,
  minLat: 57.5,
  maxLat: 71.5,
};

const DEG_TO_RAD = Math.PI / 180;

// Mercator y-koordinat for gitt breddegrad (i grader).
function mercY(latDeg: number): number {
  return Math.log(Math.tan(Math.PI / 4 + (latDeg * DEG_TO_RAD) / 2));
}

// Pre-beregnede bounds i mercator-rom (radians for lng, mercY for lat).
const MIN_LNG_RAD = BOUNDS.minLng * DEG_TO_RAD;
const MAX_LNG_RAD = BOUNDS.maxLng * DEG_TO_RAD;
const MIN_MERC_Y = mercY(BOUNDS.minLat);
const MAX_MERC_Y = mercY(BOUNDS.maxLat);

// SVG viewBox: bredde fast, høyde regnet ut fra Mercator-aspekten av bounds.
// Det gir Norge naturlig form (ikke tøyd / skviset).
export const MAP_WIDTH = 500;
export const MAP_HEIGHT = Math.round(
  (MAP_WIDTH * (MAX_MERC_Y - MIN_MERC_Y)) / (MAX_LNG_RAD - MIN_LNG_RAD),
);

type RingCoords = number[][];
type PolygonCoords = RingCoords[];
type MultiPolygonCoords = PolygonCoords[];

type GeoFeature = {
  properties: { kommunenummer: string; kommunenavn: string };
  geometry:
    | { type: "Polygon"; coordinates: PolygonCoords }
    | { type: "MultiPolygon"; coordinates: MultiPolygonCoords };
};

function project(lng: number, lat: number): [number, number] {
  const x =
    ((lng * DEG_TO_RAD - MIN_LNG_RAD) / (MAX_LNG_RAD - MIN_LNG_RAD)) *
    MAP_WIDTH;
  // SVG har y=0 øverst, lat=71 (nord) skal være øverst → invertér.
  const y =
    MAP_HEIGHT -
    ((mercY(lat) - MIN_MERC_Y) / (MAX_MERC_Y - MIN_MERC_Y)) * MAP_HEIGHT;
  return [x, y];
}

function ringToPath(ring: RingCoords): string {
  let d = "";
  for (let i = 0; i < ring.length; i++) {
    const [x, y] = project(ring[i][0], ring[i][1]);
    d += (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1);
  }
  return d + "Z";
}

function polygonToPath(polygon: PolygonCoords): string {
  return polygon.map(ringToPath).join("");
}

function geometryToPath(geom: GeoFeature["geometry"]): string {
  if (geom.type === "Polygon") return polygonToPath(geom.coordinates);
  return geom.coordinates.map(polygonToPath).join("");
}

let cached: Map<string, { name: string; d: string }> | null = null;

/**
 * Last og projiser alle 357 kommuner én gang (server-side).
 * Returnerer { kommunenummer → { name, d (SVG path) } }.
 */
export function getKommunePaths(): Map<string, { name: string; d: string }> {
  if (cached) return cached;
  const file = path.join(process.cwd(), "public", "geo", "kommuner-2024.geojson");
  const geojson = JSON.parse(readFileSync(file, "utf-8")) as {
    features: GeoFeature[];
  };
  cached = new Map();
  for (const f of geojson.features) {
    cached.set(f.properties.kommunenummer, {
      name: f.properties.kommunenavn,
      d: geometryToPath(f.geometry),
    });
  }
  return cached;
}
