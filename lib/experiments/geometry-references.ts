import { parseScenarioGeometry } from '../plots/geometry.ts';
import type { ExperimentConfigurationV1 } from './configuration.ts';
import type { ExperimentGeometryContextV1 } from './identity.ts';
import { ensure } from './validation.ts';

/** References are checked against the actual retained drawings, never inferred from proximity. */
export function checkGeometryReferences(configuration: ExperimentConfigurationV1, context: ExperimentGeometryContextV1 | null): void {
  const geometry = context ? parseScenarioGeometry(JSON.parse(context.canonicalContent)) : null;
  if (configuration.kind === 'mrt') {
    if (configuration.routeId !== null) ensure(geometry?.features.some(feature => feature.id === configuration.routeId && feature.kind === 'line'), 'MRT route reference is missing from the actual plot snapshot');
    for (const id of configuration.stationPointIds) ensure(geometry?.features.some(feature => feature.id === id && feature.kind === 'point'), 'MRT station reference is missing from the actual plot snapshot');
  }
  if (configuration.kind === 'aac' && configuration.sitePointId !== null)
    ensure(geometry?.features.some(feature => feature.id === configuration.sitePointId && feature.kind === 'point'), 'AAC site reference is missing from the actual plot snapshot');
}
