// Opt-in integration acceptance. Uses real local routes, never paid providers.
import {ask} from './phase7e-browser-check.mjs';
import {attachGraph} from './phase7g-browser-check.mjs';
const check=(value,message)=>{if(!value)throw new Error(message);};
const labFor=page=>page.locator('[aria-label="Scenario Experiment Lab"]');
const panelFor=page=>page.locator('.stakeholder-dialog');

export async function executeSaved(page){
  const lab=labFor(page),panel=panelFor(page);
  await lab.getByRole('button',{name:'Run stakeholder exploration',exact:true}).click();
  await panel.getByRole('heading',{name:'Frozen saved experiment',exact:true}).waitFor();
  check(await panel.getByLabel('Withdrawal process',{exact:true}).count()===0,'Duplicate assumption editor exposed');
  let body,status;const handler=async route=>{const response=await route.fetch();status=response.status();body=await response.json();await route.fulfill({response});};
  await page.route('**/api/stakeholder-simulate',handler);
  try{await panel.getByRole('button',{name:'Start simulation',exact:true}).click();await panel.locator('.st-run-id').waitFor();}
  finally{await page.unroute('**/api/stakeholder-simulate',handler);}
  check(status===200,'Execution HTTP failed');
  await panel.locator('.st-run-id').waitFor();check(body.run.status==='completed','No real completed run');
  const download=page.waitForEvent('download');await panel.getByRole('button',{name:'Export run JSON',exact:true}).click();
  const exported=await download;const stream=await exported.createReadStream();const parts=[];for await(const part of stream)parts.push(part);
  const linked=JSON.parse(Buffer.concat(parts).toString('utf8'));
  check(linked.source.sourceExperimentId===body.run.inputSnapshot.experimentId,'Wrong source experiment');
  check(linked.source.configurationIdentity===body.run.inputSnapshot.configurationIdentity,'Wrong full configuration identity');
  check(linked.source.execution.status==='not-executed','Saved input mutated to executed');
  check(linked.experiment.execution.status==='not-executed','Saved experiment mutated');
  check(linked.run.events.some(e=>e.previousEventIds.length>0),'No sequential event references');
  return linked;
}

export async function linkedGraph(page,runId){
  const panel=panelFor(page);await panel.getByRole('button',{name:'Explore run graph',exact:true}).click();
  await page.getByRole('searchbox',{name:'Search graph',exact:true}).waitFor();
  await page.waitForFunction(()=>document.querySelector('.kg-status')?.textContent?.includes('documented relationships'));
  await attachGraph(page);
  const counts=await page.evaluate(()=>{const core=window.__g7Renderer.core;return {nodes:core.nodes().length,edges:core.edges().length,sources:core.nodes('[category="source"]').length,results:core.nodes('[category="result"]').length,roles:core.nodes('[category="population"]').length,runNodeIds:core.nodes().map(n=>n.id()).filter(id=>id.startsWith('stakeholder:'))};});
  check(counts.sources===2,'Historical sources missing or duplicated');check(counts.runNodeIds.some(id=>id.includes(runId)),'Wrong graph run identity');check(counts.results===0,'Unrelated calculator results in archived graph');
  await page.getByRole('searchbox',{name:'Search graph',exact:true}).fill('Fictional');await page.locator('.kg-search-results button').first().click();
  await page.getByRole('button',{name:'Expand inspector',exact:true}).click();await page.getByRole('button',{name:'Full-window details',exact:true}).click();
  check(await page.locator('.kg-full-dialog').isVisible(),'Missing full-window inspector');await page.keyboard.press('Escape');
  check(await page.getByRole('button',{name:'Full-window details',exact:true}).evaluate(e=>e===document.activeElement),'Inspector focus not restored');
  await page.getByRole('button',{name:'Back to General',exact:true}).click();return counts;
}

export async function experimentRunJourney(page,base){
  check(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Loopback required');
  await page.goto(base);check((await(await page.request.get(base+'/api/ai/status')).json()).available===false,'Use no-provider server');
  await ask(page,'What if Singapore left ASEAN?');const lab=labFor(page);
  await lab.getByRole('button',{name:'Inspect evidence replay',exact:true}).click();await lab.getByText('Verified-source replay · partial',{exact:true}).waitFor();
  await lab.getByRole('button',{name:'Save experiment',exact:true}).click();
  const a=await executeSaved(page);const graphA=await linkedGraph(page,a.run.runId);
  await lab.getByRole('button',{name:'Configure',exact:true}).click();
  await lab.getByLabel('Withdrawal timing').selectOption('negotiated');await lab.getByLabel('Post-withdrawal trade arrangements').selectOption('hypothetical-replacement');
  await lab.getByRole('button',{name:'Inspect evidence replay',exact:true}).click();await lab.getByText('Verified-source replay · partial',{exact:true}).waitFor();
  await lab.getByRole('button',{name:'Save experiment',exact:true}).click();const b=await executeSaved(page),panel=panelFor(page);
  check(a.source.configurationIdentity!==b.source.configurationIdentity,'Assumption identity unchanged');check(a.run.inputFingerprint!==b.run.inputFingerprint,'Run input unchanged');
  check(a.run.events[0].statement!==b.run.events[0].statement,'Actual scripted assumptions not reflected');
  await panel.getByLabel('Run A',{exact:true}).selectOption(a.run.runId);await panel.getByLabel('Run B',{exact:true}).selectOption(b.run.runId);
  const comparison=await panel.locator('.st-comparison').innerText();check(comparison.includes('Scenario differences')&&comparison.includes('Synthetic-run differences'),'Disconnected comparison');
  await panel.getByLabel('Inspect run',{exact:true}).selectOption(a.run.runId);const archivedA=await linkedGraph(page,a.run.runId);
  await lab.getByRole('button',{name:'Run stakeholder exploration',exact:true}).click();await panel.getByLabel('Inspect run',{exact:true}).selectOption(b.run.runId);
  const graphB=await linkedGraph(page,b.run.runId);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('impactlens.experiments.v1')).experiments);
  check(saved.find(e=>e.experimentId===a.source.sourceExperimentId).configuration.withdrawalTiming==='immediate','Experiment A was mutated');
  return {a,b,graphA,archivedA,graphB,comparison};
}

