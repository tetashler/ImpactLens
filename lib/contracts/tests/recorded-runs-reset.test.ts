import assert from 'node:assert/strict';
import test from 'node:test';
import {resetRecordedRunStorage} from '../../question-simulation/recorded-runs-reset.ts';

const marker='impactlens:recorded-runs-reset:v1';
function storage(entries:Record<string,string>={}){
 const data=new Map(Object.entries(entries));
 return {data,get length(){return data.size;},key:(index:number)=>[...data.keys()][index]??null,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}};
}

test('a reset removes only recorded runs and automatic artifact markers',()=>{
 const kept={'impactlens:appearance':'light','impactlens:plots:v1':'drawing','impactlens:experiments:v1':'configuration','unrelated':'keep','impactlens:summary-history:v10':'keep'};
 const value=storage({...kept,'impactlens:summary-run:first':'run','impactlens:summary-run:second':'run','impactlens:summary-history:v1':'history','impactlens:society:legacy':'world','impactlens:auto-report:v1:summary:run:key':'attempted','impactlens:auto-report-deferred:v1:detailed:run:key':'skipped','impactlens:auto-graph-summary:v1:run:key':'attempted'});
 assert.equal(resetRecordedRunStorage(value,'epoch-one'),true);
 assert.deepEqual(Object.fromEntries(value.data),{...kept,[marker]:'epoch-one'});
});

test('repeating the same reset preserves runs created after that reset',()=>{
 const value=storage({'impactlens:summary-run:old':'old'});
 resetRecordedRunStorage(value,'epoch-one');value.setItem('impactlens:summary-run:new','new');
 assert.equal(resetRecordedRunStorage(value,'epoch-one'),false);
 assert.equal(value.getItem('impactlens:summary-run:new'),'new');
});

test('a missing reset id leaves all storage untouched',()=>{
 const value=storage({'impactlens:summary-run:old':'old'});
 assert.equal(resetRecordedRunStorage(value,undefined),false);assert.equal(resetRecordedRunStorage(value,''),false);
 assert.deepEqual(Object.fromEntries(value.data),{'impactlens:summary-run:old':'old'});
});

test('a changed reset id removes newly recorded runs once',()=>{
 const value=storage({[marker]:'epoch-one','impactlens:summary-run:new':'new'});
 assert.equal(resetRecordedRunStorage(value,'epoch-two'),true);
 assert.deepEqual(Object.fromEntries(value.data),{[marker]:'epoch-two'});
});

test('an empty store records the reset without requesting a reload',()=>{
 const value=storage();assert.equal(resetRecordedRunStorage(value,'epoch-one'),false);
 assert.equal(value.getItem(marker),'epoch-one');assert.equal(resetRecordedRunStorage(value,'epoch-one'),false);
});
