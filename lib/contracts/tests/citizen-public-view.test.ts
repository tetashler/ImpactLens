import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {projectCitizenPublicView} from '../../citizen-grounding/public-view.ts';
import {publicSociety} from '../../server/society/summary.ts';
import {phase4dWorld} from './phase4d-fixture.ts';
const bytes=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)).length;
function fixture(){
 const s=publicSociety(phase4dWorld(100));s.links=[];
 for(let i=0;i<700;i++)s.links.push({source:s.agents[i%100].id,target:s.agents[(i%100+1+Math.floor(i/100))%100].id,kind:i%3===0?'RECORDED_INFORMATION_TRANSFER':'RECORDED_PUBLIC_INTERACTION',count:i+1});
 for(let i=0;i<650;i++)s.links.push({source:s.agents[i%100].id,target:s.agents[(i%100+20+Math.floor(i/100))%100].id,kind:'ASSUMED_SOCIAL_TIE',count:1});
 return s;
}
const metadata=(s:ReturnType<typeof fixture>)=>JSON.parse(s.limitations.at(-1)!.slice(s.limitations.at(-1)!.indexOf('{')));
test('new citizen projection retains all 100 searchable agents and authoritative totals while bounding displayed links',()=>{
 const s=fixture(),before=structuredClone(s),p=projectCitizenPublicView(s);assert.ok(bytes(p)<=262144);assert.equal(p.links.length,256);assert.equal(p.agents.length,100);assert.deepEqual(p.agents,s.agents);for(const key of ['counts','conversation','usage','swarm','map','platforms','groups'] as const)assert.deepEqual(p[key],s[key]);assert.deepEqual(s,before);assert.notStrictEqual(p,s);assert.ok(!p.links.some(l=>l.kind==='ASSUMED_SOCIAL_TIE'));assert.ok(p.limitations.at(-1)?.includes('citizen-public-view-v1'));
});
test('recorded-pair selection is deterministic under link permutations and gives each active source a first display opportunity',()=>{
 const s=fixture(),a=projectCitizenPublicView(s),b=projectCitizenPublicView({...s,links:[...s.links].reverse()});assert.deepEqual(a.links,b.links);assert.deepEqual(a.limitations,b.limitations);assert.equal(new Set(a.links.map(l=>l.source)).size,100);
});
test('display metadata retains exact omitted pair counts and event-count sums by kind',()=>{
 const s=fixture(),p=projectCitizenPublicView(s),m=metadata(p);assert.equal(m.selectedPairs,256);assert.equal(m.totalPairs,1350);assert.equal(m.completeCount,s.links.reduce((n,l)=>n+l.count,0));assert.equal(m.displayedCount,p.links.reduce((n,l)=>n+l.count,0));for(const kind of ['ASSUMED_SOCIAL_TIE','RECORDED_PUBLIC_INTERACTION','RECORDED_INFORMATION_TRANSFER']){const complete=s.links.filter(l=>l.kind===kind),shown=p.links.filter(l=>l.kind===kind);assert.deepEqual(m.kinds[kind],{displayedPairs:shown.length,completePairs:complete.length,displayedCount:shown.reduce((n,l)=>n+l.count,0),completeCount:complete.reduce((n,l)=>n+l.count,0)});}
});
test('small summaries remain complete and projection never rewrites authoritative relationship weights',()=>{
 const s=fixture();s.links=s.links.slice(0,15);const p=projectCitizenPublicView(s);assert.equal(p.links.length,15);assert.ok(p.links.every(l=>s.links.some(original=>JSON.stringify(original)===JSON.stringify(l))));assert.equal(metadata(p).completePairs,undefined);assert.equal(metadata(p).totalPairs,15);
});
test('public DTOs are detached and mutable for existing failure projection without changing source state',()=>{
 const s=fixture(),phase=s.phase;assert.equal(Object.isFrozen(s.agents),false);const p=projectCitizenPublicView(s);assert.equal(Object.isFrozen(s.agents),false);p.phase='partial';p.agents[0].label='Synthetic changed display label';assert.equal(s.phase,phase);assert.notEqual(s.agents[0].label,p.agents[0].label);assert.equal(p.phase,'partial');
});
test('base payload exhaustion fails closed instead of dropping agents or raising the public limit',()=>{
 const s=fixture();s.agents[0].goal='Synthetic oversized fixture '.repeat(15000);assert.throws(()=>projectCitizenPublicView(s),/CITIZEN_PUBLIC_BASE_BOUND/);
});
test('byte pressure drops weak display links while preserving the entire base and exact omission metadata',()=>{
 const s=fixture(),baseBytes=bytes({...s,links:[]});s.limitations.push('Synthetic byte-pressure padding: '+'.'.repeat(250000-baseBytes));const p=projectCitizenPublicView(s);assert.ok(bytes(p)<=262144);assert.ok(p.links.length>0&&p.links.length<256);assert.deepEqual(p.agents,s.agents);assert.deepEqual(p.counts,s.counts);assert.equal(metadata(p).selectedPairs,p.links.length);assert.equal(metadata(p).totalPairs,1350);assert.deepEqual(p.limitations.slice(0,-1),s.limitations);
});
test('malformed counts, duplicate pair identities and unexpected relationship kinds fail closed',()=>{
 for(const mutate of [(s:ReturnType<typeof fixture>)=>{s.links[0].count=NaN;},(s:ReturnType<typeof fixture>)=>{s.links.push({...s.links[0]});},(s:ReturnType<typeof fixture>)=>{s.links[0].kind='UNREVIEWED_PRIVATE_KIND';}]){const s=fixture();mutate(s);assert.throws(()=>projectCitizenPublicView(s));}
});
