"""Offline GIS tests; Python standard library runner, no live requests."""
import sys
import json
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'buildings'))
from shapely.geometry import box, Polygon, MultiPolygon
from conflation import relation, select_footprints, parse_overture, locate, area_metres


def candidate(id, geom, source='overture'):
    return {'id': f'{source}:{id}', 'source': source, 'geometry': geom, 'properties': {}}


class ConflationTests(unittest.TestCase):
    def test_exact_and_near_equivalence(self):
        a = box(103.8, 1.3, 103.801, 1.301)
        self.assertEqual(relation(a, a)['kind'], 'equivalent')
        self.assertEqual(relation(a, box(103.80001, 1.3, 103.80101, 1.301))['kind'], 'equivalent')

    def test_adjacent_terraces_and_courtyard_are_distinct(self):
        a = box(103.8, 1.3, 103.801, 1.301)
        self.assertEqual(relation(a, box(103.801, 1.3, 103.802, 1.301))['kind'], 'disjoint')
        courtyard = Polygon(a.exterior, [box(103.8002,1.3002,103.8008,1.3008).exterior.coords])
        self.assertEqual(relation(courtyard, box(103.8003,1.3003,103.8007,1.3007))['kind'], 'disjoint')

    def test_containment_is_conflict_not_duplicate(self):
        self.assertEqual(relation(box(103.8,1.3,103.802,1.302),box(103.8001,1.3001,103.8003,1.3003))['kind'], 'contained-conflict')

    def test_partial_overlap_is_reported(self):
        self.assertEqual(relation(box(103.8,1.3,103.801,1.301),box(103.8005,1.3,103.8015,1.301))['kind'], 'partial-conflict')

    def test_precision_sliver_is_not_false_duplicate(self):
        self.assertEqual(relation(box(103.8,1.3,103.801,1.301),box(103.80099999,1.3,103.802,1.301))['kind'], 'minor-overlap')

    def test_multipart_gap_not_removed_by_bbox(self):
        multi = MultiPolygon([box(103.8,1.3,103.801,1.301),box(103.803,1.3,103.804,1.301)])
        kept, audit = select_footprints([candidate('a',multi),candidate('b',box(103.8015,1.3,103.8025,1.301))])
        self.assertEqual(len(kept), 2)
        self.assertEqual(len(audit['suppressed']), 0)

    def test_precedence_is_deterministic_and_refs_preserved(self):
        geom=box(103.8,1.3,103.801,1.301)
        data=[candidate('o',geom),candidate('h',geom,'hdb'),candidate('u',geom,'ura')]
        kept,audit=select_footprints(data)
        other,again=select_footprints(list(reversed(data)))
        self.assertEqual(kept[0]['id'],'hdb:h')
        self.assertEqual(audit,again)
        self.assertEqual(len(audit['suppressed']),2)
        self.assertEqual({x['id'] for x in audit['suppressed']},{'overture:o','ura:u'})
        self.assertEqual(len(data),3)

    def test_conflict_is_not_claimed_same_real_building(self):
        data=[candidate('h',box(103.8,1.3,103.801,1.301),'hdb'),candidate('o',box(103.8005,1.3,103.8015,1.301))]
        kept,audit=select_footprints(data)
        self.assertEqual(len(kept),1)
        self.assertEqual(audit['suppressed'][0]['kind'],'partial-conflict')

    def test_overture_ids_heights_and_sources(self):
        raw={'id':'abc-123','type':'Feature','geometry':box(103.8,1.3,103.801,1.301).__geo_interface__, 'properties':{'height':30,'sources':[{'dataset':'OpenStreetMap','record_id':'w123@1'}]}}
        got=parse_overture(raw)
        self.assertEqual(got['id'],'overture:abc-123')
        self.assertEqual(got['properties']['heightBasis'],'verified')
        self.assertIn('not independently surveyed',got['properties']['heightNote'])
        self.assertEqual(got['properties']['upstreamSources'],raw['properties']['sources'])
        raw['properties']={'num_floors':5}
        self.assertEqual(parse_overture(raw)['properties']['heightMetres'],15)
        raw['properties']={}
        self.assertEqual(parse_overture(raw)['properties']['heightMetres'],12)

    def test_parts_underground_and_invalid_height_rejected(self):
        raw={'id':'abc','type':'Feature','geometry':box(103.8,1.3,103.801,1.301).__geo_interface__,'properties':{}}
        for props in [{'type':'building_part'},{'is_underground':True},{'height':float('nan')},{'height':-5},{'num_floors':1.5}]:
            with self.assertRaises(ValueError): parse_overture({**raw,'properties':props})

    def test_geography_does_not_use_bbox_alone(self):
        land=box(103.8,1.3,103.81,1.31)
        self.assertTrue(locate(box(103.801,1.301,103.802,1.302),land))
        self.assertFalse(locate(box(103.9,1.301,103.901,1.302),land))

    def test_invalid_geometry_and_coordinate_order(self):
        raw={'id':'abc','type':'Feature','properties':{}}
        for g in [box(1.3,103.8,1.31,103.81),Polygon([(103.8,1.3),(103.801,1.301),(103.8,1.301),(103.801,1.3),(103.8,1.3)])]:
            with self.assertRaises(ValueError): parse_overture({**raw,'geometry':g.__geo_interface__})

    def test_elevated_buildings_remain_explicitly_unsupported(self):
        raw={'id':'raised','type':'Feature','geometry':box(103.8,1.3,103.801,1.301).__geo_interface__}
        for p in [{'height':10,'min_height':9},{'num_floors':3,'min_floor':2}]:
            with self.assertRaisesRegex(ValueError,'elevated-base-not-supported'):parse_overture({**raw,'properties':p})

    def test_empty_coverage_area_is_zero(self):
        self.assertEqual(area_metres(Polygon()),0)

    def test_residual_slivers_only_count_final_retained_pairs(self):
        data=[candidate('a',box(103.8,1.3,103.801,1.301),'hdb'),candidate('b',box(103.8012,1.3,103.8029,1.301),'ura'),candidate('c',box(103.80099999,1.3,103.802,1.301))]
        kept,audit=select_footprints(data)
        self.assertEqual(len(kept),2)
        self.assertEqual(audit['minorOverlaps'],[])

    def test_distinct_partial_wings_are_not_sacrificed_for_small_shared_area(self):
        data=[candidate('bar',box(103.8,1.3,103.802,1.3001),'hdb'),candidate('wing',box(103.8,1.3,103.8002,1.301),'hdb')]
        kept,audit=select_footprints(data)
        self.assertEqual(len(kept),2)
        self.assertEqual(len(audit['retainedOverlaps']),1)

    def test_small_preferred_building_cannot_remove_large_containing_roof(self):
        data=[candidate('small',box(103.8001,1.3001,103.8002,1.3002),'hdb'),candidate('large',box(103.8,1.3,103.802,1.302))]
        kept,audit=select_footprints(data)
        self.assertEqual(len(kept),2)
        self.assertLess(audit['retainedOverlaps'][0]['candidateCoverage'],.01)

    def test_aggregate_coverage_controls_one_to_many_conflict(self):
        data=[candidate('a',box(103.8,1.3,103.8004,1.301),'hdb'),candidate('b',box(103.8005,1.3,103.8009,1.301),'hdb'),candidate('c',box(103.8,1.3,103.801,1.301))]
        kept,audit=select_footprints(data)
        self.assertEqual(len(kept),2)
        self.assertAlmostEqual(audit['suppressed'][0]['candidateUnionCoverage'],.8)

    def test_actual_four_hdb_blocks_survive_shared_roof_overlaps(self):
        from shapely.geometry import shape
        fixture=Path(__file__).resolve().parents[2]/'lib/contracts/tests/fixtures/hdb-shared-roofs.json'
        raw=json.loads(fixture.read_text(encoding='utf8'))
        data=[candidate(str(f['properties']['OBJECTID']),shape(f['geometry']),'hdb') for f in raw['features']]
        kept,audit=select_footprints(data)
        self.assertEqual(len(kept),4)
        self.assertEqual(len(audit['suppressed']),0)
        self.assertEqual(len(audit['retainedOverlaps']),3)

if __name__=='__main__': unittest.main()
