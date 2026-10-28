/** Browser-safe narrow Phase 7H handoff. No automatic classification or engine calls. */
import {createDemoInput,getStakeholderRoles} from './roles.ts';
import {getInferenceRoles} from './inference-roles.ts';
import {parseStakeholderInput,type StakeholderSimulationInputV1} from './contract.ts';
export type LiveDomain='asean'|'import-tax'|'mrt';
export function createLiveInput(domain:LiveDomain,question:string,identities:{scenarioIdentity?:string;experimentId?:string;configurationIdentity?:string}={}):StakeholderSimulationInputV1{
 if(!['asean','import-tax','mrt'].includes(domain))throw new Error('Select a supported live role preset.');
 const input=createDemoInput({...identities,question});
 const ids=domain==='import-tax'?['sg-consumer','sg-importer','local-retailer','foreign-supplier']:['sg-commuter','station-resident','local-business','transport-observer'];
 input.stakeholderRoles=domain==='asean'?getStakeholderRoles().slice(0,4):getInferenceRoles().filter(r=>ids.includes(r.id));
 if(domain!=='asean')input.assumptions=[{id:'scope',label:'Unresolved scenario details',value:domain==='import-tax'?'Tax rate, products, implementation timing and foreign jurisdiction are unknown.':'Exact route, population travel demand and calculated journey outcomes are unknown unless supplied as evidence.',provenance:'user-authored'}];
 input.simulationOptions={mode:'llm-assisted',rounds:2,seed:'live-default-v1',memoryEvents:6};
 return parseStakeholderInput(input);
}
