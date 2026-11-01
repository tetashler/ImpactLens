import '../../../scripts/testing/offline-network.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import config from '../../../next.config.ts';
import {createRequire} from 'node:module';
test('production trace policy excludes private runtime histories and task evidence while retaining official source assets',()=>{
 const excluded=config.outputFileTracingExcludes?.['/*']??[];
 // Next resolves both globs and filenames from the project root before matching.
 const picomatch=createRequire(import.meta.url)('next/dist/compiled/picomatch'),normal=(path:string)=>path.replace(/^\.\//,''),isExcluded=(path:string)=>excluded.some(pattern=>picomatch(normal(pattern))(normal(path)));
 for(const privateFile of ['./data/derived/agents/accepted-private/archive.json','./data/derived/agents/social-sessions/session.jsonl','./data/derived/agents/social-sessions/session.materialized.json','./data/derived/agents/accepted-private/jobs/job.json','./data/derived/agents/session-store-v2/admission/slot-00.claim','./data/derived/agents/session-store-v2/accepted-private/archive.json','./data/derived/agents/session-store-v2/social-sessions/session.rejections-v1','./data/derived/agents/session-store-v2/social-sessions/session.materialized.json','./data/synthetic/citizens.json','./tmp/task/ledger.json'])assert.ok(isExcluded(privateFile),'Private runtime source must not be packaged: '+privateFile);
 for(const publicFile of ['./data/employment/singstat-census2020-ct17565/original.csv','./data/employment/singstat-census2020-ct17565/source-metadata.json','./data/transport/mrt-network/stations.txt','./data/transport/origin_destination_train_202609.csv','./data/demographics/census.csv','./data/geography/boundaries.geojson'])assert.ok(!isExcluded(publicFile),'Approved official runtime sources must remain traceable');
});
