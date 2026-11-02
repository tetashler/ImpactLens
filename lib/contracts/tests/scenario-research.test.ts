import test from 'node:test';
import assert from 'node:assert/strict';
import {retrieveScenarioResearch} from '../../server/evidence/scenario-research.ts';
import {createGroundingBundle,parseGroundingBundle} from '../../grounding/contract.ts';
import {summariseRetrieval} from '../../grounding/diagnostics.ts';

const now=()=>new Date('2026-11-02T00:00:00.000Z');
const item=(n:number)=>({title:`Report ${n}`,url:`https://reports.org/${n}`,content:`Singapore Sengkang published background ${n}.`,published_date:'2026-10-01'});
const fake=(fn:(body:Record<string,unknown>,signal:AbortSignal)=>unknown|Promise<unknown>):typeof fetch=>(async(_url,init)=>{
 const data=await fn(JSON.parse(String(init?.body)),init!.signal!);
 return data instanceof Response?data:Response.json(data);
}) as typeof fetch;

test('scenario research is optional without a key and reserves nothing',async()=>{
 const b=await retrieveScenarioResearch('A neighbourhood event','Sengkang',undefined,{key:'',now,fetcher:fake(()=>assert.fail('No key must not fetch'))});
 assert.equal(b.status,'not-configured');assert.equal(b.research?.stopReason,'not-configured');assert.equal(b.research?.reservedCredits,0);assert.deepEqual(b.research?.queries,[]);
 assert.deepEqual(parseGroundingBundle(JSON.parse(JSON.stringify(b))),b);
});

test('generic, healthcare and MRT scenarios get relevant distinct basic queries and stop on coverage',async()=>{
 for(const [question,topic] of [['A community festival in Sengkang','background'],['An eldercare caregiver clinic in Sengkang','healthcare'],['Change MRT train fares in Sengkang','transport']]){
  let calls=0;const b=await retrieveScenarioResearch(question,'Sengkang',undefined,{key:'mock',now,fetcher:fake(body=>{
   calls++;assert.equal(body.search_depth,'basic');assert.equal(body.max_results,5);assert.equal(body.auto_parameters,false);assert.ok(String(body.query).includes('Sengkang Singapore'));
   return {results:[item(calls)],usage:{credits:1}};
  })});
  assert.equal(b.status,'retrieved');assert.equal(b.research?.stopReason,'coverage');assert.ok(calls>1&&calls<30);assert.equal(b.usage.searches,calls);assert.equal(b.research?.reservedCredits,calls);
  assert.ok(b.research?.queries.some(q=>q.topic===topic));assert.equal(new Set(b.research?.queries.map(q=>q.query)).size,calls);
  assert.ok(b.limitations.some(x=>/not.*verif|unverified/i.test(x)));assert.equal(summariseRetrieval(b,50).sourceCount,b.sources.length);
 }
});

test('the whole question informs topical facets and foreign scope survives long-question bounding',async()=>{
 const question='Discuss a local event in Sengkang. '+'Details '.repeat(100)+'Compare Malaysia transport MRT and healthcare services.';
 const b=await retrieveScenarioResearch(question,'Sengkang',undefined,{key:'mock',now,fetcher:fake(body=>{
  const query=String(body.query);assert.ok(query.length<=500);assert.ok(query.includes('Malaysia'));assert.ok(!query.includes('Sengkang Singapore:'));
  return {results:[],usage:{credits:1}};
 })});
 assert.ok(b.research?.queries.some(q=>q.topic==='transport'));assert.ok(b.research?.queries.some(q=>q.topic==='healthcare'));assert.equal(b.research?.stopReason,'exhausted');
});

test('an explicit foreign country in the middle survives every bounded research query',async()=>{
 const question='Discuss changes to services here. '+'Background '.repeat(45)+'The intervention is in Malaysia. '+'Details '.repeat(90)+'Residents need practical help.';
 const b=await retrieveScenarioResearch(question,'Tanglin',undefined,{key:'mock',now,fetcher:fake(()=>({results:[],usage:{credits:1}}))});
 assert.ok(b.research!.queries.every(q=>q.query.includes('Malaysia')));assert.ok(b.research!.queries.every(q=>!q.query.includes('Tanglin Singapore:')));
});

