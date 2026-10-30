/** Browser-safe aggregate values only. No event IDs, message text, memories or issue records. */
export interface DiscussionSummary {
 version:1;
 authoredItems:number;
 uniqueAuthors:number;
 modelAuthoredDecisions:number;
 classifiedDecisions:number;
 unclassifiedItems:number;
 arguments:Record<'concern'|'condition'|'support'|'question'|'disagreement',number>;
 topicCoverage:{label:string;decisions:number}[];
 stakeholderCategories:string[];
 followups:number;
 peerReplies:number;
 maxDepth:number;
 actualPositionChanges:number;
 openIssues:number;
 resolvedIssues:number;
 withdrawnIssues:number;
 timeline:{period:'early'|'middle'|'late';authoredItems:number;classifiedDecisions:number;followups:number;positionChanges:number}[];
}
export interface ConversationMetrics {opportunityTicks:number[];eligiblePeerReplies:number;includedPeerReplies:number;omittedPeerReplies:number;contextOmissions:number;peerReplies:number;maxDepth:number;memoryLinkedDecisions:number}
