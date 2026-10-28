// Opt-in Playwright helpers. Use an owned no-key server; never import into the app.
export async function openStakeholderExample(page,origin='http://127.0.0.1:3134'){
  const url=new URL(origin);if(!['127.0.0.1','localhost'].includes(url.hostname)||url.port==='3000')throw new Error('Use a separately owned local test port.');
  await page.goto(url.origin,{waitUntil:'domcontentloaded'});await page.waitForSelector('.maplibregl-canvas');
  await page.getByRole('button',{name:'Open General',exact:true}).click();await page.waitForSelector('.plot-toolbar');
  await page.getByRole('textbox',{name:'Your what-if question',exact:true}).fill('What if Singapore left ASEAN?');
  await page.getByRole('button',{name:'Stakeholder simulation',exact:true}).click();
}
export async function recordStakeholderRun(page){
  let body;const handler=async route=>{const response=await route.fetch();body=await response.json();await route.fulfill({response});};
  await page.route('**/api/stakeholder-simulate',handler);
  try{await page.getByRole('button',{name:'Start simulation',exact:true}).click();await page.locator('.st-run-id').waitFor();if(body?.run?.status!=='completed')throw new Error('Expected a real completed deterministic run.');return body.run;}
  finally{await page.unroute('**/api/stakeholder-simulate',handler);}
}
