"""Stream the local extract, select unchanged roofs with an STRtree, emit static chunks.

Combined outputs are internal-review artifacts. Separate storage does not resolve
SODL/ODbL derivative-database obligations; no public release is authorised here.
"""
import argparse
import collections
import gc
import hashlib
import json
import math
import time
from pathlib import Path
import shapely
from shapely.geometry import shape, box, mapping
from shapely.ops import unary_union
from shapely.strtree import STRtree
from conflation import validate, locate, parse_overture, select_footprints, area_metres
from acquire import RAW, RELEASE, EXPECTED_SHA, sha

HDB = Path('data/buildings/HDBExistingBuilding.geojson')
URA = Path('tmp/phase7c/raw/ura-buildings.geojson')
BOUNDARY = Path('data/geography/MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson')
PINS = {HDB:'7c987511548de3a82da403cabca02702031e02ade8703a9e401417883dfeb702', URA:'ab97c16df4a76456c8551cc34b28f8ff0ec0285b6b5bb8487bb001e2434c691c', BOUNDARY:'77e30aa02b1784b649d9b6f23e3b2ebb825af787de554f3a3fb76bbee3013c42', RAW:EXPECTED_SHA}
DISTRICTS = {'tiong-bahru':(103.827,1.286),'sengkang':(103.895,1.391),'punggol':(103.902,1.405),
             'tampines':(103.945,1.354),'orchard':(103.834,1.304),'downtown':(103.851,1.283),
             'jurong':(103.742,1.333),'woodlands':(103.786,1.436),'yishun':(103.835,1.43),
             'changi':(103.988,1.356),'tuas':(103.64,1.32),'industrial':(103.705,1.322),
             'private-serangoon-gardens':(103.861,1.364),'low-density-lim-chu-kang':(103.718,1.425)}


def dumps(x): return json.dumps(x, separators=(',', ':'), ensure_ascii=False, allow_nan=False)


def source(id, dataset, title, publisher, url, licence, date, checksum, attribution):
    return dict(id=id,datasetId=dataset,title=title,publisher=publisher,url=url,licenceUrl=licence,referenceDate=date,
                accessedDate='2026-10-28',rawSha256=checksum,attribution=attribution)


