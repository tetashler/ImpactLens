import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptsMrtBinding, type MrtExecutionBinding } from '../../plots/execution.ts';
import { createPlotStore } from '../../plots/store.ts';

const plot={revision:7,key:'exact geometry A'};
const plan={capabilityId:'mrt-accessibility-v1',planId:'plan-A'};
const bound:MrtExecutionBinding={kind:'plot',...plot,routeId:'route',pointIds:['station-a','station-b'],planId:plan.planId};

test('only an explicitly confirmed current MRT plot enables execution',()=>{
  assert.equal(acceptsMrtBinding(bound,plan,plot),true);
  assert.equal(acceptsMrtBinding(null,plan,plot),false);
  assert.equal(acceptsMrtBinding(bound,null,plot),false);
});
test('unsupported and changed plans cannot reuse a previous MRT intervention',()=>{
  for(const capabilityId of ['aac-accessibility-v1','evidence-exploration-v1','stakeholder-exploration-v1'])assert.equal(acceptsMrtBinding(bound,{...plan,capabilityId},plot),false);
  assert.equal(acceptsMrtBinding(bound,{...plan,planId:'plan-B'},plot),false);
});
test('every geometry edit invalidates binding, including A to B to A undo',()=>{
  assert.equal(acceptsMrtBinding(bound,plan,{revision:8,key:'geometry B'}),false);
  assert.equal(acceptsMrtBinding(bound,plan,{revision:9,key:plot.key}),false);
  assert.equal(acceptsMrtBinding(bound,plan,{...plot,key:'different geometry'}),false);
});
test('advanced execution requires its own explicit current-plan binding',()=>{
  const advanced:MrtExecutionBinding={kind:'advanced',planId:plan.planId};
  assert.equal(acceptsMrtBinding(advanced,plan,plot),true);
  assert.equal(acceptsMrtBinding(advanced,{...plan,planId:'plan-B'},plot),false);
  assert.equal(acceptsMrtBinding(advanced,{...plan,capabilityId:'aac-accessibility-v1'},plot),false);
});

test('selection, Explore/Edit tools and Escape without a stroke preserve confirmed geometry identity',()=>{
  const store=createPlotStore({scenarioId:'navigation'}),id=store.addPoint({lat:1.3,lon:103.8});
  const before=store.getSnapshot(),binding:MrtExecutionBinding={...bound,revision:before.revision,key:before.key};
  for(const mode of ['edit','anchor','point','station','line','explore'] as const){store.setMode(mode);store.select({id});assert.equal(acceptsMrtBinding(binding,plan,store.getSnapshot()),true);}
  store.cancel();assert.equal(acceptsMrtBinding(binding,plan,store.getSnapshot()),true);
  store.movePoint(id,{lat:1.31,lon:103.8});assert.equal(acceptsMrtBinding(binding,plan,store.getSnapshot()),false);
});
