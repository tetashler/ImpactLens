import test from 'node:test';
import assert from 'node:assert/strict';
import {AiError} from '../../server/ai/errors.ts';
import {providerRateLimitError,aiRateLimitHeaders} from '../../server/ai/rate-limit.ts';

test('only valid provider Retry-After guidance is forwarded; no local fallback is invented',t=>{
 t.mock.method(Date,'now',()=>Date.UTC(2026,10,3));
 const cases:[string|null,number|undefined][]=[
  ['0',1],['1',1],['86401',86400],['999999999999999999999999999999999999999',86400],
  ['Tue, 03 Nov 2026 00:00:15 GMT',15],['Mon, 02 Nov 2026 23:59:45 GMT',1],
  [null,undefined],['nonsense',undefined],['-1',undefined],['1.5',undefined],
 ];
 for(const [value,seconds]of cases){
  const error=providerRateLimitError(new Headers(value===null?{}:{'Retry-After':value}));
  assert.equal(error.retryAfterSeconds,seconds,value??'absent');
  assert.equal(error.code,'AI_RATE_LIMIT');assert.equal(error.status,429);
  assert.deepEqual(aiRateLimitHeaders(error),seconds===undefined?{}:{'Retry-After':String(seconds)});
  assert.doesNotMatch(error.message,/local cooldown|blocks new requests/i);
 }
});

test('each response forwards its own provider guidance without remembering previous waits',()=>{
 assert.equal(providerRateLimitError(new Headers({'Retry-After':'30'})).retryAfterSeconds,30);
 assert.equal(providerRateLimitError(new Headers({'Retry-After':'2'})).retryAfterSeconds,2);
 assert.equal(providerRateLimitError(new Headers()).retryAfterSeconds,undefined);
});

test('HTTP response hints require a trusted rate-limit error and bounded integer seconds',()=>{
 assert.deepEqual(aiRateLimitHeaders(providerRateLimitError(new Headers({'Retry-After':'15'}))),{'Retry-After':'15'});
 for(const value of [undefined,0,-1,1.5,86401,Infinity,NaN])assert.deepEqual(aiRateLimitHeaders(new AiError('safe','AI_RATE_LIMIT',429,undefined,value)),{});
 assert.deepEqual(aiRateLimitHeaders({code:'AI_RATE_LIMIT',retryAfterSeconds:15}),{});
 assert.deepEqual(aiRateLimitHeaders(new AiError('safe','AI_UPSTREAM',503,undefined,15)),{});
});
