// Opt-in loopback acceptance. Requires the network-blocked inference preload.
import {attachGraph} from './phase7g-browser-check.mjs';
const check=(value,message)=>{if(!value)throw new Error(message);};
export async function startLiveQuestion(page,question){
  await page.getByRole('button',{name:'Simulation',exact:true}).click();
  const field=page.getByRole('textbox',{name:'Your scenario question',exact:true});if(await field.inputValue()!==question)await field.fill(question);
  let body,wire,status,finish,fail;const received=new Promise((resolve,reject)=>{finish=resolve;fail=reject;});
  const start=Date.now();const handler=async route=>{try{wire=route.request().postDataJSON();const response=await route.fetch({timeout:130000});status=response.status();body=await response.json();await route.fulfill({response});finish();}catch(error){fail(error);}};
  await page.route('**/api/stakeholder-simulate',handler);
  try{await page.getByRole('button',{name:'Start Simulation',exact:true}).click();await received;if(status===200){await page.waitForFunction(count=>document.querySelectorAll('[data-event-id]').length===count,body.run.events.length);await page.waitForFunction(()=>!document.querySelector('.question-primary')?.textContent?.includes('in progress'));}else await page.locator('.question-console:visible [role=alert]').waitFor();}
  finally{await page.unroute('**/api/stakeholder-simulate',handler);}
  check(wire.version===2,'Live request entered the legacy parser');return {wire,body,status,elapsedMs:Math.round(Date.now()-start)};
}
export async function inspectLiveGraph(page,runId){
  await page.getByRole('button',{name:'Explore Knowledge Graph',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.kg-status')?.textContent?.includes('documented relationships'));await attachGraph(page);
  const counts=await page.evaluate(()=>{const c=window.__g7Renderer.core;return {nodes:c.nodes().length,edges:c.edges().length,sources:c.nodes('[category="source"]').length,roles:c.nodes('[category="population"]').length,ids:c.nodes().map(n=>n.id())};});
  check(counts.ids.some(id=>id.includes(runId)),'Graph does not contain the accepted run');
  await page.getByRole('searchbox',{name:'Search graph',exact:true}).fill('Fictional');await page.locator('.kg-search-results button').first().click();
  await page.getByRole('button',{name:'Expand inspector',exact:true}).click();await page.getByRole('button',{name:'Full-window details',exact:true}).click();
  check(await page.locator('.kg-full-dialog').isVisible(),'Full inspector unavailable');await page.keyboard.press('Escape');
  check(await page.getByRole('button',{name:'Full-window details',exact:true}).evaluate(e=>e===document.activeElement),'Inspector focus not restored');
  await page.getByRole('button',{name:'Report',exact:true}).click();return {nodes:counts.nodes,edges:counts.edges,sources:counts.sources,roles:counts.roles};
}
export async function responsiveLiveReport(page,directory){
  const results=[];for(const[width,height]of[[1920,1080],[1440,900],[1024,900],[390,844]]){await page.setViewportSize({width,height});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);check(!overflow,'Document horizontal overflow');await page.screenshot({path:`${directory}/report-${width}.png`,fullPage:false});results.push({width,height,overflow,mapCanvases:await page.locator('.maplibregl-canvas').count()});}return results;
}
export async function questionState(page){return page.evaluate(()=>{
 const node=document.querySelector('.workspace-shell');let fiber=node?.[Object.keys(node).find(k=>k.startsWith('__reactFiber'))];
 for(let depth=0;fiber&&depth<30;depth++,fiber=fiber.return)for(const branch of[fiber,fiber.alternate]){let hook=branch?.memoizedState;for(let n=0;hook&&n<200;n++,hook=hook.next){const controller=hook.memoizedState;if(controller?.start&&controller?.refreshInferenceStatus&&controller?.getSnapshot){const s=controller.getSnapshot();return {phase:s.phase,attemptId:s.attemptId,revision:s.revision,runId:s.run?.runId??null,selectedArchiveId:s.selectedArchiveId,history:s.history.map(h=>({id:h.id,question:h.question,runId:h.run?.runId,phase:h.phase}))};}}}throw Error('Question controller unavailable');
});}
export async function heldLiveRaces(page){
 const results=[];for(const action of['cancel','question-aba','geometry','archive']){
  await page.getByRole('button',{name:'Simulation',exact:true}).click();const question=page.getByRole('textbox',{name:'Your scenario question',exact:true});await question.fill('What happens if Singapore increases tax on imported goods?');
  let release,announce;const held=new Promise(r=>release=r),seen=new Promise(r=>announce=r);const handler=async route=>{const response=await route.fetch();announce();await held;await route.fulfill({response}).catch(()=>{});};await page.route('**/api/stakeholder-simulate',handler);
  try{await page.getByRole('button',{name:'Start Simulation',exact:true}).click();await seen;
   if(action==='cancel')await page.getByRole('button',{name:'Cancel',exact:true}).click();
   if(action==='question-aba'){await question.fill('What if Singapore changes housing grants?');await question.fill('What happens if Singapore increases tax on imported goods?');}
   if(action==='geometry'){await page.getByRole('button',{name:'Map',exact:true}).click();const lat=page.getByLabel('Latitude',{exact:true}).first();if(await lat.isVisible()){await lat.fill(String(Number(await lat.inputValue())+.0003));await page.getByRole('button',{name:'Move point',exact:true}).click();}else{await page.getByRole('button',{name:'Add point',exact:true}).click();const b=await page.locator('.maplibregl-canvas').boundingBox();await page.mouse.click(b.x+b.width*.3,b.y+b.height*.55);}await page.getByRole('button',{name:'Explore map',exact:true}).click();}
   if(action==='archive'){const s=await questionState(page),archive=s.history.find(h=>h.phase==='completed');check(archive,'No recorded archive');await page.getByRole('combobox',{name:'Recorded preparations and runs',exact:true}).selectOption(archive.id);}
   release();await page.waitForTimeout(150);const state=await questionState(page);check(state.runId===null,`Stale run returned after ${action}`);results.push({action,phase:state.phase,archive:state.selectedArchiveId,staleRejected:true});
  }finally{release();await page.unroute('**/api/stakeholder-simulate',handler);}
 }return results;
}
