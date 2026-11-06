# ImpactLens: Judge Q&A Prep and Quick Read

## Part 1: About the judge (Neha Jirafe)

**What I could verify.** LinkedIn blocked my access, so I used public search results. Treat all of this as unverified.

- She is a data and AI leader. One listing says Data and AI Lead / Senior Manager at Accenture. Her LinkedIn search snippet says Kaplan Singapore. The two conflict, so check her current role.
- Earlier roles listed: Motional (autonomous vehicles), Equinix, Chord X. She started as a software engineer.
- Her Medium blog is hands-on data engineering: data modeling, Spark, Elasticsearch sync, ML basics such as hinge loss.

**What I could not find.** I found no public statement of her opinions on AI, and no talks or interviews. The questions below are **inferences from her background, not her known views**. Don't tell her "as you've said before...".

**What her background suggests she will care about.**

| Her background | Likely angle |
|---|---|
| Data engineering | Where the data comes from, its quality, and how you validate the output |
| Autonomous vehicles (safety-critical AI) | How you know the model is right, and what happens when it's wrong |
| Enterprise data and AI lead | Governance, real adoption, cost at scale, "does a planner actually use this" |

## Part 2: Likely judge questions and honest answers

### A. Data and validation (most likely)

**1. "How do you know the AI citizens behave like real people? How do you validate it?"**
- Be honest. The population matches the census numbers, but its behaviour is not validated against real outcomes.
- Say: "Our population is calibrated against Census 2020 targets (1,369 passed, none failed). That checks the demographic mix, not behavioural accuracy. We position the output as exploratory, and the next step is back-testing on past projects like Buangkok."
- Back-testing against your slide 2 examples is a strong "what's next" answer. The repo doesn't do it yet, so don't claim it exists.

**2. "Slide 4 says 4 million AI citizens. Are 4 million AI agents really running?"**
- **No. Fix this before presenting.** The docs show 10,000 representative synthetic residents with weights that sum to about 4.05 million, which is the Census 2020 population. Only a small cohort holds LLM discussions (runs of around 50 agents and 100–700 decision calls in the docs).
- Say: "We generate 10,000 representative residents, each weighted to stand for part of Singapore's roughly 4 million people. The impact numbers are calculated across the full weighted population. A smaller cohort of AI citizens takes part in the discussions."
- Suggested slide wording: "A representative synthetic population of 10,000, weighted to Singapore's ~4 million residents".

**3. "What data is it grounded on? How current?"**
- It uses SingStat Census 2020 by planning area, age band and sex, plus MRT/GTFS data, building footprints and a few eldercare locations.
- Limits: it's 2020 data. It has no income, employment or household joint data. Travel demand is illustrative, not observed.

**4. "Are the calculations from the AI or from deterministic code?"**
- The impact calculations are deterministic, for example weighted minutes saved on MRT routes. The AI proposes scenario assumptions, runs the citizen discussions and writes reports. The AI does not change the calculated numbers.
- This is a strong answer. Say it clearly.

### B. Reliability and hallucination

**5. "LLMs hallucinate. How do you stop them inventing facts in the report?"**
- The AI proposes assumptions, and the user must **Allow or Reject each one** before the simulation starts. Rejected assumptions stay "unknown", and the report records both choices.
- Be honest about the limit. The docs say that "approval does not verify AI claims". Humans stay in the loop, but the AI's statements are not fact-checked automatically.

**6. "What scenarios does it support? Can I ask about anything?"**
- It supports MRT lines and a limited eldercare-centre case (Bukit Merah). For polyclinics and policy questions it gives research-style views and does not invent predictions.
- Admit the scope openly. Judges like honest scope.

**7. "What happens when the AI provider fails or is rate-limited?"**
- The docs record a real failure: a run hit a provider rate limit at tick 104 of 320. The app now reports the error clearly and keeps partial results. It does not silently retry or fall back to another provider, which would add cost.
- The calculated dashboard still works with no AI key at all.

### C. Responsible AI and privacy

**8. "You say 'zero data retention'. Which provider, and how do you verify it?"**
- **Be careful.** I found no mention of zero data retention anywhere in the repo's code or docs. The project is mid-switch to Claude Haiku via the direct Anthropic API, with OpenRouter, Gemini and DeepSeek integrations also present.
- Before presenting, confirm which provider you use and that its zero-data-retention setting is actually enabled for your account. If you can't confirm it, change the slide to "no personal data is sent: the population is synthetic".
- True and safe to say: the citizens are synthetic and built from aggregate census data, so no real individual's data is sent to the AI.

