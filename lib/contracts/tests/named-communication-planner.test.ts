import test from 'node:test';
import assert from 'node:assert/strict';
import {entityReferenceStageSchema,entityStageSchema} from '../../server/inference/planner.ts';
import {requireNamedCommunicationServices} from '../../server/inference/named-communication.ts';
import {plannerFixture} from './helpers/planner-fixture.ts';
import {selectCommunication} from '../../society/communication.ts';
import {knowledgeNodeLabel} from '../../knowledge-graph/display.ts';

test('new communication declarations select named services while non-service entities keep free names',()=>{
 const schema:any=entityReferenceStageSchema();
 const item=schema.properties.ontology.properties.entityTypes.items.properties.entities.items;
 assert.ok(Array.isArray(item.anyOf),'Communication declarations must select a concrete service');
 const named=item.anyOf.filter((b:any)=>b.properties.communication.type!=='null');
 assert.deepEqual(named.map((b:any)=>b.properties.name.enum[0]),['WhatsApp','Telegram','Instagram','Reddit']);
 assert.equal(item.anyOf.find((b:any)=>b.properties.communication.type==='null').properties.name.enum,undefined);
 for(const branch of named)assert.equal(branch.additionalProperties,false);
});

test('named service selections retain their identities through channel selection and graph display',()=>{
 const names=['WhatsApp','Telegram','Instagram','Reddit'];
 const config=selectCommunication(names.map((name,i)=>({id:'service-'+i,name,typeId:'service'})),[{id:'service',name:'Communication platform'}],[]);
 assert.deepEqual(config.channels.map(c=>c.name),names);
 assert.deepEqual(config.channels.map(c=>c.id),['whatsapp','telegram','instagram','reddit']);
 for(const channel of config.channels){
  const label=knowledgeNodeLabel({id:channel.id,label:channel.name,category:'planning',entityType:channel.entityType,description:'Fictional scenario service.',properties:{recordType:'communication-platform',platformId:channel.id},provenance:{kind:'model-assumption',reference:'Fictional scenario choice'},limitations:[]});
  assert.equal(label,channel.name);
 }
});

test('new entity validation rejects vague service names without changing historical declaration schemas',()=>{
 const f=plannerFixture();
 const entity=f.draft.ontology!.entities[0];entity.communication={version:1,style:'private-group'};
 for(const name of ['Messaging App','Social media platform','Local transport forum']){
  entity.name=name;assert.throws(()=>requireNamedCommunicationServices(f.draft));
 }
 entity.name='WhatsApp';assert.doesNotThrow(()=>requireNamedCommunicationServices(f.draft));
 const historical:any=entityStageSchema();assert.equal(historical.properties.ontology.properties.entityTypes.items.properties.entities.items.anyOf,undefined);
});