def prepare(prototype=False):
    start=time.perf_counter(); out=Path('tmp/phase7c1/prototype' if prototype else 'tmp/phase7c1/derived');out.mkdir(parents=True,exist_ok=True)
    for path, digest in PINS.items():
        if sha(path) != digest: raise ValueError(f'Pinned source changed: {path.name}')
    boundary=json.loads(BOUNDARY.read_bytes())['features']; geometries=[shape(f['geometry']) for f in boundary]
    invalid_boundary=[f['properties']['SUBZONE_C'] for f,g in zip(boundary,geometries) if not g.is_valid]
    land=unary_union(geometries)
    if not land.is_valid: raise ValueError('Dissolved geographic scope is invalid')
    shapely.prepare(land)
    area_tree=STRtree(geometries)
    boxes={k:box(x-.01,y-.01,x+.01,y+.01) for k,(x,y) in DISTRICTS.items()}
    box_names=list(boxes);box_tree=STRtree(list(boxes.values()))
    prototype_land=unary_union([boxes[k] for k in ['tiong-bahru','industrial','private-serangoon-gardens']])
    candidates=[]; counts=collections.Counter(); excludes=collections.Counter(); heights=collections.Counter(); upstream=collections.Counter()
    region_counts={k:collections.Counter() for k in boxes}; region_areas={k:collections.Counter() for k in boxes}
    subzones={f['properties']['SUBZONE_C']:{'planningArea':f['properties']['PLN_AREA_N'],'subzone':f['properties']['SUBZONE_N'],'sources':collections.Counter(),'selected':0,'selectedAreaM2':0} for f in boundary}
    issues=out/'exclusions.ndjson'; provenance=out/'provenance.ndjson'; id_seen=set()
    with issues.open('w',encoding='utf8') as issues_file, provenance.open('w',encoding='utf8') as provenance_file:
        def accept(c, original):
            g=c['geometry'];counts[c['source']+'-valid']+=1
            if not locate(g,land):
                raise ValueError('outside-2019-land-scope')
            counts[c['source']+'-in-scope']+=1
            if c['id'] in id_seen: raise ValueError('repeated-source-id')
            id_seen.add(c['id'])
            for bi in box_tree.query(g,predicate='intersects'):
                name=box_names[int(bi)];b=boxes[name];region_counts[name][c['source']]+=1;region_areas[name][c['source']]+=area_metres(g.intersection(b))
            p=g.representative_point(); hit=[int(i) for i in area_tree.query(p) if geometries[int(i)].covers(p)]
            zone=min((boundary[i]['properties']['SUBZONE_C'] for i in hit),default=None)
            c['zone']=zone
            if zone: subzones[zone]['sources'][c['source']]+=1
            if c['source']=='overture':
                heights[c['properties']['heightBasis']]+=1
                for s in c['properties']['upstreamSources']:upstream[s.get('dataset','unknown')]+=1
            if prototype and not g.intersects(prototype_land):
                counts['outside-prototype']+=1; return
            # Full source property records stay in an ignored sidecar; runtime
            # uses original source ID to retrieve them, not a second full copy.
            provenance_file.write(dumps({'id':c['id'],'properties':original})+'\n')
            c['properties'].pop('upstreamSources',None)
            candidates.append(c)
        for key,path in [('hdb',HDB),('ura',URA)]:
            raw=json.loads(path.read_bytes())
            for index,f in enumerate(raw['features']):
                counts[key+'-raw']+=1; ident=f'{key}:{f.get("properties",{}).get("OBJECTID",index)}'
                try:
                    p=f['properties'];g=shape(f['geometry']);validate(g)
                    c={'id':ident,'source':key,'geometry':g,'properties':{'category':p.get('BLDG_TYPE'),'heightMetres':12,'heightBasis':'illustrative','heightNote':'Display fallback; no source height or floor count.'}}
                    accept(c,p)
                except (ValueError,TypeError,KeyError,shapely.errors.GEOSException) as e:
                    reason=str(e);excludes[key+':'+reason]+=1;issues_file.write(dumps({'id':ident,'reason':reason})+'\n')
            del raw;gc.collect()
        with RAW.open(encoding='utf8') as f:
            for line in f:
                raw=json.loads(line);counts['overture-raw']+=1
                try:
                    c=parse_overture(raw)
                    accept(c,raw['properties'])
                except (ValueError,TypeError,KeyError,shapely.errors.GEOSException) as e:
                    reason=str(e);excludes['overture:'+reason]+=1;issues_file.write(dumps({'id':'overture:'+str(raw.get('id')),'reason':reason})+'\n')
    print(dumps({'loaded':counts,'candidates':len(candidates)}),flush=True)
    selected,audit=select_footprints(candidates)
    # Complete audit: input = invalid/out-of-scope + prototype-excluded + kept + suppressed.
    assert sum(counts[k+'-raw'] for k in ['hdb','ura','overture']) == sum(excludes.values())+counts['outside-prototype']+len(selected)+len(audit['suppressed'])
    (out/'conflation.json').write_text(dumps(audit),encoding='utf8')
    sources=[source('hdb','local-hdb-supplied','Supplied HDB Existing Building','HDB','https://data.gov.sg/datasets/d_16b157c52ed637edd6ba1232e026258d/view','https://data.gov.sg/open-data-licence','Supplied snapshot; original acquisition unknown',PINS[HDB],'HDB supplied footprints; original acquisition unknown, accessed locally 2026-10-28.'),
             source('ura','d_ee3bd86e1334fbc58b520cd987090e54','Amendment to Master Plan 2019 Building layer','URA','https://data.gov.sg/datasets/d_ee3bd86e1334fbc58b520cd987090e54/view','https://data.gov.sg/open-data-licence','2025-09',PINS[URA],'URA indicative buildings (Sep 2025), accessed 2026-10-28; incomplete.'),
             source('overture',RELEASE,'Overture Buildings','Overture Maps Foundation','https://docs.overturemaps.org/guides/buildings/','https://opendatacommons.org/licenses/odbl/1-0/',RELEASE,EXPECTED_SHA,'\u00a9 OpenStreetMap contributors, Overture Maps Foundation; Microsoft ML Buildings; Google Open Buildings (CC BY 4.0). Accessed 2026-10-28.')]
    combined=source('unified','impactlens-conflation-1','Local unified building review','ImpactLens','https://docs.overturemaps.org/attribution/','https://opendatacommons.org/licenses/odbl/1-0/',RELEASE,hashlib.sha256(dumps(sources).encode()).hexdigest(),'Local review only; combined public licensing unresolved. Heights sourced, derived or illustrative; no completeness claim.')
    groups=collections.defaultdict(list); selected_sources=collections.Counter(); selected_heights=collections.Counter()
    for c in selected:
        g=c['geometry'];b=g.bounds; k=f"c1-{c['source']}-x{math.floor((b[0]+b[2])/.02)}-y{math.floor((b[1]+b[3])/.02)}"
        # 0.01-degree cells, complete geometry belongs to exactly one cell.
        # Store references, not a second full set of Python coordinate arrays.
        # Convert GEOS geometries to JSON coordinates one bounded chunk at a time.
        groups[k].append(c)
        selected_sources[c['source']]+=1;selected_heights[c['properties']['heightBasis']]+=1
        if c['zone']: subzones[c['zone']]['selected']+=1;subzones[c['zone']]['selectedAreaM2']+=area_metres(g)
        for bi in box_tree.query(g,predicate='intersects'):
            name=box_names[int(bi)];bx=boxes[name];region_counts[name]['unified']+=1;region_areas[name]['unified']+=area_metres(g.intersection(bx))
    chunks=[]
    for key,members in sorted(groups.items()):
        features=[]
        for c in sorted(members,key=lambda c:c['id']):
            props={k:v for k,v in c['properties'].items() if k in ['category','heightMetres','heightBasis','heightNote','baseMetres']}
            props.update(id=c['id'],sourceId=c['source'],sourceObjectId=c['id'].split(':',1)[1],attributionId=c['source'])
            features.append({'type':'Feature','id':c['id'],'geometry':mapping(c['geometry']),'properties':props})
        data=dumps({'type':'FeatureCollection','features':features}).encode();digest=hashlib.sha256(data).hexdigest();ident=key+'-'+digest[:16]
        if len(data)>8_000_000:raise ValueError('Chunk budget exceeded; refine partition before publishing manifest')
        extents=[c['geometry'].bounds for c in members];bounds=[min(b[0] for b in extents),min(b[1] for b in extents),max(b[2] for b in extents),max(b[3] for b in extents)]
        (out/(ident+'.geojson')).write_bytes(data)
        chunks.append(dict(id=ident,url=f'/geography/buildings-v1/{ident}.geojson',bounds=bounds,featureCount=len(features),bytes=len(data),sha256=digest))
    manifest=dict(version=1,source=combined,sources=sources,distribution='local-review-only',featureCount=len(selected),minZoom=14,chunks=chunks,heightPolicy='Direct source heights are not independently surveyed. Above-ground floors x assumed 3 m; otherwise illustrative 12 m. Whole roofs only; building parts deferred.')
    (out/'unified-manifest.json').write_text(dumps(manifest),encoding='utf8')
    # Selected union area is calculated independently to expose remaining slivers.
    selected_tree=STRtree([c['geometry'] for c in selected])
    district_union={name:area_metres(unary_union([selected[int(i)]['geometry'] for i in selected_tree.query(b,predicate='intersects')]).intersection(b)) for name,b in boxes.items()}
    summary={'release':RELEASE,'prototype':prototype,'counts':counts,'exclusions':excludes,'selected':len(selected),'selectedSources':selected_sources,'selectedHeights':selected_heights,'heightBeforeConflation':heights,'upstream':upstream,'suppressed':len(audit['suppressed']),'suppressionKinds':collections.Counter(x['kind'] for x in audit['suppressed']),'sumUncoveredAreaAtDecisionM2':sum(x['uncoveredM2'] for x in audit['suppressed']),'minorOverlaps':len(audit['minorOverlaps']),'retainedOverlapConflicts':len(audit['retainedOverlaps']),'pairChecks':audit['pairChecks'],'invalidBoundaryCodes':invalid_boundary,'boundarySha256':PINS[BOUNDARY],'boundaryMethod':'Dissolve 332 original MP2019 subzones; union validated, no clipping; interior point plus >=50% land intersection','coverage':{name:{'centre':DISTRICTS[name],'counts':region_counts[name],'clippedAreaM2':region_areas[name],'selectedUnionAreaM2':district_union[name]} for name in boxes},'subzones':subzones,'chunks':len(chunks),'bytes':sum(c['bytes'] for c in chunks),'largestChunk':max(c['bytes'] for c in chunks),'preparationSeconds':time.perf_counter()-start,'bounds':[min(c['bounds'][0] for c in chunks),min(c['bounds'][1] for c in chunks),max(c['bounds'][2] for c in chunks),max(c['bounds'][3] for c in chunks)]}
    (out/'audit.json').write_text(dumps(summary),encoding='utf8')
    (out/'LICENSING.txt').write_text('INTERNAL REVIEW ONLY. Not cleared for public demonstration or redistribution. Overture Buildings: ODbL 1.0; OSM/Microsoft/Google attribution. HDB/URA/boundary: Singapore Open Data Licence. Conflation is potentially a Derivative Database; source-separated files do not avoid ODbL. Public use requires compatibility resolution, notices and a machine-readable database or alteration offer under ODbL 4.6. See docs/PHASE7C1_ISLANDWIDE_BUILDING_COVERAGE.md.\n',encoding='utf8')
    print(dumps({k:v for k,v in summary.items() if k not in ['coverage','subzones']}),flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--prototype',action='store_true');args=parser.parse_args();prepare(args.prototype)
