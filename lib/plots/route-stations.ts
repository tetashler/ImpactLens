/** Shared browser/server geometry only; station attachment never creates network connections. */
import { groundDistance } from './adapters.ts';
import type { PlotLine, PlotPoint, PlotPosition } from './geometry.ts';

export const ROUTE_STATION_LIMITS = Object.freeze({ attachmentMetres: 25, coincidentMetres: 1 });
export interface RouteStationAttachment {
  routeId: string; orderedPointIds: string[];
  attached: { pointId: string; distanceMetres: number; alongMetres: number }[];
  ambiguousPointIds: string[]; coincidentPointIds: string[];
}

const radians = Math.PI / 180, radius = 6_371_008.8;

/** Local tangent projection in ground metres; bounded Singapore coordinates keep this suitable for attachment checks. */
export function projectStationOnSegment(p: PlotPosition, a: PlotPosition, b: PlotPosition): { distanceMetres: number; fraction: number; length: number } {
  const scaleX = radius * radians * Math.cos((a.lat + b.lat + p.lat) / 3 * radians), scaleY = radius * radians;
  const bx = (b.lon - a.lon) * scaleX, by = (b.lat - a.lat) * scaleY;
  const px = (p.lon - a.lon) * scaleX, py = (p.lat - a.lat) * scaleY;
  const squared = bx * bx + by * by;
  const fraction = squared === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / squared));
  return { distanceMetres: Math.hypot(px - fraction * bx, py - fraction * by), fraction, length: Math.sqrt(squared) };
}

/** All attached dots in deterministic polyline order, regardless of point creation order. */
export function attachRouteStations(route: PlotLine, points: PlotPoint[]): RouteStationAttachment {
  const attached: RouteStationAttachment['attached'] = [], ambiguousPointIds: string[] = [], coincidentPointIds = new Set<string>();
  for (const point of points) {
    let along = 0;
    const projections: { distanceMetres: number; alongMetres: number }[] = [];
    for (let i = 1; i < route.coordinates.length; i++) {
      const projected = projectStationOnSegment(point.coordinate, route.coordinates[i - 1], route.coordinates[i]);
      if (projected.length > 0.001) projections.push({ distanceMetres: projected.distanceMetres, alongMetres: along + projected.fraction * projected.length });
      along += groundDistance(route.coordinates[i - 1], route.coordinates[i]);
    }
    projections.sort((a, b) => a.distanceMetres - b.distanceMetres || a.alongMetres - b.alongMetres);
    const first = projections[0];
    if (!first || first.distanceMetres > ROUTE_STATION_LIMITS.attachmentMetres) continue;
    const ties = projections.filter(p => p.distanceMetres <= first.distanceMetres + 0.1);
    if (ties.some(p => Math.abs(p.alongMetres - first.alongMetres) > ROUTE_STATION_LIMITS.coincidentMetres)) ambiguousPointIds.push(point.id);
    attached.push({ pointId: point.id, ...first });
  }
  attached.sort((a, b) => a.alongMetres - b.alongMetres || a.pointId.localeCompare(b.pointId));
  for (let i = 0; i < attached.length; i++) for (let j = i + 1; j < attached.length; j++) {
    const a = points.find(p => p.id === attached[i].pointId)!, b = points.find(p => p.id === attached[j].pointId)!;
    if (Math.abs(attached[i].alongMetres - attached[j].alongMetres) <= ROUTE_STATION_LIMITS.coincidentMetres
      || groundDistance(a.coordinate, b.coordinate) <= ROUTE_STATION_LIMITS.coincidentMetres) {
      coincidentPointIds.add(a.id); coincidentPointIds.add(b.id);
    }
  }
  return { routeId: route.id, attached, orderedPointIds: attached.map(p => p.pointId), ambiguousPointIds,
    coincidentPointIds: [...coincidentPointIds] };
}
