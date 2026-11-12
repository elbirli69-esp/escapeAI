export type LocationCoords = { lat: number; lon: number };

export function haversineDistanceMeters(a: LocationCoords, b: LocationCoords): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isValidGeoCoordinates(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

export type ValidateLocationOptions = {
  radiusMeters: number;
  maxAccuracyMeters?: number;
};

export type ValidateLocationResult =
  | { ok: true; distanceMeters: number }
  | {
      ok: false;
      reason: "invalid_coords" | "too_far" | "accuracy_too_low";
      distanceMeters?: number;
    };

export function validatePlayerAtTarget(
  player: LocationCoords,
  target: LocationCoords,
  options: ValidateLocationOptions,
  accuracyMeters?: number,
): ValidateLocationResult {
  if (!isValidGeoCoordinates(player.lat, player.lon)) {
    return { ok: false, reason: "invalid_coords" };
  }
  const maxAcc = options.maxAccuracyMeters ?? 100;
  if (accuracyMeters !== undefined && accuracyMeters > maxAcc) {
    return { ok: false, reason: "accuracy_too_low" };
  }
  const distanceMeters = haversineDistanceMeters(player, target);
  if (distanceMeters > options.radiusMeters) {
    return { ok: false, reason: "too_far", distanceMeters };
  }
  return { ok: true, distanceMeters };
}
