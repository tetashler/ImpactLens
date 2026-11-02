import type {KnowledgeNode} from './contract.ts';

const sentence=(text:string)=>/[.!?]$/.test(text.trim())?text.trim():`${text.trim()}.`;
const number=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value.toLocaleString('en-SG',{maximumFractionDigits:3}):'unknown';
const text=(value:unknown)=>typeof value==='string'&&value.trim()?value.trim():null;

export interface NodeSummaryContext {question?:string;socialCalls?:number;initialStatements?:number}
/** Only existing public fields: no retrieval, inference or mutation on click. */
export function nodeSummary(node:KnowledgeNode,context:NodeSummaryContext={}):string {
  const p=node.properties,parts:string[]=[];
  const question=text(context.question);
  const initialViews=()=>{if(context.socialCalls===0)parts.push(context.initialStatements===0?'No AI follow-up discussion occurred, and no initial views were recorded.':'No AI follow-up discussion occurred; only initial views are available.');};
  const fact=(key:string,label:string)=>{if(p[key]!==undefined)parts.push(`${label}: ${number(p[key])}.`);};
  const description=()=>{if(node.description.trim())parts.push(sentence(node.description));};
  switch(p.recordType){
    case 'citizen-commute-aggregate':
      parts.push('Compares calculated journey times before and after the proposal for fictional residents. Workplaces and travel patterns are synthetic assumptions. Only journeys with a rail route in both cases are compared (the comparable rail subset).');
      fact('representedAgents','Fictional citizen records');fact('representedPopulation','Represented population weight');fact('comparableWeight','Comparable population weight');
      parts.push(`Mean minutes saved in that subset: ${number(p.meanMinutesSaved)}.`);
      parts.push(`Coverage: ${number(p.unknownAgents)} unknown; ${number(p.notApplicableAgents)} not applicable citizen records.`);
      break;
    case 'fictional-agent-aggregate':
      parts.push(`These ${number(p.members??p.representedAgents)} fictional participants provide background perspectives${question?` on the question “${question}”`:' in this scenario'}.`);
      parts.push('Their public statements can help explain the concerns they expressed, but their presence in the graph does not establish a shared position. Without a summary of their public discussion, we cannot assess whether they support the proposal, oppose it, or agree with each other.');
      break;
    case 'communication-platform':
      parts.push(`${node.label} is a simulated discussion space for fictional participants${question?` exploring the question “${question}”`: ' to discuss the scenario'}.`);
      initialViews();
      break;
    case 'fictional-messaging-group':
      parts.push(`${node.label} is a fictional messaging group${question?` in the scenario about “${question}”`: ' in this scenario'}.`);
      if(text(p.purpose))parts.push(`The group is intended to ${text(p.purpose)!.replace(/[.!?]$/,'')}.`);
      initialViews();
      break;
    case 'role':
    case 'fictional-agent':
    case 'generated-agent': {
      // A participant can use the role shape. Identity comes from fields, not shape.
      const role=typeof p.agentId!=='string'&&(typeof p.roleId==='string'||p.recordType==='role');
      parts.push(role?'A fictional scenario role used to explore this perspective.':'A fictional participant whose views are assumed for this scenario.');
      if(text(p.persistentGoal))parts.push(`What they want: ${sentence(text(p.persistentGoal)!)}`);
      if(text(p.simulatedPosition))parts.push(`Their stated view: ${sentence(text(p.simulatedPosition)!)}`);
      initialViews();
      break;
    }
    default:
      parts.push({
        'model-assumption':'An assumption used in this scenario, not a verified fact.',
        'synthetic-exploratory':'An AI-generated part of the fictional scenario. It is unverified and does not describe observed behaviour.',
        calculated:'A calculated model result, subject to its stated scope and assumptions.',
        'planning-only':'An idea or plan included in the scenario. No outcome has been established.',
        'source-backed':'Information attributed to a source. Open the source details to check what it supports.',
        'user-authored':'Context supplied by the user for this scenario.',
      }[node.provenance.kind]);
      if(node.description.trim())description();else parts.push('No further description is available.');
  }
  return [...new Set(parts)].join(' ');
}
