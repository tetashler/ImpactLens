import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,appendFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
test('task guard forwards real request shapes, counts before dispatch and retains unknown reservations offline',()=>{
 const dir=mkdtempSync(join(tmpdir(),'impact-staged-guard-'));
 try{
 const script=`process.env.IMPACTLENS_GUARD_OFFLINE_TEST_DIRECTORY=${JSON.stringify(dir)};process.env.IMPACTLENS_STAGED_LIVE_GUARD='true';let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({model:'deepseek/deepseek-v4-flash-0731',provider:'DigitalOcean',usage:{prompt_tokens:10,completion_tokens:10,cost:0.001},choices:[{finish_reason:'stop'}]})};const g=await import('./scripts/testing/staged-live-guard.mjs');g.armAttempt();const b={model:'deepseek/deepseek-v4-flash-0731',provider:{only:['digitalocean'],allow_fallbacks:false,require_parameters:true},reasoning:{effort:'none',exclude:true},stream:false,max_tokens:800,response_format:{type:'json_schema',json_schema:{name:'stakeholder_turn_v1'}}};for(let i=0;i<8;i++){const r=new Request('https://openrouter.ai/api/v1/chat/completions',{method:'POST',body:JSON.stringify(b)});await fetch(r)}let blocked=false;try{await fetch('https://openrouter.ai/api/v1/chat/completions',{body:JSON.stringify(b)})}catch{blocked=true}if(calls!==8||!blocked)throw Error('Guard failed finite Request-object boundary');g.finishAttempt('partial');g.armAttempt();globalThis.fetch;await fetch('https://api.tavily.com/search',{body:JSON.stringify({search_depth:'basic',max_results:5,auto_parameters:false})});g.finishAttempt('passed');let stopped=false;try{g.armAttempt()}catch{stopped=true}if(!stopped)throw Error('Guard must stop after first acceptance');`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:process.cwd(),encoding:'utf8',env:{...process.env,NODE_OPTIONS:''}});assert.equal(result.status,0,result.stderr);
 const d=JSON.parse(readFileSync(join(dir,'ledger.json'),'utf8'));assert.equal(d.requests.length,9);assert.equal(d.requests.filter((r:any)=>r.service==='openrouter').length,8);assert.equal(d.requests.at(-1).credits,null);assert.equal(d.requests.at(-1).reservedCredits,2);assert.equal(d.blocked[0].reason,6);
 const journal=readFileSync(join(dir,'ledger.jsonl'),'utf8').trimEnd().split('\n');assert.equal(JSON.parse(journal.at(-1)!).requests.length,9);
 appendFileSync(join(dir,'ledger.jsonl'),'{partial');const corrupt=spawnSync(process.execPath,['scripts/testing/staged-live-guard.mjs','status'],{cwd:process.cwd(),encoding:'utf8',env:{...process.env,NODE_OPTIONS:'',IMPACTLENS_GUARD_OFFLINE_TEST_DIRECTORY:dir}});assert.notEqual(corrupt.status,0);assert.match(corrupt.stderr,/Incomplete durable ledger/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
