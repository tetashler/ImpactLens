// Run with Playwright MCP browser_run_code_unsafe(filename: absolute path).
// Requires the separately started, network-blocked dynamic-provider-preload server.
async (page) => {
 const context=await page.context().browser().newContext({viewport:{width:1440,height:900}}),p=await context.newPage();
 const errors=[],consoleErrors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
 const attach=()=>p.evaluate(()=>{
  const n=document.querySelector('.kg-canvas');let f=n?.[Object.keys(n).find(k=>k.startsWith('__reactFiber'))];
  for(let d=0;f&&d<30;d++,f=f.return)for(const t of [f,f.alternate]){let s=t?.memoizedState;for(let i=0;s&&i<100;i++,s=s.next){const v=s.memoizedState?.current;if(v?.core&&typeof v.snapshot==='function'&&!v.core.destroyed()){window.__worldRenderer=v;return {nodes:v.snapshot().nodes,edges:v.snapshot().edges,types:[...new Set(v.core.nodes().map(n=>n.data('entityType')))]};}}}
  throw Error('Graph renderer unavailable');
 });
 const scenarios=[];
 await p.goto('http://127.0.0.1:3155');
 for(const question of ['What if Singapore introduces a four-day workweek?','What if Malaysia restricts water exports to Singapore?','What if a new polyclinic opens at this plotted location in Sengkang?']){
  await p.getByRole('button',{name:'Map',exact:true}).click();
  await p.getByRole('textbox',{name:'Your scenario question',exact:true}).fill(question);
  await p.getByRole('button',{name:'Explore',exact:true}).click();
  await p.getByRole('button',{name:'View Knowledge Graph',exact:true}).waitFor({timeout:60000});
  if(!await p.getByRole('textbox',{name:'Your scenario question',exact:true}).isVisible())throw Error('Explore left Map');
  await p.getByRole('button',{name:'View Knowledge Graph',exact:true}).click();
  await p.waitForSelector('.kg-canvas canvas');await p.waitForTimeout(5500);
  const graph=await attach();
  if(await p.getByRole('button',{name:'Return to current scenario graph',exact:true}).count())throw Error('Active graph mislabeled as archived');
  scenarios.push({question,...graph});
 }
 const views=[];
 for(const [width,height]of [[1920,1080],[1440,900],[1024,900],[390,844]]){
  await p.setViewportSize({width,height});await p.getByRole('button',{name:'Fit Graph',exact:true}).click();await p.locator('.kg-canvas-wrap').scrollIntoViewIfNeeded();
  await p.screenshot({path:`tmp/world-kg/final-graph-${width}.png`,fullPage:true});
  const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(overflow)throw Error('Horizontal overflow');views.push({width,height,overflow});
 }
 await p.setViewportSize({width:1440,height:900});await p.getByRole('button',{name:'Fit Graph',exact:true}).click();
 await p.evaluate(()=>{window.__graphBeforeNavigation={renderer:window.__worldRenderer,positions:JSON.stringify(window.__worldRenderer.snapshot().positions)};});
 await p.getByRole('button',{name:'Report',exact:true}).click();
 const report={entities:await p.getByRole('heading',{name:'Scenario entities · model proposals',exact:true}).count(),sources:await p.getByRole('heading',{name:'Retrieved source candidates',exact:true}).count(),noQuantitativeHealthModel:(await p.locator('body').innerText()).includes('no AAC model substitutes for a polyclinic')};
 await p.getByRole('button',{name:'Knowledge Graph',exact:true}).click();await p.waitForTimeout(200);
 const preserved=await p.evaluate(()=>({sameRenderer:window.__worldRenderer===window.__graphBeforeNavigation.renderer,samePositions:JSON.stringify(window.__worldRenderer.snapshot().positions)===window.__graphBeforeNavigation.positions}));
 if(!preserved.sameRenderer||!preserved.samePositions)throw Error('Navigation scrambled graph');
 const shapes=await p.evaluate(()=>{const c=window.__worldRenderer.core;return {single:c.edges('.single').length,parallel:c.edges('.parallel').length,loop:c.edges('.loop').length};});
 if(!shapes.single||!shapes.parallel||!shapes.loop)throw Error('Expected mixed edge geometry');
 return {scenarios,views,report,preserved,shapes,errors,consoleErrors,mapCanvas:await p.locator('.maplibregl-canvas').count()};
}
