import type { LayerSpecification, Map as LibreMap } from 'maplibre-gl';

export type MapAppearance = 'light' | 'dark';

/** Presentation only: shared by initial style, live appearance changes and street toggles. */
export function mapPresentation(appearance: MapAppearance = 'dark', streets = true) {
  const light = appearance === 'light';
  const proposal = light ? '#A96520' : '#ffac79';
  const layers: LayerSpecification[] = [
    { id: 'water', type: 'background', paint: { 'background-color': light ? '#CAD6CF' : '#0b1c26' } },
    { id: 'street-detail', type: 'raster', source: 'streets', layout: { visibility: streets ? 'visible' : 'none' }, paint: {
      'raster-saturation': light ? -.65 : -.8, 'raster-brightness-max': light ? .86 : .34,
      'raster-contrast': light ? 0 : .15, 'raster-opacity': light ? .94 : .7,
    } },
    { id: 'land-fill', type: 'fill', source: 'land', paint: { 'fill-color': light ? '#D2DCCD' : '#243c45', 'fill-opacity': streets ? .12 : .85 } },
    { id: 'subzones', type: 'line', source: 'land', paint: { 'line-color': light ? '#5F7273' : '#4c6970', 'line-width': .7, 'line-opacity': .3 } },
    { id: 'network-lines', type: 'line', source: 'network', paint: { 'line-color': ['get', 'color'], 'line-width': 1.7, 'line-opacity': light ? .85 : .56, 'line-dasharray': [3, 2] } },
    { id: 'before-route', type: 'line', source: 'before', paint: { 'line-color': light ? '#245F8A' : '#99bcee', 'line-width': 5, 'line-opacity': .8, 'line-dasharray': [2, 1] } },
    { id: 'after-route', type: 'line', source: 'after', paint: { 'line-color': light ? '#A96520' : '#ffbd8c', 'line-width': 5, 'line-opacity': .85 } },
    { id: 'proposal-halo', type: 'line', source: 'proposal', paint: { 'line-color': proposal, 'line-width': 12, 'line-opacity': .09 } },
    { id: 'proposal-lines', type: 'line', source: 'proposal', paint: { 'line-color': proposal, 'line-width': 3, 'line-dasharray': [2, 1] } },
    { id: 'station-circles', type: 'circle', source: 'stations', paint: {
      'circle-color': ['get', 'color'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 2.4, 12, 4, 15, 6],
      'circle-stroke-width': 1.5, 'circle-stroke-color': light ? '#172B2B' : '#10232c', 'circle-opacity': .96,
    } },
  ];
  return { layers, buildingColor: light ? '#B9C9C1' : '#69858b', proposal };
}

export function applyMapPresentation(map: LibreMap, appearance: MapAppearance = 'dark', streets = true) {
  const { layers } = mapPresentation(appearance, streets);
  for (const layer of layers) {
    if (!map.getLayer(layer.id)) continue;
    for (const [property, value] of Object.entries(layer.paint ?? {})) map.setPaintProperty(layer.id, property as Parameters<LibreMap['setPaintProperty']>[1], value);
  }
  if (map.getLayer('street-detail')) map.setLayoutProperty('street-detail', 'visibility', streets ? 'visible' : 'none');
  applyBuildingPresentation(map, appearance);
}

/** Building layers can register asynchronously after the base map is ready. */
export function applyBuildingPresentation(map: LibreMap, appearance: MapAppearance = 'dark') {
  const { buildingColor } = mapPresentation(appearance);
  if (map.getLayer('hdb-buildings')) map.setPaintProperty('hdb-buildings', 'fill-extrusion-color', buildingColor);
  if (map.getLayer('sg-buildings-extrusion')) map.setPaintProperty('sg-buildings-extrusion', 'fill-extrusion-color', appearance === 'light'
    ? buildingColor : ['match', ['get', 'heightBasis'], 'verified', '#8ba9ad', 'derived', '#7f999c', '#71888c']);
}
