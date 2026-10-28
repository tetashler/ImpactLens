/** Invented people, categories, weights and durations; independent illustrative visual paths. */
import { illustrativeCitizenSimulation } from '../contracts/citizen-simulation.fixtures.ts';
import type { CitizenSimulationPayload, CitizenAnimation } from '../contracts/citizen-simulation.ts';
import { parseCitizenViewPair } from './data.ts';
import { compilePedestrianPath, illustrativePedestrianActors, illustrativePedestrianPaths, samplePedestrianMotion } from './pedestrians.ts';

const paths=new Map(illustrativePedestrianPaths.map(path=>[path.id,compilePedestrianPath(path)]));
function view():CitizenSimulationPayload {
  const payload=structuredClone(illustrativeCitizenSimulation);
  payload.metadata.scenarioId='independent-pedestrian-visual-fixture';
  payload.metadata.population={...payload.metadata.population,seed:'independent-pedestrian-visual-fixture-v1',agentCount:180,representedPopulation:9000};
  payload.assumptions.find(a=>a.id==='schematic-map')!.description='Independent illustrative pedestrian loops in Tiong Bahru, Sengkang, Tampines, Downtown and Ang Mo Kio, with identical baseline/scenario motion. Manually authored visual loops checked against local subzone land areas and building footprints, not verified pavements, walking routes, homes, activities, observed people or intervention reactions. Invented Ang Mo Kio demographic categories remain contract examples; visual placement does not locate their residences or establish population coverage.';
  payload.assumptions.find(a=>a.id==='static-routing')!.description='Invented baseline/scenario durations for illustrative cases only, not calculated from paths, routing or observed travel.';
  payload.citizens=[]; payload.journeys=[]; payload.animations=[]; payload.metrics=[];
  for (let i=0;i<180;i++) {
    const kind=i%4;
    const citizen=structuredClone(illustrativeCitizenSimulation.citizens[kind]);
    citizen.agentId=`syn-a4b1800000000000-${i+1}`;
    citizen.sourceRow=kind+2;
    payload.citizens.push(citizen);
    const journey=structuredClone(illustrativeCitizenSimulation.journeys[kind]);
    journey.id=`fixture-journey-${i+1}`; journey.agentId=citizen.agentId;
    payload.journeys.push(journey);
    const actor=illustrativePedestrianActors[i],path=paths.get(actor.pathId)!;
    const position=samplePedestrianMotion(path,actor,0).position!;
    const moving=kind<2;
    const segment=path.segments.findIndex(s=>actor.startDistanceMetres>=s.startDistanceMetres&&actor.startDistanceMetres<s.startDistanceMetres+s.lengthMetres);
    // An exported/imported copy must also start at this actor's declared position,
    // rather than collapsing every actor onto the loop's arbitrary first vertex.
    const ordered=Array.from({length:path.waypoints.length},(_,offset)=>path.waypoints[(segment+(actor.direction===1?offset+1:-offset)+path.waypoints.length)%path.waypoints.length]);
    const waypoints=moving?[position,...ordered,position].map(point=>({...point})):[];
    const animation:CitizenAnimation={agentId:citizen.agentId,position,waypoints,state:moving?(i%2?'walking':'travelling'):kind===2?'unassigned':'idle',journeyId:journey.id,
      visualisation:{kind:'visual-only',geometry:moving?'schematic':'none',assumptionIds:['schematic-map']}};
    payload.animations.push(animation);
  }
  return payload;
}
export const citizenViewPairFixture=parseCitizenViewPair({baseline:view(),scenario:view()});