test('foreign US and dotted or spaced country aliases survive middle-question cropping',async()=>{
 for(const alias of ['US','U.S.','U.K.','U S','U K']){
  const question='Discuss changes here. '+'Background '.repeat(45)+`The intervention is in ${alias}. `+'Details '.repeat(90)+'Residents need practical help.';
  const b=await retrieveScenarioResearch(question,'Tanglin',undefined,{key:'mock',now,fetcher:fake(()=>({results:[],usage:{credits:1}}))});
  assert.ok(b.research!.queries.every(q=>q.query.includes(alias)),alias);assert.ok(b.research!.queries.every(q=>!q.query.includes('Tanglin Singapore:')));
 }
});

test('many explicit countries still produce bounded dispatchable research queries',async()=>{
 const question='Compare services in Malaysia, Singapore, United States, United Kingdom, United Arab Emirates, Central African Republic, Dominican Republic, Bosnia and Herzegovina, Democratic Republic of the Congo, Papua New Guinea, Saint Vincent and the Grenadines, Trinidad and Tobago, Antigua and Barbuda, South Africa, Saudi Arabia, New Zealand, South Korea, North Korea, Costa Rica, Sierra Leone, Burkina Faso, Equatorial Guinea, El Salvador, Marshall Islands, Solomon Islands.';
 const b=await retrieveScenarioResearch(question,'Tanglin',undefined,{key:'mock',now,fetcher:fake(()=>({results:[],usage:{credits:1}}))});
 assert.equal(b.status,'retrieved');assert.ok(b.research!.queries.every(q=>q.query.length<=500));
});

test('a plotted domestic locality anchors here questions and polyclinics and commuting get topic facets',async()=>{
 for(const [question,topic] of [['What if a new polyclinic was built here?','healthcare'],['What if clinics changed commuting routes?','transport']]){
  const b=await retrieveScenarioResearch(question,'Tanglin',undefined,{key:'mock',now,fetcher:fake(body=>{
   assert.ok(String(body.query).startsWith('Tanglin Singapore: '));return {results:[],usage:{credits:1}};
  })});
  assert.ok(b.research?.queries.some(q=>q.topic===topic));
 }
 for(const question of ['What if a clinic in Malaysia changed?','What if cross-border commuting changed here?'])await retrieveScenarioResearch(question,'Tanglin',undefined,{key:'mock',now,fetcher:fake(body=>{
  assert.ok(!String(body.query).includes('Tanglin Singapore:'));return {results:[],usage:{credits:1}};
 })});
});

test('hard reservations cap every multi-topic scenario at thirty requests even with zero reported cost',async()=>{
 let calls=0;const b=await retrieveScenarioResearch('Singapore clinic MRT housing school business climate internet volunteering safety',null,undefined,{key:'mock',now,fetcher:fake(()=>{
  calls++;assert.ok(calls<=30);return {results:[],usage:{credits:0}};
 })});
 assert.equal(calls,30);assert.equal(b.research?.reservedCredits,30);assert.equal(b.research?.stopReason,'budget');assert.equal(b.usage.credits,0);
});

test('source deduplication keeps at most sixteen sources and all query references point to retained sources',async()=>{
 let calls=0;const b=await retrieveScenarioResearch('Singapore clinic MRT housing school business climate internet volunteering safety',null,undefined,{key:'mock',now,fetcher:fake(()=>{
  calls++;return {results:Array.from({length:5},(_,i)=>item(i===0?0:calls*5+i)),usage:{credits:1}};
 })});
 assert.equal(b.sources.length,16);assert.equal(new Set(b.sources.map(s=>s.url)).size,16);
 const ids=new Set(b.sources.map(s=>s.id));assert.ok(b.research?.queries.every(q=>q.sourceIds.every(id=>ids.has(id))));
});

test('duplicate excerpts cannot masquerade as broad coverage and missing locality stays explicit',async()=>{
 const b=await retrieveScenarioResearch('An eldercare clinic in Sengkang','Sengkang',undefined,{key:'mock',now,fetcher:fake(()=>({results:[{...item(1),content:'National Singapore background only.'}],usage:{credits:1}}))});
 assert.equal(b.sources.length,1);assert.notEqual(b.research?.stopReason,'coverage');assert.ok(b.limitations.some(l=>l.includes('No supplied passage mentions Sengkang')));
});