export async function responsiveStakeholder(page,directory){
  const results=[];for(const [width,height]of [[1920,1080],[1440,900],[1024,900],[390,844]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(100);
    const layout=await page.evaluate(()=>({body:document.documentElement.scrollWidth>innerWidth,dialog:document.querySelector('.stakeholder-dialog').scrollWidth>document.querySelector('.stakeholder-dialog').clientWidth+1,map:document.querySelectorAll('.maplibregl-canvas').length}));
    check(!layout.body&&!layout.dialog,'Horizontal overflow');await page.screenshot({path:`${directory}/stakeholder-${width}.png`});results.push({width,height,...layout});
  }return results;
}

export async function delayedExecutions(page){
  const lab=labFor(page),panel=panelFor(page),results=[];
  for(const action of ['cancel','close-assumption-aba','close-question-aba','new-scenario']){
    if(!await panel.isVisible())await lab.getByRole('button',{name:'Run stakeholder exploration',exact:true}).click();
    let release,announce;const held=new Promise(r=>release=r),seen=new Promise(r=>announce=r);
    const handler=async route=>{const response=await route.fetch();announce();await held;await route.fulfill({response}).catch(()=>{});};
    await page.route('**/api/stakeholder-simulate',handler);
    try{
      await panel.getByRole('button',{name:'Start simulation',exact:true}).click();await seen;
      if(action==='cancel')await panel.getByRole('button',{name:'Cancel attempt',exact:true}).click();
      else{
        await panel.getByRole('button',{name:'Close stakeholder simulation',exact:true}).click();
        if(action==='close-assumption-aba'){
          await lab.getByRole('button',{name:'Configure',exact:true}).click();const horizon=lab.getByLabel('Exploration horizon');const before=await horizon.inputValue();await horizon.selectOption('10');await horizon.selectOption(before);
          await lab.getByRole('button',{name:/^Snapshots/}).click();await lab.locator('.experiment-history button').last().click();
        }else if(action==='close-question-aba'){
          await lab.getByRole('button',{name:'Back to map setup',exact:true}).click();const question=page.getByRole('textbox',{name:'Your what-if question',exact:true});await question.fill('What if a new polyclinic were built?');await question.fill('What if Singapore left ASEAN?');await page.getByRole('button',{name:'Experiment lab',exact:true}).click();await lab.getByRole('button',{name:/^Snapshots/}).click();await lab.locator('.experiment-history button').last().click();
        }else await page.getByRole('button',{name:'Start new scenario',exact:true}).click();
      }
      release();await page.waitForTimeout(150);
      check(await panel.locator('.st-run-id').count()===0,`Stale run returned after ${action}`);results.push({action,staleRejected:true});
    }finally{release();await page.unroute('**/api/stakeholder-simulate',handler);}
  }return results;
}

export async function controlledFailures(page){
  const lab=labFor(page),panel=panelFor(page);
  if(!await panel.isVisible())await lab.getByRole('button',{name:'Run stakeholder exploration',exact:true}).click();
  const failure=route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Controlled integration failure.'})});
  await page.route('**/api/stakeholder-simulate',failure);
  try{await panel.getByRole('button',{name:'Start simulation',exact:true}).click();await panel.getByRole('alert').waitFor();check(await panel.locator('.st-run-id').count()===0,'Failed request displayed successful run');}
  finally{await page.unroute('**/api/stakeholder-simulate',failure);}
  await panel.getByLabel('Execution mode',{exact:true}).selectOption('llm-assisted');
  await panel.getByRole('button',{name:'Start simulation',exact:true}).click();await panel.getByRole('alert').waitFor();
  check(await panel.getByRole('alert').innerText().then(t=>/authoris|unavailable/i.test(t)),'LLM unavailable status missing');
  await panel.getByLabel('Execution mode',{exact:true}).selectOption('deterministic-demo');
  await panel.getByLabel('Import run JSON',{exact:true}).setInputFiles({name:'corrupt.json',mimeType:'application/json',buffer:Buffer.from('{"version":1,"run":{"events":[{"previousEventIds":["invented"]}]}}')});
  await panel.getByRole('alert').waitFor();check(await panel.getByRole('alert').innerText().then(t=>t.includes('Import rejected')),'Corrupt import not rejected');
  await panel.getByRole('button',{name:'Close stakeholder simulation',exact:true}).click();const linked=await executeSaved(page);return {http500:true,llmUnavailable:true,corruptImport:true,recoveredRun:linked.run.runId};
}
