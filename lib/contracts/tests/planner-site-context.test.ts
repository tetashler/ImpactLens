import test from 'node:test';
import assert from 'node:assert/strict';
import {plannerSiteContext,assertGeneratedSiteAssumptions} from '../../server/inference/planner-site-context.ts';
import type {DynamicRequest} from '../../dynamic-scenarios/plan.ts';
import type {PlotPoint} from '../../plots/geometry.ts';

const point=(id:string,lat:number,lon:number):PlotPoint=>({kind:'point',id,label:'User label Sengkang is not a location lookup',coordinate:{lat,lon},role:'site',provenance:'user-drawn'});
const whampoa=point('whampoa',1.325243,103.856099),sengkang=point('sengkang',1.39404,103.89404),outside=point('offshore',1.16,103.61);
const request=(features:PlotPoint[]=[whampoa]):DynamicRequest=>({version:1,question:'What if a polyclinic were built at the plotted location?',geometryRevision:1,geometry:{version:1,scenarioId:'site-context-regression',features}});
const draft=(text:string,description='Hypothetical new polyclinic discussion.')=>({description,assumptions:[{id:'site',text}]});

test('Whampoa-area point retains the official Novena/Balestier lookup and original coordinates',()=>{
 const input=request(),before=structuredClone(input),context=plannerSiteContext(input);
 assert.equal(context.provenance,'official-boundary-lookup');assert.equal(context.status,'resolved');
 assert.equal(context.sites[0].planningArea,'NOVENA');assert.equal(context.sites[0].subzone,'BALESTIER');
 assert.deepEqual(context.sites[0].coordinate,whampoa.coordinate);assert.equal(context.sites[0].referenceYear,2019);
 assert.match(context.sites[0].sourceSha256,/^[a-f0-9]{64}$/);assert.match(context.instruction,/override|authoritative/i);
 assert.deepEqual(input,before);
});

test('genuine Sengkang and multiple plotted sites keep their separate resolved locations',()=>{
 assert.equal(plannerSiteContext(request([sengkang])).sites[0].planningArea,'SENGKANG');
 const context=plannerSiteContext(request([whampoa,sengkang]));
 assert.equal(context.status,'resolved');assert.deepEqual(context.sites.map(s=>s.planningArea),['NOVENA','SENGKANG']);
 assert.doesNotThrow(()=>assertGeneratedSiteAssumptions(draft('The plotted site is in the Sengkang planning area.'),request([whampoa,sengkang])));
});

test('no points, offshore points and unavailable boundaries stay explicitly unknown without locality fallback',()=>{
 const never=()=>{assert.fail('No points must not read boundaries');};
 assert.deepEqual(plannerSiteContext(request([]),never).sites,[]);
 assert.equal(plannerSiteContext(request([]),never).status,'not-plotted');
 const unresolved=plannerSiteContext(request([outside]));assert.equal(unresolved.status,'partial');assert.equal(unresolved.sites[0].planningArea,null);
 const unavailable=plannerSiteContext(request(),()=>{throw Error('Unavailable boundary snapshot');});
 assert.equal(unavailable.status,'unavailable');assert.deepEqual(unavailable.sites,[]);assert.match(unavailable.instruction,/unknown/i);
 assert.doesNotThrow(()=>assertGeneratedSiteAssumptions(draft('The plotted site is in Sengkang.'),request([])));
});

test('direct contradictory plotted-site assumptions and descriptions cannot reach review',()=>{
 for(const text of [
  'The plotted location is in the Sengkang planning area.',
  'The plotted location is a currently unbuilt site in the Sengkang planning area, but no detailed site plan is available.',
  'The selected site is located in Sengkang.',
  'The site is in Sengkang.',
  'The plotted location is an unbuilt site in Sengkang.',
  'The proposed polyclinic would be situated within Sengkang.',
  'Discussion of the proposed polyclinic in Sengkang.',
  'The plotted point lies within the Whampoa subzone.',
 ])assert.throws(()=>assertGeneratedSiteAssumptions(draft(text),request()),(e:any)=>e.diagnostic?.rule==='plan.site_location_conflict',text);
 assert.throws(()=>assertGeneratedSiteAssumptions(draft('Land use remains unknown.','The plotted site is located in Sengkang.'),request()),(e:any)=>e.diagnostic?.path==='draft.description');
 assert.throws(()=>assertGeneratedSiteAssumptions({...draft('Land use remains unknown.'),trigger:'The site is located in Sengkang.'},request()),(e:any)=>e.diagnostic?.path==='draft.trigger');
});

test('correct official locations, comparisons, negative statements and conditional discussion remain allowed',()=>{
 for(const text of [
  'The plotted site is in the Novena planning area.',
  'The plotted location is in Balestier subzone.',
  'Residents may compare services with Sengkang.',
  'The plotted site is in Novena, compared with existing services in Sengkang.',
  'The plotted site is not located in Sengkang.',
  'The site is not in Sengkang.',
  'If the site is in Sengkang, different access questions would apply.',
  'If the plotted site were in Sengkang, different access questions would apply.',
  'Is the plotted site in Sengkang?',
  'One retrieved source says “The plotted site is in Sengkang”, but its applicability is unknown.',
  'Compared with the proposed polyclinic in Sengkang, the plotted site has different access questions.',
  'The plotted site needs access arrangements for residents in Sengkang.',
 ])assert.doesNotThrow(()=>assertGeneratedSiteAssumptions(draft(text),request()),text);
 assert.doesNotThrow(()=>assertGeneratedSiteAssumptions(draft('The plotted site is in Sengkang.'),request([sengkang])));
});
