# Phase 4E implementation plan

Goal: predominantly model-capable societal cohorts with bounded event-triggered decisions and an entity-first desktop graph. User authorised autonomous implementation; no paid calls, Git mutations, credential/secondary-directory access or mobile work.

Architecture: optional versioned SocietyInput.swarm freezes 50/35 or100/70 cohort, event-trigger scheduler/routine-only rule policy and per-agent controls. Existing intelligence/memory policies remain; absent swarm preserves historical semantics. Seeded sparse cohorts include roles plus distinct resident IDs, with episodic storage per selected identity. Global hybrid64/128 decisions, peragent4, cooldown4, twosequentialopportunitiespertick/concurrency1; budgets remain explicit. New delta journal only forswarm avoids quadratic repeated-context storage; old journals are read unchanged. Full safe graph candidate nodes carry deterministic primary/entity/person/aggregate metadata for bounded desktop visibility/search expansion; no rawcontent sent.

- [x] Audit/baseline1059tests and recordhashes.
- [x] Test-first cohort/config, routine-only rule and event scheduler; preservelegacybranches.
- [x] Serial global/peragentbudget, same-tick replay, triggerprovenance, isolatedepisodic memory.
- [x] Bounded deltajournal/checkpoint persistence and restart/recovery; API/privatepreflight preserved.
- [x] Aggregate provenance-aware cohort/decision summaries and entity-first graph integration.
- [x] Desktop hierarchy/search/filter/drag/settling/report and privacy-safe inspectors.
- [x] Mockactualgateway/service benchmarks24/4/8,50/35/64,100/70/128 includingfaircoverage,multi-agentchains,performance/budgetfailures.
- [x] Full networkblockedtests/types/build/replay/hash/privacy and mockeddesktop1440x900/1920x1080.
- [x] Documentation/roadmap, exactlimits/costimplications,stopownedservers andleaveunstaged.

Final evidence:1102tests; bothTypeScript checks/build/diff;35/35 and70/70actualmockdecisioncoverage; late/privateopportunities; all80ticks; exactlegacy/newreplay;61priorhashes; bothdesktopcohorts/viewportsprivacy/navigation/drag/reportPASS. Finalbrowseruncoveredthe100-batchclientcutoff; boundedcontinuationhelper and8regressionsrepairitwithoutaddinginference. Alltaskservers/browserpagesclosed. No paidactivity. See phase4Ereport for limitations and independent live gate.

Ownership: rootcohort/scheduler/engine/service/storage/publicDTOintegration;graphagentnewprojection/sharedvisibility;desktopagentrenderer/workspace/report;harnessagentnewfixtures/benchmark/mockdesktophelpers. No overlapping sourceedits withoutcoordination.

Review: capability isdistinctfromaccepted modeldecisions; offerfairnessnotfabricatedcompletion; triggersrequireaccessibleactualrecords; hiddenpeoplemustremainsearchable; aggregatebasisexplicitwithoutinventedemployment; no automaticpaidoptin; journaldelta/replay mustnotupgradeoldworlds.
