// Execute with Playwright MCP browser_run_code_unsafe(filename: absolute path).
// Requires phase4d-mock-server.ps1: dummy credentials, fixture adapters, external-server fetch blocked.
async (page) => {
 const out='C:/Users/tetas/OneDrive/Desktop/Kaplan/Hackathon/Hackathon2/ImpactLens/tmp/phase4d';
 const context=await page.context().browser().newContext({viewport:{width:1440,height:900}}),p=await context.newPage();
 const errors=[],consoleErrors=[],payloadChecks=[],responseTasks=[];let latest=null,explores=0;
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
 await p.addInitScript(()=>{
  window.__phase4dAudit=[];window.__phase4dLatest=null;
  const original=window.fetch;
  window.fetch=async(...args)=>{const response=await original(...args);const url=new URL(typeof args[0]==='string'?args[0]:args[0].url,location.href);
   if(/\/api\/(scenario-simulate|social-simulate)/.test(url.pathname)){
    const body=await response.clone().text();const raw=body.includes('RAW_');const data=JSON.parse(body);
    window.__phase4dAudit.push({route:url.pathname,status:response.status,bytes:body.length,containsRaw:raw});
    if(!raw&&data.kind==='summary-execution')window.__phase4dLatest={runId:data.runId,initialActions:data.initialActions.map(a=>({id:a.id})),graph:{nodes:data.graph.nodes.map(n=>({id:n.id,label:n.label,properties:{recordType:n.properties.recordType}})),edges:data.graph.edges.map(e=>({id:e.id}))},society:{phase:data.society?.phase,usage:data.society?.usage,counts:data.society?.counts,platforms:data.society?.platforms.map(p=>({id:p.id,name:p.name})),groups:data.society?.groups.map(g=>({id:g.id,name:g.name})),conversation:data.society?.conversation}};
   }
   return response;
  };
 });
 p.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/api/scenario-simulate'))explores++;});
 const attach=()=>p.evaluate(()=>{const n=document.querySelector('.kg-canvas');let f=n?.[Object.keys(n).find(k=>k.startsWith('__reactFiber'))];for(let d=0;f&&d<40;d++,f=f.return)for(const t of [f,f.alternate]){let s=t?.memoizedState;for(let i=0;s&&i<100;i++,s=s.next){const r=s.memoizedState?.current;if(r?.core&&typeof r.snapshot==='function'&&!r.core.destroyed()){window.__phase4dRenderer=r;return {nodes:r.snapshot().nodes,edges:r.snapshot().edges};}}}throw Error('Graph renderer unavailable');});
 await p.goto('http://127.0.0.1:3196');
 await p.getByRole('textbox',{name:'Your scenario question',exact:true}).fill('What if Singapore introduces a four-day workweek?');
 await p.getByRole('button',{name:'Explore',exact:true}).click();
 await p.waitForFunction(()=>document.body.innerText.includes('Background communication: completed'),{},{timeout:60000});
 latest=await p.evaluate(()=>window.__phase4dLatest);payloadChecks.push(...await p.evaluate(()=>window.__phase4dAudit));if(payloadChecks.some(p=>p.containsRaw))throw Error('CONVERSATION_SENTINEL_DELIVERED');if(!latest||latest.society.usage.accepted!==8||latest.initialActions.length!==8)throw Error('Incomplete fixture integration');
 const originalRun=latest.runId,counts=latest.society.counts,graphCounts={nodes:latest.graph.nodes.length,edges:latest.graph.edges.length};
 if(await p.getByRole('button',{name:'Social Simulation',exact:true}).count())throw Error('Removed navigation returned');
 const mapCanvas=await p.locator('.maplibregl-canvas').count();await p.screenshot({path:out+'/map-1440.png'});
 await p.getByRole('button',{name:'Knowledge Graph',exact:true}).click();await p.waitForSelector('.kg-canvas canvas');await p.waitForTimeout(3500);const rendered=await attach();
 const screenshots=[];
 for(const [width,height]of [[1440,900],[1920,1080]]){
  await p.setViewportSize({width,height});await p.getByRole('button',{name:'Fit Graph',exact:true}).click();
  if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Desktop overflow');
  await p.screenshot({path:out+`/graph-${width}.png`});
  for(const [kind,filename]of [['communication-platform','platform'],['fictional-messaging-group','group'],['fictional-agent','agent']]){
   const node=latest.graph.nodes.find(n=>n.properties.recordType===kind);if(!node)throw Error('Missing '+kind);
   const search=p.getByRole('searchbox',{name:'Search graph',exact:true});await search.fill(node.label);
   await p.locator('.kg-search-results button').filter({hasText:node.label}).first().click();
   if(await p.getByRole('button',{name:'Expand inspector',exact:true}).count())await p.getByRole('button',{name:'Expand inspector',exact:true}).click();
   if(kind!=='fictional-agent'&&!await p.getByRole('heading',{name:'Recorded discussion summary'}).count())throw Error('Summary inspector unavailable');
   if((await p.locator('body').innerText()).includes('RAW_'))throw Error('Visible conversation');
   await p.screenshot({path:out+`/${filename}-${width}.png`});screenshots.push(`${filename}-${width}.png`);
   await p.getByRole('button',{name:'Close inspector',exact:true}).click();await search.fill('');
  }
  await p.getByRole('button',{name:'Report',exact:true}).click();await p.getByRole('heading',{name:'Recorded fictional communication',exact:true}).waitFor();
  if(!await p.locator('caption').filter({hasText:'Development over simulated time'}).count())throw Error('Discussion timeline absent');
  if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Report overflow');await p.screenshot({path:out+`/report-${width}.png`,fullPage:true});
  await p.getByRole('button',{name:'Knowledge Graph',exact:true}).click();await attach();
 }
 await p.getByRole('button',{name:'Fit Graph',exact:true}).click();await p.waitForTimeout(1000);
 const box=await p.locator('.kg-canvas').boundingBox(),drag=await p.evaluate(()=>{const r=window.__phase4dRenderer,n=r.core.nodes().filter(n=>n.connectedEdges().length>0)[0];const pos=n.renderedPosition();window.__phase4dBefore=r.snapshot().positions;window.__phase4dNeighbours=n.neighborhood('node').map(p=>p.id());return {id:n.id(),x:pos.x,y:pos.y};});
 await p.mouse.move(box.x+drag.x,box.y+drag.y);await p.mouse.down();await p.mouse.move(box.x+drag.x+90,box.y+drag.y+55,{steps:14});await p.screenshot({path:out+'/drag-1920.png'});await p.mouse.up();await p.waitForTimeout(7000);
 const motion=await p.evaluate(()=>{const r=window.__phase4dRenderer,before=new Map(window.__phase4dBefore.map(n=>[n.id,n])),after=r.snapshot();return {movedNeighbours:after.positions.filter(n=>window.__phase4dNeighbours.includes(n.id)&&Math.hypot(n.x-before.get(n.id).x,n.y-before.get(n.id).y)>1).length,physics:after.physics};});
 if(!motion.movedNeighbours)throw Error('Connected neighbours did not respond');if(motion.physics.running)throw Error('Graph did not settle');await p.screenshot({path:out+'/settled-1920.png'});
 const beforeNav=await p.evaluate(()=>{window.__phase4dPositions=JSON.stringify(window.__phase4dRenderer.snapshot().positions);return true;});
 await p.getByRole('button',{name:'Report',exact:true}).click();await p.getByRole('button',{name:'Knowledge Graph',exact:true}).click();await attach();
 const retained=await p.evaluate(()=>window.__phase4dPositions===JSON.stringify(window.__phase4dRenderer.snapshot().positions));if(!retained)throw Error('Graph positions changed on ordinary navigation');
 if((await p.content()).includes('RAW_'))throw Error('HTML leaked conversation');const storageSafe=await p.evaluate(()=>[...Object.values(localStorage),...Object.values(sessionStorage)].every(v=>!v.includes('RAW_')));if(!storageSafe)throw Error('Storage leaked conversation');
 await p.reload();await p.locator('.map-history > summary').click();await p.getByRole('combobox',{name:'Recorded explorations',exact:true}).waitFor();const history=p.getByRole('combobox',{name:'Recorded explorations',exact:true}),option=await history.locator('option').evaluateAll(options=>options.find(o=>o.value)?.value);if(!option)throw Error('Saved summary missing');await history.selectOption(option);
 await p.getByRole('button',{name:'Report',exact:true}).click();await p.getByRole('heading',{name:'Recorded fictional communication',exact:true}).waitFor();await p.screenshot({path:out+'/restored-report-1920.png',fullPage:true});
 await p.waitForFunction(id=>window.__phase4dLatest?.runId===id,originalRun);latest=await p.evaluate(()=>window.__phase4dLatest);payloadChecks.push(...await p.evaluate(()=>window.__phase4dAudit));if(payloadChecks.some(p=>p.containsRaw))throw Error('CONVERSATION_SENTINEL_DELIVERED');if(latest.runId!==originalRun||explores!==1)throw Error('Restore changed identity or caused another Explore');
 const result={evidence:'MOCKED DESKTOP ONLY',runId:originalRun,explores,initialActions:latest.initialActions.length,socialAccepted:latest.society.usage.accepted,counts,graphCounts,rendered,platforms:latest.society.platforms.length,groups:latest.society.groups.length,opportunityTicks:latest.society.conversation.opportunityTicks,mapCanvas,privacy:{payloadsChecked:payloadChecks.length,rawSentinelLeaks:0,htmlSafe:true,storageSafe},payloadChecks,desktopSizes:[[1440,900],[1920,1080]],motion,positionsRetained:retained,restored:true,screenshots,errors,consoleErrors};
 if(errors.length)throw Error('Unexpected browser error');
 return result;
}
