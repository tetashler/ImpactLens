/** Opt-in client smoke test. Run against a separately owned, mock-preloaded server. */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { parseScenarioResponse, type ScenarioRequest } from '../../lib/scenarios/contract.ts';
const base = process.env.PHASE7B_HTTP_BASE_URL ?? 'http://127.0.0.1:3117';
const provider = process.env.PHASE56_TEST_PROVIDER ?? 'none';
const control = process.env.PHASE56_TEST_CONTROL_FILE;
function controls(mode = 'valid') { if (control) writeFileSync(control,JSON.stringify({mode,delayMs:0})); }
const post = (body:unknown, contentType='application/json') => fetch(`${base}/api/scenarios/plan`,{method:'POST',headers:{'Content-Type':contentType},body:typeof body === 'string' ? body : JSON.stringify(body)});
const input = (question:string):ScenarioRequest => ({version:1,clientRequestId:crypto.randomUUID(),question});
controls();
const measurements: unknown[] = [];
for (const question of ['Build three new MRT stations between Choa Chu Kang and Sengkang','Open a new Active Ageing Centre in Bukit Merah','Build a new polyclinic in Sengkang','What if Singapore left ASEAN?']) {
  const request = input(question), t = performance.now(), response = await post(request), text = await response.text();
  assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'no-store');
  const result = await parseScenarioResponse(JSON.parse(text),request);
  assert.equal(result.plan.executionState,'not-executed');
  if (question.includes('polyclinic')) assert.equal(result.plan.capabilityId,'evidence-exploration-v1');
  if (question.includes('ASEAN')) assert.equal(result.plan.readiness,'needs-evidence');
  if (question.includes('MRT') || question.includes('Active Ageing')) assert.equal(result.method,provider === 'none' ? 'deterministic-fallback' : 'ai-assisted');
  measurements.push({question,method:result.method,capabilityId:result.plan.capabilityId,latencyMs:Math.round((performance.now()-t)*100)/100,responseBytes:Buffer.byteLength(text),requestBytes:Buffer.byteLength(JSON.stringify(request))});
}
for (const [body,type,status] of [['{','application/json',400],['{}','text/plain',415],['x'.repeat(16_385),'application/json',413]] as const) assert.equal((await post(body,type)).status,status);
assert.equal((await fetch(`${base}/api/scenarios/plan`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://external.invalid'},body:JSON.stringify(input('Build new MRT stations'))})).status,403);
if (provider !== 'none' && control) {
  try {
    for (const mode of ['invalid','invalid-json','rate-limit']) {
      controls(mode); const request = input('Build new MRT stations'), response = await post(request);
      assert.equal(response.status,200);
      const result = await parseScenarioResponse(await response.json(),request);
      assert.equal(result.method,'deterministic-fallback');
      assert.equal(result.providerStatus,mode === 'rate-limit' ? 'unavailable' : 'invalid-response');
    }
  } finally { controls(); }
}
console.log(JSON.stringify({provider,measurements,checks:'passed'},null,2));
