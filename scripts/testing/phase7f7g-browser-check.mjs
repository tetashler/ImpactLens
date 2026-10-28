// Opt-in helpers for the real integrated application; no production debug hooks.
const requireIntegration=(value,message)=>{if(!value)throw new Error(message);};
export async function captureCitizenRig(page){return page.evaluate(()=>{
  const scene=window._citizenScenes.find(s=>s.children.some(o=>o.isInstancedMesh&&o.count));
  if(!scene)throw new Error('No visible citizen scene');
  const parts=scene.children.filter(o=>o.isInstancedMesh);
  const ring=scene.children.find(o=>o.isMesh&&!o.isInstancedMesh&&o.geometry?.type==='RingGeometry'&&o.visible);
  return{matrices:parts.map(o=>({name:o.name,matrix:[...o.instanceMatrix.array.slice(0,16)]})),root:ring?{x:ring.position.x,y:ring.position.y}:null};
});}
// Call with an accepted MRT result and the journey inspector visible.
export async function rerunClearsGraph(page,attachGraph){
  let release,seen;const held=new Promise(r=>release=r),started=new Promise(r=>seen=r);
  const handler=async route=>{seen();await held;await route.fulfill({status:500,json:{error:'Deliberate integration failure'}}).catch(()=>{});};
  await page.route('**/api/simulate',handler);
  try{await page.getByRole('button',{name:'Run simulation',exact:true}).click();await started;
    await page.getByRole('button',{name:'Knowledge Graph',exact:true}).click();await page.waitForTimeout(500);await attachGraph(page);
    const pending=await page.evaluate(()=>window.__g7Renderer.core.nodes('[category="result"]').length);
    requireIntegration(pending===0,'Obsolete MRT result survived a pending rerun');release();await page.waitForTimeout(250);
    const failed=await page.evaluate(()=>window.__g7Renderer.core.nodes('[category="result"]').length);
    requireIntegration(failed===0,'Failed rerun restored old MRT graph results');return{pending,failed};
  }finally{release();await page.unroute('**/api/simulate',handler);}
}
export async function exactPosePause(page){
  const controls=page.locator('.citizens-panel');await controls.getByRole('button',{name:'Pause',exact:true}).click();
  await page.waitForTimeout(100);const first=await captureCitizenRig(page);await page.waitForTimeout(600);
  requireIntegration(JSON.stringify(first)===JSON.stringify(await captureCitizenRig(page)),'Paused citizen pose changed');return first;
}
