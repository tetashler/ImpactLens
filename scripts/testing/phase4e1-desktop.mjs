// Execute with Playwright MCP browser_run_code_unsafe(filename: absolute path).
// Requires the guarded Phase 4E mock server, never a live provider server.
// OSM z/x/y PNG URLs receive a local transparent tile fixture: Map canvas/local geometry only.
// Optional input: window.__phase4eDesktopConfig = {url, output} on the caller's page.
// Returns safe JSON for the caller to save. The screenshot directory must exist.
async (page) => {
 const configuration=await page.evaluate(()=>{
  const c=window.__phase4eDesktopConfig??{};
  return Object.fromEntries(['url','output'].filter(k=>typeof c[k]==='string').map(k=>[k,c[k]]));
 });
 const workspace='C:/Users/tetas/OneDrive/Desktop/Kaplan/Hackathon/Hackathon2/ImpactLens';
 const defaultOutput=workspace+'/tmp/phase4e1/desktop';
 const output=(configuration.output??defaultOutput).replaceAll('\\','/').replace(/\/+$/,'');
 const ensure=(condition,code)=>{if(!condition)throw Error(code);};
 ensure(output.toLowerCase().startsWith((workspace+'/tmp/').toLowerCase())&&!output.split('/').some(p=>p==='.'||p==='..'),'OUTPUT_MUST_STAY_IN_WORKSPACE_TMP');
 const address=configuration.url??'http://127.0.0.1:3200';
 const isLocal=url=>/^https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?(?:\/|$)/i.test(url);
 const pathname=url=>url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i,'').split(/[?#]/)[0]||'/';
 ensure(/^http:\/\//.test(address)&&isLocal(address),'LOCAL_MOCK_SERVER_REQUIRED');

 const fields={
  summary:['version','kind','attemptId','requestIdentity','runId','planId','question','status','request','graph','inspections','roles','initialActions','assumptions','limitations','sources','accounting','demographics','session','society','job'],
  society:['version','runId','worldId','phase','tick','totalSteps','minutes','counts','platforms','groups','agents','links','map','usage','limitations','conversation','swarm'],
  agent:['id','roleId','label','entityType','affiliation','goal','initialPosition','position','activity','platformIds','groupCount','events','modelDecisions','ruleEvents','stateChanges','demographic','indexedExperiences','openIssues','discussion','controlMode','offeredDecisions'],
  platform:['id','entityId','name','entityType','style','adapter','participants','counts','startMinute','endMinute','themes','viewpoints','arguments','summary','limitations','discussion'],
  group:['id','name','entityType','platformId','purpose','creatorId','createdMinute','membershipPolicy','historyPolicy','sharingPolicy','members','counts','viewpoints','summary','themes','arguments','discussion'],
  swarm:['executionPolicy','version','activeAgents','llmCapableAgents','ruleDrivenAgents','offeredAgents','acceptedAgents','opportunities','acceptedDecisions','rejectedDecisions','skippedDecisions','modelAuthoredItems','ruleAuthoredItems','reads','reactions','deterministicStateChanges','maxPerAgent','maxCalls','perAgent'],
  discussion:['version','authoredItems','uniqueAuthors','modelAuthoredDecisions','classifiedDecisions','unclassifiedItems','arguments','topicCoverage','stakeholderCategories','followups','peerReplies','maxDepth','actualPositionChanges','openIssues','resolvedIssues','withdrawnIssues','timeline'],
  node:['id','label','category','entityType','description','details','provenance','properties','limitations'],
  edge:['id','source','target','relationship','relationshipLabel','description','provenance','directed'],
 };
 function object(value,allowed,required=[]){
  ensure(value&&typeof value==='object'&&!Array.isArray(value),'PUBLIC_OBJECT_REQUIRED');
  ensure(Object.keys(value).every(k=>allowed.includes(k))&&required.every(k=>Object.hasOwn(value,k)),'PUBLIC_SCHEMA_ALLOWLIST');
 }
 function discussion(value){
  if(!value)return;
  object(value,fields.discussion,fields.discussion);
  ensure(value.version===1&&Array.isArray(value.timeline)&&value.timeline.length===3,'PUBLIC_DISCUSSION_SCHEMA');
  object(value.arguments,['concern','condition','support','question','disagreement']);
  for(const t of value.timeline)object(t,['period','authoredItems','classifiedDecisions','followups','positionChanges']);
  for(const t of value.topicCoverage)object(t,['label','decisions']);
  ensure(value.authoredItems===value.classifiedDecisions+value.unclassifiedItems,'PUBLIC_DISCUSSION_COUNTS');
 }
 function validateSummary(data){
  object(data,fields.summary,fields.summary);
  ensure(data.version===3&&data.kind==='summary-execution'&&typeof data.runId==='string','PUBLIC_SUMMARY_SCHEMA');
  ensure(Array.isArray(data.initialActions)&&data.initialActions.length<=8,'PUBLIC_ACTION_BOUND');
  for(const a of data.initialActions)object(a,['id','roleId','type','round','position','previousEventIds']);
  for(const r of data.roles)object(r,['id','label','goals']);
  object(data.accounting,['planningCalls','actionCalls','inputTokens','outputTokens','costUsd']);
  if(data.session)object(data.session,['id','token','revision']);if(data.job)object(data.job,['version','id','status','tick','totalSteps','acceptedDecisions','participatingAgents','capacity','admittedCalls','remainingCalls','reason','revision']);
  object(data.graph,['version','scenarioIdentity','executionIdentity','nodes','edges','limitations']);
  ensure(data.graph.version===1&&Array.isArray(data.graph.nodes)&&data.graph.nodes.length<=1500&&Array.isArray(data.graph.edges)&&data.graph.edges.length<=6000,'PUBLIC_GRAPH_BOUND');
  const ids=new Set();
  for(const n of data.graph.nodes){
   object(n,fields.node,['id','label','category','description','provenance','properties','limitations']);
   ensure(!ids.has(n.id),'PUBLIC_GRAPH_DUPLICATE');ids.add(n.id);
   ensure(n.properties&&Object.keys(n.properties).length<=40&&Object.values(n.properties).every(v=>v===null||['string','number','boolean'].includes(typeof v)),'PUBLIC_GRAPH_PROPERTIES');
   ensure(!['event','message','social-item'].includes(n.properties.recordType),'PUBLIC_GRAPH_PRIVATE_RECORD');
  }
  for(const e of data.graph.edges){object(e,fields.edge);ensure(ids.has(e.source)&&ids.has(e.target),'PUBLIC_GRAPH_ENDPOINT');}
  for(const inspection of Object.values(data.inspections)){
   object(inspection,['version','kind','affiliation','sources','interactions','assumptions','sourceAttribution','demographicContext']);
   ensure(Array.isArray(inspection.interactions)&&inspection.interactions.length===0,'PUBLIC_INSPECTOR_TRANSCRIPT');
  }
  if(!data.society)return;
  const s=data.society;
  object(s,fields.society,['version','runId','phase','agents','platforms','groups','counts','usage']);
  ensure(s.version===2&&s.runId===data.runId&&Array.isArray(s.agents)&&s.agents.length<=100&&s.platforms.length<=4&&s.groups.length<=8,'PUBLIC_SOCIETY_SCHEMA');
  object(s.counts,['agents','events','seeds','modelEvents','ruleEvents','failureEvents']);
  object(s.usage,['calls','skipped','accepted','failed','inputTokens','outputTokens','costUsd','unknownReservedUsd']);
  for(const a of s.agents){object(a,fields.agent);discussion(a.discussion);}
  for(const p of s.platforms){object(p,fields.platform);discussion(p.discussion);ensure(typeof p.participants==='number','PUBLIC_PARTICIPANT_COUNT');}
  for(const g of s.groups){object(g,fields.group);discussion(g.discussion);ensure(typeof g.members==='number','PUBLIC_PRIVATE_MEMBERSHIP_LIST');}
  for(const link of s.links)object(link,['source','target','kind','count']);
  if(s.conversation)object(s.conversation,['opportunityTicks','eligiblePeerReplies','includedPeerReplies','omittedPeerReplies','contextOmissions','peerReplies','maxDepth','memoryLinkedDecisions']);
  if(s.swarm){
   object(s.swarm,fields.swarm,fields.swarm.filter(k=>k!=='executionPolicy'));
   ensure(s.swarm.version===1&&s.swarm.activeAgents===s.agents.length,'PUBLIC_COHORT_SCHEMA');
   for(const a of s.swarm.perAgent)object(a,['agentId','offered','accepted']);
   ensure(s.swarm.llmCapableAgents+s.swarm.ruleDrivenAgents===s.swarm.activeAgents,'PUBLIC_COHORT_COUNTS');
   ensure(s.swarm.offeredAgents<=s.swarm.llmCapableAgents&&s.swarm.acceptedAgents<=s.swarm.offeredAgents,'PUBLIC_COHORT_COVERAGE');
  }
 }

 const context=await page.context().browser().newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
 const completionTimeoutMs=240000;
 let p,latest=null,active=null,step='new-context',operation='initialise',requestedNodeId=null,explores=0,continues=0,exploreStartedAt=null,exploreToCompletionMs=null;
 const lifecycle={pause:false,resume:false,browserClosed:false,continuedWithoutBrowser:false,reconnected:false,cancel:false};const intentionallyClosedPages=new Set(),interruptedObservations=[];const errors=[],consoleErrors=[],blockedRequests=[],payloadChecks=[],payloadErrors=[],responseTasks=[],screenshots=[],performanceChecks=[];
 const cleanMessage=message=>message.includes('RAW_')?'CONVERSATION_SENTINEL_IN_BROWSER_ERROR':message.slice(0,240).replace(/token=[^\s&]+/gi,'token=[redacted]');
 function acceptLatest(value){if(!latest||value.runId!==latest.runId||(value.session?.revision??0)>=(latest.session?.revision??0))latest=value;}
 async function drain(){
  let count;do{count=responseTasks.length;await Promise.all(responseTasks.slice());}while(responseTasks.length!==count);
  const unavailable=payloadErrors.filter(e=>e.route==='/api/scenario-simulate'&&e.code==='PUBLIC_RESPONSE_BODY_UNAVAILABLE');
  if(unavailable.length){
   await p.waitForFunction(()=>window.__phase4eScenarioCapture&&!window.__phase4eScenarioCapture.pending,{},{timeout:15000});
   const captured=await p.evaluate(()=>window.__phase4eScenarioCapture);
   ensure(captured.raw===false,'PUBLIC_RESPONSE_CONVERSATION_SENTINEL');ensure(!captured.error,'SCENARIO_FETCH_CLONE_FAILED');
   ensure(captured.bytes<=3000000,'PUBLIC_RESPONSE_BOUND');ensure(captured.status>=200&&captured.status<300,'PUBLIC_RESPONSE_HTTP_ERROR');
   ensure(unavailable.length===1&&captured.status===unavailable[0].status&&captured.method===unavailable[0].method,'SCENARIO_FETCH_CLONE_RESPONSE_MISMATCH');
   validateSummary(captured.value);ensure(!latest||captured.value.runId===latest.runId,'SCENARIO_FETCH_CLONE_RUN_MISMATCH');
   payloadChecks.push({route:'/api/scenario-simulate',method:captured.method,status:captured.status,bytes:captured.bytes,containsRaw:false,capture:'browser-fetch-clone-fallback'});acceptLatest(captured.value);
   const index=payloadErrors.indexOf(unavailable[0]);payloadErrors.splice(index,1);
  }
  ensure(!payloadErrors.length,'PUBLIC_RESPONSE_AUDIT_FAILED');
 }
 async function ledger(){
  ensure(latest?.society,'PUBLIC_ACCOUNTING_UNAVAILABLE');
  return {basis:'Intercepted public summary and browser request counts',social:latest.society.usage.calls,accepted:latest.society.usage.accepted,failed:latest.society.usage.failed,actions:latest.initialActions.length,planning:latest.accounting.planningCalls,explores,continues};
 }
 async function attach(){
  await p.waitForSelector('.kg-canvas canvas');
  return p.evaluate(()=>{
   const n=document.querySelector('.kg-canvas');let f=n?.[Object.keys(n).find(k=>k.startsWith('__reactFiber'))];
   for(let d=0;f&&d<40;d++,f=f.return)for(const t of [f,f.alternate]){
    let s=t?.memoizedState;
    for(let i=0;s&&i<100;i++,s=s.next){const r=s.memoizedState?.current;if(r?.core&&typeof r.snapshot==='function'&&!r.core.destroyed()){window.__phase4eRenderer=r;const v=r.snapshot();return {nodes:v.nodes,edges:v.edges,visibleNodes:v.visibleNodes,visibleEdges:v.visibleEdges};}}
   }
   throw Error('GRAPH_RENDERER_UNAVAILABLE');
  });
 }
 async function settled(){await p.waitForFunction(()=>{const v=window.__phase4eRenderer?.snapshot();return v&&!v.physics.running&&v.physics.alphaTarget===0&&v.physics.alpha<.001;},{},{timeout:20000});}
 async function sampleFrames(){
  return p.evaluate(()=>new Promise(resolve=>{
   const start=performance.now();let frames=0,previous=start,longestGapMs=0,finished=false;
   const done=timedOut=>{if(finished)return;finished=true;resolve({basis:'Local observed browser frame cadence after graph settling',frames,elapsedMs:performance.now()-start,longestGapMs,timedOut});};
   const frame=now=>{if(finished)return;frames++;longestGapMs=Math.max(longestGapMs,now-previous);previous=now;if(now-start>=500)done(false);else requestAnimationFrame(frame);};
   requestAnimationFrame(frame);setTimeout(()=>done(true),1500);
  }));
 }
 async function privacy(){
  await drain();
  const result=await p.evaluate(()=>{
   let sentinelLeaks=0,privateShapes=0,plainObjects=0;const seen=new WeakSet();
   const visit=(v,depth=0)=>{
    if(typeof v==='string'){if(v.includes('RAW_'))sentinelLeaks++;return;}
    if(!v||typeof v!=='object'||depth>48||seen.has(v)||plainObjects>=300000)return;
    const proto=Object.getPrototypeOf(v);if(!Array.isArray(v)&&proto!==Object.prototype&&proto!==null)return;
    seen.add(v);plainObjects++;
    if(Object.hasOwn(v,'genesis')||Array.isArray(v.memories)||Array.isArray(v.items)&&v.items.some(i=>i&&typeof i.text==='string')||Array.isArray(v.events)&&v.events.some(e=>e&&typeof e.statement==='string'))privateShapes++;
    for(const child of Object.values(v))visit(child,depth+1);
   };
   visit(document.documentElement.outerHTML);
   visit(window.__phase4eScenarioCapture);
   for(const storage of [localStorage,sessionStorage])for(let i=0;i<storage.length;i++){const text=storage.getItem(storage.key(i));visit(text);try{visit(JSON.parse(text));}catch{}}
   for(const el of document.querySelectorAll('*')){
    const props=Object.keys(el).find(k=>k.startsWith('__reactProps'));if(props)visit(el[props]);
    let f=el[Object.keys(el).find(k=>k.startsWith('__reactFiber'))];
    for(let d=0;f&&d<4;d++,f=f.return)for(const t of [f,f.alternate]){
     visit(t?.memoizedProps);let h=t?.memoizedState;for(let i=0;h&&i<100;i++,h=h.next)visit(h.memoizedState);
    }
   }
   const renderer=window.__phase4eRenderer;if(renderer&&!renderer.core.destroyed())visit(renderer.core.json());
   return {sentinelLeaks,privateShapes,plainObjects,storageEntries:localStorage.length+sessionStorage.length};
  });
  ensure(result.sentinelLeaks===0&&result.privateShapes===0,'CLIENT_STATE_PRIVATE_CONTENT');
  return result;
 }
 async function screenshot(name,fullPage=false){
  await privacy();const filename=`cohort-${active}-${name}.png`;
  await p.screenshot({path:output+'/'+filename,fullPage});screenshots.push(filename);
 }
 async function noOverflow(){ensure(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),'DESKTOP_HORIZONTAL_OVERFLOW');}
 const search=()=>p.getByRole('searchbox',{name:'Search graph',exact:true});
 async function closeInspector(){const button=p.getByRole('button',{name:'Close inspector',exact:true});if(await button.count())await button.click();}
 async function choose(node,keyboard=false){
  requestedNodeId=node.id;operation='search-fill';await search().fill(node.id);
  const button=p.locator('.kg-search-results button[data-entity-id="'+node.id+'"]');operation='search-result-wait';await button.waitFor();
  operation='search-select';if(keyboard){await button.focus();await p.keyboard.press('Enter');}else await button.click();
  operation='inspector-heading';await p.locator('.kg-inspector h2').filter({hasText:node.label}).waitFor();
  operation='canonical-node-focus';
  await p.waitForFunction(id=>{const n=window.__phase4eRenderer?.core.getElementById(id);return n&&!n.hasClass('kg-hidden')&&n.hasClass('focused');},node.id);
 }

 try{
  await context.route('**/*',async route=>{
   const url=route.request().url();
   if(route.request().method()==='GET'&&/^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/.test(url)){
    blockedRequests.push({host:'tile.openstreetmap.org',method:'GET',fixture:true});
    await route.fulfill({path:output+'/offline-tile.png',contentType:'image/png'});return;
   }
   if(/^(?:data|blob|about):/.test(url)||isLocal(url)){await route.continue();return;}
   const host=(url.match(/^[a-z][a-z0-9+.-]*:\/\/([^/]+)/i)?.[1]??'nonlocal').split('@').at(-1);
   blockedRequests.push({host,method:route.request().method()});await route.abort('blockedbyclient');
  });
  p=await context.newPage();p.setDefaultTimeout(15000);p.setDefaultNavigationTimeout(45000);
  await context.addInitScript(()=>{
   const original=window.fetch;
   window.fetch=async function(...args){
    const response=await original.apply(this,args);
    const input=args[0],url=new URL(typeof input==='string'?input:input.url,location.href);
    if(url.pathname==='/api/scenario-simulate'&&!window.__phase4eScenarioCapture){
     const method=String(args[1]?.method??(typeof input==='object'?input.method:undefined)??'GET').toUpperCase(),status=response.status;
     window.__phase4eScenarioCapture={pending:true};
     void response.clone().text().then(text=>{
      const raw=text.includes('RAW_'),bytes=new TextEncoder().encode(text).byteLength;
      if(raw){window.__phase4eScenarioCapture={pending:false,raw:true,bytes,status,method};return;}
      try{window.__phase4eScenarioCapture={pending:false,raw:false,bytes,status,method,value:JSON.parse(text)};}
      catch{window.__phase4eScenarioCapture={pending:false,raw:false,bytes,status,method,error:'SCENARIO_FETCH_CLONE_JSON_INVALID'};}
     }).catch(()=>{window.__phase4eScenarioCapture={pending:false,raw:false,status,method,error:'SCENARIO_FETCH_CLONE_BODY_UNAVAILABLE'};});
    }
    return response;
   };
  });
  function watchPage(p){
  p.on('pageerror',error=>errors.push(cleanMessage(error.message)));
  p.on('console',message=>{if(message.type()==='error')consoleErrors.push(cleanMessage(message.text()));});
  p.on('request',request=>{
   const routePath=pathname(request.url());
   if(request.method()==='POST'&&routePath==='/api/scenario-simulate')explores++;
   if(request.method()==='POST'&&routePath==='/api/social-simulate'){try{if(request.postDataJSON()?.operation==='continue')continues++;}catch{}}
  });
  p.on('response',response=>{
   const routePath=pathname(response.url());if(!['/api/scenario-simulate','/api/social-simulate'].includes(routePath))return;
   responseTasks.push((async()=>{
    let text;try{text=await response.text();}catch{if(intentionallyClosedPages.has(p)&&response.request().method()==='GET'&&/[?&]operation=status(?:&|$)/.test(response.url())){interruptedObservations.push({route:routePath,method:'GET',reason:'INTENTIONAL_BROWSER_CLOSE_STATUS_BODY_UNAVAILABLE'});return;}throw Error('PUBLIC_RESPONSE_BODY_UNAVAILABLE');}
    const bytes=Array.from(text).reduce((sum,c)=>sum+(c.codePointAt(0)>65535?4:c.codePointAt(0)>2047?3:c.codePointAt(0)>127?2:1),0),raw=text.includes('RAW_');
    payloadChecks.push({route:routePath,method:response.request().method(),status:response.status(),bytes,containsRaw:raw});
    ensure(!raw,'PUBLIC_RESPONSE_CONVERSATION_SENTINEL');ensure(bytes<=3000000,'PUBLIC_RESPONSE_BOUND');
    ensure(response.ok(),'PUBLIC_RESPONSE_HTTP_ERROR');let value;try{value=JSON.parse(text);}catch{throw Error('PUBLIC_RESPONSE_JSON_INVALID');}if(value.kind==='society-job-status'){object(value,['version','kind','runId','job']);object(value.job,['version','id','status','tick','totalSteps','acceptedDecisions','participatingAgents','capacity','admittedCalls','remainingCalls','reason','revision']);}else{validateSummary(value);acceptLatest(value);}
   })().catch(error=>{payloadErrors.push({route:routePath,method:response.request().method(),status:response.status(),code:/^[A-Z_]+$/.test(error.message)?error.message:'PUBLIC_RESPONSE_PARSE_FAILED'});}));
  });

  }
  watchPage(p);

  step='map-explore';await p.goto(address);
  await p.getByRole('textbox',{name:'Your scenario question',exact:true}).fill('What if Singapore introduces a four-day workweek?');
  exploreStartedAt=Date.now();
  await p.getByRole('button',{name:'Explore',exact:true}).click();
  step='job-lifecycle';operation='pause-button-ready';await p.getByRole('button',{name:'Pause background job',exact:true}).waitFor();await p.waitForTimeout(1000);await drain();
  operation='pause-control';await p.getByRole('button',{name:'Pause background job',exact:true}).click();await p.waitForFunction(()=>document.body.innerText.includes('Background communication: paused'));await drain();lifecycle.pause=true;
  const paused=latest;ensure(paused?.job?.status==='paused','PAUSE_CONTROL_NOT_DURABLE');
  const statusAddress=address+'/api/social-simulate?operation=status&runId='+encodeURIComponent(paused.runId)+'&token='+paused.session.token;
  operation='verify-paused-status';await p.waitForTimeout(200);const stillPaused=await (await context.request.get(statusAddress)).json();ensure(stillPaused.job.status==='paused'&&stillPaused.job.acceptedDecisions===paused.job.acceptedDecisions,'PAUSE_DISPATCHED_MORE_WORK');
  operation='resume-control';await p.getByRole('button',{name:'Resume background job',exact:true}).click();await p.waitForFunction(()=>document.body.innerText.includes('Background communication: running'));await drain();lifecycle.resume=true;
  operation='browser-close';await drain();const beforeClose=latest.job.acceptedDecisions,ownedRun=latest.runId;intentionallyClosedPages.add(p);await p.close();lifecycle.browserClosed=true;await page.waitForTimeout(1000);
  operation='verify-without-browser';const withoutBrowser=await (await context.request.get(statusAddress)).json();ensure(withoutBrowser.job.acceptedDecisions>beforeClose,'JOB_DID_NOT_CONTINUE_WITHOUT_BROWSER');lifecycle.continuedWithoutBrowser=true;
  operation='reconnect-page';p=await context.newPage();p.setDefaultTimeout(15000);p.setDefaultNavigationTimeout(45000);watchPage(p);await p.goto(address);await p.locator('.map-history > summary').click();const reconnect=p.getByRole('combobox',{name:'Recorded explorations',exact:true});operation='reconnect-option-attached';await reconnect.locator('option[value="'+ownedRun+'"]').waitFor({state:'attached'});operation='reconnect-select-run';await reconnect.selectOption(ownedRun);lifecycle.reconnected=true;
  operation='await-managed-completion';await p.waitForFunction(()=>document.body.innerText.includes('Background communication: completed'),{},{timeout:completionTimeoutMs});await drain();exploreToCompletionMs=Date.now()-exploreStartedAt;
  ensure(latest?.society?.phase==='completed'&&latest.society.swarm,'COMPLETED_SWARM_SUMMARY_REQUIRED');
  const initial=latest,s=initial.society,swarm=s.swarm;ensure(initial.job?.status==='completed','MANAGED_JOB_NOT_COMPLETED');ensure(continues===0,'BROWSER_MUST_NOT_DRIVE_DEEP_JOB');active=swarm.activeAgents;
  ensure(active===50||active===100,'EXPECTED_50_OR_100_ACTIVE_AGENTS');
  const expectedCapacity=active===50?350:700,expectedCalls=s.usage.calls,expectedCapable=active===50?35:70;
  ensure(s.counts.agents===active&&swarm.llmCapableAgents===expectedCapable&&swarm.maxCalls===expectedCapacity,'COHORT_CONFIGURATION_MISMATCH');
  ensure(s.usage.calls>expectedCapable&&s.usage.accepted===expectedCalls&&swarm.acceptedDecisions===expectedCalls&&s.usage.failed===0,'MOCK_DECISION_TOTAL_MISMATCH');
  ensure(s.tick===80&&s.totalSteps===80&&initial.initialActions.length===8,'FIXTURE_CLOCK_OR_INITIAL_ACTIONS');
  ensure(swarm.offeredAgents>active/2&&swarm.acceptedAgents>active/2,'MAJORITY_DECISION_COVERAGE');
  const recordedLedger=await ledger();ensure(recordedLedger.social===expectedCalls&&recordedLedger.actions===8,'MOCK_LEDGER_COMPLETION_TOTALS');
  ensure(explores===1,'EXACTLY_ONE_EXPLORE_REQUIRED');
  const primary=initial.graph.nodes.filter(n=>n.properties.presentationPrimary!==false),people=initial.graph.nodes.filter(n=>n.properties.agentId!==undefined);
  const hidden=people.filter(n=>n.properties.presentationPrimary===false),roles=initial.graph.nodes.filter(n=>n.properties.roleId&&!n.properties.agentId);
  const roleAgents=people.filter(n=>n.properties.roleId),groups=initial.graph.nodes.filter(n=>n.properties.recordType==='fictional-messaging-group').sort((a,b)=>Number(b.properties.messages??0)+Number(b.properties.replies??0)-Number(a.properties.messages??0)-Number(a.properties.replies??0)||a.id.localeCompare(b.id)),aggregate=initial.graph.nodes.find(n=>n.properties.recordType==='fictional-agent-aggregate');
  const institutions=['Ministry of Manpower','National Trades Union Congress','Singapore National Employers Federation'].map(label=>initial.graph.nodes.find(n=>n.label===label));
  ensure(institutions.every(n=>n?.properties.presentationPrimary!==false&&n?.properties.presentationCategory==='entity'),'PRIMARY_INSTITUTIONS_MISSING');
  ensure(roles.length===initial.roles.length&&roleAgents.length===initial.roles.length,'SCENARIO_ROLES_NOT_RETAINED');
  ensure(people.length===active&&hidden.length>0&&hidden.length<active&&aggregate&&aggregate.properties.members===hidden.length,'SAFE_CANDIDATES_OR_AGGREGATE_COUNT');
  ensure(groups.length===s.groups.length&&groups.length>=2&&s.platforms.length===4,'COMMUNICATION_ENTITIES_MISSING');
  ensure(people.filter(n=>!n.properties.roleId&&n.properties.presentationPrimary!==false).length<=12,'DEFAULT_PERSON_PRESENTATION_UNBOUNDED');
  ensure(!await p.getByRole('button',{name:'Social Simulation',exact:true}).count(),'REMOVED_SOCIAL_TAB_RETURNED');
  await p.getByRole('button',{name:'Map',exact:true}).click();const mapCanvas=await p.locator('.maplibregl-canvas').count();ensure(mapCanvas>0,'MAP_CANVAS_UNAVAILABLE');
  await screenshot('map-1440');

  step='initial-graph';const initialGraphStart=Date.now();await p.getByRole('button',{name:'Knowledge Graph',exact:true}).click();const rendered=await attach(),initialClickToCanvasMs=Date.now()-initialGraphStart;await settled();
  ensure(rendered.nodes===initial.graph.nodes.length&&rendered.visibleNodes===primary.length,'PRIMARY_CANVAS_VISIBILITY');
  const hiddenAgent=hidden.find(n=>initial.graph.edges.some(e=>e.source===n.id||e.target===n.id))??hidden[0];
  step='hidden-agent-search';const filter=p.locator('.kg-filters label').filter({has:p.getByText(hiddenAgent.entityType,{exact:true})}).locator('input');
  ensure(await filter.count()===1,'HIDDEN_AGENT_TYPE_FILTER_UNAVAILABLE');await filter.uncheck();
  const beforeDiscovery=await p.evaluate(()=>JSON.stringify(window.__phase4eRenderer.snapshot().positions));
  await search().fill(hiddenAgent.id);await p.locator('.kg-search-results button[data-entity-id="'+hiddenAgent.id+'"]') .waitFor();
  ensure(await p.evaluate(id=>window.__phase4eRenderer.core.getElementById(id).hasClass('kg-hidden'),hiddenAgent.id),'TYPE_FILTER_DID_NOT_HIDE_AGENT');
  await choose(hiddenAgent,true);ensure(await filter.isChecked(),'SEARCH_DID_NOT_RESTORE_TYPE_FILTER');
  ensure(beforeDiscovery===await p.evaluate(()=>JSON.stringify(window.__phase4eRenderer.snapshot().positions)),'SEARCH_CHANGED_STABLE_POSITIONS');
  await screenshot('hidden-agent-search-1440');
  await p.getByRole('button',{name:'Expand inspector',exact:true}).click();
  const connection=initial.graph.edges.find(e=>e.source===hiddenAgent.id&&e.target!==hiddenAgent.id||e.target===hiddenAgent.id&&e.source!==hiddenAgent.id);
  let neighborFocus=false;
  if(connection){
   const id=connection.source===hiddenAgent.id?connection.target:connection.source,neighbor=initial.graph.nodes.find(n=>n.id===id);
   const button=p.locator('.kg-inspector .kg-relationships .kg-related').filter({hasText:neighbor.label}).first();
   if(await button.count()){await button.click();await p.waitForFunction(id=>window.__phase4eRenderer.core.getElementById(id).hasClass('focused'),id);neighborFocus=true;}
  }
  await closeInspector();await search().fill('');await p.getByRole('button',{name:'Reset Focus',exact:true}).click();

  const inspectorChecks=[],reportChecks=[];
  for(const [width,height]of [[1440,900],[1920,1080]]){
   step=`desktop-${width}`;await p.setViewportSize({width,height});await p.getByRole('button',{name:'Report',exact:true}).click();const canvasStart=Date.now();await p.getByRole('button',{name:'Knowledge Graph',exact:true}).click();await attach();const clickToCanvasMs=Date.now()-canvasStart;await settled();await p.getByRole('button',{name:'Fit Graph',exact:true}).click();await noOverflow();performanceChecks.push({width,height,clickToCanvasMs,readinessBasis:'Local observed warm tab click to existing graph canvas',frameCadence:await sampleFrames()});await screenshot(`graph-${width}`);
   for(const [kind,node]of [['institution',institutions[0]],['platform',initial.graph.nodes.find(n=>n.properties.recordType==='communication-platform')],['group',groups[0]],['agent',roleAgents[0]],['aggregate',aggregate]]){
    step=`inspect-${kind}-${width}`;ensure(node,'INSPECTOR_CANDIDATE_MISSING');await choose(node);operation='expand-inspector';await p.getByRole('button',{name:'Expand inspector',exact:true}).click();
    const inspector=p.getByRole('complementary',{name:'Expanded inspector',exact:true});
    ensure((await inspector.innerText()).includes(node.label),'INSPECTOR_IDENTITY_MISMATCH');
    if(['platform','group'].includes(kind))ensure(await inspector.getByRole('heading',{name:'Recorded discussion summary',exact:true}).count(),'SAFE_DISCUSSION_SUMMARY_MISSING');
    const expectedCount=kind==='aggregate'?node.properties.members:kind==='agent'?node.properties.modelDecisions:null;
    if(expectedCount!==null){operation='read-inspector-grounded-count';const label=kind==='aggregate'?'Members':'Model Decisions';const count=await inspector.locator('.kg-properties > div').filter({has:p.getByText(label,{exact:true})}).locator('dd').innerText();ensure(Number(count.replaceAll(',',''))===expectedCount,'INSPECTOR_GROUNDED_COUNT_MISMATCH');}
    if(kind==='platform'&&width===1440){
     await p.getByRole('button',{name:'Full-window details',exact:true}).click();await p.locator('.kg-full-dialog').waitFor({state:'visible'});await p.keyboard.press('Escape');await p.locator('.kg-full-dialog').waitFor({state:'hidden'});
     await p.waitForFunction(()=>document.activeElement?.textContent==='Full-window details');
    }
    await screenshot(`${kind}-${width}`);inspectorChecks.push({kind,width,groundedCount:expectedCount,summary:['platform','group'].includes(kind)});await closeInspector();await search().fill('');
   }
   step=`report-${width}`;await p.getByRole('button',{name:'Report',exact:true}).click();await p.getByRole('heading',{name:'Recorded fictional communication',exact:true}).waitFor();
   const cohort=p.getByRole('region',{name:'Fictional agent cohort',exact:true});
   const tiles=await cohort.locator('.society-summary-grid > div').evaluateAll(nodes=>nodes.map(n=>({count:Number(n.querySelector('strong').textContent),label:n.querySelector('span').textContent})));
   ensure(JSON.stringify(tiles.map(t=>t.count))===JSON.stringify([active,swarm.llmCapableAgents,swarm.offeredAgents,swarm.acceptedAgents]),'REPORT_COHORT_COUNTS_MISMATCH');
   const text=await cohort.innerText();
   for(const phrase of [`${swarm.modelAuthoredItems} model-authored / ${swarm.ruleAuthoredItems} rule-authored`,`${swarm.reads} reads`,`${swarm.reactions} reactions`,`${swarm.acceptedDecisions} accepted decisions`])ensure(text.includes(phrase),'REPORT_ACTIVITY_COUNTS_MISMATCH');
   ensure(text.includes('Capability does not mean a call was made'),'REPORT_CAPABILITY_DISTINCTION_MISSING');
   ensure(await p.locator('caption').filter({hasText:'Development over simulated time'}).count(),'DISCUSSION_TIMELINE_MISSING');
   await noOverflow();await p.evaluate(()=>window.scrollTo(0,0));await screenshot(`report-${width}`,true);reportChecks.push({width,active,capable:swarm.llmCapableAgents,offered:swarm.offeredAgents,accepted:swarm.acceptedAgents});
   await p.getByRole('button',{name:'Knowledge Graph',exact:true}).click();await attach();
  }

  step='mouse-drag';await closeInspector();await search().fill('');await p.getByRole('button',{name:'Reset Focus',exact:true}).click();await p.getByRole('button',{name:'Fit Graph',exact:true}).click();await settled();
  const box=await p.locator('.kg-canvas').boundingBox();ensure(box,'GRAPH_CANVAS_BOUNDS');
  const drag=await p.evaluate(()=>{
   const r=window.__phase4eRenderer,host=document.querySelector('.kg-canvas'),bounds=host.getBoundingClientRect();
   const candidates=r.core.nodes().not('.kg-hidden').filter(n=>n.connectedEdges().not('.kg-hidden').length>0&&n.neighborhood('node').not('.kg-hidden').length>0);
   const node=candidates.find(n=>{const q=n.renderedPosition();if(q.x<40||q.x>bounds.width-150||q.y<110||q.y>bounds.height-170)return false;const hit=document.elementFromPoint(bounds.x+q.x,bounds.y+q.y);return hit?.tagName==='CANVAS'&&host.contains(hit);});
   if(!node)throw Error('VISIBLE_CONNECTED_DRAG_TARGET_MISSING');
   window.__phase4eBeforeDrag=r.snapshot().positions;window.__phase4eDragNeighbors=node.neighborhood('node').not('.kg-hidden').map(n=>n.id());
   return {id:node.id(),...node.renderedPosition()};
  });
  await p.mouse.move(box.x+drag.x,box.y+drag.y);await p.mouse.down();await p.mouse.move(box.x+drag.x+90,box.y+drag.y+55,{steps:14});await p.waitForTimeout(180);
  const during=await p.evaluate(id=>{const r=window.__phase4eRenderer,before=window.__phase4eBeforeDrag.find(n=>n.id===id),n=r.core.getElementById(id);return {distance:Math.hypot(before.x-n.position('x'),before.y-n.position('y')),alphaTarget:r.snapshot().physics.alphaTarget};},drag.id);
  ensure(during.distance>20&&during.alphaTarget>0,'MOUSE_DRAG_DID_NOT_PIN_AND_REHEAT');await screenshot('drag-1920');await p.mouse.up();await settled();
  const motion=await p.evaluate(()=>{
   const r=window.__phase4eRenderer,before=new Map(window.__phase4eBeforeDrag.map(n=>[n.id,n])),after=r.snapshot();
   return {movedNeighbors:after.positions.filter(n=>window.__phase4eDragNeighbors.includes(n.id)&&Math.hypot(n.x-before.get(n.id).x,n.y-before.get(n.id).y)>1).length,physics:after.physics};
  });
  ensure(motion.movedNeighbors>0&&!motion.physics.running,'CONNECTED_NEIGHBORS_OR_SETTLING_FAILED');
  const stable=await p.evaluate(()=>JSON.stringify(window.__phase4eRenderer.snapshot().positions));await p.waitForTimeout(250);
  ensure(stable===await p.evaluate(()=>JSON.stringify(window.__phase4eRenderer.snapshot().positions)),'SETTLED_POSITIONS_STILL_MOVING');await screenshot('settled-1920');

  step='navigation-retention';await search().fill(institutions[0].id);
  const navFilter=p.locator('.kg-filters input[type=checkbox]').last();await navFilter.uncheck();
  const state=()=>p.evaluate(()=>{const r=window.__phase4eRenderer,v=r.snapshot();return JSON.stringify({positions:v.positions,zoom:v.zoom,pan:v.pan,query:document.querySelector('.kg-search input').value,filters:[...document.querySelectorAll('.kg-filters input')].map(n=>n.checked)});});
  const beforeNavigation=await state();await p.getByRole('button',{name:'Report',exact:true}).click();await p.getByRole('button',{name:'Map',exact:true}).click();await p.getByRole('button',{name:'Knowledge Graph',exact:true}).click();await attach();
  const positionsRetained=beforeNavigation===await state();ensure(positionsRetained,'NAVIGATION_CHANGED_GRAPH_STATE');await navFilter.check();await search().fill('');
  const clientPrivacy=await privacy();

  step='history-restore';const beforeRestore={explores,continues,ledger:await ledger(),runId:initial.runId,calls:s.usage.calls};
  await p.reload();await p.locator('.map-history > summary').click();const history=p.getByRole('combobox',{name:'Recorded explorations',exact:true});await history.waitFor();
  const options=await history.locator('option').evaluateAll(nodes=>nodes.map(n=>n.value));ensure(options.includes(initial.runId),'SAVED_RUN_IDENTITY_MISSING');
  const restoreResponse=p.waitForResponse(response=>pathname(response.url())==='/api/social-simulate'&&response.request().method()==='GET'&&response.ok(),{timeout:15000});await history.selectOption(initial.runId);
  await p.getByRole('button',{name:'Report',exact:true}).click();await p.getByRole('heading',{name:'Recorded fictional communication',exact:true}).waitFor();
  await restoreResponse;await drain();
  ensure(latest.runId===initial.runId&&latest.society.phase==='completed'&&latest.society.usage.calls===beforeRestore.calls,'RESTORE_CHANGED_SUMMARY_IDENTITY');
  const restoredLedger=await ledger();ensure(explores===beforeRestore.explores&&continues===beforeRestore.continues&&JSON.stringify(restoredLedger)===JSON.stringify(beforeRestore.ledger),'RESTORE_DISPATCHED_WORK');
  await screenshot('restored-report-1920',true);const restoredPrivacy=await privacy();ensure(errors.length===0,'UNEXPECTED_BROWSER_ERROR');ensure(consoleErrors.length===0,'UNEXPECTED_BROWSER_CONSOLE_ERROR');
  step='cancel-control';await p.getByRole('button',{name:'Map',exact:true}).click();await p.getByRole('textbox',{name:'Your scenario question',exact:true}).fill('What if Singapore introduces a four-day workweek?');await p.getByRole('button',{name:'Explore',exact:true}).click();await p.getByRole('button',{name:'Cancel background job',exact:true}).waitFor();await p.getByRole('button',{name:'Cancel background job',exact:true}).click();await p.waitForFunction(()=>document.body.innerText.includes('Background communication: cancelled'));await drain();const cancelled=latest;ensure(cancelled.runId!==initial.runId&&cancelled.job.status==='cancelled','CANCEL_JOB_NOT_DISTINCT_OR_DURABLE');const cancelStatusAddress=address+'/api/social-simulate?operation=status&runId='+encodeURIComponent(cancelled.runId)+'&token='+cancelled.session.token;await p.waitForTimeout(200);const cancelStatus=await (await context.request.get(cancelStatusAddress)).json();ensure(cancelStatus.job.acceptedDecisions===cancelled.job.acceptedDecisions,'CANCEL_REDISPATCHED_INFERENCE');lifecycle.cancel=true;
  const result={version:1,lifecycle,interruptedObservations,evidence:'MOCKED DESKTOP ONLY — no paid dispatch',runId:initial.runId,activeAgents:active,reasoningCapacity:expectedCapacity,llmCapableAgents:swarm.llmCapableAgents,offeredAgents:swarm.offeredAgents,acceptedAgents:swarm.acceptedAgents,expectedCalls,socialCalls:s.usage.calls,acceptedDecisions:swarm.acceptedDecisions,initialActions:initial.initialActions.length,clock:{tick:s.tick,totalSteps:s.totalSteps},counts:s.counts,authored:{model:swarm.modelAuthoredItems,rule:swarm.ruleAuthoredItems,reads:swarm.reads,reactions:swarm.reactions},graph:{nodes:initial.graph.nodes.length,edges:initial.graph.edges.length,primary:primary.length,personCandidates:people.length,hiddenCandidates:hidden.length,scenarioRoles:roles.length,roleAgents:roleAgents.length,institutions:institutions.map(n=>n.label),groups:groups.length,aggregateMembers:aggregate.properties.members,rendered},desktopSizes:[[1440,900],[1920,1080]],mapCanvas,keyboardSelection:true,hiddenSearchRestoredFilter:true,neighborFocus,inspectorChecks,reportChecks,motion,positionsRetained,restored:true,requests:{explores,continues},provider:{beforeRestore:recordedLedger,afterRestore:restoredLedger},privacy:{payloadsChecked:payloadChecks.length,client:clientPrivacy,restored:restoredPrivacy},payloadChecks,blockedRequests,screenshots,errors,consoleErrors};
  result.success=true;result.mapFixture={basis:'Offline transparent basemap tiles; Map canvas and local geometry only',externalTileRequestsDispatched:0,fixtureTileResponses:blockedRequests.filter(r=>r.fixture===true).length};result.performance={basis:'Local mocked browser observations; provider latency is not measured',exploreToCompletionMs,completionTimeoutMs,initialClickToCanvasMs,viewports:performanceChecks};ensure(!JSON.stringify(result).includes('RAW_'),'RESULT_MUST_BE_SAFE');return result;
 }catch(error){
  let technical={operation,errorType:['Error','TimeoutError','TypeError','ReferenceError'].includes(error.name)?error.name:'BrowserError',reason:/timeout|exceeded/i.test(error.message)?'BROWSER_TIMEOUT':/strict mode violation/i.test(error.message)?'AMBIGUOUS_LOCATOR':'BROWSER_OPERATION_ERROR'};
  if(p)try{technical={...technical,...await p.evaluate(id=>{
   const inspector=document.querySelector('.kg-inspector'),r=window.__phase4eRenderer,n=id&&r&&!r.core.destroyed()?r.core.getElementById(id):null;
   const labels=[...(inspector?.querySelectorAll('.kg-properties dt')??[])].map(n=>n.textContent);
   return {inspectorOpen:!!inspector,propertyRows:labels.length,modelDecisionLabelMatches:labels.filter(s=>s==='Model Decisions').length,membersLabelMatches:labels.filter(s=>s==='Members').length,requestedNodeFocused:!!n?.hasClass('focused'),requestedNodeVisible:!!n&&!n.empty()&&!n.hasClass('kg-hidden'),requestedResultMatches:id?[...document.querySelectorAll('.kg-search-results button')].filter(n=>n.getAttribute('data-entity-id')===id).length:0};
  },requestedNodeId)};}catch{technical={...technical,diagnosticCode:'DOM_DIAGNOSTICS_UNAVAILABLE'};}
  if(p)try{await privacy();const name=`cohort-${active??'unknown'}-failure.png`;await p.screenshot({path:output+'/'+name});screenshots.push(name);}catch{technical={...technical,screenshotCode:'PRIVACY_CHECK_OR_CAPTURE_UNAVAILABLE'};}
  const progress={phase:latest?.society?.phase??null,tick:latest?.society?.tick??null,totalSteps:latest?.society?.totalSteps??null,activeAgents:latest?.society?.swarm?.activeAgents??latest?.society?.counts?.agents??null,socialCalls:latest?.society?.usage?.calls??null,acceptedDecisions:latest?.society?.usage?.accepted??null,failedDecisions:latest?.society?.usage?.failed??null,recordedEvents:latest?.society?.counts?.events??null,completionTimeoutMs,exploreElapsedMs:exploreStartedAt===null?null:Date.now()-exploreStartedAt};
  const failure={version:1,lifecycle,interruptedObservations,evidence:'MOCKED DESKTOP ONLY',step,activeAgents:active??progress.activeAgents,errorCode:/^[A-Z_]+$/.test(error.message)?error.message:'BROWSER_OPERATION_FAILED',technical,progress,requests:{explores,continues},payloadChecks:payloadChecks.map(({containsRaw,...safe})=>({...safe,sentinelLeak:containsRaw})),payloadErrors,errors,consoleErrors,blockedRequests,screenshots};
  return {success:false,...failure};
 }finally{await context.close();}
}
