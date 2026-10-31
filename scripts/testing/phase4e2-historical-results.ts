/** Pure aggregation of replay observations; this never reads, repairs, or replays an archive. */
export interface HistoricalReplayObservation {
 file:string;replayExact:boolean;archiveUnchanged:boolean;journalUnchanged:boolean;checkpointTailExact?:boolean|null;
}
export interface HistoricalAcceptanceFailure {file?:string;code:string}
export interface HistoricalClassifiedObservation {
 file:string;classification:string;qualification:string;replayStatus:string;hashesVerified:boolean;
 recordIndex:number;tick:number;sourcePolicyRecoverable:false;
}
export interface HistoricalAcceptanceInput {
 expectedMandatory:string[];qualifying:HistoricalReplayObservation[];failures:HistoricalAcceptanceFailure[];
 classified:HistoricalClassifiedObservation[];approvedFile:string;
}
export interface HistoricalAcceptanceResult {
 mandatory:{status:'PASS'|'FAIL';expected:number;passed:number;failures:HistoricalAcceptanceFailure[]};
 inventory:{status:'COMPLETE_WITH_CLASSIFIED_UNRESOLVED'|'INCOMPLETE';qualifying:number;classified:HistoricalClassifiedObservation[];unresolved:number};
}

const approvedArtifact='f62d6f5e112fc640aa275e193f31fc0eb909032445c106fe4fedcbdf1fa1a916.json';
const nonempty=(value:unknown):value is string=>typeof value==='string'&&value.trim().length>0;

/** expectedMandatory contains only qualifying archives, excluding the single approved classification. */
export function historicalAcceptanceResult(input:HistoricalAcceptanceInput):HistoricalAcceptanceResult {
 const failures:HistoricalAcceptanceFailure[]=[];
 const fail=(code:string,file?:string)=>failures.push(file===undefined?{code}:{file,code});
 const expected=Array.isArray(input.expectedMandatory)?input.expectedMandatory:[];
 const qualifying=Array.isArray(input.qualifying)?input.qualifying:[];
 const candidates=Array.isArray(input.classified)?input.classified:[];
 const observedFailures=Array.isArray(input.failures)?input.failures:[];
 if(input.approvedFile!==approvedArtifact)fail('HISTORICAL_APPROVED_FILE');
 if(!Array.isArray(input.expectedMandatory)||expected.length===0)fail('HISTORICAL_EXPECTED_EMPTY');
 if(!Array.isArray(input.qualifying))fail('HISTORICAL_QUALIFYING_SHAPE');
 if(!Array.isArray(input.failures))fail('HISTORICAL_FAILURES_SHAPE');

 const expectedFiles=new Set<string>();
 for(const file of expected){
  if(!nonempty(file))fail('HISTORICAL_EXPECTED_ID');
  else if(file===approvedArtifact)fail('HISTORICAL_CLASSIFIED_IS_MANDATORY',file);
  else if(expectedFiles.has(file))fail('HISTORICAL_EXPECTED_DUPLICATE',file);
  else expectedFiles.add(file);
 }

 const classified:HistoricalClassifiedObservation[]=[];
 if(candidates.length!==1)fail('HISTORICAL_CLASSIFICATION_COUNT');
 else {
  const row=candidates[0];
  if(row&&input.approvedFile===approvedArtifact&&row.file===approvedArtifact
   &&row.classification==='pre-final-mocked-development-artifact'
   &&row.qualification==='nonqualifying-for-mandatory-historical-replay'
   &&row.replayStatus==='unresolved-SOCIAL_STALE'&&row.hashesVerified===true
   &&row.recordIndex===0&&row.tick===1&&row.sourcePolicyRecoverable===false){
   classified.push({file:row.file,classification:row.classification,qualification:row.qualification,replayStatus:row.replayStatus,
    hashesVerified:true,recordIndex:0,tick:1,sourcePolicyRecoverable:false});
  }else fail('HISTORICAL_CLASSIFICATION_INVALID',nonempty(row?.file)?row.file:undefined);
 }

 const failedFiles=new Set<string>();
 let classifiedFailureObserved=false;
 for(const failure of observedFailures){
  if(!failure||!nonempty(failure.code)||(failure.file!==undefined&&!nonempty(failure.file))){fail('HISTORICAL_FAILURE_SHAPE');continue;}
  if(classified.length===1&&failure.file===approvedArtifact&&failure.code==='SOCIAL_STALE'){
   classifiedFailureObserved=true;continue;
  }
  fail(failure.code,failure.file);
  if(failure.file!==undefined)failedFiles.add(failure.file);
 }
 if(!classifiedFailureObserved)fail('HISTORICAL_CLASSIFIED_FAILURE_MISSING',approvedArtifact);

 const seen=new Set<string>(),passedFiles=new Set<string>();
 for(const row of qualifying){
  if(!row||!nonempty(row.file)){fail('HISTORICAL_QUALIFYING_ID');continue;}
  if(seen.has(row.file)){fail('HISTORICAL_QUALIFYING_DUPLICATE',row.file);passedFiles.delete(row.file);continue;}
  seen.add(row.file);
  if(!expectedFiles.has(row.file)){fail('HISTORICAL_QUALIFYING_UNEXPECTED',row.file);continue;}
  if(row.replayExact!==true||row.archiveUnchanged!==true||row.journalUnchanged!==true
   ||(row.checkpointTailExact!==undefined&&row.checkpointTailExact!==null&&row.checkpointTailExact!==true)){
   fail('HISTORICAL_QUALIFYING_FAILED',row.file);continue;
  }
  if(!failedFiles.has(row.file))passedFiles.add(row.file);
 }
 for(const file of expectedFiles)if(!seen.has(file))fail('HISTORICAL_QUALIFYING_MISSING',file);
 const passed=passedFiles.size,complete=failures.length===0;
 return {
  mandatory:{status:complete?'PASS':'FAIL',expected:expected.length,passed,failures},
  inventory:{status:complete?'COMPLETE_WITH_CLASSIFIED_UNRESOLVED':'INCOMPLETE',qualifying:passed,classified,unresolved:classified.length},
 };
}
