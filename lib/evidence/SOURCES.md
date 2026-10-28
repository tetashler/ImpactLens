# Verified evidence replay v1

Verification decision recorded at **2026-10-28T11:45:14.000Z**. These are checked historical excerpts. The application performs **no live retrieval, URL fetching, search, or AI request** for evidence research; POST replays this small reference set and labels it `verified-replay` / `verified-snapshot`.

## ASEAN institutional role

- Official URL: https://asean.org/about-asean/asean-summit/
- Publisher: ASEAN Secretariat. Title: ASEAN Summit. Publication date: not supplied (`null`).
- Verification: read the official page's search-indexed content using the web research tool on 28 October 2026. The full indexed result explains the Summit's institutional role. Direct automated opens of this URL returned HTTP 403. **No direct successful page fetch is claimed.** This limitation travels with every bundle.
- Stored excerpt (10 words): “The ASEAN Summit is the highest policy-making body in ASEAN”.
- Supported finding: the Summit's institutional policy-making role only.

## Singapore trade agreements

- Requested MTI URL: https://www.mti.gov.sg/trade-international-economic-relations/agreements/free-trade-agreements-fta/
- Checked final official URL: https://www.meti.gov.sg/trade-international-economic-relations/agreements/free-trade-agreements-fta/
- Publisher displayed: Ministry of Energy, Trade and Industry. Title: Free Trade Agreements (FTAs).
- Verification: successful direct web-tool open of the MTI URL followed its official redirect to METI; the page says its website moved on 1 October 2026. No runtime redirect-following mechanism is implemented in the app.
- The content's displayed “Last updated on 21 August 2026” is stored as `publishedAt: "2026-08-21"`. This is an update date, **not a claimed first-publication date**.
- Stored excerpt (17 words): “Free Trade Agreements (FTAs) are treaties which make trade and investment between 2 or more economies easier.”
- Supported finding: the general treaty definition only. The replay does not make claims about the current number of agreements or membership lists.

## Bounds and identity

The checked source registry is finite. Validators require exact source metadata and exact citation excerpts; uploaded objects cannot mint additional “verified” sources. Directly supported findings must match the checked factual statements. Inferences and assumptions have explicit finite classifications; the replay generator emits only directly supported findings.

`snapshotIdentity` is a full SHA-256 of fixed-order JSON containing `version`, `queries`, `sources`, `findings`, `unknowns`, `status`, `mode`, and `limitations`. Each source/finding also uses fixed schema field order. `bundleId` uses the same full digest. `scenarioIdentity`, `researchAttemptId`, and `createdAt` are separately correlated and excluded from the content identity. This hash detects changed content; it is **not a cryptographic signature or external attestation**.

`queries` records the user's research question; it does not claim a new search happened. A fresh request creates a fresh attempt ID and timestamp while preserving the identity of unchanged replay content.

## Explicit gaps

These excerpts do not establish an ASEAN withdrawal procedure, automatic termination of any FTA, future negotiated arrangements, economic magnitudes, implementation timelines, public opinion, or stakeholder responses. ASEAN questions return `partial`. Polyclinic, MRT, AAC and generic topics return `empty` with explicit research gaps.
