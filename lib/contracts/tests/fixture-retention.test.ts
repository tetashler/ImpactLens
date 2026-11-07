import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,lstatSync,mkdirSync,mkdtempSync,readdirSync,readFileSync,renameSync,rmdirSync,symlinkSync,unlinkSync,writeFileSync} from 'node:fs';
import {basename,join,resolve} from 'node:path';
import {createOfflineTestFixture,finishOfflineTestFixture} from '../../../scripts/testing/fixture-retention.ts';

const temporaryRoot=resolve('tmp');

// Teardown only touches directories this test invocation created; links are unlinked, never traversed.
function removeFreshDirectory(directory:string){
 assert.equal(resolve(directory,'..'),temporaryRoot);
 assert.ok(basename(directory).startsWith('fixture-retention-test-'));
 const remove=(path:string)=>{const stat=lstatSync(path);if(stat.isDirectory()&&!stat.isSymbolicLink()){for(const name of readdirSync(path))remove(join(path,name));rmdirSync(path);}else unlinkSync(path);};
 if(existsSync(directory))remove(directory);
}

function fixture(t:test.TestContext){
 const result=createOfflineTestFixture('fixture-retention-test-');
 t.after(()=>removeFreshDirectory(result.directory));
 return result;
}

test('successful new offline fixtures are removed only after their inspected contents pass',t=>{
 const owned=fixture(t);writeFileSync(join(owned.directory,'ledger.json'),'synthetic');
 assert.equal(readFileSync(join(owned.directory,'ledger.json'),'utf8'),'synthetic');
 assert.equal(finishOfflineTestFixture(owned,true),'removed');
 assert.equal(existsSync(owned.directory),false);
});

test('failed runs and explicit artifact retention leave their evidence intact',t=>{
 const failed=fixture(t);writeFileSync(join(failed.directory,'ledger.json'),'failed synthetic');
 assert.equal(finishOfflineTestFixture(failed,false),'retained-failure');
 assert.equal(readFileSync(join(failed.directory,'ledger.json'),'utf8'),'failed synthetic');
 assert.deepEqual(JSON.parse(readFileSync(join(failed.directory,'.test-artifact-retention.json'),'utf8')),{version:1,reason:'failure'});
 const kept=fixture(t),prior=process.env.IMPACTLENS_KEEP_TEST_ARTIFACTS;
 try{process.env.IMPACTLENS_KEEP_TEST_ARTIFACTS='1';assert.equal(finishOfflineTestFixture(kept,true),'retained-requested');assert.ok(existsSync(kept.directory));assert.deepEqual(JSON.parse(readFileSync(join(kept.directory,'.test-artifact-retention.json'),'utf8')),{version:1,reason:'requested'});}
 finally{if(prior===undefined)delete process.env.IMPACTLENS_KEEP_TEST_ARTIFACTS;else process.env.IMPACTLENS_KEEP_TEST_ARTIFACTS=prior;}
});

test('Markdown protects the whole fixture including linked local assets',t=>{
 const owned=fixture(t);mkdirSync(join(owned.directory,'notes'));mkdirSync(join(owned.directory,'assets'));
 writeFileSync(join(owned.directory,'notes','Review.MD'),'![evidence](../assets/plot.png)');
 writeFileSync(join(owned.directory,'assets','plot.png'),'linked asset');
 assert.equal(finishOfflineTestFixture(owned,true),'retained-markdown');
 assert.equal(readFileSync(join(owned.directory,'assets','plot.png'),'utf8'),'linked asset');
 assert.ok(existsSync(join(owned.directory,'notes','Review.MD')));
});

test('unowned paths and root escapes cannot acquire cleanup authority',t=>{
 const owned=fixture(t);
 for(const directory of [temporaryRoot,resolve(temporaryRoot,'..'),resolve(temporaryRoot,'../tmp-other/fixture-retention-test-123456'),owned.directory]){
  assert.throws(()=>finishOfflineTestFixture({directory},true),/not owned/i);
 }
 assert.throws(()=>createOfflineTestFixture('../fixture-retention-test-'),/prefix/i);
 assert.throws(()=>createOfflineTestFixture('real-paid-ledger-'),/prefix/i);
 assert.ok(existsSync(owned.directory));
});

test('a symlink or junction preserves the fixture and never touches its external target',t=>{
 const owned=fixture(t),external=fixture(t);writeFileSync(join(external.directory,'keep.json'),'external evidence');
 symlinkSync(external.directory,join(owned.directory,'external'),process.platform==='win32'?'junction':'dir');
 assert.equal(finishOfflineTestFixture(owned,true),'retained-link');
 assert.equal(readFileSync(join(external.directory,'keep.json'),'utf8'),'external evidence');
 assert.ok(lstatSync(join(owned.directory,'external')).isSymbolicLink());
});

test('replacing an owned root with a junction does not grant authority over its target',t=>{
 const owned=fixture(t),external=fixture(t),archive=mkdtempSync(join(temporaryRoot,'fixture-retention-test-'));
 rmdirSync(archive);renameSync(owned.directory,archive);t.after(()=>removeFreshDirectory(archive));
 writeFileSync(join(external.directory,'keep.json'),'external evidence');
 symlinkSync(external.directory,owned.directory,process.platform==='win32'?'junction':'dir');
 assert.throws(()=>finishOfflineTestFixture(owned,true),/changed|link/i);
 assert.throws(()=>finishOfflineTestFixture(owned,false),/changed|link/i);
 assert.equal(existsSync(join(external.directory,'.test-artifact-retention.json')),false);
 assert.equal(readFileSync(join(external.directory,'keep.json'),'utf8'),'external evidence');
});
