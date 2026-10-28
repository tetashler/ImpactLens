// Opt-in checks for a real local application through a Playwright Page.
// No paid calls; use the no-key server or the documented provider mock preload.
const assert = (value, message) => { if (!value) throw new Error(message); };
export async function landing(page) {
  await page.goto('http://127.0.0.1:3000/');
  await page.getByRole('heading', { name: 'What if...?', exact: true }).waitFor({ timeout: 5000 });
  const composer = await page.locator('.scenario-composer').boundingBox();
  const map = await page.locator('.maplibregl-canvas').boundingBox();
  assert(map.width > composer.width * 2, 'The live map must dominate the desktop landing page');
  assert(await page.locator('.editor-panel:visible').count() === 0, 'Technical editors must not be first contact');
  assert(await page.locator('.scenario-example').count() === 4, 'Four honest example prompts are required');
  assert(await page.locator('.maplibregl-canvas').count() === 1, 'Keep one map');
  return { map, composer };
}

const mrtQuestion='What if Singapore built three new MRT stations between Choa Chu Kang and Sengkang?';
const aacQuestion='What if a new Active Ageing Centre opened in Bukit Merah?';
const button=(page,name)=>page.getByRole('button',{name,exact:true});

export async function plannerRaces(page) {
  const checked=[];
  for(const change of ['edit','example','a-b-a','reset','workspace','category']) {
    await button(page,'ImpactLens SG home').click();
    await page.getByRole('textbox',{name:'Your what-if question',exact:true}).fill(mrtQuestion);
    let release,started;const ready=new Promise(resolve=>release=resolve),seen=new Promise(resolve=>started=resolve);
    const handler=async route=>{const response=await route.fetch();started();await ready;try{await route.fulfill({response});}catch{/* aborted client is expected */}};
    await page.route('**/api/scenarios/plan',handler);
    try {
      await button(page,'Interpret scenario').click();await seen;
      if(change==='edit')await page.getByRole('textbox',{name:'Your what-if question',exact:true}).fill('A revised scenario question');
      if(change==='example'){await page.getByText('Try another question',{exact:true}).click();await button(page,aacQuestion).click();}
      if(change==='a-b-a'){await page.getByRole('textbox',{name:'Your what-if question',exact:true}).fill(aacQuestion);await page.getByRole('textbox',{name:'Your what-if question',exact:true}).fill(mrtQuestion);}
      if(change==='reset')await button(page,'ImpactLens SG home').click();
      if(change==='workspace')await button(page,'Open workspaces').click();
      if(change==='category'){await page.locator('.scenario-routing').evaluate(e=>e.open=true);await page.getByRole('combobox',{name:'Scenario category hint',exact:true}).selectOption('aac');}
      release();await page.waitForTimeout(250);
      assert(await page.locator('.scenario-plan-view').count()===0,`${change}: obsolete plan was restored`);
      checked.push(change);
    } finally {release();await page.unroute('**/api/scenarios/plan',handler);}
  }
  for(const corrupt of ['token','hash']) {
    await button(page,'ImpactLens SG home').click();await page.getByRole('textbox',{name:'Your what-if question',exact:true}).fill(mrtQuestion);
    const handler=async route=>{const response=await route.fetch(),json=await response.json();if(corrupt==='token')json.clientRequestId='wrong-client-token';else json.plan.planId=`plan-${'0'.repeat(64)}`;await route.fulfill({response,json});};
    await page.route('**/api/scenarios/plan',handler);
    try{await button(page,'Interpret scenario').click();await page.locator('.scenario-planner-error').waitFor();assert(await page.locator('.scenario-plan-view').count()===0,`${corrupt}: invalid plan accepted`);checked.push(corrupt);}
    finally{await page.unroute('**/api/scenarios/plan',handler);}
  }
  return checked;
}

export async function guidedNavigation(page) {
  await button(page,'ImpactLens SG home').click();await button(page,mrtQuestion).click();await button(page,'Interpret scenario').click();await page.locator('.scenario-plan-view').waitFor();
  await button(page,'Configure MRT scenario').click();assert(await page.locator('.station-list>li').count()===0,'Question must not invent a station layout');
  await page.locator('.maplibregl-canvas').evaluate(e=>e.dataset.acceptanceIdentity='guided-map');
  await button(page,'Load illustrative example').click();const stations=await page.locator('.station-list>li').count();
  await button(page,'Review journey & calculate').click();await button(page,'Run simulation').click();await page.locator('.comparison-results').waitFor();
  const minutes=await page.locator('.duration-block.scenario strong').innerText();
  await button(page,'Illustrative city').click();await button(page,'Play citizen animation').click();await page.waitForTimeout(1200);
  await page.locator('nav[aria-label="Scenario stages"]').getByRole('button',{name:'Configure',exact:true}).click();
  assert(await page.locator('.citizen-baseline').count()===0,'Returning to the editor must restore the editable network');
  assert(await page.locator('.proposal-pin:visible').count()===stations,'Editable proposal pins must return after citizen view');
  await button(page,'Question & plan').click();await button(page,'Resume MRT configuration').click();
  assert(await page.locator('.station-list>li').count()===stations,'Back navigation must preserve the draft');
  assert(await page.locator('.maplibregl-canvas').getAttribute('data-acceptance-identity')==='guided-map','Guided navigation must retain map ownership');
  await button(page,'Citizens').click();assert(await page.locator('.scenario-experience.stage-results').count()===1,'Citizens map control must open the inspector instead of hiding an editable proposal');
  await page.locator('nav[aria-label="Scenario stages"]').getByRole('button',{name:'Configure',exact:true}).click();
  assert(await page.locator('.proposal-pin:visible').count()===stations,'Returning from the map citizen control must restore proposal markers');
  await button(page,'Question & plan').click();await page.getByRole('textbox',{name:'Your what-if question',exact:true}).fill(aacQuestion);
  assert(await button(page,'Resume MRT configuration').count()===0,'A new question must not resume an unrelated draft');
  return {stations,minutes,sameCanvas:true};
}

export async function mapBeforeNetwork(page) {
  let release;const held=new Promise(resolve=>release=resolve);
  const handler=async route=>{const response=await route.fetch();await held;try{await route.fulfill({response});}catch{/* navigation can cancel the client */}};
  await page.route('**/api/network?*',handler);
  try {
    await page.goto('http://127.0.0.1:3000/');
    await page.locator('.maplibregl-canvas').waitFor({timeout:5000});
    await page.locator('.maplibregl-canvas').evaluate(e=>e.dataset.acceptanceIdentity='before-network');
    release();await page.waitForTimeout(500);
    assert(await page.locator('.maplibregl-canvas').getAttribute('data-acceptance-identity')==='before-network','Network loading must not remount the landing map');
  } finally {release();await page.unroute('**/api/network?*',handler);}
}
