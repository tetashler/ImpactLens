import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createElement,type ComponentType} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {KnowledgeGraph,KnowledgeNode,KnowledgeEdge} from '../../knowledge-graph/contract.ts';
import type {WorldInspectionV1} from '../../world-graph/projection.ts';
import type {StakeholderEvent} from '../../stakeholder-simulation/contract.ts';
import {buildScenarioDemographicContext} from '../../server/demographics/scenario-context.ts';
import {contextForAgent} from '../../demographics/scenario-context.ts';

// The real production component and inspector render under the existing Babel
// TSX loader. CSS alone is omitted; no hook state or renderer behaviour is mocked.
const componentUrl=new URL('../../../components/knowledge-workspace.tsx',import.meta.url);
const require=createRequire(import.meta.url),babel=require('next/dist/compiled/babel/core');
interface InspectorProps {graph:KnowledgeGraph;node?:KnowledgeNode;edge?:KnowledgeEdge;inspection?:WorldInspectionV1;compact?:boolean;full?:boolean}
interface WorkspaceProps {graph:KnowledgeGraph|null;visible:boolean;onReturn:()=>void;inspections?:Record<string,WorldInspectionV1>;emptyReason?:string}
let loaded:Promise<{default:ComponentType<WorkspaceProps>;KnowledgeInspectorContent:ComponentType<InspectorProps>}>|undefined;
function loadWorkspace(){return loaded??=readFile(componentUrl,'utf8').then(async source=>{
  const js:string=babel.transformSync(source.replace(/import ['"][^'"]+\.css['"];?/g,''),{filename:'knowledge-workspace.tsx',babelrc:false,configFile:false,presets:[[require.resolve('next/dist/compiled/babel/preset-typescript'),{allExtensions:true,isTSX:true}],[require.resolve('next/dist/compiled/babel/preset-react'),{runtime:'automatic'}]]}).code;
  const resolved=js.replace(/from (['"])([^'"]+)\1/g,(_match,quote,specifier:string)=>{
    const url=specifier.startsWith('.')?new URL(`${specifier}.ts`,componentUrl).href:pathToFileURL(require.resolve(specifier)).href;
    return `from ${quote}${url}${quote}`;
  });
  return import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`);
});}
const provenance={kind:'synthetic-exploratory' as const,reference:'Model-generated proposal; unverified.'};
const entity:KnowledgeNode={id:'entity-a',label:'Supply organisation',category:'planning',entityType:'Supply organisation',description:'An unverified entity suggested by the model.',provenance,properties:{recordType:'world-entity',entityId:'internal-entity-reference',horizonYears:8},limitations:[]};
const agent:KnowledgeNode={id:'agent-a',label:'Foreign logistics manager',category:'population',entityType:'Logistics operator',description:'A fictional role for exploration.',provenance,properties:{recordType:'fictional-agent',roleId:'internal-role-reference'},limitations:[]};
const edge:KnowledgeEdge={id:'edge-a',source:entity.id,target:agent.id,relationship:'describes',relationshipLabel:'SUPPLIES',description:'Proposed supply relationship.',provenance,directed:true};
const graph:KnowledgeGraph={version:1,scenarioIdentity:'inspector-fixture',executionIdentity:'fixture-run',nodes:[entity,agent],edges:[edge],limitations:['Model suggestions do not establish actual outcomes.']};
function inspection(kind:WorldInspectionV1['kind']='model-suggested-entity'):WorldInspectionV1{return {version:1,kind,affiliation:'Singapore',sources:[],interactions:[],assumptions:[]};}
function event(turnIndex:number,statement:string):StakeholderEvent{return {id:`event-${turnIndex}`,runId:'fixture-run',turnIndex,round:1,checkpointYear:0,roleId:'agent-a',addressedRoleId:null,statement,type:'argument',previousEventIds:[],evidenceFindingIds:[],assumptionIds:[],reasoningSummary:'Fictional reasoning.',uncertainties:['Unknown practical effect.'],position:'conditional',topics:['logistics'],sourceIds:[],provenance:'synthetic-stakeholder-statement',grounding:'no-evidence',positionChange:'initial'};}
async function renderInspector(props:InspectorProps){const module=await loadWorkspace();assert.equal(typeof module.KnowledgeInspectorContent,'function','Production selected-content component must be exported and reused by each inspector size');return renderToStaticMarkup(createElement(module.KnowledgeInspectorContent,props));}

test('unverified candidate source associations never render as entity or relationship evidence',async()=>{
 const record:WorldInspectionV1={...inspection(),sourceAttribution:{version:1,status:'unverified-candidate',reason:'entity-mention-not-established'},sources:[{title:'Candidate source',url:'https://www.mom.gov.sg/',publisher:'www.mom.gov.sg',publishedAt:null,retrievedAt:'2026-10-29T00:00:00.000Z',quote:'withheld-quote-marker',limitation:'Not evidence for this entity.'}]};
 for(const compact of [true,false]){
  const html=await renderInspector({graph,node:entity,inspection:record,compact});assert.doesNotMatch(html,/withheld-quote-marker|Candidate source/);assert.match(html,/Unverified source candidate/);
 }
});

test('entity inspector distinguishes suggestions and shows readable source provenance behind secondary details',async()=>{
  const record={...inspection(),sources:[{title:'Fixture policy statement',url:'https://example.invalid/fixture',publisher:'Fixture publisher',publishedAt:null,retrievedAt:'2026-10-29T02:00:00Z',quote:'A source passage mentions <script>unsafe()</script>.',limitation:'Literal linkage does not verify the proposed relationship.'}],assumptions:Array.from({length:14},(_,i)=>`Assumption ${i+1}`)};
  const html=await renderInspector({graph,node:entity,inspection:record,full:true});
  assert.match(html,/Model-suggested entity/);
  assert.match(html,/Unverified/);
  assert.match(html,/Supply organisation/);
  assert.match(html,/Affiliation \(model-proposed\)/);
  assert.match(html,/Singapore/);
  assert.match(html,/<details[^>]*>[\s\S]*<summary>Source passages/);
  assert.match(html,/<a[^>]*href="https:\/\/example\.invalid\/fixture"[^>]*>Fixture policy statement<\/a>/);
  assert.match(html,/Fixture publisher/);
  assert.match(html,/Publication date[\s\S]*Unknown/);
  assert.match(html,/Retrieved[\s\S]*2026-10-29T02:00:00Z/);
  assert.match(html,/<blockquote>A source passage mentions &lt;script&gt;unsafe\(\)&lt;\/script&gt;\.<\/blockquote>/);
  assert.match(html,/Literal linkage does not verify/);
  assert.match(html,/<summary>Assumptions/);
  assert.match(html,/Assumption 12/);
  assert.doesNotMatch(html,/Assumption 13|internal-entity-reference|Horizon|<script>/);
  const popup=await renderInspector({graph,node:entity,inspection:record,compact:true});
  assert.match(popup,/Model-suggested entity/);
  assert.match(popup,/1 source passage/);
  assert.doesNotMatch(popup,/<blockquote>|internal-entity-reference/);
});

test('foreign roles show an explicit missing-demographics note while Singapore context shows sourced aggregate profiles',async()=>{
  const snapshot=buildScenarioDemographicContext('Bukit Merah');
  const foreign={...inspection('fictional-agent'),affiliation:'Malaysia',demographicContext:contextForAgent(snapshot,'Malaysia')};
  const html=await renderInspector({graph,node:agent,inspection:foreign,full:true});
  assert.match(html,/Fictional stakeholder/);
  assert.match(html,/Malaysia/);
  assert.match(html,/foreign or unresolved jurisdiction/);
  assert.doesNotMatch(html,/4,047,260|4,044,210|151,540|internal-role-reference/);
  const singapore=await renderInspector({graph,node:agent,inspection:{...inspection('fictional-agent'),demographicContext:contextForAgent(snapshot,'Singapore')},full:true});
  assert.match(singapore,/Census 2020/);
  assert.match(singapore,/4,047,260/);
  assert.match(singapore,/4,044,210/);
  assert.match(singapore,/151,540/);
  assert.match(singapore,/Subzone/);
  assert.match(singapore,/data\.gov\.sg\/datasets\//);
  assert.match(singapore,/<table/);
  assert.match(singapore,/Age group/);
  assert.match(singapore,/90\+/);
  assert.doesNotMatch(singapore,/&quot;ageGroups&quot;|"ageGroups"\s*:/);
});

test('relationship inspectors preserve direction and distinguish proposals, source reports and chronological recorded dialogue',async()=>{
  const proposed=await renderInspector({graph,edge,inspection:inspection('proposed-relationship'),compact:true});
  assert.match(proposed,/Proposed relationship/);
  assert.match(proposed,/Source[\s\S]*Supply organisation/);
  assert.match(proposed,/Target[\s\S]*Foreign logistics manager/);
  assert.match(proposed,/Directed/);
  const reported=await renderInspector({graph,edge,inspection:inspection('source-reported-relationship'),full:true});
  assert.match(reported,/Source-reported relationship/);
  assert.match(reported,/independently verified|independently corroborated/);
  const recorded=await renderInspector({graph,edge,inspection:{...inspection('recorded-interaction'),interactions:[event(3,'Later statement.'),event(0,'Earlier statement.')]},full:true});
  assert.match(recorded,/Recorded fictional interaction/);
  assert.match(recorded,/<summary>Recorded interactions/);
  assert.ok(recorded.indexOf('Earlier statement.')<recorded.indexOf('Later statement.'));
  assert.match(recorded,/event-0/);
  assert.match(recorded,/event-3/);
});

test('failed or empty worlds offer concise escaped recovery without a tutorial or invented graph',async()=>{
  const Workspace=(await loadWorkspace()).default;
  const html=renderToStaticMarkup(createElement(Workspace,{graph:null,visible:true,onReturn:()=>{},emptyReason:'World generation failed: <script>unsafe()</script>.'}));
  assert.match(html,/World entities/);
  assert.match(html,/World generation failed: &lt;script&gt;unsafe\(\)&lt;\/script&gt;\./);
  assert.match(html,/>Back to Map<\/button>/);
  assert.doesNotMatch(html,/Give your question a context|Start an investigation|Open Map|Research Horizon|Calculated results attached|<script>/);
  const fallback=renderToStaticMarkup(createElement(Workspace,{graph:null,visible:true,onReturn:()=>{}}));
  assert.match(fallback,/World entities are not available/);
});
