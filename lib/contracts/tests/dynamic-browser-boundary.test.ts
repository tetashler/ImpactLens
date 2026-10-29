import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
test('dynamic browser modules have no server/provider/fixture imports or executable HTML rendering',()=>{
 const seen=new Set<string>();function walk(url:URL){if(seen.has(url.href))return;seen.add(url.href);const source=readFileSync(url,'utf8');assert.doesNotMatch(source,/dangerouslySetInnerHTML|process\.env|OPENROUTER_API_KEY|GEMINI_API_KEY/);
 for(const match of source.matchAll(/import(?!\s+type)\s+(?:[^;'"\n]*?\sfrom\s*)?['"]([^'"]+)['"]/g)){const name=match[1];assert.doesNotMatch(name,/node:|\/server\/|fixtures|testing/);if(name.startsWith('.')){for(const suffix of ['','.ts','.tsx']){const child=new URL(name+suffix,url);if(/\.tsx?$/.test(child.pathname)&&existsSync(child)){walk(child);break;}}}}
 }
 for(const name of ['../../../lib/dynamic-scenarios/client.ts','../../../lib/dynamic-scenarios/projection.ts','../../../components/dynamic-scenario-view.tsx'])walk(new URL(name,import.meta.url));assert.ok(seen.size>5);
});
