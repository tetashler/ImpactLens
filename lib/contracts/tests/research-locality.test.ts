import test from 'node:test';
import assert from 'node:assert/strict';
import {researchLocality} from '../../server/evidence/research-locality.ts';
import type {ScenarioGeometry,PlotPoint} from '../../plots/geometry.ts';

const point=(id:string,lat:number,lon:number):PlotPoint=>({kind:'point',id,label:'Hypothetical plotted site',coordinate:{lat,lon},role:'site',provenance:'user-drawn'});
const geometry=(features:PlotPoint[]=[]):ScenarioGeometry=>({version:1,scenarioId:'research-location-fixture',features});
const tanglin=point('site-tanglin',1.305,103.81),toaPayoh=point('site-toa-payoh',1.335,103.85),outside=point('site-outside',1.16,103.61);

test('research resolves the actual plotted Tanglin site when the question only says built here',()=>{
 assert.equal(researchLocality(geometry([tanglin]),null),'TANGLIN');
 assert.equal(researchLocality(geometry([tanglin]),'Sengkang'),'TANGLIN','the site location takes precedence over a question-area fallback');
});
test('research without plotted points uses only the question locality and skips boundary IO',()=>{
 assert.equal(researchLocality(geometry(),'Sengkang',()=>{throw Error('Boundary lookup should not run.');}),'Sengkang');
 assert.equal(researchLocality(geometry(),null),null);
});
test('multiple resolved planning areas remain ambiguous instead of choosing a question fallback',()=>{
 assert.equal(researchLocality(geometry([tanglin,toaPayoh]),'Sengkang'),null);
 assert.equal(researchLocality(geometry([tanglin,{...tanglin,id:'second-tanglin'}]),null),'TANGLIN');
});
test('unresolved offshore markers and unavailable boundary data gracefully use question fallback',()=>{
 assert.equal(researchLocality(geometry([outside]),'Sengkang'),'Sengkang');
 assert.equal(researchLocality(geometry([outside]),null),null);
 assert.equal(researchLocality(geometry([tanglin]),'Sengkang',()=>{throw Object.assign(Error('Unavailable boundary fixture'),{code:'ENOENT'});}),'Sengkang');
});
