import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {PublicScenarioSession} from '../../question-simulation/public-session.ts';
test('a preparation transport timeout rejects instead of silently leaving the controller preparing',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:1800000000000});const session=new PublicScenarioSession();let dispatched=false;
 const work=session.execute({version:1,question:'What if working hours changed?',geometry:{version:1,scenarioId:'review-timeout',features:[]},geometryRevision:0},'timeout-key',async(_url,init)=>{dispatched=true;return new Promise((_resolve,reject)=>init!.signal!.addEventListener('abort',()=>reject(Error('aborted')),{once:true}));},50);
 const rejected=assert.rejects(work,/timed out/i);for(let i=0;i<15;i++)await Promise.resolve();assert.ok(dispatched);t.mock.timers.tick(50);await rejected;
});
