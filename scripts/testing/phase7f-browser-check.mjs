// Opt-in real-page checks through Playwright MCP. Uses Three's DevTools observer
// to inspect actual rendered matrices; no production debug globals or paid AI.
const check=(value,message)=>{if(!value)throw new Error(message);};
export async function citizenMovement(page,base='http://127.0.0.1:3000'){
  await page.addInitScript(()=>{
    window._citizenScenes=[];
    window.__THREE_DEVTOOLS__=new EventTarget();
    window.__THREE_DEVTOOLS__.addEventListener('observe',event=>{if(event.detail?.isScene)window._citizenScenes.push(event.detail);});
  });
  await page.goto(base);await page.bringToFront();
  await page.getByRole('button',{name:'Open General',exact:true}).press('Enter');
  await page.getByRole('button',{name:'Illustrative citizens',exact:true}).press('Enter');
  await page.waitForFunction(()=>document.querySelector('[data-pedestrian-position]')&&window._citizenScenes.some(s=>s.children.some(o=>o.isInstancedMesh&&o.count)));
  const controls=page.locator('.citizens-panel');
  const root=()=>{
    const scene=window._citizenScenes.find(s=>s.children.some(o=>o.isInstancedMesh&&o.count));
    return [...scene.children.find(o=>o.isInstancedMesh).instanceMatrix.array.slice(0,16)];
  };
  const position=async()=>JSON.parse(await page.getByLabel('Selected pedestrian position',{exact:true}).getAttribute('data-pedestrian-position'));
  await controls.getByRole('button',{name:'Reset',exact:true}).press('Enter');
  await page.waitForTimeout(100);const initial={matrix:await page.evaluate(root),visual:await position()};
  await controls.getByRole('button',{name:'Play',exact:true}).press('Enter');await page.waitForTimeout(5000);
  const moving={matrix:await page.evaluate(root),visual:await position()};
  const metres=Math.hypot(moving.matrix[12]-initial.matrix[12],moving.matrix[13]-initial.matrix[13]);
  check(metres>3.5,'Play must visibly displace the actor root, not only its limbs');
  await controls.getByRole('button',{name:'Pause',exact:true}).press('Enter');
  const paused=await page.evaluate(root);await page.waitForTimeout(600);
  check(JSON.stringify(paused)===JSON.stringify(await page.evaluate(root)),'Pause changed the rendered pose or location');
  await controls.getByRole('button',{name:'Reset',exact:true}).press('Enter');await page.waitForTimeout(100);
  check(JSON.stringify(initial.matrix)===JSON.stringify(await page.evaluate(root)),'Reset did not restore the exact initial matrix');
  check(initial.visual.agentId===moving.visual.agentId,'Movement changed the selected identity');
  return {initial,moving,metres,canvasCount:await page.locator('.maplibregl-canvas').count()};
}
