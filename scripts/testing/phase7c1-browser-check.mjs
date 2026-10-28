// Test-only fixed cameras. Inventory uses separate polygon-intersection counts.
export const islandDistricts=[['tiong-bahru',[103.827,1.286]],['sengkang',[103.895,1.391]],['punggol',[103.902,1.405]],['tampines',[103.945,1.354]],['orchard',[103.834,1.304]],['downtown',[103.851,1.283]],['jurong',[103.742,1.333]],['woodlands',[103.786,1.436]],['yishun',[103.835,1.43]],['changi',[103.988,1.356]],['tuas',[103.64,1.32]],['industrial',[103.705,1.322]],['private-serangoon-gardens',[103.861,1.364]],['low-density-lim-chu-kang',[103.718,1.425]]];
// Supply attach/install/camera from phase7c-browser-check.mjs in your test driver.
export async function inspectDistricts(page,mode,entries=islandDistricts){
  const results=[];
  for(const [name,center] of entries){
    await page.evaluate(center=>window.__buildingAuditMap.jumpTo({center,zoom:15.65,pitch:52,bearing:-9}),center);
    await page.waitForTimeout(250);
    if(mode!=='hdb')await page.evaluate(()=>window.__buildingAdapter.refresh());
    await page.waitForFunction(mode=>{const m=window.__buildingAuditMap;return mode==='hdb'?m.getLayer('hdb-buildings')&&m.isSourceLoaded('hdb'):window.__buildingStatuses.at(-1)?.state==='ready'&&m.isSourceLoaded('sg-buildings');},mode,{timeout:60000});
    await page.waitForTimeout(350);
    const metric=await page.evaluate(mode=>({rendered:window.__buildingAuditMap.queryRenderedFeatures({layers:[mode==='hdb'?'hdb-buildings':'sg-buildings-extrusion']}).length,status:mode==='hdb'?null:window.__buildingStatuses.at(-1)}),mode);
    await page.screenshot({path:`test-results/phase7c1/${mode}-${name}.png`});results.push({name,...metric});
  }
  return results;
}
