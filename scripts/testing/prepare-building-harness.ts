/** Opt-in test-only browser modules. No application component or second map. */
import { stripTypeScriptTypes } from 'node:module';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
const out='public/geography/buildings-v1/harness';await mkdir(out,{recursive:true});
for(const name of ['contract','layer']){
  const source=await readFile(`lib/buildings/${name}.ts`,'utf8');
  await writeFile(`${out}/${name}.mjs`,stripTypeScriptTypes(source).replaceAll("'./contract.ts'","'./contract.mjs'"));
}
console.log('Prepared opt-in building adapter harness; import /geography/buildings-v1/harness/layer.mjs into the existing test map.');
