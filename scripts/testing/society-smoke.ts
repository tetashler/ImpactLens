/** Offline foundation → accepted fixture actions → social world → map/graph/report smoke test. */
import {performance} from 'node:perf_hooks';
import {buildPopulation,populationView} from '../../lib/server/population/store.ts';
import {buildSocietyGeography} from '../../lib/server/population/geography.ts';
import {createSociety,advanceSociety,saveSociety,restoreSociety} from '../../lib/society/engine.ts';
import {societyMapSnapshot} from '../../lib/society/geography.ts';
import {societyReport} from '../../lib/society/report.ts';
import {projectSocietyGraph} from '../../lib/society/graph.ts';
import {worldFixtures} from '../../lib/world-graph/fixtures.ts';
import {createDynamicPlan} from '../../lib/dynamic-scenarios/plan.ts';
import {createDynamicInput} from '../../lib/dynamic-scenarios/execution.ts';
import {runStakeholderSimulation,deterministicTurn} from '../../lib/stakeholder-simulation/engine.ts';
import {projectPrimaryWorldGraph} from '../../lib/world-graph/projection.ts';
import {canonical,ensure} from '../../lib/experiments/validation.ts';

const start=performance.now(),fixture=worldFixtures()[0];
const plan=await createDynamicPlan(fixture.request,fixture.draft);
const run=await runStakeholderSimulation(await createDynamicInput(plan),{
 attemptId:'offline-society-smoke',provider:'offline-mock',model:'deterministic-fixture',
 generateTurn:async context=>deterministicTurn(context),
});
const population=buildPopulation({size:10000,seed:'offline-society'});
const world=advanceSociety(createSociety({
 runId:run.runId,question:fixture.request.question,seed:'offline-society',
 population:populationView(population),geography:buildSocietyGeography(),
 roles:plan.draft.agents,jurisdictions:plan.draft.jurisdictions,
 acceptedActions:run.events.map(e=>({id:e.id,roleId:e.roleId,statement:e.statement,position:e.position})),
}),80);
ensure(canonical(restoreSociety(saveSociety(world),world.genesis))===canonical(world),'Replay differed.');
const map=societyMapSnapshot(world),base=await projectPrimaryWorldGraph(run),graph=projectSocietyGraph(base.graph,world),report=societyReport(world,run.runId);
ensure(report.modelStatements===8&&report.eventCount===world.events.length,'Report did not reconcile.');
ensure(world.agents.every(a=>graph.nodes.some(n=>n.id===a.id)),'Graph identity differed.');
console.log(JSON.stringify({
 evidence:'OFFLINE FIXTURES ONLY — zero network/provider calls',populationId:population.id,
 sample:population.population.citizens.length,weightedCellError:population.validation.maximumWeightedCellError,
 acceptedFixtureActions:run.events.length,activeProfiles:world.agents.length,steps:world.tick,
 events:world.events.length,items:world.items.length,contextMarkers:map.features.features.length,
 graphNodes:graph.nodes.length,graphEdges:graph.edges.length,replay:'exact',elapsedMs:performance.now()-start,
},null,2));