test('later successful refinements can fill an empty initial coverage facet and stop early',async()=>{
 let calls=0;const b=await retrieveScenarioResearch('A Singapore event',null,undefined,{key:'mock',now,fetcher:fake(()=>{
  calls++;return {results:calls===1?[]:[item(calls)],usage:{credits:1}};
 })});
 assert.equal(b.research?.stopReason,'coverage');assert.ok(calls<9);assert.ok(b.sources.length>=4);
});

test('unknown or over-reservation provider usage stops dispatch without refunding and preserves excerpts',async()=>{
 for(const usage of [undefined,{credits:2},{credits:-1}]){
  let calls=0;const b=await retrieveScenarioResearch('A Singapore event',null,undefined,{key:'mock',now,fetcher:fake(()=>{calls++;return {results:[item(1)],usage};})});
  assert.equal(calls,1);assert.equal(b.sources.length,1);assert.equal(b.research?.reservedCredits,1);assert.equal(b.research?.stopReason,'uncertain-usage');
  if(usage?.credits!==2)assert.equal(b.usage.credits,null);
 }
});

test('a failed second request stops without retry and retains the successful first source',async()=>{
 let calls=0;const b=await retrieveScenarioResearch('A Singapore event',null,undefined,{key:'mock',now,fetcher:fake(()=>{
  calls++;if(calls===2)throw new Error('mock private secret');return {results:[item(1)],usage:{credits:1}};
 })});
 assert.equal(calls,2);assert.equal(b.status,'retrieved');assert.equal(b.sources.length,1);assert.equal(b.usage.credits,null);assert.equal(b.research?.reservedCredits,2);assert.equal(b.research?.stopReason,'unavailable');assert.ok(!JSON.stringify(b).includes('private secret'));
});

test('a single total deadline retains completed sources even when transport ignores cancellation',async()=>{
 let calls=0;const started=Date.now();const b=await retrieveScenarioResearch('A Singapore event',null,undefined,{key:'mock',now,timeoutMs:25,fetcher:fake(()=>{
  calls++;return calls===1?{results:[item(1)],usage:{credits:1}}:new Promise(()=>{});
 })});
 assert.equal(calls,2);assert.equal(b.research?.stopReason,'timeout');assert.equal(b.sources.length,1);assert.ok(Date.now()-started<1000);
});

test('a research timeout without completed excerpts remains a timeout in privacy-safe diagnostics',async()=>{
 const b=await retrieveScenarioResearch('A Singapore event',null,undefined,{key:'mock',now,timeoutMs:5,fetcher:fake(()=>new Promise(()=>{}))});
 assert.equal(b.status,'failed');assert.equal(summariseRetrieval(b,10).limitation,'timeout');
});

test('external cancellation rejects and never dispatches later searches',async()=>{
 const c=new AbortController();c.abort();await assert.rejects(retrieveScenarioResearch('A Singapore event',null,c.signal,{key:'mock',fetcher:fake(()=>assert.fail('Aborted must not fetch'))}),{name:'AbortError'});
 const live=new AbortController();let calls=0;const pending=retrieveScenarioResearch('A Singapore event',null,live.signal,{key:'mock',fetcher:fake(()=>{calls++;live.abort();return new Promise(()=>{});})});
 await assert.rejects(pending,{name:'AbortError'});assert.equal(calls,1);
});

test('research metadata is strict, referentially checked and identity bound without changing legacy shape',async()=>{
 const b=await retrieveScenarioResearch('A Singapore event',null,undefined,{key:'mock',now,fetcher:fake(()=>({results:[item(1)],usage:{credits:1}}))});
 assert.deepEqual(parseGroundingBundle(b),b);
 for(const research of [{...b.research,extra:true},{...b.research,reservedCredits:31},{...b.research,queries:b.research!.queries.map((q,i)=>i===0?{...q,sourceIds:['invented']}:q)},{...b.research,stopReason:'timeout'}])assert.throws(()=>parseGroundingBundle({...b,research}));
 assert.throws(()=>createGroundingBundle({...b,usage:{...b.usage,credits:b.usage.searches*3},research:{...b.research!,queries:b.research!.queries.map(q=>({...q,credits:3}))}}));
 const {research:_,...legacyInput}=b;const legacy=createGroundingBundle(legacyInput);assert.ok(!Object.hasOwn(legacy,'research'));assert.equal(createGroundingBundle(legacy).bundleId,legacy.bundleId);assert.notEqual(legacy.bundleId,b.bundleId);
});
