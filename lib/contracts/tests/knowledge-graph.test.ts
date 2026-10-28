import test from 'node:test';
import assert from 'node:assert/strict';
import {parseKnowledgeGraph, type KnowledgeGraph} from '../../knowledge-graph/contract.ts';
import {buildKnowledgeGraph,knowledgeIdentity} from '../../knowledge-graph/adapters.ts';
import {createScenarioPlan} from '../../scenarios/contract.ts';
import {buildPlottedMrt} from '../../plots/adapters.ts';
import {draftToIntervention} from '../../editor.ts';
import {getNetworkCatalog,runMapSimulation} from '../../server/mrt-service.ts';
import {createDefaultEldercareRequest} from '../../eldercare/api-contract.ts';
import {calculateEldercare,getEldercareFacilities} from '../../server/eldercare-service.ts';
import {illustrativeCitizenSimulation} from '../citizen-simulation.fixtures.ts';
import {searchKnowledgeNodes,filterKnowledgeGraph,knowledgeNeighbours} from '../../knowledge-graph/selectors.ts';
import {spawnSync} from 'node:child_process';

const provenance={kind:'user-authored' as const,reference:'Current user question'};
const graph=():KnowledgeGraph=>({version:1,scenarioIdentity:'scenario:1',nodes:[{id:'a',label:'Scenario',category:'scenario',description:'Current proposal',provenance,properties:{weight:1},limitations:[]}],edges:[],limitations:[]});
test('knowledge graph validation detaches values and preserves provenance',()=>{
  const input=graph(),parsed=parseKnowledgeGraph(input);parsed.nodes[0].properties.weight=2;
  assert.equal(input.nodes[0].properties.weight,1);assert.deepEqual(parsed.nodes[0].provenance,provenance);
});
test('knowledge graph rejects invalid identities, endpoints, categories and provenance',()=>{
  const n=graph().nodes[0];
  for(const bad of [{...graph(),version:2},{...graph(),nodes:[n,n]},{...graph(),nodes:[{...n,category:'fiction'}]},
    {...graph(),nodes:[{...n,provenance:{kind:'official-fact',reference:'guess'}}]},
    {...graph(),edges:[{id:'e',source:'a',target:'missing',relationship:'contains',description:'membership',directed:true,provenance}]}])assert.throws(()=>parseKnowledgeGraph(bad));
});
test('knowledge graph rejects unsafe URLs, nonfinite and unbounded content',()=>{
  const n=graph().nodes[0];
  for(const url of ['javascript:alert(1)','http://example.com','https://user:password@example.com'])assert.throws(()=>parseKnowledgeGraph({...graph(),nodes:[{...n,provenance:{...provenance,url}}]}));
  for(const v of [NaN,Infinity,-Infinity])assert.throws(()=>parseKnowledgeGraph({...graph(),nodes:[{...n,properties:{bad:v}}]}));
  assert.throws(()=>parseKnowledgeGraph({...graph(),nodes:[{...n,label:'x'.repeat(181)}]}));
  assert.throws(()=>parseKnowledgeGraph({...graph(),unknown:true}));
});
const geometry={version:1 as const,scenarioId:'draft-1',features:[]};
test('planning-only graph contains no fabricated calculations or observed stakeholder opinions',async()=>{
  const question='What if Singapore left ASEAN?';
  const plan=await createScenarioPlan({version:1,clientRequestId:'test',question},{version:1,intent:'international-policy',capabilityId:'evidence-exploration-v1'});
  const input={question,plan,geometry,catalog:null,scenarioIdentity:'current'};
  const a=buildKnowledgeGraph(input),b=buildKnowledgeGraph(input);
  assert.deepEqual(a,b);assert.ok(a.nodes.length>1);assert.ok(a.nodes.every(n=>n.provenance.kind!=='calculated'&&n.provenance.kind!=='synthetic-exploratory'));
  assert.ok(a.nodes.filter(n=>n.label.includes('Residents')).every(n=>n.provenance.kind==='planning-only'));
});
test('question edits discard incompatible plan and execution data',async()=>{
  const plan=await createScenarioPlan({version:1,clientRequestId:'test',question:'Build an MRT line'},{version:1,intent:'mrt-line',capabilityId:'mrt-accessibility-v1'});
  const graph=buildKnowledgeGraph({question:'Build a polyclinic',plan,geometry,catalog:null,scenarioIdentity:'new'});
  assert.ok(graph.nodes.every(n=>n.category!=='result'));assert.ok(!graph.nodes.some(n=>n.label==='MRT accessibility'));
  assert.notEqual(knowledgeIdentity({question:'a',geometry}),knowledgeIdentity({question:'b',geometry}));
});
test('knowledge edges reject duplicate identities, unknown kinds and invalid directions',()=>{
  const edge={id:'edge',source:'a',target:'a',relationship:'uses',description:'Self input fixture',directed:true,provenance};
  for(const patch of [{edges:[edge,edge]},{edges:[{...edge,relationship:'causes'}]},{edges:[{...edge,directed:'yes'}]},{edges:[{...edge,provenance:{kind:'calculated'}}]},{nodes:'bad'},{nodes:Array(1501).fill(graph().nodes[0])}])assert.throws(()=>parseKnowledgeGraph({...graph(),...patch}));
});
test('node and edge identities share one renderer namespace',()=>{
  const edge={id:'a',source:'a',target:'a',relationship:'uses',description:'Colliding edge fixture',directed:true,provenance};
  assert.throws(()=>parseKnowledgeGraph({...graph(),edges:[edge]}),/Duplicate knowledge identity/);
});
test('source URLs remain references only and nested properties cannot carry executable objects',()=>{
  const node=graph().nodes[0];
  assert.throws(()=>parseKnowledgeGraph({...graph(),nodes:[{...node,properties:{html:{dangerouslySetInnerHTML:'anything'}}}]}));
  assert.deepEqual(parseKnowledgeGraph(JSON.parse(JSON.stringify(graph()))),graph());
});
test('knowledge adapters load behind a browser-only import boundary',()=>{
  const url=new URL('../../knowledge-graph/adapters.ts',import.meta.url).href;
  const code=`import {registerHooks,builtinModules} from 'node:module';registerHooks({resolve(specifier,context,next){if(specifier.startsWith('node:')||builtinModules.includes(specifier)||/[\\/]server[\\/]/.test(specifier))throw new Error('Server import crossed graph boundary');return next(specifier,context);}});await import(${JSON.stringify(url)});`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
});
test('search, category filters and direct-neighbour selection preserve source graph',()=>{
  const a=graph();a.nodes.push({...a.nodes[0],id:'b',label:'Baseline distance',category:'result',properties:{sourceId:'MOH-123'}});
  a.edges.push({id:'e',source:'a',target:'b',relationship:'produces',description:'Fixture calculated linkage',provenance,directed:true});
  const before=JSON.stringify(a);
  assert.equal(searchKnowledgeNodes(a,'moh-123')[0].id,'b');assert.equal(searchKnowledgeNodes(a,'result').length,1);
  assert.deepEqual([...knowledgeNeighbours(a,'a')],['b']);
  const filtered=filterKnowledgeGraph(a,['scenario']);assert.equal(filtered.nodes.length,1);assert.equal(filtered.edges.length,0);
  assert.equal(JSON.stringify(a),before);
});
async function mrtFixture(){
  const catalog=getNetworkCatalog('2026-10-27'),anchor=catalog.stations.find(s=>s.id==='NS4')!;
  const geometry={version:1 as const,scenarioId:'real-plotted',features:[{kind:'line' as const,id:'route',label:'Drawn route',coordinates:[{lat:anchor.lat,lon:anchor.lon},{lat:1.39,lon:103.8}],provenance:'user-drawn' as const},{kind:'point' as const,id:'anchor',label:'Anchor',coordinate:{lat:anchor.lat,lon:anchor.lon},role:'station' as const,provenance:'user-drawn' as const},{kind:'point' as const,id:'new',label:'New station',coordinate:{lat:1.39,lon:103.8},role:'station' as const,provenance:'user-drawn' as const}]};
  const draft=buildPlottedMrt(geometry,{routeId:'route',pointIds:['anchor','new'],anchors:{anchor:'NS4'},geometryConfirmed:true,assumptionsConfirmed:true,runSeconds:300,dwellSeconds:30,waitingTimeSeconds:150,transferWalkSeconds:180},catalog);
  const question='What if a new MRT line opened?';const plan=await createScenarioPlan({version:1,clientRequestId:'mrt',question},{version:1,intent:'mrt-line',capabilityId:'mrt-accessibility-v1'});
  return{question,plan,geometry,catalog,draft,scenarioIdentity:'current-mrt'};
}
test('real plotted MRT adapter preserves accepted baseline, explicit anchors, order and timing',async()=>{
  const context=await mrtFixture(),before=JSON.stringify(context),g=buildKnowledgeGraph(context);
  assert.equal(g.nodes.filter(n=>n.id.startsWith('station:')).length,context.catalog.stations.length);
  assert.ok(g.nodes.filter(n=>n.id.startsWith('station:')).every(n=>n.provenance.kind==='source-backed'));
  assert.equal(g.edges.filter(e=>e.source.startsWith('proposal-stop:')&&e.relationship==='connects').length,1);
  assert.equal(g.edges.filter(e=>e.relationship==='ordered-before').length,1);
  assert.equal(g.nodes.find(n=>n.id==='service-assumption:0')?.properties.runSeconds,300);
  assert.ok(!g.edges.some(e=>e.source.startsWith('plot:')&&e.relationship==='connects'));
  assert.ok(!g.nodes.some(n=>n.category==='result'));assert.equal(JSON.stringify(context),before);
});
test('before execution, only explicit coordinate-matching served anchors connect drawings to stations',async()=>{
  const context=await mrtFixture();
  const unconfirmed=buildKnowledgeGraph({...context,draft:null});assert.ok(!unconfirmed.edges.some(e=>e.source==='plot:anchor'&&e.relationship==='connects'));
  const confirmed=buildKnowledgeGraph({...context,draft:null,anchors:{anchor:'NS4'}});
  assert.equal(confirmed.edges.filter(e=>e.source==='plot:anchor'&&e.target==='station:NS4'&&e.relationship==='connects').length,1);
  const moved=structuredClone(context.geometry);const point=moved.features.find(f=>f.kind==='point'&&f.id==='anchor')!;if(point.kind==='point')point.coordinate.lat+=.001;
  assert.ok(!buildKnowledgeGraph({...context,draft:null,geometry:moved,anchors:{anchor:'NS4'}}).edges.some(e=>e.source==='plot:anchor'&&e.relationship==='connects'));
  assert.ok(!buildKnowledgeGraph({...context,draft:null,anchors:{anchor:'missing'}}).edges.some(e=>e.source==='plot:anchor'&&e.relationship==='connects'));
});
test('actual MRT outputs bind to current run and stale geometry cannot restore comparisons',async()=>{
  const context=await mrtFixture();const result=runMapSimulation({serviceDate:'2026-10-27',intervention:draftToIntervention(context.draft),journeys:[{origin:'NS4',destination:'NE16'}]});
  const bound={scenarioIdentity:context.scenarioIdentity,executionIdentity:'run-1',result};
  const after=buildKnowledgeGraph({...context,mrt:bound});assert.equal(after.executionIdentity,'run-1');assert.equal(after.nodes.find(n=>n.id==='journey:0')?.properties.baselineMinutes,result.comparisons[0].baselineMinutes);
  const stale=buildKnowledgeGraph({...context,scenarioIdentity:'moved-geometry',mrt:bound});assert.ok(!stale.nodes.some(n=>n.category==='result'));assert.equal(stale.executionIdentity,undefined);
  const rerun=buildKnowledgeGraph({...context,mrt:{...bound,executionIdentity:'run-2'}});assert.equal(rerun.executionIdentity,'run-2');
  assert.deepEqual(buildKnowledgeGraph({...context,mrt:bound}),after);
});
test('unavailable MRT values stay null and invalid numeric output is rejected',async()=>{
  const context=await mrtFixture();const comparison={origin:'NS4',destination:'unknown',status:'invalid' as const,baselineStatus:'invalid' as const,scenarioStatus:'invalid' as const,baselineMinutes:null,scenarioMinutes:null,minutesSaved:null,percentageChange:null,baselineTransfers:null,scenarioTransfers:null,transferChange:null,usedProposedLine:null,baselineRoute:null,scenarioRoute:null};
  const bound={scenarioIdentity:context.scenarioIdentity,executionIdentity:'unknown-route',result:{serviceDate:'2026-10-27',model:'static-median-travel-time' as const,comparisons:[comparison]}};
  const g=buildKnowledgeGraph({...context,mrt:bound});assert.equal(g.nodes.find(n=>n.id==='journey:0')?.properties.minutesSaved,null);
  assert.throws(()=>buildKnowledgeGraph({...context,mrt:{...bound,result:{...bound.result,comparisons:[{...comparison,minutesSaved:NaN}]}}}));
});
test('graph identity is exact and changes for geometry revisions and assumed settings',()=>{
  assert.equal(knowledgeIdentity({b:2,a:1}),knowledgeIdentity({a:1,b:2}));
  const key=knowledgeIdentity({question:'MRT',geometry,revision:1,wait:150});
  assert.notEqual(key,knowledgeIdentity({question:'MRT',geometry,revision:2,wait:150}));
  assert.notEqual(key,knowledgeIdentity({question:'MRT',geometry,revision:1,wait:300}));
  assert.notEqual(knowledgeIdentity({wait:NaN}),knowledgeIdentity({wait:null}));
  assert.notEqual(knowledgeIdentity({optional:undefined}),knowledgeIdentity({}));
  assert.notEqual(knowledgeIdentity([undefined]),knowledgeIdentity([]));
});
test('weighted demographic payload metrics are independent of rendered citizen subset',async()=>{
  const context=await mrtFixture(),payload=structuredClone(illustrativeCitizenSimulation);
  const g=buildKnowledgeGraph({...context,demographic:{scenarioIdentity:context.scenarioIdentity,executionIdentity:'population-run',result:payload}});
  const n=g.nodes.find(n=>n.id===`demographic:${payload.metrics[0].id}`)!;
  assert.equal(n.properties.representedPopulation,payload.metrics[0].denominator.representedPopulation);
  assert.equal(n.properties.weightedMeanMinutesSaved,payload.metrics[0].weightedMeanMinutesSaved);
  assert.ok(!g.nodes.some(n=>n.id.startsWith('citizen:')));
});
test('actual AAC graph preserves historical facilities, proxy/unknown provenance and calculated denominators',async()=>{
  const request=createDefaultEldercareRequest('graph-aac'),result=await calculateEldercare(request),facilities=getEldercareFacilities();
  const question='What if a new AAC opened in Bukit Merah?';const plan=await createScenarioPlan({version:1,clientRequestId:'aac',question},{version:1,intent:'aac',capabilityId:'aac-accessibility-v1'});
  const g=buildKnowledgeGraph({question,plan,geometry,catalog:null,scenarioIdentity:'aac-current',facilities,aac:{scenarioIdentity:'aac-current',executionIdentity:result.identity.scenarioId,result}});
  assert.equal(g.nodes.filter(n=>n.id.startsWith('facility:')).length,4);
  assert.ok(g.nodes.filter(n=>n.id.startsWith('facility:')).every(n=>n.properties.capacity===null&&n.properties.openingStatus==='listed-unconfirmed'));
  assert.equal(g.nodes.filter(n=>n.id.startsWith('origin:')).length,2);
  const proxy=g.nodes.find(n=>n.id===`origin:${result.result.comparisons[0].origin.id}`)!;
  assert.equal(proxy.provenance.kind,'model-assumption');
  for(const key of ['status','baselineMetres','scenarioMetres','reductionMetres'])assert.ok(!Object.hasOwn(proxy.properties,key));
  const originOutcome=g.nodes.find(n=>n.id===`origin-comparison:${result.result.comparisons[0].origin.id}`)!;
  assert.equal(originOutcome.provenance.kind,'calculated');
  assert.equal(originOutcome.properties.baselineMetres,result.result.comparisons[0].baseline?.distanceMetres??null);
  assert.equal(originOutcome.properties.reductionMetres,result.result.comparisons[0].reductionMetres);
  assert.ok(g.edges.some(e=>e.source==='aac-execution'&&e.target===originOutcome.id&&e.relationship==='produces'));
  assert.ok(g.edges.some(e=>e.source===originOutcome.id&&e.target===proxy.id&&e.relationship==='uses'));
  assert.ok(!Object.hasOwn(g.nodes.find(n=>n.id==='proposed-aac')!.properties,'capacityUsers'));
  assert.equal(g.nodes.find(n=>n.id==='aac-service-assumptions')?.provenance.kind,'model-assumption');
  assert.equal(g.nodes.find(n=>n.id==='threshold-assumption:500')?.provenance.kind,'model-assumption');
  const m=result.result.metrics[0];assert.equal(g.nodes.find(n=>n.id==='unlocated-population')?.properties.representedPopulation,m.unlocatedPopulation);
  assert.equal(g.nodes.find(n=>n.id==='aac-group:0')?.properties.meanBaselineMetres,m.meanBaselineMetres.value);
  assert.equal(g.nodes.find(n=>n.id==='threshold:500')?.properties.baselineDenominator,m.thresholds.find(t=>t.metres===500)?.baselineShare.denominatorPopulation);
  assert.ok(!g.edges.some(e=>e.relationship==='connects'));
});
test('polyclinic cannot consume AAC or MRT execution even if a stale result envelope is supplied',async()=>{
  const question='What if a new polyclinic opened in Sengkang?';const plan=await createScenarioPlan({version:1,clientRequestId:'poly',question},{version:1,intent:'polyclinic',capabilityId:'evidence-exploration-v1'});
  const g=buildKnowledgeGraph({question,plan,geometry,catalog:null,scenarioIdentity:'same',mrt:{scenarioIdentity:'same',executionIdentity:'forged-route',result:{serviceDate:'2026-10-27',model:'static-median-travel-time',comparisons:[]}}});
  assert.equal(g.executionIdentity,undefined);assert.ok(g.nodes.every(n=>n.category!=='result'));
});
