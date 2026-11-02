import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {projectCitizenPublicView} from '../../citizen-grounding/public-view.ts';
import {publicSociety} from '../../server/society/summary.ts';
import {phase4dWorld} from './phase4d-fixture.ts';
import type {LinkDetail,SocietySummary} from '../../society/public-contract.ts';

function summary(detail?:LinkDetail):SocietySummary{
 const value=publicSociety(phase4dWorld(100));
 value.links=[{source:value.agents[0].id,target:value.agents[1].id,kind:'RECORDED_PUBLIC_INTERACTION',count:2,...(detail?{detail}:{})}];return value;
}
test('nested relationship metadata rejects raw content, malformed counts and oversized fields before public projection',()=>{
 const invalid:unknown[]=[
  {mix:{reply:2,message:'SECRET_MESSAGE'}},{mix:{reply:-1}},{mix:{reply:NaN}},{mix:{reply:Infinity}},{mix:{reply:1.5}},
  {platforms:['reddit'],text:'SECRET_MESSAGE'}, {platforms:['reddit','reddit']},{platforms:['x'.repeat(200)]},
  {themes:[{label:'Transport',count:1,text:'SECRET_MESSAGE'}]},{themes:[{label:'Transport',count:-1}]},{themes:[{label:'x'.repeat(2000),count:1}]},
  {arguments:{concern:1,statement:'SECRET_MESSAGE'}},{arguments:{concern:-1}},{stance:{changes:1,towardSupport:0,towardConcern:0}},
  {stance:{changes:1,towardSupport:1,towardConcern:0,eventId:'SECRET_EVENT'}},{tie:'SECRET_MESSAGE'}
 ];
 for(const detail of invalid)assert.throws(()=>projectCitizenPublicView(summary(detail as LinkDetail)),JSON.stringify(detail));
});
test('valid aggregate detail and legacy links preserve the exact identities, counts and privacy boundary',()=>{
 const detail:LinkDetail={mix:{reply:1,comment:1},platforms:['reddit','channel:community'],themes:[{label:'Access < options >',count:2}],arguments:{concern:1,question:1},stance:{changes:3,towardSupport:1,towardConcern:2}};
 const original=summary(detail),before=structuredClone(original),projected=projectCitizenPublicView(original);
 assert.deepEqual(projected.links,original.links);assert.deepEqual(original,before);assert.notStrictEqual(projected.links[0].detail,original.links[0].detail);
 assert.deepEqual(projectCitizenPublicView(summary()).links,summary().links);
});
test('large valid aggregate details remain inside the existing public byte cap without changing authoritative totals',()=>{
 const value=summary();const baseBytes=Buffer.byteLength(JSON.stringify({...value,links:[]}));value.limitations.push('x'.repeat(Math.max(0,249000-baseBytes)));
 value.links=[];for(let i=0;i<250;i++)value.links.push({source:value.agents[i%100].id,target:value.agents[(i%100+1+Math.floor(i/100))%100].id,kind:'RECORDED_PUBLIC_INTERACTION',count:2,detail:{mix:{reply:2},platforms:['reddit','instagram','channel:one','channel:two'],themes:[{label:'A'.repeat(180),count:2},{label:'B'.repeat(180),count:1}],arguments:{concern:1,condition:1},stance:{changes:2,towardSupport:1,towardConcern:1}}});
 const original=structuredClone(value),projected=projectCitizenPublicView(value);
 assert.ok(Buffer.byteLength(JSON.stringify(projected))<=262144);assert.ok(projected.links.length<250);assert.deepEqual(projected.counts,value.counts);assert.deepEqual(projected.agents,value.agents);assert.deepEqual(value,original);
});
