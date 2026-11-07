import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePilotReviews} from '../../decision-pilot/core.ts';
import {newReviewTimer, startReviewTimer, pauseReviewTimer, reviewElapsed, reviewWallElapsed, buildPilotReview, exportPilotReviews, readPacketUpload} from '../../decision-pilot/reviewer.ts';

// All content here is TEST-ONLY software verification data, never participant evidence.
const packet = {
  version:1 as const, kind:'decision-pilot-packet' as const, studyId:'a'.repeat(64), reviewerId:'TEST01', id:'b'.repeat(64),
  items:Array.from({length:6},(_,i)=>({id:`TEST01:test-case-${i+1}`,caseId:`test-case-${i+1}`,order:i+1,question:'TEST-ONLY question?',decisionQuestion:'TEST-ONLY: Is the evidence sufficient for a research next step?',brief:'TEST-ONLY hypothetical brief.',sources:[{id:'test-source',title:'TEST-ONLY source',url:'https://example.org/test',publisher:'Test fixture',accessedAt:'2026-11-07',summary:'Test only.'}],discussion:[]})),
};
const draft={concerns:'Access concern\nCost concern',concernReferences:'test-source\n',stakeholders:'Older residents\nCarers',claims:'Claim to check',claimReferences:'test-source',questions:'What access barriers need research?',decision:'supported' as const};

test('review timer counts active intervals separately and preserves over-limit elapsed time',()=>{
  const idle=newReviewTimer();
  assert.equal(reviewElapsed(idle,50_000),0);
  const running=startReviewTimer(idle,1000);
  assert.equal(reviewElapsed(running,2500),1500);
  const paused=pauseReviewTimer(running,3000);
  assert.equal(reviewElapsed(paused,90_000),2000);
  assert.equal(reviewWallElapsed(paused,41_000),40_000);
  const resumed=startReviewTimer(paused,100_000);
  assert.equal(reviewElapsed(resumed,101_000),3000);
  assert.equal(reviewElapsed(resumed,20_000_000),19_902_000);
  assert.equal(startReviewTimer(pauseReviewTimer(resumed,20_000_000),21_000_000).runningSince,null);
  const hidden=pauseReviewTimer(startReviewTimer(newReviewTimer(),0),10_000);
  assert.equal(reviewElapsed(hidden,40_000),10_000);
  assert.equal(reviewWallElapsed(hidden,40_000),40_000);
  assert.equal(reviewWallElapsed(hidden,86_400_000),86_400_000);
  assert.throws(()=>buildPilotReview(packet,packet.items[0],draft,10_000,86_400_000),/time/i);
  const fractional=pauseReviewTimer(startReviewTimer(pauseReviewTimer(startReviewTimer(newReviewTimer(),0),0.6),0.7),1.3);
  assert.equal(reviewElapsed(fractional,1.3),1);
  assert.equal(reviewWallElapsed(fractional,1.3),1);
});

test('saved responses bind exact packet items and explicit references with sequential category IDs',()=>{
  const review=buildPilotReview(packet,packet.items[0],draft,2500,40_000,'2026-11-07T00:00:00.000Z');
  assert.equal(review.id,'TEST01:test-case-1');
  assert.equal(review.itemId,'TEST01:test-case-1');
  assert.deepEqual(review.concerns,[{id:'concern-1',text:'Access concern',referenceIds:['test-source']},{id:'concern-2',text:'Cost concern',referenceIds:[]}]);
  assert.deepEqual(review.questions,[{id:'question-1',text:'What access barriers need research?'}]);
  assert.equal(review.independent,true);
  assert.equal(review.activeMilliseconds,2500);
  assert.equal(review.elapsedMilliseconds,40_000);
  const exported=parsePilotReviews(exportPilotReviews(packet,[review]));
  assert.equal(exported.reviews.length,1);
  assert.equal(exported.packetId,'b'.repeat(64));
  assert.throws(()=>buildPilotReview(packet,packet.items[0],{...draft,concernReferences:'unknown-source'},10,10),/reference/i);
  assert.throws(()=>buildPilotReview(packet,packet.items[0],{...draft,concerns:Array(13).fill('x').join('\n')},10,10),/12/);
  assert.throws(()=>buildPilotReview(packet,packet.items[0],{...draft,questions:'x'.repeat(1201)},10,10),/1,?200/);
  assert.throws(()=>buildPilotReview(packet,packet.items[0],{...draft,concerns:'First concern\n\nSecond concern',concernReferences:'test-source\n\ntest-source'},10,10),/blank/i);
  assert.throws(()=>buildPilotReview(packet,packet.items[0],{...draft,decision:''},10,10),/decision/i);
});

test('upload rejects oversize inputs before reading and accepts only verified reviewer packets',async()=>{
  let read=false;
  await assert.rejects(readPacketUpload({size:300*1024+1,text:async()=>{read=true;return '{}';}}),/300/);
  assert.equal(read,false);
  await assert.rejects(readPacketUpload({size:12,text:async()=>'{invalid'}),/JSON/i);
  await assert.rejects(readPacketUpload({size:10,text:async()=>JSON.stringify({kind:'decision-pilot-study'})}),/packet|version|unexpected/i);
});
