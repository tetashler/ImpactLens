import test from 'node:test';
import assert from 'node:assert/strict';
import {protectPrivateConversationSummaries} from '../../server/graph-conversation-privacy.ts';
import type {PublicExplore} from '../../society/public-contract.ts';
import type {GraphSummaryWriterEvidence} from '../../server/graph-summary-evidence.ts';
const run={society:{agents:[{id:'private-actor-123',label:'Fictional Agent Example'}]},roles:[]} as unknown as PublicExplore;
const evidence={channelDiscussions:[{nodeId:'whatsapp',visibility:'private',statements:[{text:'The proposed clinic should extend evening appointments so working families can attend follow-ups without missing work.'}]}]} as unknown as GraphSummaryWriterEvidence;
test('private conversation outputs do not persist known speaker identities but public node summaries are unchanged',()=>{
 const result=protectPrivateConversationSummaries(run,evidence,[{nodeId:'whatsapp',summary:'Fictional Agent Example requested evening appointments; private-actor-123 asked about follow-up access.'},{nodeId:'reddit',summary:'Fictional Agent Example discussed current care.'}]);
 assert.doesNotMatch(result[0].summary,/Fictional Agent Example|private-actor-123/);
 assert.match(result[0].summary,/evening appointments/);
 assert.match(result[1].summary,/Fictional Agent Example/);
});
test('substantial verbatim private message copies are rejected before cache writes, while paraphrases remain eligible',()=>{
 const verbatim='One participant said: The proposed clinic should extend evening appointments so working families can attend follow-ups without missing work.';
 assert.throws(()=>protectPrivateConversationSummaries(run,evidence,[{nodeId:'whatsapp',summary:verbatim}]),{code:'GRAPH_SUMMARY_PRIVATE_QUOTE'});
 const paraphrase=[{nodeId:'whatsapp',summary:'The discussion focused on evening access for working families. A participant requested later appointments, and no response to that request was recorded.'}];
 assert.deepEqual(protectPrivateConversationSummaries(run,evidence,paraphrase),paraphrase);
});
