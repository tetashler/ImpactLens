/** Entirely invented spatial layout, categories, weights and durations. No observed people or government spatial observations. */
import { illustrativeCitizenSimulation } from '../contracts/citizen-simulation.fixtures.ts';
import type { CitizenSimulationPayload, CitizenAnimation } from '../contracts/citizen-simulation.ts';
import { parseCitizenViewPair } from './data.ts';

function view(scenario:boolean):CitizenSimulationPayload {
  const payload=structuredClone(illustrativeCitizenSimulation);
  payload.metadata.scenarioId='ang-mo-kio-invented-visual-fixture';
  payload.metadata.population={...payload.metadata.population,seed:'ang-mo-kio-visual-fixture-v1',agentCount:180,representedPopulation:9000};
  payload.assumptions.find(a=>a.id==='schematic-map')!.description='Invented compact spatial grid around Ang Mo Kio for toy-like visualisation and schematic paths, not government observations or physical walking/rail alignments. Each view supplies its own invented geometry; interpolation is visual only.';
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
    const position={lon:103.85+((i%15)-7)*.00012,lat:1.37+(Math.floor(i/15)-5.5)*.00012};
    const moving=kind<2;
    const waypoints=moving?[position,{lon:position.lon+.00012,lat:position.lat+(scenario&&kind===0?.00012:-.00012)},{lon:position.lon+.00025,lat:position.lat+.0001}]:[];
    const animation:CitizenAnimation={agentId:citizen.agentId,position,waypoints,state:moving?(i%2?'walking':'travelling'):kind===2?'unassigned':'idle',journeyId:journey.id,
      visualisation:{kind:'visual-only',geometry:moving?'schematic':'none',assumptionIds:['schematic-map']}};
    payload.animations.push(animation);
  }
  return payload;
}
export const citizenViewPairFixture=parseCitizenViewPair({baseline:view(false),scenario:view(true)});
