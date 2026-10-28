// Opt-in browser acceptance on Terminal 2's owned port. Never imported by the app.
export async function attachGraph(page){
  return page.evaluate(()=>{
    const n=document.querySelector('.kg-canvas');let f=n?.[Object.keys(n).find(k=>k.startsWith('__reactFiber'))];
    for(let d=0;f&&d<20;d++,f=f.return)for(const t of [f,f.alternate]){let s=t?.memoizedState;for(let i=0;s&&i<80;i++,s=s.next){const v=s.memoizedState?.current;if(v?.core&&typeof v.snapshot==='function'&&!v.core.destroyed()){window.__g7Renderer=v;return v.snapshot();}}}
    throw new Error('Graph renderer unavailable');
  });
}
export async function inspectThreeLevels(page,label){
  await page.getByRole('searchbox',{name:'Search graph',exact:true}).fill(label);
  await page.locator('.kg-search-results button').first().click();
  await attachGraph(page);
  const before=await page.evaluate(()=>window.__g7Renderer.snapshot());
  await page.getByRole('button',{name:'Expand inspector',exact:true}).click();
  await page.getByRole('button',{name:'Full-window details',exact:true}).click();
  if(!await page.getByRole('dialog').isVisible())throw new Error('Full-window dialog missing');
  await page.screenshot({path:'test-results/phase7g/full-window.png',timeout:15000});
  await page.keyboard.press('Escape');
  if(!await page.getByRole('button',{name:'Full-window details',exact:true}).evaluate(e=>e===document.activeElement))throw new Error('Focus not restored');
  const after=await page.evaluate(()=>window.__g7Renderer.snapshot());
  if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Inspector altered graph layout or camera');
  return {before,after,focusRestored:true};
}
