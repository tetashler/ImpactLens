import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

type Position = number[];
type Geometry = { type: 'Polygon' | 'MultiPolygon'; coordinates: Position[][] | Position[][][] };
type Feature = { type: 'Feature'; id?: string | number; properties: Record<string, unknown>; geometry: Geometry };
type Collection = { type: 'FeatureCollection'; name?: string; features: Feature[] };
const root = new URL('../', import.meta.url);
const outputDirectory = new URL('public/geography/', root);
const precision = 6;

function rings(geometry: Geometry): Position[][] {
  if (geometry.type === 'Polygon') return geometry.coordinates as Position[][];
  if (geometry.type === 'MultiPolygon') return (geometry.coordinates as Position[][][]).flat();
  throw new Error('Expected Polygon or MultiPolygon');
}

function validateGeometry(geometry: Geometry): void {
  const allRings = rings(geometry);
  if (!allRings.length) throw new Error('Empty polygon');
  for (const ring of allRings) {
    if (!Array.isArray(ring) || ring.length < 4) throw new Error('Ring has fewer than four positions');
    for (const position of ring) {
      if (position.length !== 2 || !position.every(Number.isFinite)) throw new Error('Expected finite two-dimensional position');
      if (Math.abs(position[0]) > 180 || Math.abs(position[1]) > 90) throw new Error('Position outside WGS84 longitude/latitude range');
    }
    if (ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1]) throw new Error('Unclosed polygon ring');
  }
}

async function prepare(inputPath: string, outputName: string, kind: 'subzones' | 'buildings') {
  const raw = await readFile(new URL(inputPath, root));
  const source: Collection = JSON.parse(raw.toString('utf8'));
  if (source.type !== 'FeatureCollection') throw new Error(`${inputPath}: expected FeatureCollection`);
  const sourceCount = source.features.length;
  const invalidFeatures: { sourceIndex: number; reason: string }[] = [];
  const features: Feature[] = [];
  const dates = new Set<string>();
  const sourcePropertyNames = new Set<string>();
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  let positionCount = 0;
  for (const [index, feature] of source.features.entries()) {
    Object.keys(feature.properties).forEach(key => sourcePropertyNames.add(key));
    if (typeof feature.properties.FMEL_UPD_D === 'string') dates.add(feature.properties.FMEL_UPD_D);
    try {
      validateGeometry(feature.geometry);
      const id = kind === 'subzones' ? feature.properties.SUBZONE_C : feature.properties.OBJECTID;
      if (typeof id !== 'string' && typeof id !== 'number') throw new Error('Missing source identifier');
      if (kind === 'subzones' && typeof feature.properties.SUBZONE_N !== 'string') throw new Error('Missing subzone name');
      for (const ring of rings(feature.geometry)) for (const position of ring) {
        position[0] = Number(position[0].toFixed(precision));
        position[1] = Number(position[1].toFixed(precision));
        bounds[0] = Math.min(bounds[0], position[0]);
        bounds[1] = Math.min(bounds[1], position[1]);
        bounds[2] = Math.max(bounds[2], position[0]);
        bounds[3] = Math.max(bounds[3], position[1]);
        positionCount++;
      }
      validateGeometry(feature.geometry);
      features.push({ type: 'Feature', id, properties: kind === 'subzones'
        ? { id, name: feature.properties.SUBZONE_N }
        : { sourceId: id }, geometry: feature.geometry });
    } catch (error) {
      invalidFeatures.push({ sourceIndex: index, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  const output = JSON.stringify({ type: 'FeatureCollection', features });
  await writeFile(new URL(outputName, outputDirectory), output + '\n');
  const sortedDates = [...dates].sort();
  return {
    sourcePath: inputPath,
    sourceLayerName: source.name ?? null,
    sourceSha256: createHash('sha256').update(raw).digest('hex'),
    sourceBytes: raw.byteLength,
    sourceFeatureCount: sourceCount,
    sourcePropertyNames: [...sourcePropertyNames].sort(),
    sourceFmelUpdateRange: { earliest: sortedDates[0] ?? null, latest: sortedDates.at(-1) ?? null },
    outputPath: `/geography/${outputName}`,
    outputFeatureCount: features.length,
    outputBytes: Buffer.byteLength(output + '\n'),
    outputSha256: createHash('sha256').update(output + '\n').digest('hex'),
    positionCount,
    bounds,
    invalidFeatures,
  };
}

await mkdir(outputDirectory, { recursive: true });
// Process sequentially to avoid retaining both large source files in memory.
const subzones = await prepare('data/geography/MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson', 'subzones.geojson', 'subzones');
const buildings = await prepare('data/buildings/HDBExistingBuilding.geojson', 'buildings.geojson', 'buildings');
const manifest = {
  schemaVersion: 1,
  coordinateSystem: 'WGS84 longitude, latitude',
  coordinateDecimalPlaces: precision,
  geometryProcessing: 'All valid source polygons, rings and vertices retained; coordinates rounded to six decimal places. No simplification or sampling.',
  sourceHasHeights: false,
  uniformVisualHeightMetres: 12,
  heightLimitation: '12 metres is a uniform stylised visual assumption, not measured building height.',
  provenanceLimitation: 'Derived from supplied local files. Download URL, download date and licence were not supplied or independently verified. FMEL_UPD_D values are source attributes, not download timestamps.',
  subzones,
  buildings,
};
await writeFile(new URL('manifest.json', outputDirectory), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Prepared ${subzones.outputFeatureCount} subzones (${subzones.outputBytes} bytes) and ${buildings.outputFeatureCount} building footprints (${buildings.outputBytes} bytes) in ${fileURLToPath(outputDirectory)}`);
if (subzones.invalidFeatures.length || buildings.invalidFeatures.length) console.warn('Invalid features were skipped; see manifest.json for source indices and reasons.');
