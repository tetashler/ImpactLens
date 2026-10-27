// Opt-in Playwright page checks. No provider requests, credentials or test flags.
// Invoke exports with a Playwright Page (for example through Playwright MCP).
const assert={
  equal(a,b){if(a!==b)throw new Error(`Expected ${JSON.stringify(b)}, received ${JSON.stringify(a)}`);},
  notEqual(a,b){if(a===b)throw new Error('Expected distinct values');},
  ok(v){if(!v)throw new Error('Expected condition to hold');},
  match(v,re){if(!re.test(v))throw new Error(`Expected ${re} in ${v}`);},
  deepEqual(a,b){if(JSON.stringify(a)!==JSON.stringify(b))throw new Error(`Expected identical values: ${JSON.stringify(a)} / ${JSON.stringify(b)}`);},
  notDeepEqual(a,b){if(JSON.stringify(a)===JSON.stringify(b))throw new Error('Expected changed coordinates');},
};
const button=(page,name)=>page.getByRole('button',{name,exact:true});
const point=async page=>({lat:Number(await page.getByRole('spinbutton',{name:'AAC latitude',exact:true}).inputValue()),lon:Number(await page.getByRole('spinbutton',{name:'AAC longitude',exact:true}).inputValue())});
async function calculate(page){const pending=page.waitForResponse(r=>r.url().endsWith('/api/eldercare/simulate'));await button(page,'Calculate AAC Impact').click();const r=await pending;assert.equal(r.status(),200);const body=await r.json();await page.locator('.aac-current-report').waitFor();assert.deepEqual(body.request.intervention.position,await point(page));assert.equal(await page.locator('.aac-current-report').getAttribute('data-request-fingerprint'),body.identity.requestFingerprint);return body;}

export async function mrtRegression(page){
  await button(page,'MRT Line').click();await page.getByRole('spinbutton',{name:'Segment 1 run (s)',exact:true}).fill('360');
  await button(page,'Run simulation').click();await page.locator('.comparison-results').waitFor();assert.equal(await page.locator('.duration-block.scenario strong').innerText(),'21.00');
  await button(page,'Calculated impact').click();const pending=page.waitForResponse(r=>r.url().endsWith('/api/impact'));await button(page,'Calculate demographic impact').click();const report=await(await pending).json();await page.locator('.impact-dashboard').waitFor();assert.equal(await page.locator('.impact-report').getAttribute('data-run-id'),report.identity.runId);await page.locator('.citizens-id').waitFor();
  const profiles=await page.locator('.citizens-id').innerText(),ai=await page.locator('.ai-context').first().innerText();
  await button(page,'Illustrative city').click();await page.bringToFront();await button(page,'Play citizen animation').click();await page.waitForTimeout(1200);const sample=Number(await page.locator('.citizens-stats dd').first().innerText());assert.ok(sample>0);await button(page,'Pause citizen animation').click();await button(page,'Reset').click();assert.equal(await page.locator('.citizens-clock output').innerText(),'00:00:00');
  await button(page,'MRT journey').click();await button(page,'New station').click();
  return {scenarioMinutes:21,profile:profiles,aiAvailability:ai,animatedSample:sample,stations:await page.locator('.station-list>li').count()};
}
export async function placementAndResults(page){
  const beforeStations=await page.locator('.station-list>li').count();await button(page,'Active Ageing Centre').click();await page.locator('.aac-map-pin.existing').first().waitFor();assert.equal(await page.locator('.aac-map-pin.existing').count(),4);
  await page.locator('.aac-map-pin.existing').first().click();await page.locator('.aac-popup').waitFor();const evidence=await page.locator('.aac-popup').innerText();assert.match(evidence,/Historical/);await page.locator('.maplibregl-popup-close-button').click();await page.locator('.aac-map-pin.existing').first().click();assert.equal(await page.locator('.aac-popup').count(),1);
  await button(page,'Place New Centre').click();await page.locator('.maplibregl-popup-close-button').click();assert.equal(await page.locator('.aac-map-pin.proposed').count(),0);await page.keyboard.press('Escape');assert.equal(await button(page,'Place New Centre').getAttribute('aria-pressed'),'false');
  await button(page,'Place centre').click();const box=await page.locator('.maplibregl-canvas').boundingBox();await page.mouse.click(box.x+box.width*.55,box.y+box.height*.54);await page.locator('.aac-map-pin.proposed').waitFor();assert.equal(await page.locator('.station-list>li').count(),beforeStations);
  await calculate(page);
  await button(page,'Load Bukit Merah demo').click();await page.waitForTimeout(650);const demo=await calculate(page),overall=demo.result.metrics[0];
  assert.ok(Math.abs(overall.population-44520)<1e-6);assert.ok(Math.abs(overall.comparablePopulation-6230)<1e-6);assert.ok(Math.abs(overall.unlocatedPopulation-38290)<1e-6);assert.equal(overall.thresholds.find(t=>t.metres===500).newlyWithinPopulation,0);assert.equal(await page.locator('.aac-map-pin.proxy').count(),2);
  const oldPoint=await point(page),pin=await page.locator('.aac-map-pin.proposed').boundingBox();await page.mouse.move(pin.x+pin.width/2,pin.y+pin.height/2);await page.mouse.down();await page.mouse.move(pin.x+pin.width/2+50,pin.y+pin.height/2+35,{steps:10});await page.mouse.up();assert.equal(await page.locator('.aac-current-report').count(),0);assert.notDeepEqual(await point(page),oldPoint);
  const moved=await calculate(page);assert.notEqual(moved.identity.requestFingerprint,demo.identity.requestFingerprint);
  await page.getByRole('spinbutton',{name:'Straight-line accessibility radius (m)',exact:true}).fill('250');assert.equal(await page.locator('.aac-current-report').count(),0);const radius=await calculate(page);assert.ok(radius.request.options.thresholdsMetres.includes(250));
  await button(page,'MRT Line').click();assert.equal(await page.locator('.aac-current-report:visible').count(),0);assert.equal(await page.locator('.aac-map-pin').count(),0);assert.equal(await page.getByRole('spinbutton',{name:'Segment 1 run (s)',exact:true}).inputValue(),'360');assert.equal(await page.locator('.station-list>li').count(),beforeStations);
  await button(page,'Active Ageing Centre').click();assert.equal(await page.locator('.aac-current-report:visible').count(),1);assert.equal(await page.locator('.aac-map-pin.existing').count(),4);
  return {evidence,demonstration:{population:overall.population,comparable:overall.comparablePopulation,unknown:overall.unlocatedPopulation,closer:overall.closerPopulation,before:overall.meanBaselineMetres.value,after:overall.meanScenarioMetres.value},movedScenario:moved.identity.scenarioId,changedRadiusScenario:radius.identity.scenarioId};
}
export async function delayedResponses(page){
  const checks=[];
  for(const change of ['move','threshold','reset','mode']){
    await button(page,'Load Bukit Merah demo').click();let release;const ready=new Promise(resolve=>release=resolve);let started;const seen=new Promise(resolve=>started=resolve);
    const handler=async route=>{const response=await route.fetch();started();await ready;try{await route.fulfill({response});}catch{/* client cancellation is expected */}};
    await page.route('**/api/eldercare/simulate',handler);await button(page,'Calculate AAC Impact').click();await seen;
    if(change==='move')await page.getByRole('spinbutton',{name:'AAC latitude',exact:true}).fill('1.288');
    else if(change==='threshold')await page.getByRole('spinbutton',{name:'Straight-line accessibility radius (m)',exact:true}).fill('750');
    else if(change==='reset')await button(page,'Reset AAC proposal').click();
    else await button(page,'MRT Line').click();
    release();await page.waitForTimeout(200);if(change==='mode')await button(page,'Active Ageing Centre').click();assert.equal(await page.locator('.aac-current-report').count(),0);await page.unroute('**/api/eldercare/simulate',handler);checks.push(change);
  }
  assert.equal(await page.locator('.maplibregl-canvas').count(),1);return checks;
}

