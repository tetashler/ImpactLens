import type { Feature, Polygon } from 'geojson';
import type { Position } from '../../prototype/eldercare/types.ts';
import { position as validatePosition } from '../../prototype/eldercare/validation.ts';

// Same mean Earth radius used by the server's WGS84-haversine distance model.
const EARTH_RADIUS_METRES = 6371008.8;
const RADIANS = Math.PI / 180;

export function toLngLat(position: Position): [number, number] {
  validatePosition(position, false);
  return [position.lon, position.lat];
}

/** Spherical great-circle destinations; the ring is display geometry, not an access calculation. */
export function geodesicCircle(position: Position, radiusMetres: number, segments = 64): Feature<Polygon> {
  validatePosition(position, false);
  if (!Number.isFinite(radiusMetres) || radiusMetres < 0) throw new Error('Circle radius must be finite and nonnegative');
  if (!Number.isSafeInteger(segments) || segments < 3 || segments > 65536) throw new Error('Circle segments must be an integer from 3 to 65536');
  const latitude = position.lat * RADIANS;
  const longitude = position.lon * RADIANS;
  const angularRadius = radiusMetres / EARTH_RADIUS_METRES;
  const sinLatitude = Math.sin(latitude), cosLatitude = Math.cos(latitude);
  const sinLongitude = Math.sin(longitude), cosLongitude = Math.cos(longitude);
  const sinRadius = Math.sin(angularRadius), cosRadius = Math.cos(angularRadius);
  const ring: [number, number][] = [];
  for (let index = 0; index < segments; index++) {
    if (radiusMetres === 0) {
      ring.push([position.lon, position.lat]);
      continue;
    }
    const bearing = index * 2 * Math.PI / segments;
    // Rotate the centre vector toward local north/east. This remains defined at the poles,
    // where the usual longitude destination formula subtracts almost equal quantities.
    const north = Math.cos(bearing) * sinRadius, east = Math.sin(bearing) * sinRadius;
    const x = cosRadius * cosLatitude * cosLongitude - north * sinLatitude * cosLongitude - east * sinLongitude;
    const y = cosRadius * cosLatitude * sinLongitude - north * sinLatitude * sinLongitude + east * cosLongitude;
    const z = cosRadius * sinLatitude + north * cosLatitude;
    const degreesLongitude = Math.atan2(y, x) / RADIANS;
    ring.push([((degreesLongitude + 180) % 360 + 360) % 360 - 180, Math.atan2(z, Math.hypot(x, y)) / RADIANS]);
  }
  ring.push([...ring[0]]);
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}
