// Playwright MCP fixture benchmark; requires world-graph-browser-check to have
// attached window.__worldRenderer in the last isolated browser context.
async (page) => {
 const p=page.context().browser().contexts().at(-1).pages()[0],results=[];
 await p.setViewportSize({width:1440,height:900});
 for(const count of [20,100,300]){
  const initial=await p.evaluate(count=>{
   const host=document.createElement('div');host.id='world-benchmark';host.style.cssText='position:fixed;inset:90px 30px 30px;z-index:9999;background:#0d1525;border:1px solid #456';document.body.append(host);
   const provenance={kind:'planning-only',reference:'Synthetic renderer performance fixture; not simulated agents'};
   const graph={version:1,scenarioIdentity:'world-browser-phase2b-benchmark-'+count,nodes:Array.from({length:count},(_,i)=>({id:'n'+i,label:'Benchmark entity '+i,entityType:i%2?'Fixture company':'Fixture institution',category:'planning',description:'Performance fixture only',provenance,properties:{},limitations:[]})),edges:Array.from({length:count-1},(_,i)=>({id:'e'+i,source:'n'+Math.floor(i/2),target:'n'+(i+1),relationship:'connects',relationshipLabel:'TEST_LINK',description:'Artificial benchmark relation',provenance,directed:true})),limitations:['Performance fixture only']};
   window.__worldBench={start:performance.now(),frames:[],longTasks:[],host};
   try{window.__worldBench.observer=new PerformanceObserver(list=>window.__worldBench.longTasks.push(...list.getEntries().map(e=>e.duration)));window.__worldBench.observer.observe({type:'longtask',buffered:false});}catch{}
   const r=new window.__worldRenderer.constructor(host,graph,()=>{});window.__worldBench.renderer=r;
   window.__worldBench.raf=requestAnimationFrame(function frame(t){const b=window.__worldBench;if(!b)return;if(b.last)b.frames.push(t-b.last);b.last=t;b.raf=requestAnimationFrame(frame);});
   return {constructMs:r.layoutMs};
  },count);
  await p.waitForFunction(()=>!window.__worldBench.renderer.snapshot().physics.running,{},{timeout:25000});
  const settleMs=await p.evaluate(()=>performance.now()-window.__worldBench.start);
  await p.evaluate(()=>window.__worldBench.renderer.fit());
  await p.screenshot({path:`tmp/world-kg/phase2b-benchmark-${count}.png`});
  const before=await p.evaluate(()=>{const b=window.__worldBench,r=b.renderer,n=r.core.getElementById('n0'),other=r.core.getElementById('n1'),box=b.host.getBoundingClientRect();return {x:box.x+n.renderedPosition('x'),y:box.y+n.renderedPosition('y'),neighbour:{...other.position()}};});
  await p.mouse.move(before.x,before.y);await p.mouse.down();
  for(let i=1;i<=8;i++){await p.mouse.move(before.x+i*8,before.y-i*3);await p.waitForTimeout(50);}
  const moved=await p.evaluate(()=>{const r=window.__worldBench.renderer;return {neighbour:{...r.core.getElementById('n1').position()},active:r.snapshot().physics.alphaTarget===.3};});
  await p.mouse.up();
  const summary=await p.evaluate(()=>{
   const b=window.__worldBench,s=b.renderer.snapshot(),frames=[...b.frames].sort((a,b)=>a-b);
   const result={ticks:s.physics.ticks,nodes:s.nodes,edges:s.edges,frameMedianMs:frames[Math.floor(frames.length/2)],frameP95Ms:frames[Math.floor(frames.length*.95)],longTasks:b.longTasks.length,maxLongTaskMs:Math.max(0,...b.longTasks)};
   cancelAnimationFrame(b.raf);b.observer?.disconnect();b.renderer.dispose();b.host.remove();delete window.__worldBench;return result;
  });
  results.push({...initial,settleMs,...summary,dragActivated:moved.active,neighbourMovement:Math.hypot(moved.neighbour.x-before.neighbour.x,moved.neighbour.y-before.neighbour.y)});
 }
 return results;
}
