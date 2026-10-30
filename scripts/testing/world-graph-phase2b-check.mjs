// Opt-in Playwright MCP function. Use only task-owned port3155 with the
// network-blocked dynamic-provider-preload and IMPACTLENS_PHASE2B_MOCK=true.
async(page)=>{
 const c=await page.context().browser().newContext({viewport:{width:1440,height:900},deviceScaleFactor:1}),p=await c.newPage(),errors=[];
 p.setDefaultTimeout(12000);p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const attach=()=>p.evaluate(()=>{const n=document.querySelector('.kg-canvas');let f=n?.[Object.keys(n).find(k=>k.startsWith('__reactFiber'))];for(let d=0;f&&d<30;d++,f=f.return)for(const t of [f,f.alternate]){let s=t?.memoizedState;for(let i=0;s&&i<100;i++,s=s.next){const v=s.memoizedState?.current;if(v?.core&&typeof v.snapshot==='function'&&!v.core.destroyed()){window.__worldRenderer=v;return {nodes:v.snapshot().nodes,edges:v.snapshot().edges,types:[...new Set(v.core.nodes().map(n=>n.data('entityType')))],labels:v.core.nodes().map(n=>n.data('label'))};}}}throw Error('Renderer unavailable');});
 await p.goto('http://127.0.0.1:3155');
 const scenarios=[];
 for(const question of ['What if Singapore introduces a four-day workweek?','What if Malaysia restricts water exports to Singapore?']){
  await p.getByRole('button',{name:'Map',exact:true}).click();await p.getByRole('textbox',{name:'Your scenario question',exact:true}).fill(question);await p.getByRole('button',{name:'Explore',exact:true}).click();await p.getByRole('button',{name:'View Knowledge Graph',exact:true}).click({timeout:60000});await p.waitForSelector('.kg-canvas canvas');const data=await attach();
  await p.waitForFunction(()=>!window.__worldRenderer.snapshot().physics.running,{},{timeout:20000});await p.getByRole('button',{name:'Fit Graph',exact:true}).click();
  if(data.nodes!==7)throw Error('Audit records leaked or expected mock entities disappeared');
  if(data.types.some(t=>['Run','Recorded action','Assumption','Source excerpt','Scenario plan'].includes(t)))throw Error('Technical type leaked');
  const role=question.includes('Malaysia')?'Fictional Malaysian water planners':'Fictional Employees';
  await p.getByRole('searchbox',{name:'Search graph',exact:true}).fill(role);await p.locator('.kg-search-results button').first().click();await p.getByRole('button',{name:'Expand inspector',exact:true}).click();
  const inspector=await p.getByRole('complementary',{name:'Expanded inspector'}).innerText();
  if(question.includes('Malaysia')){if(!inspector.includes('No demographic context for this foreign'))throw Error('Foreign demographic mismatch');if(inspector.includes('4,047,260'))throw Error('Singapore counts applied abroad');}
  else if(!inspector.includes('4,047,260')||!inspector.includes('Census 2020'))throw Error('Aggregate context missing');
  await p.getByRole('button',{name:'Full-window details',exact:true}).click();await p.screenshot({path:question.includes('Malaysia')?'tmp/world-kg/phase2b-foreign-inspector.png':'tmp/world-kg/phase2b-singapore-inspector.png'});await p.keyboard.press('Escape');await p.getByRole('button',{name:'Close inspector',exact:true}).click();
  await p.getByRole('searchbox',{name:'Search graph',exact:true}).fill(question.includes('Malaysia')?'PUB Singapore':'Ministry of Manpower');await p.locator('.kg-search-results button').first().click();await p.getByRole('button',{name:'Expand inspector',exact:true}).click();await p.getByRole('complementary',{name:'Expanded inspector'}).getByText('Source passages',{exact:false}).first().click();
  const source=await p.getByRole('complementary',{name:'Expanded inspector'}).innerText();if(!source.includes('Mocked retrieval fixture only'))throw Error('Quote support missing');
  await p.getByRole('button',{name:'Close inspector',exact:true}).click();await p.getByRole('searchbox',{name:'Search graph',exact:true}).fill('');await p.getByRole('button',{name:'Reset Focus',exact:true}).click();await p.getByRole('button',{name:'Fit Graph',exact:true}).click();
  await p.screenshot({path:question.includes('Malaysia')?'tmp/world-kg/phase2b-water.png':'tmp/world-kg/phase2b-workweek.png'});
  await p.evaluate(()=>window.__savedWorld={renderer:window.__worldRenderer,positions:JSON.stringify(window.__worldRenderer.snapshot().positions)});
  await p.getByRole('button',{name:'Report',exact:true}).click();const count=await p.getByRole('heading',{name:'Recorded decisions and position changes',exact:true}).locator('xpath=following-sibling::ul[1]').locator('li').count();if(count!==8)throw Error('Report events missing');
  if((await p.locator('body').innerText()).includes('Research horizon'))throw Error('Artificial horizon exposed');
  await p.getByRole('button',{name:'Knowledge Graph',exact:true}).click();const preserved=await p.evaluate(()=>window.__worldRenderer===window.__savedWorld.renderer&&JSON.stringify(window.__worldRenderer.snapshot().positions)===window.__savedWorld.positions);if(!preserved)throw Error('Graph positions changed on navigation');scenarios.push({...data,events:count,preserved});
 }
 const views=[];for(const [width,height]of [[1920,1080],[1440,900],[1024,900],[390,844]]){await p.setViewportSize({width,height});await p.getByRole('button',{name:'Fit Graph',exact:true}).click();await p.locator('.kg-canvas-wrap').scrollIntoViewIfNeeded();await p.screenshot({path:`tmp/world-kg/phase2b-${width}.png`,fullPage:true});views.push({width,height,overflow:await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});}
 await p.setViewportSize({width:1440,height:900});await p.getByRole('button',{name:'Fit Graph',exact:true}).click();const dpi=await p.evaluate(()=>[...document.querySelectorAll('.kg-canvas canvas')].map(n=>({backing:n.width,css:n.getBoundingClientRect().width,ratio:n.width/n.getBoundingClientRect().width})));
 return {scenarios,views,dpi,errors,mapCanvas:await p.locator('.maplibregl-canvas').count()};
}
