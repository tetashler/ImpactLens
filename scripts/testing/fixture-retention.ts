import {lstatSync,mkdirSync,mkdtempSync,readdirSync,realpathSync,rmdirSync,unlinkSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

// Test-only capability: existing paths can never be registered for deletion.
const workspace=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const temporaryRoot=join(workspace,'tmp');
const prefixes=new Set([
 'admission-cold-process-test-',
 'admission-timeout-smoke-guard-test-',
 'conversation-menu-v5-guard-test-',
 'hybrid-map-v2-guard-test-',
 'fixture-retention-test-',
]);
export type OfflineTestFixture=Readonly<{directory:string}>;
type Ownership={directory:string;canonical:string;device:bigint;inode:bigint;prefix:string};
const owned=new WeakMap<OfflineTestFixture,Ownership>();
const samePath=(left:string,right:string)=>process.platform==='win32'?left.toLowerCase()===right.toLowerCase():left===right;

function verifyTemporaryRoot(){
 const stat=lstatSync(temporaryRoot);
 if(stat.isSymbolicLink()||!stat.isDirectory()||!samePath(realpathSync(temporaryRoot),join(realpathSync(workspace),'tmp')))
  throw Error('Offline fixture tmp root changed or is a link');
}

export function createOfflineTestFixture(prefix:string):OfflineTestFixture{
 if(!prefixes.has(prefix))throw Error('Unknown offline fixture prefix');
 mkdirSync(temporaryRoot,{recursive:true});verifyTemporaryRoot();
 const directory=mkdtempSync(join(temporaryRoot,prefix)),stat=lstatSync(directory,{bigint:true});
 const fixture=Object.freeze({directory});
 owned.set(fixture,{directory,canonical:realpathSync(directory),device:stat.dev,inode:stat.ino,prefix});
 return fixture;
}

function verifyOwned(fixture:OfflineTestFixture,authority:Ownership){
 verifyTemporaryRoot();
 const expectedParent=resolve(authority.directory,'..');
 if(!samePath(expectedParent,temporaryRoot)||!samePath(fixture.directory,authority.directory)||
    !authority.directory.startsWith(join(temporaryRoot,authority.prefix)))throw Error('Offline fixture path escaped its owned prefix');
 const stat=lstatSync(authority.directory,{bigint:true});
 if(stat.isSymbolicLink()||!stat.isDirectory()||stat.dev!==authority.device||stat.ino!==authority.inode||
    !samePath(realpathSync(authority.directory),authority.canonical))throw Error('Offline fixture root changed or is a link');
}

type Protection='retained-markdown'|'retained-link';
function protection(directory:string):Protection|undefined{
 for(const name of readdirSync(directory)){
  const path=join(directory,name),stat=lstatSync(path);
  if(/\.md$/i.test(name))return 'retained-markdown';
  if(stat.isSymbolicLink())return 'retained-link';
  if(stat.isDirectory()){const found=protection(path);if(found)return found;}
 }
}

// Deliberately avoid recursive rm: lstat every entry and never descend into links.
function removeTree(directory:string,canonicalRoot:string){
 const stat=lstatSync(directory),canonical=realpathSync(directory);
 if(stat.isSymbolicLink()||!stat.isDirectory()||
    !(samePath(canonical,canonicalRoot)||canonical.startsWith(canonicalRoot+sep)))throw Error('Offline fixture directory changed or is a link');
 for(const name of readdirSync(directory)){
  const path=join(directory,name),child=lstatSync(path);
  if(child.isSymbolicLink())throw Error('Offline fixture acquired a link during cleanup');
  if(/\.md$/i.test(name))throw Error('Offline fixture acquired Markdown during cleanup');
  if(child.isDirectory())removeTree(path,canonicalRoot);else unlinkSync(path);
 }
 rmdirSync(directory);
}

/** Call only after the child process, all assertions, and optional artifact inspection finish. */
export function finishOfflineTestFixture(fixture:OfflineTestFixture,passed:boolean):
 'removed'|'retained-failure'|'retained-requested'|Protection{
 const authority=owned.get(fixture);
 if(!authority)throw Error('Offline fixture is not owned by this process');
 verifyOwned(fixture,authority);
 if(!passed||process.env.IMPACTLENS_KEEP_TEST_ARTIFACTS==='1'){
  const reason=passed?'requested':'failure';
  // Exclusive creation never overwrites an existing path or follows a marker symlink.
  try{writeFileSync(join(authority.directory,'.test-artifact-retention.json'),JSON.stringify({version:1,reason})+'\n',{flag:'wx'});}
  catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;}
  return passed?'retained-requested':'retained-failure';
 }
 const protectedReason=protection(authority.directory);
 if(protectedReason)return protectedReason;
 verifyOwned(fixture,authority);removeTree(authority.directory,authority.canonical);owned.delete(fixture);
 return 'removed';
}
