import {createSociety} from '../../society/engine.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {buildPopulation,populationView} from '../../server/population/store.ts';
import {selectCommunication} from '../../society/communication.ts';
import {HYBRID_DEFAULTS} from '../../society/decision-contract.ts';
import {decodeMenuDecision} from '../../society/decision-menu.ts';
import type {DecisionContext} from '../../society/decision-contract.ts';

export const intelligence={version:1,scheduling:'conversation-windows-v1',context:'conversation-menu-v2',memory:'episodic-v1',rules:'attention-v1',episodicEntries:32,readCooldown:4,responseCooldown:8,postCooldown:12} as const;
const population=populationView(buildPopulation({size:10000,seed:'phase4d-offline'}));
export function phase4dWorld(agents=24,activation=0,legacy=false){
 const f=worldFixtures()[0];
 return createSociety({runId:'phase4d-fixture',question:f.request.question,seed:'phase4d',population,roles:f.draft.agents,jurisdictions:f.draft.jurisdictions,socialPolicy:'memory-aware-v1',sharePolicy:'source-position-v1',hybrid:{...HYBRID_DEFAULTS},communication:selectCommunication([{id:'rd',name:'Reddit',typeId:'t'},{id:'wa',name:'WhatsApp',typeId:'t'},{id:'ig',name:'Instagram',typeId:'t'}],[{id:'t',name:'Communication platform'}],['Workweek safeguards','Service continuity']),acceptedActions:f.draft.agents.map((a,i)=>({id:'seed-'+i,roleId:a.id,statement:i===0?'How will monthly wage protection be maintained?':'Service continuity and explicit safeguards need discussion.',position:'conditional'})),config:{agents,activation},...(!legacy?{intelligence}:{})} as Parameters<typeof createSociety>[0]);
}
export function fixtureDecision(c:DecisionContext,action='inactive',targetId?:string,text='A fictional contextual response addressing the recorded safeguard.'){
 const option=c.menu!.find(m=>m.action===action&&(targetId===undefined||m.targetKind==='item'&&c.items[m.targetIndex!].id===targetId));
 if(!option)throw Error('Fixture requires an actually offered '+action);
 return decodeMenuDecision({choiceId:option.id,text:['post','comment','reply','message','group-reply'].includes(action)?text:null,motivation:'Consider the actual encountered concern and persistent goal.',recallIds:[],stanceId:'keep',discussion:{topicIds:[],argument:'unspecified'},...(c.policy==='conversation-menu-v2'?{issueUpdate:null}:{})},c);
}
