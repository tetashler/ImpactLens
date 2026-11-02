/** Browser-safe shape only. Statement packs are used internally by ReportWriter, never as an HTTP response. */
export interface PublicDiscussionEvidence {
 version:1;
 scope:string;
 /** Eligible public statements before bounded selection. */
 initialStatements:number;
 followupStatements:number;
 omitted:number;
 statements:{id:string;actor:string;nodeIds:string[];phase:'initial'|'followup';text:string}[];
 nodes:{nodeId:string;label:string;kind:string;description:string}[];
}

export const PUBLIC_DISCUSSION_LIMITS=Object.freeze({statements:32,statementCharacters:700,nodes:16,descriptionCharacters:320});
