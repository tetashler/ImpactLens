// Opt-in Playwright functions; inject the actual adapter into the existing map.
// No application globals/test flags are required in production components.
export const districts=[['tiong-bahru',[103.827,1.286]],['sengkang',[103.895,1.391]],['tampines',[103.945,1.354]],['orchard',[103.834,1.304]],['downtown',[103.851,1.283]],['jurong',[103.742,1.333]],['industrial',[103.705,1.322]]];
export async function attach(page){
  await page.waitForSelector('.maplibregl-map');
  await page.waitForFunction(()=>{const n=document.querySelector('.maplibregl-map');let f=n?.[Object.keys(n).find(k=>k.startsWith('__reactFiber'))];for(let d=0;f&&d<20;d++,f=f.return)for(const t of [f,f.alternate]){let s=t?.memoizedState;for(let i=0;s&&i<60;i++,s=s.next){const v=s.memoizedState?.current;if(v&&typeof v.getStyle==='function'&&v.isStyleLoaded()){window.__buildingAuditMap=v;return true;}}}return false;});
}
export async function install(page,manifestUrl='/geography/buildings-v1/manifest.json'){
  return page.evaluate(async manifestUrl=>{
    const m=window.__buildingAuditMap;
    window.__buildingAdapter?.dispose();
    const box=[...document.querySelectorAll('.map-layers label')].find(x=>x.textContent.includes('buildings'))?.querySelector('input');if(box?.checked)box.click();
    if(m.getLayer('hdb-buildings'))m.removeLayer('hdb-buildings');if(m.getSource('hdb'))m.removeSource('hdb');
    const {BuildingLayer}=await import(`/geography/buildings-v1/harness/layer.mjs?test=${Date.now()}`);
    const manifest=await(await fetch(manifestUrl,{cache:'no-store'})).json();
    window.__buildingStatuses=[];window.__buildingAdapter=new BuildingLayer(m,manifest,{beforeId:'network-lines',onStatus:s=>window.__buildingStatuses.push(s)});
    await window.__buildingAdapter.refresh();return {count:manifest.featureCount,attribution:manifest.source.attribution};
  },manifestUrl);
}
export async function camera(page,center){
  await page.evaluate(center=>{window.__buildingAuditMap.jumpTo({center,zoom:15.65,pitch:52,bearing:-9});},center);
  await page.waitForTimeout(150);await page.evaluate(()=>window.__buildingAdapter.refresh());
  await page.waitForFunction(()=>{const m=window.__buildingAuditMap;return window.__buildingStatuses.at(-1)?.state==='ready'&&m.isSourceLoaded('sg-buildings');});
  await page.waitForTimeout(350);
  return page.evaluate(()=>({rendered:window.__buildingAuditMap.queryRenderedFeatures({layers:['sg-buildings-extrusion']}).length,status:window.__buildingStatuses.at(-1)}));
}
export async function districtScreenshots(page){
  const result=[];for(const [name,center] of districts){const current=await camera(page,center);await page.screenshot({path:`test-results/phase7c/after-${name}.png`});result.push({name,...current});}return result;
}
