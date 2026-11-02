import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {projectReportEvidence,reportSnapshotPayload} from '../../report-summary/evidence.ts';
import type {PublicExplore} from '../../society/public-contract.ts';
import type {HybridReview} from '../../interventions/explore-contract.ts';

function context():HybridReview {
  return {version:1,kind:'hybrid-map-review',bindingKey:'a'.repeat(64),question:'Propose a polyclinic',geometryRevision:7,interventionType:'new_polyclinic',analysisMode:'location-context',message:'Discussion context only',limitations:['Opening hours and staffing are unknown.'],locations:[{pointId:'clinic-point',coordinate:{lat:1.352123,lon:103.819876},planningArea:'ANG MO KIO',subzone:'TOWN CENTRE',sourceId:'area-source',sourceSha256:'b'.repeat(64),referenceYear:2019}]};
}
function run(locationContext?:HybridReview):PublicExplore {
  return {version:3,kind:'summary-execution',attemptId:'attempt',requestIdentity:'request',runId:'location-report',planId:null,question:'Propose a polyclinic',status:'partial',request:null,graph:{version:1,scenarioIdentity:'scenario',nodes:[],edges:[],limitations:[]},inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{planningCalls:null,actionCalls:null,inputTokens:null,outputTokens:null,costUsd:null},demographics:null,session:null,society:null,...(locationContext?{locationContext}:{})};
}
const fingerprint=(value:PublicExplore)=>createHash('sha256').update(reportSnapshotPayload(projectReportEvidence(value))).digest('hex');

test('report evidence retains selected polyclinic location and scope without private location fields',()=>{
  const review=context();
  Object.assign(review,{token:'PRIVATE_TOKEN',profiles:['PRIVATE_PROFILE'],bindingKey:'PRIVATE_BINDING'});
  Object.assign(review.locations![0],{privateNotes:'PRIVATE_LOCATION',resident:'PRIVATE_RESIDENT'});
  const evidence=projectReportEvidence(run(review)) as unknown as {locationContext?:Record<string,unknown>};
  assert.ok(evidence.locationContext,'accepted plotted context must reach report evidence');
  assert.equal(evidence.locationContext.interventionType,'new_polyclinic');
  assert.equal(evidence.locationContext.analysisMode,'location-context');
  assert.equal(evidence.locationContext.geometryRevision,7);
  assert.deepEqual(evidence.locationContext.locations,[{pointId:'clinic-point',coordinate:{lat:1.352123,lon:103.819876},planningArea:'ANG MO KIO',subzone:'TOWN CENTRE'}]);
  assert.deepEqual(evidence.locationContext.limitations,['Opening hours and staffing are unknown.']);
  const encoded=JSON.stringify(evidence);
  assert.match(encoded,/discussion.only/i);
  assert.match(encoded,/no measured healthcare effects/i);
  for(const excluded of ['PRIVATE_TOKEN','PRIVATE_PROFILE','PRIVATE_BINDING','PRIVATE_LOCATION','PRIVATE_RESIDENT','sourceSha256','sourceId','referenceYear'])assert.ok(!encoded.includes(excluded),excluded);
});

test('location context changes the report fingerprint while legacy evidence has no added field',()=>{
  const legacy=run(),review=context(),located=run(review);
  assert.equal(Object.hasOwn(projectReportEvidence(legacy),'locationContext'),false);
  assert.notEqual(fingerprint(legacy),fingerprint(located));
  const original=fingerprint(located);
  review.locations![0].coordinate.lat=1.353;
  assert.notEqual(fingerprint(located),original);
});

// Use the installed Next Babel loader to render the actual TSX component in Node.
async function render(context:HybridReview) {
  const componentUrl=new URL('../../../components/location-discussion-context.tsx',import.meta.url);
  const require=createRequire(import.meta.url),babel=require('next/dist/compiled/babel/core');
  const source=await readFile(componentUrl,'utf8');
  const js:string=babel.transformSync(source,{filename:'location-discussion-context.tsx',babelrc:false,configFile:false,presets:[[require.resolve('next/dist/compiled/babel/preset-typescript'),{allExtensions:true,isTSX:true}],[require.resolve('next/dist/compiled/babel/preset-react'),{runtime:'automatic'}]]}).code;
  const resolved=js.replace(/from (['"])([^'"]+)\1/g,(_match,quote,specifier:string)=>`from ${quote}${specifier.startsWith('.')?new URL(`${specifier}.ts`,componentUrl).href:pathToFileURL(require.resolve(specifier)).href}${quote}`);
  const {default:LocationDiscussionContext}=await import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`);
  return renderToStaticMarkup(createElement(LocationDiscussionContext,{context}));
}

test('display preserves plotted location and clearly scopes fictional discussion while escaping text',async()=>{
  const review=context();review.locations![0].planningArea='<script>unsafe()</script>';
  const html=await render(review);
  assert.match(html,/Fictional discussion about a proposed polyclinic/);
  assert.match(html,/plotted location.*retained/i);
  assert.match(html,/1\.35212, 103\.81988/);
  assert.match(html,/TOWN CENTRE/);
  assert.match(html,/&lt;script&gt;unsafe\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(html,/<script>/);
  assert.match(html,/participants are fictional/i);
  assert.match(html,/not measured residents/i);
  assert.match(html,/No healthcare outcomes, waiting times or capacity have been calculated/);
  assert.match(html,/Opening hours and staffing are unknown/);
});

test('display states unknown geography without inventing a place',async()=>{
  const review=context();review.locations![0].planningArea=null;review.locations![0].subzone=null;
  const html=await render(review);
  assert.match(html,/Planning area: Unknown/);
  assert.match(html,/Subzone: Unknown/);
  assert.match(html,/1\.35212, 103\.81988/);
});
