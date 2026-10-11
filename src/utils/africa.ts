import {mulberry32} from './motion';

/**
 * A stylised, abstract Africa built as a dot matrix (not a literal cartographic map).
 * Outline is a simplified coastline in [lon, lat]; dots are laid on a hex grid inside it.
 * Everything here is deterministic (seeded) so every render is identical.
 */
const LON0 = -18.5;
const LON1 = 52.5;
const LAT0 = -35.5;
const LAT1 = 37.8;
export const MAP_ASPECT = (LON1 - LON0) / (LAT1 - LAT0); // width / height

const MAINLAND: [number, number][] = [
  [-5.9, 35.8], [-2.0, 35.1], [0.0, 35.8], [3.0, 36.8], [8.0, 37.0], [10.2, 37.3], [11.0, 35.5],
  [10.1, 33.9], [11.0, 33.2], [15.0, 32.4], [19.5, 30.3], [21.0, 32.8], [25.0, 31.7], [29.5, 31.2],
  [32.3, 31.3], [32.5, 29.9], [33.5, 27.5], [35.5, 24.0], [37.2, 21.0], [38.5, 18.0], [40.0, 15.5],
  [43.1, 12.7], [44.0, 10.4], [49.0, 11.3], [51.3, 11.8], [50.8, 9.5], [48.5, 5.0], [45.3, 2.0],
  [42.5, -0.8], [40.1, -2.8], [39.7, -4.0], [39.3, -6.8], [40.2, -10.2], [40.6, -14.5], [37.0, -17.8],
  [34.9, -19.8], [35.3, -22.0], [35.5, -24.0], [32.9, -26.0], [32.5, -28.5], [31.0, -29.9], [28.0, -33.0],
  [25.6, -34.0], [22.5, -34.0], [20.0, -34.8], [18.4, -34.1], [18.0, -31.5], [16.5, -28.6], [15.0, -26.0],
  [14.5, -22.5], [13.2, -20.0], [12.0, -17.0], [11.8, -15.5], [13.2, -12.5], [13.0, -9.0], [12.2, -6.0],
  [11.5, -4.5], [9.5, -1.0], [9.3, 1.0], [9.7, 3.9], [6.3, 4.3], [4.5, 6.3], [3.4, 6.4], [1.0, 5.8],
  [-0.2, 5.6], [-2.0, 4.8], [-4.0, 5.2], [-7.5, 4.4], [-9.7, 5.0], [-13.2, 8.4], [-14.5, 10.8],
  [-16.7, 12.2], [-17.5, 14.7], [-16.5, 19.5], [-17.0, 21.0], [-15.0, 23.7], [-13.0, 27.7], [-10.0, 29.8],
  [-9.8, 31.5], [-8.5, 33.5], [-6.8, 34.0],
];
const MADAGASCAR: [number, number][] = [
  [49.3, -12.0], [50.4, -15.4], [49.4, -18.0], [47.5, -24.9], [45.1, -25.6], [43.7, -23.5],
  [44.4, -20.0], [44.0, -17.0], [46.0, -15.7], [48.0, -13.5],
];

const inside = (lon: number, lat: number, poly: [number, number][]) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

export const project = (lon: number, lat: number) => ({
  u: (lon - LON0) / (LON1 - LON0),
  v: (LAT1 - lat) / (LAT1 - LAT0),
});

export type Dot = {
  u: number;
  v: number;
  rank: number; // 0..1 arrival order (centre first)
  r1: number; // random numbers for scatter / twinkle
  r2: number;
  r3: number;
};

const buildDots = (): Dot[] => {
  const rnd = mulberry32(2026);
  const stepLon = 1.75;
  const stepLat = stepLon * 0.866;
  const raw: {lon: number; lat: number}[] = [];
  let row = 0;
  for (let lat = LAT0; lat <= LAT1; lat += stepLat, row++) {
    for (let lon = LON0 + (row % 2 ? stepLon / 2 : 0); lon <= LON1; lon += stepLon) {
      if (inside(lon, lat, MAINLAND) || inside(lon, lat, MADAGASCAR)) raw.push({lon, lat});
    }
  }
  const cx = 18;
  const cy = 3;
  const maxD = Math.max(...raw.map((p) => Math.hypot(p.lon - cx, p.lat - cy)));
  return raw.map((p) => {
    const {u, v} = project(p.lon, p.lat);
    return {u, v, rank: Math.hypot(p.lon - cx, p.lat - cy) / maxD, r1: rnd(), r2: rnd(), r3: rnd()};
  });
};
export const DOTS = buildDots();

