import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlotStore} from '../../plots/store.ts';
import {planConfirmedAnchor} from '../../plots/anchor.ts';

test('confirmed route and dot update is one undoable geometry edit',()=>{
 const store=createPlotStore({scenarioId:'anchor-store'});
 store.setMode('line');store.addVertex({lat:1.35,lon:103.75});store.addVertex({lat:1.35,lon:103.8});store.finishLine();
 const route=store.getSnapshot().geometry.features.find(f=>f.kind==='line')!;
 const dot=store.addPoint({lat:1.35,lon:103.775},'station');
 const before=structuredClone(store.getSnapshot().geometry),revision=store.getSnapshot().revision;
 const proposal=planConfirmedAnchor(before,dot,{lat:1.351,lon:103.775},route.id);
 store.applyGeometry(proposal.geometry);
 assert.equal(store.getSnapshot().revision,revision+1);assert.deepEqual(store.getSnapshot().geometry,proposal.geometry);
 store.undo();assert.deepEqual(store.getSnapshot().geometry,before);
 store.redo();assert.deepEqual(store.getSnapshot().geometry,proposal.geometry);
 assert.throws(()=>store.applyGeometry({invalid:true}));assert.deepEqual(store.getSnapshot().geometry,proposal.geometry);
});
