import assert from 'node:assert/strict';
import test from 'node:test';
import type { Map as LibreMap, LayerSpecification } from 'maplibre-gl';
import { mapPresentation, applyMapPresentation } from '../../map-appearance.ts';

test('light geographic paint retains readable street tiles, official network expressions and estimate patterns', () => {
  const light = mapPresentation('light', true);
  const paint = (id: string) => light.layers.find(layer => layer.id === id)!.paint as Record<string, unknown>;
  assert.equal(paint('water')['background-color'], '#CAD6CF');
  assert.equal(paint('land-fill')['fill-color'], '#D2DCCD');
  assert.equal(paint('street-detail')['raster-brightness-max'], .86);
  assert.equal(paint('street-detail')['raster-opacity'], .94);
  assert.deepEqual(paint('network-lines')['line-color'], ['get', 'color']);
  assert.deepEqual(paint('station-circles')['circle-color'], ['get', 'color']);
  assert.equal(paint('before-route')['line-color'], '#245F8A');
  assert.equal(paint('after-route')['line-color'], '#A96520');
  assert.deepEqual(paint('before-route')['line-dasharray'], [2, 1]);
  assert.deepEqual(paint('proposal-lines')['line-dasharray'], [2, 1]);
  assert.equal(light.buildingColor, '#B9C9C1');
});

test('street toggles retain opaque local land, and omitted appearance preserves legacy dark paints', () => {
  for (const appearance of ['light', 'dark'] as const) {
    const { layers } = mapPresentation(appearance, false);
    assert.equal(layers.find(layer => layer.id === 'street-detail')!.layout!.visibility, 'none');
    assert.equal((layers.find(layer => layer.id === 'land-fill')!.paint as Record<string, unknown>)['fill-opacity'], .85);
  }
  const legacy = mapPresentation();
  assert.equal((legacy.layers[0].paint as Record<string, unknown>)['background-color'], '#0b1c26');
  assert.equal((legacy.layers[1].paint as Record<string, unknown>)['raster-brightness-max'], .34);
});

test('live map paints match the initial appearance and update late building layers without touching network visibility', () => {
  const layers = new Map<string, LayerSpecification>(mapPresentation().layers.map(layer => [layer.id, layer]));
  const map = {
    getLayer: (id: string) => layers.get(id),
    setPaintProperty(id: string, property: string, value: unknown) {
      (layers.get(id)!.paint as Record<string, unknown>)[property] = value;
    },
    setLayoutProperty(id: string, property: string, value: unknown) {
      const layer = layers.get(id)!;
      layer.layout ??= {};
      (layer.layout as Record<string, unknown>)[property] = value;
    },
  } as unknown as LibreMap;
  layers.get('network-lines')!.layout = { visibility: 'none' };
  applyMapPresentation(map, 'light', true);
  for (const initial of mapPresentation('light', true).layers) assert.deepEqual(layers.get(initial.id)!.paint, initial.paint);
  assert.equal(layers.get('network-lines')!.layout!.visibility, 'none');
  for (const id of ['hdb-buildings', 'sg-buildings-extrusion']) layers.set(id, { id, type: 'fill-extrusion', source: 'buildings', paint: {} });
  applyMapPresentation(map, 'light', false);
  for (const id of ['hdb-buildings', 'sg-buildings-extrusion']) assert.equal((layers.get(id)!.paint as Record<string, unknown>)['fill-extrusion-color'], '#B9C9C1');
  assert.equal(layers.get('street-detail')!.layout!.visibility, 'none');
  applyMapPresentation(map);
  assert.deepEqual((layers.get('sg-buildings-extrusion')!.paint as Record<string, unknown>)['fill-extrusion-color'], ['match', ['get', 'heightBasis'], 'verified', '#8ba9ad', 'derived', '#7f999c', '#71888c']);
});
