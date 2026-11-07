import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,writeFileSync,readFileSync,existsSync,symlinkSync,renameSync,utimesSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
const parent=resolve('tmp/workspace-cleanup-tests');mkdirSync(parent,{recursive:true});
async function setup(){const module=await import('../../../scripts/maintenance/workspace-cleanup.ts').catch(()=>null);assert.ok(module?.planWorkspaceCleanup,'safe cleanup planner required');const root=mkdtempSync(join(parent,'fixture-'));mkdirSync(join(root,'.git'));writeFileSync(join(root,'package.json'),'{"name":"impactlens-pre-hackathon-research"}');return {module,root};}
function file(root:string,path:string,content:string){const target=join(root,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,content);return target;}

test('preview does not delete and apply preserves Markdown folders, linked assets, data and baselines',async()=>{
 const {module,root}=await setup();file(root,'.next/cache/cache.bin','generated');file(root,'.next/dev/output.js','generated');file(root,'tmp/phase4e/private-tests/service-old/journal.jsonl','offline fixture');
 const doc=file(root,'docs/research.md','[image](../tmp/phase4e/private-tests/service-linked/image.png)');file(root,'tmp/phase4e/private-tests/service-linked/image.png','linked evidence');file(root,'tmp/phase4e/private-tests/service-md/notes.md','documentation');file(root,'tmp/phase4e/private-tests/service-md/attachment.json','keep whole documentation folder');
 const data=file(root,'data/derived/agents/accepted-private/run.json','real simulation');file(root,'tmp/phase4e/private-benchmark-5fgXoi/retained.json','baseline');
 const plan=module.planWorkspaceCleanup(root);assert.ok(existsSync(join(root,'.next/cache/cache.bin')));assert.ok(plan.bytes>0);
 const receipt=module.applyWorkspaceCleanup(plan);assert.ok(receipt.deletedBytes>0);assert.ok(!existsSync(join(root,'.next/cache/cache.bin')));assert.ok(!existsSync(join(root,'tmp/phase4e/private-tests/service-old/journal.jsonl')));
 assert.equal(readFileSync(doc,'utf8'),'[image](../tmp/phase4e/private-tests/service-linked/image.png)');assert.equal(readFileSync(data,'utf8'),'real simulation');assert.ok(existsSync(join(root,'tmp/phase4e/private-tests/service-linked/image.png')));assert.ok(existsSync(join(root,'tmp/phase4e/private-tests/service-md/attachment.json')));assert.ok(existsSync(join(root,'tmp/phase4e/private-benchmark-5fgXoi/retained.json')));
});

test('changed or forged plans fail before deleting anything',async()=>{
 const {module,root}=await setup();const path=file(root,'.next/cache/cache.bin','original');let plan=module.planWorkspaceCleanup(root);writeFileSync(path,'changed bytes');
 assert.throws(()=>module.applyWorkspaceCleanup(plan),/WORKSPACE_CLEANUP_CHANGED/);assert.ok(existsSync(path));assert.throws(()=>module.applyWorkspaceCleanup({...plan}),/WORKSPACE_CLEANUP_PLAN/);
 plan=module.planWorkspaceCleanup(root);file(root,'docs/new.md','new document after preview');assert.throws(()=>module.applyWorkspaceCleanup(plan),/WORKSPACE_CLEANUP_CHANGED/);
});

test('linked directories are never traversed and recent or retained fixture directories stay',async()=>{
 const {module,root}=await setup(),outside=mkdtempSync(join(parent,'outside-'));file(outside,'important.json','external evidence');mkdirSync(join(root,'.next/cache'),{recursive:true});symlinkSync(outside,join(root,'.next/cache/link'),process.platform==='win32'?'junction':'dir');file(root,'.next/cache/local.bin','cache');
 const recent=file(root,'tmp/admission-cold-process-test-recent/ledger.jsonl','recent failure');file(root,'tmp/conversation-menu-v5-guard-test-keep01/.test-artifact-retention.json','{"reason":"failure"}');const retained=file(root,'tmp/conversation-menu-v5-guard-test-keep01/ledger.jsonl','retain');const old=file(root,'tmp/conversation-menu-v5-guard-test-old001/ledger.jsonl','obsolete fixture');
 const prior=new Date(Date.now()-172800000);utimesSync(dirname(retained),prior,prior);utimesSync(dirname(old),prior,prior);
 module.applyWorkspaceCleanup(module.planWorkspaceCleanup(root));assert.equal(readFileSync(join(outside,'important.json'),'utf8'),'external evidence');assert.ok(existsSync(recent));assert.ok(existsSync(retained));assert.ok(!existsSync(old));
});

test('a junction substituted after preview and protected data changes block all deletion',async()=>{
 const {module,root}=await setup();const cache=file(root,'.next/cache/local.bin','cache');const protectedFile=file(root,'data/protected.json','protected');const plan=module.planWorkspaceCleanup(root);writeFileSync(protectedFile,'changed');assert.throws(()=>module.applyWorkspaceCleanup(plan),/WORKSPACE_CLEANUP_PROTECTED/);assert.ok(existsSync(cache));
 const newer=module.planWorkspaceCleanup(root),outside=mkdtempSync(join(parent,'replacement-'));file(outside,'local.bin','external');renameSync(join(root,'.next/cache'),join(root,'.next/original-cache'));symlinkSync(outside,join(root,'.next/cache'),process.platform==='win32'?'junction':'dir');assert.throws(()=>module.applyWorkspaceCleanup(newer),/WORKSPACE_CLEANUP_LINK/);assert.equal(readFileSync(join(outside,'local.bin'),'utf8'),'external');
});

test('Markdown URLs with parentheses, escaped spaces and HTML attachments remain intact',async()=>{
 const {module,root}=await setup();file(root,'docs/attachments.md','[one](../.next/cache/chart(1).png) [two](../.next/cache/chart\\ image.png) <img src="../.next/cache/html.png">');
 for(const name of ['chart(1).png','chart image.png','html.png'])file(root,'.next/cache/'+name,'linked');file(root,'.next/cache/disposable.bin','cache');
 module.applyWorkspaceCleanup(module.planWorkspaceCleanup(root));for(const name of ['chart(1).png','chart image.png','html.png'])assert.equal(readFileSync(join(root,'.next/cache',name),'utf8'),'linked');assert.ok(!existsSync(join(root,'.next/cache/disposable.bin')));
});

test('explicit private storage configuration overrides the generated artifact policy',async()=>{
 const {module,root}=await setup(),privateFile=file(root,'tmp/phase4e/private-tests/service-live/claim.json','configured private evidence');file(root,'.next/cache/cache.bin','cache');
 module.applyWorkspaceCleanup(module.planWorkspaceCleanup(root,Date.now(),[dirname(privateFile)]));assert.equal(readFileSync(privateFile,'utf8'),'configured private evidence');assert.ok(!existsSync(join(root,'.next/cache/cache.bin')));
});
