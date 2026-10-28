// Opt-in real-browser acceptance. No production imports or paid AI requests.
import {attachGraph} from './phase7g-browser-check.mjs';
const check=(ok,message)=>{if(!ok)throw new Error(message);};
export async function ask(page,question){
  await page.getByRole('textbox',{name:'Your what-if question',exact:true}).fill(question);
  let plan,finish;const received=new Promise(resolve=>finish=resolve);const handler=async route=>{const response=await route.fetch();plan=await response.json();await route.fulfill({response});finish();};
  await page.route('**/api/scenarios/plan',handler);
  try{await page.getByRole('button',{name:'Interpret scenario',exact:true}).click();await received;await page.locator('.compact-plan').waitFor({state:'attached'});}
  finally{await page.unroute('**/api/scenarios/plan',handler);}
  check(plan?.plan.request.question===question,'Planner question mismatch');return plan;
}
export async function aseanExperiments(page,base='http://127.0.0.1:3000'){
  await page.goto(base);const ai=await(await page.request.get(base+'/api/ai/status')).json();check(ai.available===false,'Use a no-key acceptance server; no paid planner calls are authorised');
  const plan=await ask(page,'What if Singapore left ASEAN?');check(plan.plan.executionState==='not-executed','Plan executed unexpectedly');
  const lab=page.locator('[aria-label="Scenario Experiment Lab"]');await lab.getByRole('heading',{name:'Scenario Experiment Lab',exact:true}).waitFor();
  check(await lab.getByLabel('Withdrawal timing').inputValue()==='immediate','Wrong default timing');
  check(await lab.getByLabel('Post-withdrawal trade arrangements').inputValue()==='unresolved','Wrong trade default');
  check(await lab.getByLabel('Exploration horizon').inputValue()==='5','Wrong horizon');
  const evidenceResponse=page.waitForResponse(r=>r.url().endsWith('/api/evidence/research'));
  await lab.getByRole('button',{name:'Inspect evidence replay',exact:true}).click();const evidence=await(await evidenceResponse).json();
  await lab.getByText('Verified-source replay · partial',{exact:true}).waitFor();
  await lab.locator('#source-singapore-fta-official-20261028 > summary').click();
  check(await lab.getByRole('link',{name:'Open official source',exact:true}).getAttribute('href')==='https://www.meti.gov.sg/trade-international-economic-relations/agreements/free-trade-agreements-fta/','Unexpected source URL');
  const before=await lab.locator('#source-singapore-fta-official-20261028').innerText();
  await lab.getByRole('button',{name:'Save experiment',exact:true}).click();await lab.getByRole('button',{name:'Configure',exact:true}).click();
  await lab.getByLabel('Withdrawal timing').selectOption('negotiated');await lab.getByLabel('Post-withdrawal trade arrangements').selectOption('hypothetical-replacement');
  await lab.getByRole('button',{name:'Inspect evidence replay',exact:true}).click();await lab.getByText('Verified-source replay · partial',{exact:true}).waitFor();
  await lab.getByRole('button',{name:'Save experiment',exact:true}).click();await lab.getByRole('button',{name:'Compare',exact:true}).click();
  const comparison=await lab.getByRole('region',{name:'Compare experiments',exact:true}).innerText();
  check(comparison.includes('Immediate (hypothetical)')&&comparison.includes('Negotiated (terms unresolved)')&&comparison.includes('Hypothetical replacement'),'Actual assumptions missing from comparison');
  check(comparison.includes('outcomes remain unknown'),'Missing outcome boundary');
  const records=await page.evaluate(()=>JSON.parse(localStorage.getItem('impactlens.experiments.v1')).experiments);
  check(records.length>=2&&records.at(-2).configuration.withdrawalTiming==='immediate','Saved A mutated');
  check(records.at(-1).configuration.withdrawalTiming==='negotiated','Saved B missing');
  check(records.at(-2).scenarioIdentity===records.at(-1).scenarioIdentity,'Assumptions changed scenario identity');
  check(records.at(-2).configurationIdentity!==records.at(-1).configurationIdentity,'Configuration fingerprints did not change');
  check(records.at(-2).evidence.snapshotIdentity===records.at(-1).evidence.snapshotIdentity,'Unchanged evidence differed');
  return {planId:plan.plan.planId,evidenceMode:evidence.evidence.mode,sourceInspector:before,records:records.map(r=>({id:r.experimentId,configuration:r.configuration,configurationIdentity:r.configurationIdentity})),comparison};
}
export async function archivedGraph(page){
  const lab=page.locator('[aria-label="Scenario Experiment Lab"]');await lab.getByRole('button',{name:/^Snapshots/}).click();
  const buttons=lab.locator('.experiment-history button');await buttons.last().click();await lab.getByRole('button',{name:'Inspect snapshot in Knowledge Graph',exact:true}).click();
  await page.getByRole('searchbox',{name:'Search graph',exact:true}).fill('Trade arrangements');await page.locator('.kg-search-results button').first().click();
  await page.getByRole('button',{name:'Expand inspector',exact:true}).click();await page.getByRole('button',{name:'Full-window details',exact:true}).click();
  check(await page.getByRole('dialog').isVisible(),'Inspector full view did not open');const detail=await page.getByRole('dialog').innerText();
  check(detail.includes('Bound to an archived experiment'),'Archive mislabeled as current');await page.keyboard.press('Escape');
  const graph=await attachGraph(page);const counts=await page.evaluate(()=>{const c=window.__g7Renderer.core;return {nodes:c.nodes().length,edges:c.edges().length,sources:c.nodes('[category="source"]').length,results:c.nodes('[category="result"]').length};});
  check(counts.sources===2&&counts.results===0,'Archived evidence graph is incorrect');await page.getByRole('button',{name:'Back to General',exact:true}).click();
  return {counts,detail,canvasCount:await page.locator('.maplibregl-canvas').count(),snapshot:graph};
}
export async function delayedResearch(page){
  const lab=page.locator('[aria-label="Scenario Experiment Lab"]');await lab.getByRole('button',{name:'Configure',exact:true}).click();
  let release,started;const held=new Promise(r=>release=r),seen=new Promise(r=>started=r);
  const handler=async route=>{const result=await route.fetch();started();await held;await route.fulfill({response:result}).catch(()=>{});};
  await page.route('**/api/evidence/research',handler);
  try{await lab.getByRole('button',{name:'Inspect evidence replay',exact:true}).click();await seen;
    await lab.getByRole('button',{name:'Configure',exact:true}).click();await lab.getByLabel('Exploration horizon').selectOption('10');release();
    await page.waitForTimeout(250);await lab.getByRole('button',{name:'Evidence',exact:true}).click();check(await lab.getByText('No evidence snapshot attached',{exact:true}).isVisible(),'Stale evidence returned after assumption edit');
    return {staleRejected:true,horizon:await lab.getByLabel('Exploration horizon').inputValue()};
  }finally{release();await page.unroute('**/api/evidence/research',handler);}
}

