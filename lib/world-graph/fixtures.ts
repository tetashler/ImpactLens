/** Explicit deterministic mock scenarios. Never a runtime interpretation fallback. */
import {dynamicFixtures} from '../dynamic-scenarios/fixtures.ts';
import type {WorldOntologyV1} from './ontology.ts';
export function worldFixtures(){return dynamicFixtures().map((f,index)=>{
 const ids=new Map(f.draft.agents.map((a,i)=>[a.id,`agent-${i+1}`]));f.draft.agents=f.draft.agents.map(a=>({...a,id:ids.get(a.id)!}));f.draft.relationships=f.draft.relationships.map(r=>({...r,sourceAgentId:ids.get(r.sourceAgentId)!,targetAgentId:ids.get(r.targetAgentId)!}));
 const names=index===0?['Workplace','Employee group','Customer group']:index===1?['Water operator','Household group','Supply business']:index===2?['Household group','Public finance institution','Community organisation']:index===3?['Proposed station','Commuter group','Transport authority']:['Proposed clinic','Patient group','Healthcare organisation'];
 const entityTypes=names.map((name,i)=>({id:`type-${i}`,name,description:`Scenario context: ${name.toLowerCase()}.`}));
 const entities=Array.from({length:12},(_,i)=>({id:`context-${i}`,name:`Illustrative ${names[i%3].toLowerCase()} ${String.fromCharCode(65+i)}`,typeId:`type-${i%3}`,jurisdictionId:index===1&&i%2?'my':'sg',support:null}));
 const ontology:WorldOntologyV1={version:1,entityTypes,relationshipTypes:[{id:'consults',name:'CONSULTS_WITH',description:'A model-proposed consultation opportunity.'},{id:'depends',name:'DEPENDS_ON',description:'An unverified proposed dependency.'}],entities,relationships:entities.map((e,i)=>({id:`context-link-${i}`,source:i<4?f.draft.agents[i].id:entities[i-1].id,target:e.id,typeId:i%2?'depends':'consults',statement:'A possible scenario-specific interaction, not an established world relationship.',support:null}))};
 // Parallel and legitimate self-reference fixtures exercise renderer geometry;
 // they are explicitly mock model proposals, never claims about real organisations.
 ontology.relationships.push({id:'parallel',source:f.draft.agents[0].id,target:entities[0].id,typeId:'depends',statement:'A separate proposed dependency to inspect.',support:null},{id:'self-review',source:entities[0].id,target:entities[0].id,typeId:'consults',statement:'Illustrative internal consultation within this organisation.',support:null});
 return {...f,draft:{...f.draft,ontology}};
});}
