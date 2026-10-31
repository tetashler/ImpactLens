import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRetrievalQuery} from '../../server/evidence/retrieval-query.ts';
import {retrieveTavilyGrounding} from '../../server/evidence/tavily.ts';

const question='What if a new government-supported eldercare centre in Sengkang begins a three-day pilot of neighbourhood volunteer visits and caregiver-support sessions? How might nearby residents, caregivers, volunteers and service providers coordinate schedules, raise concerns, exchange updates and revisit unresolved practical issues over the following days?';

test('a uniquely resolved Sengkang question gains an explicit country search anchor',()=>{
 assert.equal(buildRetrievalQuery(question,'Sengkang'),'Sengkang Singapore: '+question);
 assert.equal(question.includes('Singapore'),false,'The source question remains unchanged');
});

test('explicit Singapore context is retained without inventing an unresolved locality',()=>{
 assert.equal(buildRetrievalQuery('Compare caregiver support in Singapore.'),'Singapore: Compare caregiver support in Singapore.');
 assert.equal(buildRetrievalQuery('Consider Singapore services in Sengkang.','Sengkang'),'Sengkang Singapore: Consider Singapore services in Sengkang.');
 assert.equal(buildRetrievalQuery('Compare Singapore services in Sengkang and Bukit Merah.',null),'Singapore: Compare Singapore services in Sengkang and Bukit Merah.');
});

test('foreign countries and cross-border mechanisms never acquire an inferred Singapore prefix',()=>{
 for(const foreign of ['Malaysia','Hong Kong','United States','UK','U.S.','China','Indonesia']){
  const text=`Compare Sengkang services with ${foreign}.`;
  assert.equal(buildRetrievalQuery(text,'Sengkang'),text);
 }
 for(const text of ['An international volunteer exchange in Sengkang.','Support cross-border caregivers in Sengkang.','Compare Singapore and Malaysia caregiver services in Sengkang.'])assert.equal(buildRetrievalQuery(text,'Sengkang'),text);
});

test('missing, ambiguous or nonmatching planning-area context never invents Singapore',()=>{
 for(const area of [undefined,null,'Sengkang','Sengkang: Singapore'])assert.equal(buildRetrievalQuery('Compare Sengkangster volunteer services.',area),'Compare Sengkangster volunteer services.');
 assert.equal(buildRetrievalQuery('Compare Sengkang and Bukit Merah services.',null),'Compare Sengkang and Bukit Merah services.');
 assert.equal(buildRetrievalQuery('Consider an unresolved neighbourhood centre.'),'Consider an unresolved neighbourhood centre.');
});

test('query whitespace is compacted while Unicode and source text remain intact',()=>{
 const source=' \tSÉNIORS 👵 in\nSengkang need caregiver\u00a0support.  ';
 assert.equal(buildRetrievalQuery(source,'Sengkang'),'Sengkang Singapore: SÉNIORS 👵 in Sengkang need caregiver support.');
 assert.equal(source,' \tSÉNIORS 👵 in\nSengkang need caregiver\u00a0support.  ');
});

test('geography after the old five-hundred-character cut remains at the front of the bounded query',()=>{
 const source='Caregiver support '.repeat(35)+'in Sengkang.';
 const query=buildRetrievalQuery(source,'Sengkang');
 assert.equal(query.length,500);assert.ok(query.startsWith('Sengkang Singapore: Caregiver support Caregiver support '));
 assert.equal(buildRetrievalQuery(source,'Sengkang'),query);
});

test('a foreign country after five hundred characters prevents a misleading local anchor',()=>{
 const source='Caregiver support '.repeat(35)+'in Sengkang and Malaysia.';
 assert.equal(buildRetrievalQuery(source,'Sengkang'),'Caregiver support '.repeat(27)+'Caregiver supp');
});

test('the complete original question is validated before any truncation or trimming',()=>{
 for(const source of ['', ' \t\n ', 'x'.repeat(2001), ' '.repeat(2000)+'x', 'x'.repeat(550)+'\u0000', 'x'.repeat(550)+'\u007f'])assert.throws(()=>buildRetrievalQuery(source),/^Error: Invalid retrieval question\.$/);
 assert.throws(()=>buildRetrievalQuery(null as unknown as string),/^Error: Invalid retrieval question\.$/);
 assert.equal(buildRetrievalQuery('x'.repeat(2000)),'x'.repeat(500));
});

test('the bounded query never splits a Unicode surrogate pair at its final character',()=>{
 assert.equal(buildRetrievalQuery('a'.repeat(499)+'👵 rest'),'a'.repeat(499));
 assert.equal(buildRetrievalQuery('a'.repeat(498)+'👵 rest'),'a'.repeat(498)+'👵');
});

test('the actual mocked Tavily request carries the bounded query with unchanged search limits',async()=>{
 let calls=0;
 const query=buildRetrievalQuery(question,'Sengkang');
 const bundle=await retrieveTavilyGrounding(query,undefined,{key:'offline-mock-only',now:()=>new Date('2026-10-31T00:00:00.000Z'),fetcher:async(url,init)=>{
  calls++;assert.equal(url,'https://api.tavily.com/search');
  const body=JSON.parse(String(init?.body));
  assert.equal(body.query,'Sengkang Singapore: '+question);assert.equal(body.search_depth,'basic');assert.equal(body.max_results,5);assert.equal(body.auto_parameters,false);
  return Response.json({results:[],usage:{credits:1}});
 }});
 assert.equal(calls,1);assert.equal(bundle.query,'Sengkang Singapore: '+question);assert.deepEqual(bundle.usage,{searches:1,credits:1});
});
