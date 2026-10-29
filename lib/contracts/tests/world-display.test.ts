import test from 'node:test';
import assert from 'node:assert/strict';
import {parseKnowledgeGraph,type KnowledgeGraph} from '../../knowledge-graph/contract.ts';
import {graphEntityTypes,knowledgeRelationshipLabel,entityTypeColour,isArchivedGraphView} from '../../knowledge-graph/display.ts';
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
