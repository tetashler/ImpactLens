import '../../../scripts/testing/offline-network.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {confirmedAnchorVertex} from '../../plots/anchor.ts';
const geometry={version:1 as const,scenarioId:'anchor-fixture',features:[{kind:'line' as const,id:'line-one',label:'Proposed line',coordinates:[{lat:1.38549,lon:103.744344},{lat:1.399348,lon:103.819959},{lat:1.391789,lon:103.895154}],provenance:'user-drawn' as const},{kind:'point' as const,id:'dot-one',label:'Station dot',coordinate:{lat:1.38549,lon:103.744344},role:'station' as const,provenance:'user-drawn' as const}]};
test('an explicit anchor confirmation can preserve its unique pre-existing dot/vertex coincidence',()=>{const before=JSON.stringify(geometry);assert.deepEqual(confirmedAnchorVertex(geometry,'dot-one'),{routeId:'line-one',vertex:0});assert.equal(JSON.stringify(geometry),before);});
test('nearby geometry is never silently snapped or treated as a station',()=>{const g=structuredClone(geometry);g.features[1].coordinate!.lat+=0.00001;assert.equal(confirmedAnchorVertex(g,'dot-one'),null);assert.throws(()=>confirmedAnchorVertex(g,'unknown'));});
test('a shared or repeated vertex is ambiguous and cannot select an arbitrary alignment',()=>{const g=structuredClone(geometry);g.features.push({...structuredClone(g.features[0]),id:'line-two'});assert.equal(confirmedAnchorVertex(g,'dot-one'),null);});
