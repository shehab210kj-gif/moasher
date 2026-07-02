export type DistrictFeature = GeoJSON.Feature<GeoJSON.Geometry, Record<string, unknown>>;

export function normalizeArabicText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/^حي\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function getDistrictFeatureName(feature: DistrictFeature) {
  const props = feature.properties ?? {};
  const keys = ['name_ar', 'name', 'district', 'district_ar', 'Name_Ar', 'Name'];
  for (const key of keys) {
    const value = props[key];
    if (typeof value === 'string' && value.trim()) return value.replace(/^حي\s+/i, '').trim();
  }
  return '';
}

export function findDistrictFeature(collection: GeoJSON.FeatureCollection, district: string) {
  const wanted = normalizeArabicText(district);
  if (!wanted) return null;
  return collection.features.find((feature) => normalizeArabicText(getDistrictFeatureName(feature as DistrictFeature)) === wanted) as DistrictFeature | undefined ?? null;
}

function eachCoordinate(geometry: GeoJSON.Geometry, callback: (lng: number, lat: number) => void) {
  const visit = (coords: unknown): void => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      callback(coords[0], coords[1]);
      return;
    }
    coords.forEach(visit);
  };
  visit((geometry as { coordinates?: unknown }).coordinates);
}

export function getFeatureBounds(feature: DistrictFeature): [[number, number], [number, number]] | null {
  if (!feature.geometry) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  eachCoordinate(feature.geometry, (lng, lat) => {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  });

  if (![minLng, minLat, maxLng, maxLat].every(Number.isFinite)) return null;
  return [[minLng, minLat], [maxLng, maxLat]];
}

export function getFeatureCenter(feature: DistrictFeature) {
  const bounds = getFeatureBounds(feature);
  if (!bounds) return null;
  return {
    longitude: (bounds[0][0] + bounds[1][0]) / 2,
    latitude: (bounds[0][1] + bounds[1][1]) / 2,
  };
}

function pointInRing(point: [number, number], ring: number[][]) {
  const [lng, lat] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function isPointInFeature(longitude: number, latitude: number, feature: DistrictFeature | null) {
  if (!feature?.geometry) return false;
  const geometry = feature.geometry;
  const polygons = geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates
      : [];

  return polygons.some((polygon) => pointInRing([longitude, latitude], polygon[0] as number[][]));
}