**9. "Bias: could the AI stereotype demographic groups?"**
- Answer: "Yes, that's a real risk. Citizens are built from demographic cells, and the LLM may lean on stereotypes about age or income groups. That's why the report shows assumptions and risks, why the output is exploratory, and why a human decides."

**10. "Could this be used to justify a decision that was already made?"**
- Answer: "It could. We mitigate with assumption review, visible risks and a 'human must decide' principle. It tests options and does not give a verdict."

### D. Value and adoption

**11. "Why not just run surveys or use existing planning tools?"**
- Surveys take months and are expensive. Existing tools model flows and places but not sentiment. ImpactLens is a fast pre-screen that tells you what to ask real people, so it complements surveys and does not replace them.

**12. "Who would pay or use this, and how would it get adopted?"**
- Target users: urban planners and transport authorities, government policymakers, agency policymakers.
- Realistic next step: a pilot with one agency on a past project, comparing the predicted concerns against what actually happened.

**13. "What does a run cost, and does it scale?"**
- Cost is token-based and capped by `SOCIAL_PROVIDER_MAX_CALLS` and similar settings in the config. The docs say actual token cost is unknown for failed runs.
- Do not quote a cost per run unless you have measured one. Say: "We cap calls per run and track usage; we haven't finalised unit economics."

**14. "What would you do next?"**
- Back-test against past projects such as Buangkok and the highway.
- Add more scenario types and more recent data (income, employment).
- Run a pilot with a planning agency.

## Part 3: Things to fix or check before you present

1. **"4 million AI citizens" on slide 4.** Reword it (see Q2). A data-minded judge will challenge it.
2. **"Zero data retention" on slide 10.** The repo has no evidence for it. Confirm it or reword it (see Q8).
3. **Demo claims.** Only show scenarios the app really supports: MRT, or eldercare in Bukit Merah.

## Part 4: Quick-read: ImpactLens in 2 minutes

**One sentence.** ImpactLens is a "What if...?" sandbox on a map of Singapore. Planners ask a question about a proposed project, and the tool simulates how different resident groups might react and be affected, before anything is built.

**How it works, step by step.**
1. **Ask.** The user types or speaks a question, such as "What if we build a new MRT line here?" They can also draw routes and points on the map.
2. **Plan.** AI turns the question into a scenario and proposes assumptions. The user approves or rejects **each** assumption.
3. **Calculate.** Deterministic code works out measurable impacts, such as travel time saved. It weights each resident group by its share of Singapore's population.
4. **Simulate.** A smaller group of AI citizens discusses the project, with their own memories and social ties.
5. **Explain.** The tool produces a knowledge graph of who talks to whom and what concerns arise, an AI summary, and a detailed report.

**The data.** SingStat Census 2020 (residents by area, age and sex), MRT/GTFS network data, building footprints and a few eldercare locations. The synthetic population has 10,000 residents whose weights add up to about 4.05 million.

**Tech stack.** Next.js, TypeScript and MapLibre for the app. Configurable AI providers: Claude Haiku (direct API), Gemini, OpenRouter and DeepSeek. Whisper for speech input. The AI is optional, and the calculated dashboard works without it.

**Strengths to emphasise.**
- Calculated numbers are separate from AI-generated text.
- The user reviews every AI assumption.
- Honest about limits. The tool says "unknown" instead of inventing answers.
- It works without an AI key.

**Weaknesses to be ready to admit.**
- Behaviour is not validated against real outcomes yet.
- It uses 2020 census data and has no income or employment detail.
- Scope is narrow: MRT and a limited eldercare case.
- Provider rate limits can interrupt long runs.
- The LLM may carry stereotypes.

**Numbers worth remembering.**

| Fact | Value |
|---|---|
| Population represented | ~4.05 million (4,047,260 weighted) |
| Synthetic residents generated | 10,000 |
| Census calibration | 1,369 passed, 0 failed |
| Slide 2 examples | Buangkok MRT: S$80M, 3-year delay. Highway: S$134.7M, delayed three times |

## Part 5: Answering style tips

- If you don't know, say so: "We haven't validated that yet, and here's how we'd do it." This beats bluffing in front of an AI and data professional.
- Lead with your strongest point when pressed: calculations are deterministic, the AI only advises, and a human approves every assumption.
- Don't over-claim "prediction". Use "exploration" and "pre-screening".
