import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {appendCitizenCommuteGraph} from '../../citizen-grounding/graph.ts';
import {calculateCitizenImpact} from '../../server/citizen-grounding/api.ts';
import {transportDataset,transportReference} from './citizen-transport-fixture.ts';
import {baselineFixture,proposalFixture} from '../../../prototype/mrt/tests/scenario-fixtures.ts';

test('citizen graph is one bounded aggregate entity with the same public Report quantities',async()=>{
 const {publicResult:r}=await calculateCitizenImpact({serviceDate:'2026-10-27',intervention:proposalFixture()},{dataset:()=>transportDataset(),baseline:()=>baselineFixture(),demand:()=>transportReference,access:()=>({sourceHash:'e'.repeat(64),points:{}})});
 const graph=appendCitizenCommuteGraph(null,r,'scenario-one');assert.equal(graph.nodes.length,1);assert.equal(graph.nodes[0].properties.comparableWeight,r.summary.comparableWeight);assert.equal(graph.nodes[0].properties.meanMinutesSaved,r.summary.meanMinutesSaved);
 assert.doesNotMatch(JSON.stringify(graph),/PRIVATE_JOB_SENTINEL|PRIVATE_SCHEDULE_SENTINEL|workplaceProxy|"profiles"|"personality"/);
 assert.throws(()=>appendCitizenCommuteGraph(graph,r,'scenario-two'));
 assert.deepEqual(appendCitizenCommuteGraph(graph,r,'scenario-one'),graph,'Server and browser projections must not duplicate the same authoritative aggregate');
 const conflicting=structuredClone(graph);conflicting.nodes[0].properties.meanMinutesSaved=999;assert.throws(()=>appendCitizenCommuteGraph(conflicting,r,'scenario-one'),'A colliding aggregate with different quantities must fail closed');
});