/** Hubs of the network — generic continental connectivity, NOT tied to any nominee. */
const CITY_LL = {
  casablanca: [-7.6, 33.6], tunis: [10.2, 36.8], cairo: [31.2, 30.0], khartoum: [32.5, 15.6],
  dakar: [-17.4, 14.7], abidjan: [-4.0, 5.3], accra: [-0.2, 5.6], lagos: [3.4, 6.5],
  addis: [38.7, 9.0], nairobi: [36.8, -1.3], kigali: [30.1, -1.9], kinshasa: [15.3, -4.3],
  dar: [39.3, -6.8], luanda: [13.2, -8.8], maputo: [32.6, -25.9], johannesburg: [28.0, -26.2],
} as const;
export type City = keyof typeof CITY_LL;
export const CITIES = (Object.keys(CITY_LL) as City[]).map((k) => ({id: k, ...project(CITY_LL[k][0], CITY_LL[k][1])}));
const cityUV = (id: City) => CITIES.find((c) => c.id === id)!;

export const EDGES: {a: City; b: City; bow: number; delay: number}[] = [
  {a: 'casablanca', b: 'tunis', bow: 0.1, delay: 0}, {a: 'casablanca', b: 'dakar', bow: -0.12, delay: 6},
  {a: 'tunis', b: 'cairo', bow: 0.1, delay: 10}, {a: 'cairo', b: 'khartoum', bow: 0.08, delay: 14},
  {a: 'khartoum', b: 'addis', bow: 0.1, delay: 18}, {a: 'addis', b: 'nairobi', bow: -0.1, delay: 22},
  {a: 'nairobi', b: 'kigali', bow: 0.1, delay: 26}, {a: 'nairobi', b: 'dar', bow: -0.1, delay: 28},
  {a: 'kigali', b: 'kinshasa', bow: 0.12, delay: 32}, {a: 'kinshasa', b: 'lagos', bow: -0.14, delay: 36},
  {a: 'lagos', b: 'accra', bow: 0.1, delay: 40}, {a: 'accra', b: 'abidjan', bow: 0.1, delay: 42},
  {a: 'abidjan', b: 'dakar', bow: 0.1, delay: 46}, {a: 'kinshasa', b: 'luanda', bow: 0.1, delay: 50},
  {a: 'luanda', b: 'johannesburg', bow: 0.1, delay: 54}, {a: 'johannesburg', b: 'maputo', bow: 0.1, delay: 58},
  {a: 'dar', b: 'maputo', bow: -0.1, delay: 60}, {a: 'nairobi', b: 'lagos', bow: -0.18, delay: 64},
  {a: 'cairo', b: 'nairobi', bow: 0.16, delay: 68}, {a: 'johannesburg', b: 'nairobi', bow: 0.14, delay: 72},
  {a: 'cairo', b: 'casablanca', bow: -0.2, delay: 76},
];

/** Knowledge, skills and capital arriving from beyond the continent (the diaspora idea). */
export const INBOUND: {from: [number, number]; to: City; bow: number; delay: number}[] = [
  {from: [-0.95, -0.25], to: 'casablanca', bow: 0.18, delay: 20},
  {from: [-0.9, 0.55], to: 'dakar', bow: -0.14, delay: 30},
  {from: [0.5, -0.55], to: 'tunis', bow: 0.12, delay: 40},
  {from: [1.75, -0.2], to: 'cairo', bow: -0.16, delay: 50},
  {from: [1.9, 0.75], to: 'dar', bow: 0.14, delay: 60},
  {from: [0.25, 1.45], to: 'johannesburg', bow: -0.14, delay: 70},
  {from: [-0.7, 1.2], to: 'lagos', bow: 0.16, delay: 80},
];

export const uv = cityUV;
