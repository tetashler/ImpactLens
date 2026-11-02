import test from 'node:test';
import assert from 'node:assert/strict';
import {parseKnowledgeGraph,type KnowledgeGraph} from '../../knowledge-graph/contract.ts';
import {graphEntityTypes,knowledgeRelationshipLabel,entityTypeColour,isArchivedGraphView} from '../../knowledge-graph/display.ts';
import {graphElements} from '../../knowledge-graph/renderer.ts';
const graph:KnowledgeGraph={version:1,scenarioIdentity:'world-test',nodes:[{id:'ministry',label:'Example',category:'planning',entityType:'Ministry',description:'Unverified example',provenance:{kind:'synthetic-exploratory',reference:'Fixture proposal'},properties:{},limitations:[]}],edges:[],limitations:[]};
test('the active completed run graph is not mislabelled as an archived experiment',()=>{
 const scope={kind:'run' as const,graph:{...graph,executionIdentity:'current-run'}};
 assert.equal(isArchivedGraphView(scope,'current-run',false),false);
 assert.equal(isArchivedGraphView(scope,'other-run',false),true);
 assert.equal(isArchivedGraphView(scope,'current-run',true),true);
 assert.equal(isArchivedGraphView({kind:'current'},undefined,false),false);
 assert.equal(isArchivedGraphView({kind:'experiment'},'current-run',false),true);
});
test('graph display types come only from actual nodes and retain distinct provenance',()=>{
 const value=parseKnowledgeGraph(graph);assert.deepEqual(graphEntityTypes(value),[{name:'Ministry',colour:entityTypeColour('Ministry'),count:1}]);
 assert.equal(value.nodes[0].provenance.kind,'synthetic-exploratory');
 assert.equal(entityTypeColour('Ministry'),entityTypeColour('Ministry'));
});
test('dynamic relationship labels are bounded presentation data while legacy semantics remain valid',()=>{
 const edge={id:'e',source:'ministry',target:'ministry',relationship:'describes' as const,relationshipLabel:'REGULATES',description:'An unverified proposed relation',provenance:graph.nodes[0].provenance,directed:true};
 const value=parseKnowledgeGraph({...graph,edges:[edge]});assert.equal(knowledgeRelationshipLabel(value.edges[0]),'REGULATES');
 assert.throws(()=>parseKnowledgeGraph({...graph,nodes:[{...graph.nodes[0],entityType:'x'.repeat(81)}]}));
 assert.throws(()=>parseKnowledgeGraph({...graph,edges:[{...edge,relationshipLabel:'<script>unsafe</script>'}]}));
});

test('graph categories have distinct colours through sixteen dynamic types, independent of node order',()=>{
 for(const names of [
  ['Community Facility','Discussion environment','Fictional participant aggregate','Grounded fictional citizen aggregate','MRT Line','Neighbourhood','Proposed Station','Resident','stakeholder'],
  Array.from({length:16},(_,i)=>`Custom type ${i+1}`),
 ]){
  const fixture:KnowledgeGraph={...graph,nodes:names.map((entityType,i)=>({...graph.nodes[0],id:`type-${i}`,entityType}))};
  const original=structuredClone(fixture),types=graphEntityTypes(fixture);
  assert.equal(new Set(types.map(t=>t.colour)).size,names.length,'Every type has its own retained colour slot');
  assert.deepEqual(graphEntityTypes({...fixture,nodes:[...fixture.nodes].reverse()}),types);
  const canvas=graphElements(fixture).filter(item=>item.data.entityType);
  for(const type of types)assert.equal(canvas.find(item=>item.data.entityType===type.name)?.data.colour,type.colour);
  for(const {colour} of types){
   const luminance=(hex:string)=>{const rgb=hex.match(/[a-f\d]{2}/gi)!.map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
   assert.ok((luminance(colour)+.05)/(luminance('#101c26')+.05)>=3,`${colour} remains visible on the graph canvas`);
  }
  assert.deepEqual(fixture,original);
 }
});