// Read the real external store through React only in this opt-in test page.
export async function labState(page){return page.evaluate(()=>{
  let fiber=document.querySelector('.experiment-lab')?.[Object.keys(document.querySelector('.experiment-lab')??{}).find(k=>k.startsWith('__reactFiber'))];
  for(let d=0;fiber&&d<25;d++,fiber=fiber.return)for(const f of [fiber,fiber.alternate]){let hook=f?.memoizedState;for(let n=0;hook&&n<150;n++,hook=hook.next){const v=hook.memoizedState;if(v?.saveSnapshot&&v?.research&&v?.getSnapshot){const s=v.getSnapshot();return {question:s.question,busy:s.busy,evidence:s.evidence?{attempt:s.evidence.researchAttemptId,scenario:s.evidence.scenarioIdentity}:null,records:s.records.length,configuration:s.configuration};}}}
  throw Error('Experiment store unavailable');
});}
export async function researchRaces(page){
  const results=[];
  for(const change of ['cancel','retry','question-aba','geometry','reset']){
    await page.getByRole('button',{name:'Start new scenario',exact:true}).click();await ask(page,'What if Singapore left ASEAN?');
    const lab=page.locator('[aria-label="Scenario Experiment Lab"]');await lab.getByRole('button',{name:'Configure',exact:true}).click();
    let release,announce;const held=new Promise(r=>release=r),seen=new Promise(r=>announce=r);let number=0,oldAttempt;
    const handler=async route=>{const response=await route.fetch();if(number++===0){oldAttempt=(await response.json()).researchAttemptId;announce();await held;}await route.fulfill({response}).catch(()=>{});};
    await page.route('**/api/evidence/research',handler);
    try{
      await lab.getByRole('button',{name:'Inspect evidence replay',exact:true}).click();await seen;
      let latestAttempt=null;
      if(change==='cancel')await lab.getByRole('button',{name:'Cancel research',exact:true}).click();
      if(change==='retry'){await lab.getByRole('button',{name:'Load evidence replay',exact:true}).click();await lab.getByText('Verified-source replay · partial',{exact:true}).waitFor();latestAttempt=(await labState(page)).evidence.attempt;}
      if(change==='question-aba'){await lab.getByRole('button',{name:'Back to map setup',exact:true}).click();const input=page.getByRole('textbox',{name:'Your what-if question',exact:true});await input.fill('What if a new polyclinic opened?');await input.fill('What if Singapore left ASEAN?');await page.getByRole('button',{name:'Experiment lab',exact:true}).click();}
      if(change==='geometry'){await page.getByRole('button',{name:'Add point',exact:true}).click();const box=await page.locator('.maplibregl-canvas').boundingBox();await page.mouse.click(box.x+box.width*.35,box.y+box.height*.4);await page.getByRole('button',{name:'Explore map',exact:true}).click();}
      if(change==='reset')await page.getByRole('button',{name:'Start new scenario',exact:true}).click();
      release();await page.waitForTimeout(250);const state=await labState(page);
      check(change==='retry'?state.evidence?.attempt===latestAttempt&&state.evidence.attempt!==oldAttempt:state.evidence===null,`Old research returned after ${change}`);
      check(!state.busy,`Research remained pending after ${change}`);results.push({change,staleRejected:true,question:state.question});
    }finally{release();await page.unroute('**/api/evidence/research',handler);}
  }
  return results;
}
