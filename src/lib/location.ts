export type Coordinates = {
  latitude: number | null;
  longitude: number | null;
};

export function isValidLatitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180;
}

export function hasValidCoordinates(value: Coordinates) {
  return isValidLatitude(value.latitude) && isValidLongitude(value.longitude);
}

export function normalizeCoordinates(value: Coordinates): Coordinates {
  if (!hasValidCoordinates(value)) {
    return { latitude: null, longitude: null };
  }

  return {
    latitude: Number((value.latitude as number).toFixed(6)),
    longitude: Number((value.longitude as number).toFixed(6)),
  };
}

export function getCoordinateWarnings(original: Coordinates, normalized: Coordinates) {
  const warnings: string[] = [];
  const hadPartial = original.latitude !== null || original.longitude !== null;
  if (hadPartial && !hasValidCoordinates(normalized)) {
    warnings.push('Location coordinates were incomplete or outside valid latitude/longitude ranges, so the report treats exact location as not selected.');
  }
  return warnings;
}
