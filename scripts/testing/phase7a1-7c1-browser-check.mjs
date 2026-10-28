// Opt-in acceptance helpers for the production-owned map/adapter. Never installs another layer.
const requireCondition=(condition,message)=>{if(!condition)throw new Error(message);};
export async function attachIntegrationMap(page){
  await page.waitForFunction(()=>{const node=document.querySelector('.maplibregl-map');let fiber=node?.[Object.keys(node).find(k=>k.startsWith('__reactFiber'))];
    for(let depth=0;fiber&&depth<20;depth++,fiber=fiber.return)for(const branch of [fiber,fiber.alternate]){
      let hook=branch?.memoizedState;for(let i=0;hook&&i<80;i++,hook=hook.next){const value=hook.memoizedState?.current;
        if(value&&typeof value.getStyle==='function'&&value.isStyleLoaded())window.__impactIntegrationMap=value;
        if(value&&typeof value.retry==='function'&&typeof value.setVisible==='function')window.__impactIntegrationBuildings=value;
      }
    }
    return !!window.__impactIntegrationMap&&!!window.__impactIntegrationBuildings;
  });
}
export async function sourceDialogPreservesRoute(page){
  await page.locator('.map-layers').evaluate(e=>e.open=false);
  await page.getByRole('button',{name:'Draw route',exact:true}).click();
  const box=await page.locator('.maplibregl-canvas').boundingBox();
  for(const [x,y]of [[.35,.6],[.6,.6]])await page.mouse.click(box.x+box.width*x,box.y+box.height*y);
  const before=(await page.locator('.plot-feature-list').allTextContents()).join('');
  await page.getByRole('button',{name:'Sources & licences',exact:true}).click();
  await page.keyboard.press('Escape');
  requireCondition((await page.locator('.plot-feature-list').allTextContents()).join('')===before,'Closing source details cancelled the underlying route');
  requireCondition(await page.getByRole('button',{name:'Finish route',exact:true}).isVisible(),'Unfinished route was lost');
  await page.getByRole('button',{name:'Finish route',exact:true}).click();return {preserved:before};
}
export const integratedDistricts=[['tiong-bahru',[103.827,1.286]],['sengkang',[103.895,1.391]],['punggol',[103.902,1.405]],['tampines',[103.945,1.354]],['orchard',[103.834,1.304]],['downtown',[103.851,1.283]],['jurong',[103.742,1.333]],['woodlands',[103.786,1.436]],['yishun',[103.835,1.43]],['changi',[103.988,1.356]],['tuas',[103.64,1.32]],['industrial',[103.705,1.322]],['private-serangoon-gardens',[103.861,1.364]],['low-density-lim-chu-kang',[103.718,1.425]]];
export async function integratedDistrictsCheck(page,outputDirectory){
  await attachIntegrationMap(page);const results=[];
  for(const [name,center] of integratedDistricts){
    await page.evaluate(center=>window.__impactIntegrationMap.jumpTo({center,zoom:15.65,pitch:52,bearing:-9}),center);
    await page.waitForTimeout(150);
    await page.waitForFunction(()=>document.querySelector('.map-frame')?.dataset.buildingState==='ready'&&window.__impactIntegrationMap.isSourceLoaded('sg-buildings'),null,{timeout:60000});
    await page.waitForTimeout(150);
    const result=await page.evaluate(()=>{const map=window.__impactIntegrationMap,features=map.queryRenderedFeatures({layers:['sg-buildings-extrusion']});return{renderedFeatures:features.length,renderedSourceIds:[...new Set(features.map(f=>f.properties.sourceId))],distinctRenderedIds:new Set(features.map(f=>f.properties.id)).size,activeExtrusions:map.getStyle().layers.filter(l=>l.type==='fill-extrusion'&&l.layout?.visibility!=='none').map(l=>l.id),status:document.querySelector('.building-status')?.textContent};});
    requireCondition(result.renderedFeatures>0,`${name}: no visible sourced buildings`);requireCondition(result.activeExtrusions.length===1&&result.activeExtrusions[0]==='sg-buildings-extrusion','Duplicate building systems');
    if(outputDirectory)await page.screenshot({path:`${outputDirectory}/${name}.png`});results.push({name,...result});
  }
  return results;
}
