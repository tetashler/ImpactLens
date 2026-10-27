import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../../', import.meta.url);
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const sourceHashes = {
  subzones: '77e30aa02b1784b649d9b6f23e3b2ebb825af787de554f3a3fb76bbee3013c42',
  buildings: '7c987511548de3a82da403cabca02702031e02ade8703a9e401417883dfeb702',
};

test('map geography retains all supplied polygons and uses longitude, latitude without invented heights', async () => {
  const manifest = JSON.parse(await readFile(new URL('public/geography/manifest.json', root), 'utf8'));
  assert.equal(manifest.sourceHasHeights, false);
  assert.equal(manifest.uniformVisualHeightMetres, 12);
  assert.equal(manifest.coordinateDecimalPlaces, 6);
  // Read and verify one dataset at a time; do not clone the million-position building collection.
  for (const kind of ['subzones', 'buildings'] as const) {
    const entry = manifest[kind];
    const sourceBytes = await readFile(new URL(entry.sourcePath, root));
    assert.equal(hash(sourceBytes), sourceHashes[kind], 'supplied raw file must remain byte-for-byte unchanged');
    assert.equal(entry.sourceSha256, sourceHashes[kind]);
    const source = JSON.parse(sourceBytes.toString('utf8'));
    const outputBytes = await readFile(new URL(`public${entry.outputPath}`, root));
    assert.equal(hash(outputBytes), entry.outputSha256);
    assert.equal(outputBytes.byteLength, entry.outputBytes);
    const output = JSON.parse(outputBytes.toString('utf8'));
    const expectedCount = kind === 'subzones' ? 332 : 13436;
    assert.equal(source.features.length, expectedCount);
    assert.equal(output.features.length, expectedCount);
    assert.equal(entry.sourceFeatureCount, expectedCount);
    assert.equal(entry.outputFeatureCount, expectedCount);
    assert.deepEqual(entry.invalidFeatures, []);
    const ids = new Set();
    let positions = 0;
    for (let index = 0; index < source.features.length; index++) {
      const original = source.features[index];
      const feature = output.features[index];
      const id = kind === 'subzones' ? original.properties.SUBZONE_C : original.properties.OBJECTID;
      assert.equal(feature.id, id);
      ids.add(feature.id);
      assert.deepEqual(feature.properties, kind === 'subzones' ? { id, name: original.properties.SUBZONE_N } : { sourceId: id });
      assert.equal(feature.geometry.type, original.geometry.type);
      const originalPolygons = original.geometry.type === 'Polygon' ? [original.geometry.coordinates] : original.geometry.coordinates;
      const outputPolygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
      assert.equal(outputPolygons.length, originalPolygons.length);
      for (let polygonIndex = 0; polygonIndex < originalPolygons.length; polygonIndex++) {
        const originalPolygon = originalPolygons[polygonIndex];
        const polygon = outputPolygons[polygonIndex];
        assert.equal(polygon.length, originalPolygon.length);
        for (let ringIndex = 0; ringIndex < originalPolygon.length; ringIndex++) {
          const originalRing = originalPolygon[ringIndex];
          const ring = polygon[ringIndex];
          assert.equal(ring.length, originalRing.length);
          assert.ok(ring.length >= 4);
          assert.deepEqual(ring[0], ring.at(-1));
          for (let positionIndex = 0; positionIndex < ring.length; positionIndex++) {
            const position = ring[positionIndex];
            const originalPosition = originalRing[positionIndex];
            assert.equal(position.length, 2);
            assert.ok(Number.isFinite(position[0]) && Number.isFinite(position[1]));
            assert.ok(position[0] > 103 && position[0] < 105, 'Singapore longitude must be first');
            assert.ok(position[1] > 1 && position[1] < 2, 'Singapore latitude must be second');
            assert.equal(position[0], Number(originalPosition[0].toFixed(6)));
            assert.equal(position[1], Number(originalPosition[1].toFixed(6)));
            positions++;
          }
        }
      }
    }
    assert.equal(ids.size, expectedCount);
    assert.equal(positions, entry.positionCount);
  }
});
