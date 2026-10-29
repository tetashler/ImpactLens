import test from 'node:test';
import assert from 'node:assert/strict';
import {assertAcceptanceBudget} from './dynamic-live-debug.mjs';
const ledger=()=>({task:'dynamic-live-20261029',ceilingUsd:0.5,reservationUsd:0.02,maxCalls:60,calls:[]});
test('acceptance guard includes reserved unknown charges and rejects the next call above the ceiling',()=>{
 const l=ledger();l.calls=Array.from({length:24},()=>({accountedUsd:0.02,costUsd:null}));assert.doesNotThrow(()=>assertAcceptanceBudget(l));
 l.calls.push({accountedUsd:0.000001,costUsd:0.000001});assert.throws(()=>assertAcceptanceBudget(l),/ceiling reached/);
 l.calls=Array.from({length:60},()=>({accountedUsd:0.000001}));assert.throws(()=>assertAcceptanceBudget(l),/ceiling reached/);
});
test('acceptance guard fails closed for corrupt costs or modified ceiling metadata',()=>{
 for(const cost of [undefined,null,NaN,Infinity,-1,0]){const l=ledger();l.calls=[{accountedUsd:cost}];assert.throws(()=>assertAcceptanceBudget(l),/Invalid acceptance ledger/);}
 for(const field of ['ceilingUsd','reservationUsd','maxCalls']){const l=ledger();l[field]*=2;assert.throws(()=>assertAcceptanceBudget(l),/Invalid acceptance ledger/);}
});
