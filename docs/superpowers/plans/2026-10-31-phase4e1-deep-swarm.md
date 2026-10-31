# Phase4E.1 balanced deep-swarm implementation plan

**Goal:** Versioned350/700 opportunity capacity, meaningful long conversations, durable locally owned jobs, then a separately capped70-social-decision real acceptance.
**Architecture:** Add optional immutable `SwarmPolicy.deep` selected by `deepSwarmPolicy`; retain old factories/branches. Serial event-triggered substeps reuse current reducers/gateway. Private conversation windows retain complete exposure/access evidence outside the eight raw prompt items. Format2 journals retain immutable decisions, add bounded materialised checkpoints and owner-serialised recovery. A tracked local Node coordinator owns timers/abort/deadline/leases; public clients poll safe status and use explicit controls.
**Spec:** User's Phase4E.1 autonomous implementation prompt and the preceding in-conversation read-only research. No standalone research file is assumed.
**Stack:** Existing Next16.4.3/TypeScript/Node24 filesystem and DeepSeek gateway; no packages/services.

## Global constraints

- Main worktree/master only; preserve current edits and historical hashes. No Git mutations/deployment/.env edits or display/secondary directory/mobile work.
- New default50/35/deep350; larger100/70/deep700; quick24/4/8,50/35/64,100/70/128 unchanged.
- Deep80ticks,6/12sequential slots,soft10/hard16 per actor,concurrency1. No demanded activity quota.
- ST12/EP32/memory6/items8/context24000/output600/timeout30000 remain. Current model/provider restrictions unchanged.
- Before offlinePASS: network-blocked mocks only. Live task: <=3Explore,<=70social/attempt,<=240ORtotal,<=USD1reported+unknown reserves,<=3Tavily/6credits,no retries/evaluators/summaries. Stop after qualifying acceptance.
- Raw conversation/memory stays server-side; ordinary API/status/control/history/graph/report are allowlisted summaries.

## Ownership and integration contracts

| Owner | Files | Produces/consumes |
|---|---|---|
| Root | `swarm.ts`,new`deep-policy.ts`,`deep-scheduler.ts`,engine/hybrid/contracts/publicparser/summary/facts,liveguard,bench/doc integration | `deepSwarmPolicy(active,maxDecisions?)`, `isDeep(inputOrWorld)`, `deepLimits(input)`, `replayHybridFrom(base,tick,records,pending)`; metadata conversation fields |
| Conversation agent | exposure/communication/group-engine/episodic/retrieval/decision-menu,newdeep-context,focusedtests | Branch only when `w.genesis.input.swarm?.deep?.policy==='deep-swarm-v1'`; full ancestry<=64, actual reducer exposures; `deepConversationMetadata(w,actorId,itemIds)` for root context builder |
| Storage agent | server society service/swarm-journal,newcheckpoint/session-lock,focusedtests | Typed `socialOperation(body,d,signal?) -> Promise<SocialState>` (same start/step bodies); `checkpointSocialSession(sessionId,d)`; `SocialDependencies.admission` optional trusted maxCalls/tokens/USD/deadline; deep defaultprovider grant remainsquick64/128 unlessexplicit |
| Coordinator/UI agent | public-service,newcoordinator/job,statusAPI,hook/history/report/public-contract,desktophelpers,focusedtests | Uses typed `socialOperation`; tracked single-process Node job owner+durable exclusive lease, timer/Abort/deadline, explicit restartresume, compact safe status+controls; root ownsparser/summary and integrates sharedDTO |

New deep selector fields: `{version:1,policy:'deep-swarm-v1',maxDecisions:175|350|700,softAllowance:10,perThreadBurst:4,proactiveLimit:2,ancestryLimit:64,retention:'source-diverse-v1',context:'conversation-window-v1'}`. `SwarmPolicy` existing fields remain; deep has scheduling`deep-events-v1`,maxPerAgent16,decisionsPerTick6/12. `swarmHybrid(deep)` uses capacity,16M/32M reserved token ceiling,USD8/16 representational ceiling; independent trusted provider admission is binding and cannot be raised by browser input.

`DecisionContext.conversation` is optional, contains bounded ancestry IDs/omission counts/version only; eight actual visible item bodies remain. Existing conversation-menu-v2 output format remains valid. Deep optional context opportunity includes ordinal/substep; old contexts do not acquire fields.

## Tasks and gates

- [ ] Baseline1102networkblockedtests; read currentdocs/Nextguides; snapshot existing private file hashes.
- [ ] TDD deepcapacity/sharedbounds, fairbounded triggers/substeps, derived replay termination; keeplegacycontexts exact.
- [ ] TDD longpublic/private ancestry windows, root-aging inbox, source-coalescedretention and durableissues.
- [ ] TDD format2highercapacity, projected-byte admission, cold-load/append ownership, torn-tail evidence, materialcheckpoint+tail exactness, persistencefaults.
- [ ] TDD trusted providergrant separate fromreasoningcapacity, failureclassification, no automaticretry, budgetpause.
- [ ] TDD managedcoordinator lifecycle/restartpause/browserdisconnect/status/controls/compacthistory/summaryDTO.
- [ ] Integrate service/gateway/coordinator benchmarks:legacy8,quick64/128,deep175/350/350/700; quiet/repetitive/private/adversarial; measuredCPU/storage/replay/memory/graph metrics.
- [ ] Fulloffline tests/types/strict/build/diff; historicalfullreplay and hashes; desktop1440x900/1920x1080bothcohorts/privacy/closure/reconnect/pause/resume/cancel.
- [ ] Only afterofflinePASS: durablelive taskledger/preflight,normal-user defaultstorage,keypresence/modelrouting/no mocks,realMapExplore max70social. Diagnose defectsoffline andfullregressionbeforeanotherattempt; allcumulative ceilingsbinding.
- [ ] Finaltestsifrepairs, separateoffline/live/behaviour/privacyverdicts,report/roadmap/exactinventory,stopownedservers/browser,leaveunstaged.

## Review focus and rulings

| Interface/risk | Resolution |
|---|---|
| Rootcapacity vsstorage/publicparser | Shared`deepLimits` determinesnewbounds; legacy128/8 retained unlessdeepselectorpresent. |
| Conversation agent vsroot hybrid | Agent changes retrievalitemIds and suppliesmetadata helper; root alone edits hybrid/contracts. |
| Storage vscoordinator | Typedstate avoidswholeworld HTTP; service ownsjournals/checkpoints/admission; coordinator ownsjoblease/lifecycle and no rawDTO serialization. |
| Publiccontract vsroot parser/summary | Coordinator may add optional safejob DTO; coordinate names beforeusage. Root integratesparser andfacts. |
| Processlifetime | Ruling: managed coordinator within long-lived localNode server, notfire-and-forgetroute/Nextafter. Explicitglobalregistry/lease/abort/timer and restartpause. This preservesexistingprocess-wideAI gate and avoidschildprocessmultiplication. Local-onlydeploymentassumption documented. |
| Paidbudget defaults | Ruling: capacity350/700 neverauthorisesallcalls. Existingquickgrant64/128 retainedbydefault; controlledlive explicitly70, taskledgeralways<=USD1. |
| Mainbranch/skillcommits | Ruling: userexplicitlyrequiresmainworktree,noGitmutations; noalternateworktreeorcommits. |
| Corrupttail | Preserveownedrawtail separately; acceptonlyfullyverifiedprefix,neverignorecompletehashfailure; no uncertainproviderredispatch. |
| Openissues | Keepfullboundedownissuehistoryfromacceptedrecords; activeindex8,context4existingbound; no inventedresolution. |
