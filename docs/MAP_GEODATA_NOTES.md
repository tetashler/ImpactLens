# Map geography preparation

Run `node scripts/prepare-map-data.ts` from the repository root using Node 24 or newer. The script resolves paths relative to its own location, so `node <absolute-path-to-script>` also works from another directory. It has no package dependencies and never writes to `data/`.

The map serves two separate local GeoJSON collections. `public/geography/subzones.geojson` contains all 332 supplied subzones (1,327,188 bytes). `public/geography/buildings.geojson` contains all 13,436 supplied HDB footprints (23,533,371 bytes). The larger building collection should be fetched lazily when its layer is enabled; it should not block the initial map. Keeping every vertex produces a larger asset than a 15 MB target, but avoids a geographically biased subset or unreviewed shape simplification.

## Geometry and properties

Both collections retain the source Polygon/MultiPolygon type, polygon parts, exterior rings, holes, vertex counts and ordering. Coordinates use WGS84 longitude first, latitude second. The script rounds each coordinate to six decimal places (roughly 0.11 metres at Singapore's latitude), without projection, simplification, sampling, or invented land shapes. The subzone source includes island geography; these boundaries are planning subzones rather than a current shoreline or complete terrain dataset.

Subzones use `SUBZONE_C` as their GeoJSON feature `id` and retain only `{ id, name }` properties, with `name` taken directly from `SUBZONE_N`. Buildings use source `OBJECTID` as their feature `id` and retain only `{ sourceId }` properties. Descriptive source properties are stripped from browser assets. The source fields are recorded in the manifest for auditability.

Validation checks finite two-dimensional coordinates, longitude/latitude ranges, ring length and closure. Invalid features are skipped and reported by their zero-based source index and reason in `manifest.json`; no invalid rings are silently closed or repaired. The supplied inputs produced **zero invalid features**. This is structural validation, not a polygon self-intersection or cadastral-accuracy assessment. Rounding can merge very close consecutive positions, but no vertices are removed.

## Height and coverage limitations

The supplied HDB layer has no height or storey field. The manifest explicitly records `sourceHasHeights: false` and `uniformVisualHeightMetres: 12`. Any 12 metre extrusion is a **uniform stylised visual assumption**, not measured physical building height. These are HDB footprints, not all Singapore buildings. Footprints do not establish housing population, occupancy, station demand, or model weights.

## Supplied source metadata

| Local input | Layer name | Features | Source bytes | Source `FMEL_UPD_D` range |
| --- | --- | ---: | ---: | --- |
| `data/geography/MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson` | `URA_MP19_SUBZONE_NO_SEA_PL` | 332 | 3,180,569 | `20191223152313`–`20210910170416` |
| `data/buildings/HDBExistingBuilding.geojson` | `HDB_ACTIVE_BLK_P` | 13,436 | 57,012,074 | `20130426120209`–`20260619113032` |

`FMEL_UPD_D` values are preserved source attribute strings; they are not independently verified publication dates or download timestamps, and their timezone is unspecified. The filenames and layer names suggest government planning/HDB datasets, but the supplied files contain no download URL, licence, retrieval timestamp, or CRS object. Download provenance and licensing were not independently verified. No external dataset was downloaded or substituted during preparation. Coordinates were checked against WGS84 ranges and Singapore's expected longitude/latitude extent.

The manifest records SHA-256 hashes for both original inputs and generated outputs, feature counts, position counts, bounds, byte sizes and invalid-feature reports. It intentionally contains no machine-specific absolute paths or changing build timestamp, so rebuilding unchanged inputs produces identical output. Tests pin the supplied input hashes and compare every generated position against the corresponding rounded source position; they also check IDs, properties, complete feature counts, ring closure and longitude/latitude order.

## Verification

Run `node --test prototype/mrt/tests/map-geodata.test.ts`. To verify reproducibility, run preparation again and compare the generated files or their SHA-256 hashes. The output collections contain 58,917 subzone positions and 1,011,496 building positions, including each closed ring's repeated final position.