export async function settingsAndFailures(page){
  await button(page,'Active Ageing Centre').click();await button(page,'Load Bukit Merah demo').click();
  await page.getByRole('combobox',{name:'Existing AAC availability',exact:true}).selectOption('exclude-unconfirmed');
  const noBaseline=await calculate(page),metric=noBaseline.result.metrics[0];
  assert.equal(metric.comparablePopulation,0);assert.equal(metric.meanBaselineMetres.value,null);
  assert.ok(metric.meanScenarioMetres.value>0);assert.ok(metric.thresholds[0].scenarioAccessWithoutBaselinePopulation>0);
  assert.equal(metric.thresholds[0].newlyWithinPopulation,0);
  await button(page,'Load Bukit Merah demo').click();
  await page.locator('.aac-advanced').evaluate(e=>e.open=true);
  await page.getByLabel('Record an illustrative capacity').check();await page.getByRole('spinbutton',{name:'Assumed AAC capacity (users)',exact:true}).fill('150');
  await page.getByLabel('Show assumed straight-line time conversions').check();await page.getByRole('spinbutton',{name:'Assumed speed (m/s)',exact:true}).fill('0.8');
  await page.getByRole('combobox',{name:'AAC modelled age cutoff',exact:true}).selectOption('65');
  const advanced=await calculate(page);assert.equal(advanced.request.options.minimumAge,65);assert.equal(advanced.result.capacity.proposedAssumedUsers,150);
  assert.ok(advanced.result.comparisons[0].assumedStraightLineWalkingMinutes);
  const groups=[];for(const dimension of ['ageGroup','sex','planningArea','subzone']){
    await page.locator('.aac-dashboard select').nth(0).selectOption(dimension);await page.locator('.aac-dashboard select').nth(1).selectOption('unlocated');
    await page.locator('.aac-group-table tbody button').first().click();assert.ok(await page.locator('.aac-group-detail').isVisible());
    groups.push({dimension,count:await page.locator('.aac-group-table tbody tr').count()});
  }
  const unavailable=async route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({version:1,error:{code:'UNAVAILABLE',message:'Accessibility calculation is temporarily unavailable. Retry shortly.'}})});
  await page.route('**/api/eldercare/simulate',unavailable);
  try{await button(page,'Calculate AAC Impact').click();await page.locator('.aac-results .aac-error').waitFor();assert.match(await page.locator('.aac-results .aac-error').innerText(),/temporarily unavailable/);}
  finally{await page.unroute('**/api/eldercare/simulate',unavailable);}
  const mismatched=async route=>{const response=await route.fetch(),json=await response.json();json.identity.clientRequestId='stale-browser-test';await route.fulfill({response,json});};
  await page.route('**/api/eldercare/simulate',mismatched);
  try{await button(page,'Calculate AAC Impact').click();await page.getByText('An invalid or outdated response was ignored. Recalculate for the current centre and settings.',{exact:true}).waitFor();assert.equal(await page.locator('.aac-current-report').count(),0);}
  finally{await page.unroute('**/api/eldercare/simulate',mismatched);}
  const recovered=await calculate(page);return {noBaselineComparable:metric.comparablePopulation,groups,capacity:advanced.result.capacity.proposedAssumedUsers,recovered:recovered.identity.scenarioId};
}
