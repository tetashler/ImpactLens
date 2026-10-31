import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {retrieveTavilyGrounding} from '../../server/evidence/tavily.ts';
import {buildRetrievalQuery} from '../../server/evidence/retrieval-query.ts';
import {geographicCoverage} from '../../grounding/geographic-coverage.ts';
import {createGroundingBundle,groundingContentId} from '../../grounding/contract.ts';

test('balanced query preserves later intervention words without enlarging the one-search request',()=>{
 const question='Sengkang '+ 'community support '.repeat(60)+' overnight volunteer visits and caregiver scheduling';
 const query=buildRetrievalQuery(question,'Sengkang','balanced-question-v1');
 assert.ok(query.length<=500);assert.match(query,/Sengkang Singapore:/);assert.match(query,/overnight volunteer visits and caregiver scheduling$/);
 assert.equal(buildRetrievalQuery(question,'Sengkang'),('Sengkang Singapore: '+question).slice(0,500).trimEnd(),'legacy query remains unchanged');
});

test('locality window keeps an exact bounded source substring after long boilerplate',async()=>{
 let calls=0;const content='General overseas background. '.repeat(40)+'Sengkang Singapore fictional fixture: volunteers coordinate caregiver visits. '+ 'Supplementary text. '.repeat(80);
 const bundle=await retrieveTavilyGrounding('Sengkang Singapore: caregiver coordination',undefined,{key:'offline-only',locality:'Sengkang',passagePolicy:'locality-window-v1',fetcher:async(_url,init)=>{
  calls++;assert.equal(JSON.parse(String(init?.body)).max_results,5);
  return Response.json({results:[{url:'https://www.moh.gov.sg/offline-fixture',title:'Synthetic fixture',content}],usage:{credits:1}});
 }});
 const text=bundle.sources[0].passages[0].text;
 assert.equal(calls,1);assert.ok(text.length<=800);assert.ok(content.includes(text));assert.match(text,/Sengkang Singapore/);
 assert.match(bundle.limitations.join(' '),/literal.*mention|mention.*literal/i);
 assert.equal(bundle.sources[0].publishedAt,null);
});

test('no local passage coverage is disclosed without manufacturing source support',async()=>{
 const bundle=await retrieveTavilyGrounding('Sengkang Singapore: caregiver coordination',undefined,{key:'offline-only',locality:'Sengkang',passagePolicy:'locality-window-v1',fetcher:async()=>Response.json({results:[{url:'https://www.moh.gov.sg/offline-fixture',title:'Sengkang in an unverified title',content:'Singapore national caregiving background only.'}],usage:{credits:1}})});
 assert.match(bundle.limitations.join(' '),/No supplied passage.*Sengkang/);
 assert.equal(bundle.sources[0].passages[0].text,'Singapore national caregiving background only.');
});

test('geographic labels use passage wording, never government domains or locality titles',()=>{
 const sources=[['Sengkang','National guidance in Singapore.'],['National','A fictional Sengkang Singapore fixture mentions volunteer visits.'],['International','London overseas example of caregiver support.'],['Conflict','Sengkang is NOT evidence of this hypothetical pilot.']].map(([title,text],n)=>({id:'source-'+n,title,url:`https://www.moh.gov.sg/offline-${n}`,publisher:'www.moh.gov.sg',publishedAt:null,retrievedAt:'2026-10-31T00:00:00.000Z',passages:[{id:groundingContentId('p',text),text}]}));
 const bundle=createGroundingBundle({status:'retrieved',query:'Sengkang Singapore',retrievedAt:'2026-10-31T00:00:00.000Z',sources,limitations:[],usage:{searches:1,credits:1}});
 const coverage=geographicCoverage(bundle,'Sengkang');
 assert.deepEqual(coverage.sources.map(s=>s.passages[0].requestedLocalityMentioned),[false,true,false,true]);
 assert.deepEqual(coverage.sources.map(s=>s.passages[0].singaporeMentioned),[true,true,false,false]);
 assert.ok(coverage.sources.every(s=>s.publishedAt===null));assert.match(coverage.interpretation,/negat|truth|existence/);
 assert.equal(geographicCoverage(bundle,null).requestedLocality,null);
 assert.equal(geographicCoverage(bundle,'Sengkang and Bukit Merah').sources[1].passages[0].requestedLocalityMentioned,false,'caller must supply a resolved locality; combined phrase does not create local support');
});

test('locality window never enlarges five candidates, duplicate URLs, or search count',async()=>{
 let calls=0;
 const bundle=await retrieveTavilyGrounding('Sengkang Singapore: coordination',undefined,{key:'offline-only',locality:'Sengkang',passagePolicy:'locality-window-v1',fetcher:async()=>{
 calls++;return Response.json({results:Array.from({length:9},(_,n)=>({url:`https://www.aic.sg/offline-${Math.floor(n/2)}`,title:'Synthetic fixture',content:'No local details. Singapore background only.'})),usage:{credits:1}});
 }});
 assert.equal(calls,1);assert.equal(bundle.sources.length,5);assert.equal(new Set(bundle.sources.map(s=>s.url)).size,5);assert.equal(bundle.usage.searches,1);
});

test('locality excerpts reject interior control characters instead of inventing contiguous quotations',async()=>{
 const bundle=await retrieveTavilyGrounding('Sengkang Singapore: coordination',undefined,{key:'offline-only',locality:'Sengkang',passagePolicy:'locality-window-v1',fetcher:async()=>Response.json({results:[{url:'https://www.aic.sg/offline-controls',title:'Synthetic fixture',content:'Seng\u0000kang Singapore caregiver information.'}],usage:{credits:1}})});
 assert.equal(bundle.sources.length,0);assert.match(bundle.limitations.join(' '),/No supplied passage/);
});

test('new source windows do not turn ambiguous or invalid publication dates into precise dates',async()=>{
 const dates=['2025','2025-02-30','31/10/2025','2025-10-31','2025-10-31T08:00:00+08:00'];
 const bundle=await retrieveTavilyGrounding('Singapore background',undefined,{key:'offline-only',passagePolicy:'locality-window-v1',fetcher:async()=>Response.json({results:dates.map((published_date,n)=>({url:`https://www.aic.sg/date-${n}`,title:'Synthetic fixture',content:'Singapore caregiver background.',published_date})),usage:{credits:1}})});
 assert.deepEqual(bundle.sources.map(s=>s.publishedAt),[null,null,null,'2025-10-31T00:00:00.000Z','2025-10-31T00:00:00.000Z']);
 assert.ok(bundle.sources.every(s=>s.retrievedAt!==null));
});
