"""Offline geometry selection. Keeps original footprints; never creates/joins roofs."""
import math
import re
from shapely.geometry import shape
from shapely.strtree import STRtree

METRES_PER_DEGREE = 111195.0802335329
PRIORITY = {'hdb': 0, 'ura': 1, 'overture': 2}


def area_metres(g):
    if g.is_empty or g.area == 0:
        return 0.0
    return g.area * METRES_PER_DEGREE ** 2 * math.cos(math.radians(g.centroid.y))


def validate(g):
    if g.geom_type not in ('Polygon', 'MultiPolygon') or g.is_empty or not g.is_valid or not math.isfinite(g.area) or g.area <= 0:
        raise ValueError('invalid-or-empty-topology')
    x1, y1, x2, y2 = g.bounds
    if not all(math.isfinite(x) for x in g.bounds) or not (103.55 <= x1 <= x2 <= 104.15 and 1.12 <= y1 <= y2 <= 1.5) or g.has_z:
        raise ValueError('invalid-singapore-lon-lat')


def locate(g, land):
    # Representative point is inside the polygon (unlike a centroid). Also require
    # majority land intersection so a tiny shoreline contact is insufficient.
    if not land.covers(g.representative_point()):
        return False
    return land.covers(g) or g.intersection(land).area / g.area >= .5


def parse_overture(raw):
    p = raw.get('properties') or {}
    if raw.get('type') != 'Feature' or p.get('type', 'building') != 'building' or p.get('building_id') is not None:
        raise ValueError('building-parts-not-supported')
    if p.get('is_underground') is True:
        raise ValueError('underground-not-rendered')
    if p.get('min_height') not in (None,0) or p.get('min_floor') not in (None,0):
        raise ValueError('elevated-base-not-supported')
    object_id = raw.get('id', p.get('id'))
    if not isinstance(object_id, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,80}', object_id):
        raise ValueError('missing-source-id')
    g = shape(raw.get('geometry')); validate(g)
    height, floors = p.get('height'), p.get('num_floors')
    if height is not None:
        if isinstance(height, bool) or not isinstance(height, (float, int)) or not math.isfinite(height) or not 0 < height <= 1000:
            raise ValueError('invalid-height')
        basis, note = 'verified', 'Source height in metres; not independently surveyed. See original attribute provenance.'
    elif floors is not None:
        if isinstance(floors, bool) or not isinstance(floors, int) or not 0 < floors <= 200:
            raise ValueError('invalid-floors')
        height, basis, note = floors * 3, 'derived', 'Sourced above-ground floors multiplied by assumed 3 m; not surveyed.'
    else:
        height, basis, note = 12, 'illustrative', 'Display fallback; no source height or floor count.'
    return {'id': 'overture:' + object_id, 'source': 'overture', 'geometry': g, 'properties': {
        'heightMetres': height, 'heightBasis': basis, 'heightNote': note,
        'category': p.get('class') or p.get('subtype'), 'upstreamSources': p.get('sources', []),
        'hasParts': p.get('has_parts') is True,
    }}


def relation(a, b):
    intersection = a.intersection(b).area
    if intersection <= 0:
        return {'kind': 'disjoint'}
    small, large = sorted((a.area, b.area))
    iou = intersection / (a.area + b.area - intersection)
    fraction = intersection / small
    square_metres = intersection * METRES_PER_DEGREE ** 2 * math.cos(math.radians((a.centroid.y + b.centroid.y) / 2))
    if iou >= .9 and small / large >= .9:
        kind = 'equivalent'
    elif square_metres <= 1 or fraction <= .02:
        kind = 'minor-overlap'
    elif fraction >= .95:
        kind = 'contained-conflict'
    else:
        kind = 'partial-conflict'
    return {'kind': kind, 'iou': round(iou, 8), 'smallerCoverage': round(fraction, 8), 'candidateCoverage':round(intersection/a.area,8),'retainedCoverage':round(intersection/b.area,8),'intersectionM2': round(square_metres, 3)}


def select_footprints(candidates):
    # Detailed public-housing footprints first, then URA indicative geometry,
    # then Overture gap-fill. Within a source retain larger whole roofs before
    # contained outlines. This is display precedence, not proof of real identity.
    ordered = sorted(candidates, key=lambda c: (PRIORITY[c['source']], -c['geometry'].area, c['id']))
    if not ordered:
        return [], {'suppressed': [], 'minorOverlaps': [], 'retainedOverlaps':[], 'pairChecks': 0}
    tree = STRtree([c['geometry'] for c in ordered])
    kept_indices, kept, suppressed, minor, residual = set(), [], [], [], []
    checks = 0
    for index, c in enumerate(ordered):
        conflicts = []; potential=sorted(int(j) for j in tree.query(c['geometry']) if int(j) in kept_indices)
        for j in potential:
            other = ordered[j]; checks += 1
            r = relation(c['geometry'], other['geometry'])
            if r['kind'] == 'minor-overlap':
                minor.append({'id': c['id'], 'otherId': other['id'], **r})
            elif r['kind'] != 'disjoint':
                conflicts.append({'retainedId': other['id'], **r})
        union_coverage=0;uncovered=None
        if conflicts:
            from shapely.ops import unary_union
            blockers=unary_union([ordered[j]['geometry'] for j in potential])
            uncovered=c['geometry'].difference(blockers)
            union_coverage=1-uncovered.area/c['geometry'].area
        if conflicts and (union_coverage>=.5-1e-10 or any(r['kind']=='equivalent' for r in conflicts)):
            # No clipping: omit the entire lower-precedence geometry and report
            # uncovered area sacrificed by that display choice separately.
            kind = 'equivalent' if len(conflicts) == 1 and conflicts[0]['kind'] == 'equivalent' else 'multiple-conflict' if len(conflicts) > 1 else conflicts[0]['kind']
            suppressed.append({'id': c['id'], 'kind': kind, 'matches': conflicts,'candidateUnionCoverage':round(union_coverage,8), 'uncoveredM2': round(area_metres(uncovered), 3) if not uncovered.is_empty else 0})
        else:
            for r in conflicts:residual.append({'id':c['id'],'otherId':r['retainedId'],**r,'candidateUnionCoverage':round(union_coverage,8)})
            kept_indices.add(index); kept.append(c)
    retained_ids={c['id'] for c in kept}
    minor=[r for r in minor if r['id'] in retained_ids and r['otherId'] in retained_ids]
    return kept, {'suppressed': suppressed, 'minorOverlaps': minor, 'retainedOverlaps':residual, 'pairChecks': checks}
