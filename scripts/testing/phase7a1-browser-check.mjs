// Opt-in real-page acceptance helpers. The server must be no-key or use documented mocks.
const ensure=(value,message)=>{if(!value)throw new Error(message);};
const button=(page,name)=>page.getByRole('button',{name,exact:true});
async function interpret(page,question){await page.getByRole('textbox',{name:'Your what-if question',exact:true}).fill(question);await button(page,'Interpret scenario').click();await page.locator('.compact-plan').waitFor();}
async function drawRouteAndStations(page){
  await button(page,'Draw route').click();const box=await page.locator('.maplibregl-canvas').boundingBox(),points=[[.27,.58],[.44,.54],[.64,.51]];
  for(const [x,y] of points)await page.mouse.click(box.x+box.width*x,box.y+box.height*y);
  await button(page,'Finish route').click();await button(page,'Station dot').click();
  for(const [x,y] of points)await page.mouse.click(box.x+box.width*x,box.y+box.height*y);
  await button(page,'Explore map').click();ensure(await page.locator('.plot-point-marker').count()===3,'Station dots must be separate from route vertices');
}
async function connect(page,label,stationId){
  await page.locator('.plot-feature-list button').filter({hasText:label}).click();
  await page.waitForFunction(value=>document.querySelector('.plot-feature-list button[aria-pressed="true"]')?.textContent?.includes(value),label);
  const disclosure=page.locator('details.plot-disclosure').filter({has:page.getByText('Connect an existing MRT station',{exact:true})});
  if(!await disclosure.evaluate(e=>e.open))await disclosure.locator('summary').click();
  await page.getByRole('searchbox',{name:'Find an existing station',exact:true}).fill(stationId);
  await page.locator('.plot-search-results button').first().click();await button(page,'Confirm interchange').click();
}
export async function plottedMrt(page,plotFirst=false){
  await page.goto('http://127.0.0.1:3000/');await button(page,'Open General').click();await page.locator('.plot-toolbar').waitFor();await page.waitForTimeout(750);
  await page.waitForFunction(()=>document.querySelector('.maplibregl-canvas')&&!document.querySelector('.map-frame .map-loading'));
  await page.locator('.maplibregl-canvas').evaluate(e=>e.dataset.acceptanceOwner='one-map');
  if(plotFirst){await drawRouteAndStations(page);await interpret(page,'What if this became a new MRT line?');}
  else{await interpret(page,'What if we built a new MRT line here?');await drawRouteAndStations(page);}
  await connect(page,'Station 1','NS4');await connect(page,'Station 3','NE16');
  await page.getByRole('checkbox',{name:/These selected dots are stations/}).check();await page.getByRole('checkbox',{name:/I accept illustrative travel and transfer times/}).check();
  let submitted;const handler=async route=>{submitted=route.request().postDataJSON();const response=await route.fetch();await route.fulfill({response});};
  await page.route('**/api/simulate',handler);
  try{await button(page,'Calculate MRT impact').click();await page.locator('.comparison-results').waitFor();}
  finally{await page.unroute('**/api/simulate',handler);}
  ensure(submitted.intervention.stations[0].stationId==='NS4'&&submitted.intervention.stations[2].stationId==='NE16','MRT execution requires confirmed known anchors');
  ensure(submitted.intervention.segments.length===2&&submitted.intervention.segments.every(s=>s.runSeconds===300&&s.dwellSeconds===30),'Explicit segment assumptions must reach the real API');
  ensure(await page.locator('.maplibregl-canvas').getAttribute('data-acceptance-owner')==='one-map','Map ownership changed');
  return {plotFirst,baseline:await page.locator('.duration-block.baseline strong').innerText(),scenario:await page.locator('.duration-block.scenario strong').innerText(),stationKinds:submitted.intervention.stations.map(s=>s.kind),segments:submitted.intervention.segments.length};
}
