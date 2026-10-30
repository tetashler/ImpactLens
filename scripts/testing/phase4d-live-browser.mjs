// Run through Playwright with an explicit question only after arming the durable task guard.
async(page,configuration={})=>{
 if(configuration.operation==='start'){
  if(configuration.authorised!==true||typeof configuration.question!=='string')throw Error('LIVE_BROWSER_NOT_ARMED');
  const context=await page.context().browser().newContext({viewport:{width:1440,height:900}}),p=await context.newPage();
  await p.addInitScript(()=>{
   window.__phase4dLive={network:[],latest:null,errors:[],posts:0};
   const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,x])=>[k,stable(x)])):v;
   const forbidden=v=>v&&typeof v==='object'?Object.entries(v).flatMap(([k,x])=>['world','hybrid','memories','memoryIds','episodic','issues','statement','text','content','recentDecisions'].includes(k)?[k]:forbidden(x)):[];
   const fetcher=window.fetch;window.fetch=async(...args)=>{const r=await fetcher(...args),url=new URL(typeof args[0]==='string'?args[0]:args[0].url,location.href);if(/\/api\/(?:scenario-simulate|social-simulate)$/.test(url.pathname)){
    const bytes=await r.clone().text();let v;try{v=JSON.parse(bytes);}catch{window.__phase4dLive.network.push({route:url.pathname,status:r.status,invalidJson:true});return r;}
    const metadata={route:url.pathname,status:r.status,bytes:bytes.length,forbiddenFields:forbidden(v),rawMarker:bytes.includes('RAW_')};window.__phase4dLive.network.push(metadata);
    if(v.kind==='summary-execution'){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(stable(v))));window.__phase4dLive.latest={runId:v.runId,planId:v.planId,question:v.question,status:v.status,initialActions:v.initialActions.length,roles:v.roles.length,graph:{nodes:v.graph.nodes.map(n=>({id:n.id,label:n.label,recordType:n.properties.recordType})),edges:v.graph.edges.length},society:v.society?{phase:v.society.phase,tick:v.society.tick,counts:v.society.counts,usage:v.society.usage,conversation:v.society.conversation,platforms:v.society.platforms.map(p=>({id:p.id,name:p.name})),groups:v.society.groups.map(g=>({id:g.id,name:g.name}))}:null,canonicalHash:[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('')};}
    else if(v.kind==='planning-failed')window.__phase4dLive.failure={code:v.error?.code,validation:v.error?.validation,stage:v.error?.diagnostic?.stage,reason:v.error?.diagnostic?.reason,accounting:v.accounting,retrieval:v.retrieval};
    else if(r.status>=400)window.__phase4dLive.failure={status:r.status,code:typeof v.error==='string'?v.error:v.code??'PUBLIC_FAILURE'};
   }return r;};
  });
  p.on('pageerror',()=>void p.evaluate(()=>window.__phase4dLive.errors.push('PAGE_ERROR')).catch(()=>{}));p.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/api/scenario-simulate'))void p.evaluate(()=>window.__phase4dLive.posts++);});
  await p.goto('http://127.0.0.1:3198');await p.getByRole('textbox',{name:'Your scenario question',exact:true}).fill(configuration.question);await p.getByRole('button',{name:'Explore',exact:true}).click();return {started:true,question:configuration.question};
 }
 const p=page.context().browser().contexts().flatMap(c=>c.pages()).filter(p=>p.url().startsWith('http://127.0.0.1:3198')).at(-1);if(!p)throw Error('LIVE_PAGE_UNAVAILABLE');
 return await p.evaluate(()=>({network:window.__phase4dLive.network,latest:window.__phase4dLive.latest,failure:window.__phase4dLive.failure,errors:window.__phase4dLive.errors,explores:window.__phase4dLive.posts,hasSocialTab:[...document.querySelectorAll('button')].some(b=>b.textContent==='Social Simulation')}));
}
