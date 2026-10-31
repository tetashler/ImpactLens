/** Pure task acceptance checks. No credentials, files, provider calls or recovery. */
const check=(value,code)=>{if(!value)throw Error(code);};
export function liveProviderAdmission(env,now=Date.now()){
 const deadlineMs=Number(env.SOCIAL_PROVIDER_DEADLINE_MS);
 check(env.STAKEHOLDER_LIVE_ENABLED==='true'&&env.SOCIAL_LLM_ENABLED==='true'&&env.SOCIAL_SWARM_SIZE==='50'&&env.SOCIAL_MAX_DECISIONS==='350'&&env.SOCIAL_PROVIDER_MAX_CALLS==='350'&&env.SOCIAL_PROVIDER_TOKEN_LIMIT==='16000000'&&env.SOCIAL_PROVIDER_COST_USD==='1'&&!env.SOCIAL_STORAGE_ROOT,'LIVE_CONFIGURATION');
 check(Number.isSafeInteger(deadlineMs)&&deadlineMs>now&&deadlineMs<=now+5_400_000,'LIVE_CONFIGURATION');
 return {maxCalls:350,reservedTokens:16_000_000,costUsd:1,deadlineMs};
}
export function frozenLiveProviderAdmission(grant,preflight){
 const expected=preflight?.providerAdmission,created=preflight?.createdAtMs;
 check(expected?.maxCalls===350&&expected.reservedTokens===16_000_000&&expected.costUsd===1&&Number.isSafeInteger(created)&&Number.isSafeInteger(expected.deadlineMs)&&expected.deadlineMs>created&&expected.deadlineMs<=created+5_400_000,'AUDIT_ADMISSION');
 check(grant&&['maxCalls','reservedTokens','costUsd','deadlineMs'].every(key=>grant[key]===expected[key]),'AUDIT_ADMISSION');
 return {...expected};
}
export function liveAcceptedTerminal(job,society,prefix='LIVE'){
 const fail=code=>prefix+'_'+code,c=society?.clock,s=society?.swarm,calls=society?.usage?.calls,tick=society?.tick;
 check(job?.profileId==='multi-day-50-320-v1'&&job.totalSteps===320&&job.capacity===350&&job.admittedCalls===350&&s?.profileId===job.profileId&&s.executionPolicy==='multi-day-swarm-v1'&&s.activeAgents===50&&s.llmCapableAgents===35&&s.maxCalls===350&&society.totalSteps===320,fail('PROFILE'));
 check(Number.isSafeInteger(tick)&&tick>=0&&tick<=320&&Number.isSafeInteger(calls)&&calls>=0&&calls<=350&&job.tick===tick&&job.remainingCalls===350-calls&&job.acceptedDecisions===society.usage.accepted,fail('ACCOUNTING'));
 const absolute=480+tick*15,day=1+Math.floor(absolute/1440);
 check(c?.version===1&&c.policy==='multi-day-swarm-v1'&&c.profileId===job.profileId&&c.timeZone==='Asia/Singapore'&&c.tickMinutes===15&&c.anchor==='Day 1 08:00'&&c.elapsedMinutes===tick*15&&c.day===day&&c.hour===Math.floor(absolute%1440/60)&&c.minute===absolute%60&&Array.isArray(c.daily)&&c.daily.length===day&&c.daily.every((d,i)=>d.day===i+1),fail('CALENDAR'));
 check(c.daily.reduce((n,d)=>n+d.opportunities,0)===s.opportunities&&c.daily.reduce((n,d)=>n+d.acceptedDecisions,0)===society.usage.accepted,fail('CALENDAR'));
 check(job.status==='completed'&&tick===320&&society.phase==='completed'||job.status==='budget-limited'&&society.phase==='partial',fail('TERMINAL'));
 return job.status;
}
