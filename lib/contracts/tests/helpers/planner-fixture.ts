import {worldFixtures} from '../../../world-graph/fixtures.ts';
import {createGroundingBundle,groundingContentId} from '../../../grounding/contract.ts';
/** Offline only. Literal excerpt tests attribution, never source truth. */
export function plannerFixture(){
 const f=worldFixtures()[0],at='2026-10-29T00:00:00.000Z';
 const quote='Public institution discusses working arrangements.',sourceId=groundingContentId('s','https://www.mom.gov.sg/'),passageId=groundingContentId('p',quote);
 const grounding=createGroundingBundle({status:'retrieved',query:'Offline workweek fixture',retrievedAt:at,sources:[{id:sourceId,title:'Offline institution excerpt',url:'https://www.mom.gov.sg/',publisher:'www.mom.gov.sg',publishedAt:null,retrievedAt:at,passages:[{id:passageId,text:quote}]}],limitations:['Unverified offline fixture.'],usage:{searches:1,credits:null}});
 f.draft.ontology={version:1,entityTypes:[{id:'institution',name:'Public institution',description:'A contextual institution'}],relationshipTypes:[{id:'discusses',name:'DISCUSSES_WITH',description:'A proposed discussion'}],entities:[{id:'institution-a',name:'Public institution',typeId:'institution',jurisdictionId:'sg',support:{sourceId,passageId,quote}}],relationships:[{id:'discussion-a',source:'institution-a',target:'agent-1',typeId:'discusses',statement:'Working arrangements could be discussed.',support:null}]};
 return {...f,grounding};
}
