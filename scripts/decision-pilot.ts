/** Local pilot preparation only. No contacts, generation, inference or private-store reads. */
import {existsSync,mkdirSync,readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {pilotCases} from '../lib/decision-pilot/cases.ts';
import {attachPilotDiscussion} from '../lib/decision-pilot/authoring.ts';
import {analysePilot,makePilotStudy,makeReviewerPacket,parsePilotCase,parsePilotReviews,parsePilotStudy,parsePilotCoding,pilotHash} from '../lib/decision-pilot/core.ts';
import type {PilotCase,PilotReviews,PilotCoding} from '../lib/decision-pilot/core.ts';

const fail=(code:string):never=>{throw Error(code);};
function json(path:string){if(!statSync(path).isFile()||statSync(path).size>300000)fail('PILOT_INPUT_BYTES');return JSON.parse(readFileSync(path,'utf8'));}
function exclusive(path:string,value:unknown){mkdirSync(dirname(path),{recursive:true});writeFileSync(path,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{encoding:'utf8',flag:'wx',mode:0o600});}
function directory(path:string){if(existsSync(path))fail('PILOT_OUTPUT_EXISTS');mkdirSync(dirname(path),{recursive:true});mkdirSync(path,{mode:0o700});}
function casesFrom(path?:string):PilotCase[]{const input=path?json(path):pilotCases;if(!Array.isArray(input)||input.length!==6)fail('PILOT_SIX_CASES_REQUIRED');const result=input.map(parsePilotCase);if(new Set(result.map(c=>c.id)).size!==6)fail('PILOT_DUPLICATE_CASE');return result;}
function reviewFiles(path:string):PilotReviews[]{return readdirSync(path).filter(name=>name.endsWith('.json')).sort().map(name=>parsePilotReviews(json(join(path,name))));}
try{
 const [command,...args]=process.argv.slice(2);
 if(!command){console.log('Commands: questions --out <new-directory>; attach --case <id> --report <public-report.json> [--cases <cases.json>] --out <new-cases.json>; build --cases <cases.json> --reviewers R01,R02,R03 --seed <seed> --out <new-directory>; analyse --study <study.json> --reviews <directory> [--coding <final-coding.json>] --out <new-directory>');}
 else{
  const allowed:Record<string,string[]>={questions:['out'],attach:['case','report','cases','out'],build:['cases','reviewers','seed','out'],analyse:['study','reviews','coding','out']};
  if(!Object.hasOwn(allowed,command)||args.length%2)fail('PILOT_ARGUMENTS');
  const options:Record<string,string>={};for(let i=0;i<args.length;i+=2){const key=args[i].slice(2);if(!args[i].startsWith('--')||!allowed[command].includes(key)||Object.hasOwn(options,key)||!args[i+1]?.trim())fail('PILOT_ARGUMENTS');options[key]=args[i+1];}
  const requireOption=(key:string)=>options[key]??fail('PILOT_REQUIRED_'+key.toUpperCase());
  const out=resolve(requireOption('out'));
  if(command==='questions'){
   const cases=casesFrom();directory(out);exclusive(join(out,'cases.json'),cases);
   exclusive(join(out,'generation-questions.md'),'# Exact pilot generation questions\n\nNo discussion has been generated. Run each exact question in ImpactLens, review the result and download its evidence JSON. Do not substitute test fixtures or handcrafted dialogue.\n\n'+cases.map(c=>`## ${c.id}\n\n${c.generationQuestion}\n`).join('\n'));
   exclusive(join(out,'README.md'),'# Author materials, not reviewer packets\n\nAll sites and changes are hypothetical. Sources are retained authored paraphrases inspected on 2026-11-07. Review source fit and provisional stakeholder keys with an independent practitioner before freezing the study. No human evaluation has occurred.\n\nGenerate real ImpactLens discussion using the exact questions, then attach each public report with the attach command. These excerpts are bounded; inspect privacy and provenance before use. Keep this author folder away from reviewers.\n');
   console.log(JSON.stringify({status:'awaiting-discussion',cases:6,prepared:0,out}));
  }else if(command==='attach'){
   const cases=casesFrom(options.cases),id=requireOption('case'),index=cases.findIndex(c=>c.id===id);if(index<0)fail('PILOT_CASE_UNKNOWN');
   cases[index]=parsePilotCase(attachPilotDiscussion(cases[index],json(requireOption('report'))));exclusive(out,cases);
   console.log(JSON.stringify({status:'discussion-attached',prepared:cases.filter(c=>c.supplement!==null).length,total:6,out}));
  }else if(command==='build'){
   const study=await makePilotStudy(casesFrom(requireOption('cases')),requireOption('reviewers').split(','),requireOption('seed'));
   const packets=await Promise.all(study.reviewerIds.map(id=>makeReviewerPacket(study,id)));
   directory(out);exclusive(join(out,'study.json'),study);for(const packet of packets)exclusive(join(out,packet.reviewerId+'.packet.json'),packet);
   exclusive(join(out,'README.md'),'# Pilot distribution\n\nKeep study.json private to the facilitator/coders: it contains allocation and provisional reference keys. Give each independent reviewer only their own .packet.json and the reviewer instructions in docs/DECISION_USEFULNESS_PILOT.md. Open /evaluation in ImpactLens. No review has been collected yet.\n');
   console.log(JSON.stringify({status:'ready-for-human-review',reviewers:packets.length,studyId:study.id,out}));
  }else{
   const study=parsePilotStudy(json(requireOption('study'))),reviews=reviewFiles(requireOption('reviews'));
   let coding:PilotCoding[]=[];if(options.coding){const input=json(options.coding);if(!Array.isArray(input))fail('PILOT_CODING_ARRAY');coding=input.map(parsePilotCoding);}
   const analysis=await analysePilot(study,reviews,coding);directory(out);exclusive(join(out,'analysis.json'),analysis);
   const raw=reviews.flatMap(file=>file.reviews);
   exclusive(join(out,'coding-template.json'),await Promise.all(raw.map(async review=>({reviewId:review.id,reviewHash:await pilotHash(review),coderId:'REPLACE_WITH_CODER_PSEUDONYM',usefulConcernIds:null,missedStakeholders:null,unsupportedClaimIds:null,additionalUnsupportedClaims:null,actionableQuestionIds:null,decisionCorrect:null,notes:'Incomplete worksheet; nulls deliberately fail validation. Independently code and adjudicate before analysis.'}))));
   exclusive(join(out,'README.md'),'# Descriptive pilot analysis\n\nRead analysis.json and the method in docs/DECISION_USEFULNESS_PILOT.md. Missing quality judgments remain null. coding-template.json is intentionally incomplete: do not convert unknown ratings to empty arrays or false without human review. Keep separate initial coder worksheets and disagreements, then produce one adjudicated final coding array. No causal benefit, resident fidelity or demand validation follows from these small descriptive results.\n');
   console.log(JSON.stringify({status:analysis.status,out}));
  }
 }
}catch(error){
 const code=error instanceof Error&&/^PILOT_[A-Z_]+$/.test(error.message)?error.message:'PILOT_COMMAND_FAILED';
 // Contract errors contain bounded field labels, not file paths, source contents or private diagnostics.
 const message=error instanceof Error&&error.message.startsWith('Decision pilot: ')?error.message.slice(0,240):undefined;
 console.error(JSON.stringify({error:code,...(message?{message}:{})}));process.exitCode=1;
}
