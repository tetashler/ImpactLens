# ImpactLens SG — MRT data validation

Validated: 27 October 2026 (Singapore). Scope: all records in the eight network files and recursive inspection of the passenger-volume directory. Python standard-library CSV parsing; no dependencies installed. This is rapid technical validation, not full GTFS certification or verification against actual train operations.

## Verdict

**The network data is usable as a prototype foundation, with corrections and explicit assumptions.** It contains station coordinates, platform hierarchy, ordered trips and times, with intact core references. It is not yet a validated representation of the operating network: transfer links are missing, several unusual trip edges need checking, and timetable provenance is unverified. **No passenger-volume data is present**, so observed demand or demand-weighted benefits cannot currently be calculated.

## Inventory, schemas and counts

Network directory: `data/transport/mrt-network/`; exactly eight UTF-8-readable, comma-separated `.txt` files, totalling 19,488,381 bytes. Counts below exclude headers. No zero-byte files; only `calendar_dates.txt` contains headers alone.

| File | Bytes | Records | Columns, in order |
| --- | ---: | ---: | --- |
| `agency.txt` | 300 | 3 | `agency_id, agency_name, agency_url, agency_timezone, agency_lang, agency_email` |
| `calendar.txt` | 365 | 6 | `service_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday, start_date, end_date` |
| `calendar_dates.txt` | 32 | 0 | `service_id, date, exception_type` |
| `feed_info.txt` | 168 | 1 | `feed_publisher_name, feed_publisher_url, feed_lang, feed_start_date, feed_end_date, feed_version` |
| `routes.txt` | 6,158 | 114 | `route_id, agency_id, route_short_name, route_long_name, route_type, route_color, route_text_color` |
| `stops.txt` | 59,221 | 1,211 | `stop_id, stop_code, stop_name, stop_lat, stop_lon, location_type, platform_code, parent_station` |
| `stop_times.txt` | 18,236,412 | 348,777 | `trip_id, arrival_time, departure_time, stop_id, stop_sequence, stop_headsign` |
| `trips.txt` | 1,185,725 | 19,119 | `route_id, service_id, trip_id, trip_headsign, direction_id, block_id` |

Passenger directory: `data/transport/passenger-volumes/` exists but is completely empty, including hidden entries and nested content. **Zero CSV, ZIP or other files.** Local schema, record count, OD coverage, reference month and temporal granularity are therefore unavailable; none can be inferred from the directory name.

## Structural and value checks

Checks follow the [GTFS Schedule reference](https://gtfs.org/documentation/schedule/reference/), applied to this conventional fixed-stop feed. Required fields and applicable conditional fields are present and populated: agency identity/name/URL/timezone; stop identity/name/coordinates; route identity/agency/type and names; trip route/service/identity; stop-time trip/stop/order/times; calendar service/day flags/dates; and publisher/name/URL/language metadata. Empty exception records do not themselves invalidate a feed with a calendar.

- No malformed CSV row widths or duplicate agency, stop, route, trip or calendar service IDs.
- Zero broken references: routes → agencies; trips → routes/services; stop times → trips/stops; stops → parent stations. Every trip has at least two stop-time records. Trip/stop-sequence keys are unique.
- Every referenced stop is a platform (`location_type=0`). All platform and entrance parents exist and are station records; stations have no parent.
- Stop inventory: **186 station records, 434 platforms, 591 entrances**. Every station and platform is represented by scheduled trips through its platform hierarchy. These are MRT **and LRT**, not 1,211 separate stations.
- Coordinates are populated and within global bounds: latitude 1.26497196–1.449156837; longitude 103.6368407–103.9892766. This is geographically plausible for Singapore, not independent positional verification.
- Routes: 111 metro (`route_type=1`), three light rail/tram (`0`). Short-name groups: NS, EW, CG, NE, CC, DT, TE, BP, SK, PG. The 114 route IDs include service variants; they do not represent 114 lines. Sixteen route IDs have no trips.
- Day flags, calendar date formats, route colours and trip directions pass the checked domains. Times parse correctly, including one-digit hours. No departure precedes its arrival and no consecutive trip segment has nonpositive elapsed time. Consecutive arrival minus prior departure ranges from 52 to 929 seconds.
- Time values span **05:06:22–25:04:52**. There are 10,594 arrival/departure fields at or beyond 24:00; retain GTFS service-day semantics rather than wrapping them prematurely.
- Blank optional values: two agency emails; 777 platform codes (all non-platform records); 308,342 stop headsigns; 17,715 trip block IDs. All 186 station parents are blank as expected. No blanks were found in other supplied fields.

These checks establish internal consistency, not the accuracy of travel times or source ownership.

## Network and timetable concerns

1. **Transfers are incomplete.** No `transfers.txt` or `pathways.txt` is supplied. Collapsing platforms to their parent stations yields 425 distinct directed station edges and two undirected connected components of 173 and 13 station records. The smaller component is the Bukit Panjang LRT. Choa Chu Kang has separate parents `NS4`/`BP1`; Bukit Panjang has `DT1`/`BP6`. These interchanges require verified transfer links and walking costs. Do not merge stations globally using names alone. The component check ignores direction and does not prove timetable reachability.
2. **Consecutive scheduled stops are not always physical neighbours.** Three station edges have no reverse counterpart: Yishun → Braddell (`NS13→NS18`, two trips), Ang Mo Kio → Novena (`NS16→NS20`, one trip), and Marina Bay → Tanjong Rhu (`CC33→TE23`, 14 trips). Example IDs: `NSL_SB_WD_203_3103`, `NSL_NB_PH_210_5334`, `TEL_CB_WE_142_0891`. These may be special services, omitted calls or errors; validate before accepting them as physical track adjacency or shortcuts. Positive times alone do not resolve them.
3. **No track geometry.** `shapes.txt` is absent. Coordinates support a station map and straight-line schematic links, not geographically accurate rail alignments or train animation along tracks. Its absence is not itself a GTFS violation.
4. **Provenance remains unknown.** Agency rows name LTA, SMRT and SBS Transit; metadata identifies LTA as publisher. Those assertions inside the files do not authenticate an official feed. There is no source URL for the actual download, generation method or licence document in either inspected directory. Regular-looking schedules cannot establish whether times are observed, published or synthesised.

## Feed validity

`feed_info.txt`: publisher `Land Transport Authority`, URL `https://www.lta.gov.sg/`, language `en`, version `0.1`, declared coverage **2025-01-01–2026-12-31**. All six calendar rows instead cover **2026-01-01–2026-12-31**. Thus there is **no scheduled service for 2025**, despite the broader metadata window. The validation date is within the scheduled 2026 window; no service is defined beyond it.

`SERVICE_WD` and its `_CCL` equivalent run Monday–Friday; `SERVICE_WE` equivalents run Saturday only; `SERVICE_PH` equivalents run Sunday only. The `PH` label does not make public holidays active: `calendar_dates.txt` has no exceptions. Holiday-specific behaviour is consequently unverified. No within-year commissioning dates are represented by these calendars; validate station/service availability for the chosen scenario date against the [LTA rail network information](https://www.lta.gov.sg/content/ltagov/en/getting_around/public_transport/rail_network.html).

## Simulation feasibility

| Capability | Available calculation | Additional requirement |
| --- | --- | --- |
| Construct station network | Station/platform/entrance points and service membership | Verify operating-date coverage and provenance; distinguish MRT from LRT |
| Identify connections | Directed consecutive scheduled-stop edges | Check unusual jumps; add interchange transfers; independently verify physical adjacency |
| Baseline journey times | Feed-implied segment running time = next arrival − previous departure; dwell = departure − arrival; trip elapsed times | Validate timetable accuracy. Full journeys require service-date/departure-time routing, waits, transfer walking and access/egress; arbitrary minimum edge times may combine incompatible services |
| Passenger movement | No observed flows available | Train OD demand plus station-code mapping; route choice and within-hour departure sampling are modelling assumptions |
| Hypothetical MRT line | Can specify synthetic stations and edges as a scenario | Explicit alignment, interchanges, speed/run times, dwell, headway and operating hours; these are scenario inputs, not downloaded facts |
| Recalculate journeys | Feasible once baseline and scenario graph costs exist | Apply consistent routing assumptions before/after. Passenger-weighted savings need OD data; demand shifts, crowding and demographic benefits require further models/data |

## Missing information and verified official sources

Sources checked on the validation date. Documentation verification is distinguished from a successful authenticated API call; no credentials were read or used.

| Missing information | Purpose | Official source and access |
| --- | --- | --- |
| Station-to-station passenger demand | Weight travel-time benefits by observed flows | [LTA DataMall API guide](https://datamall.lta.gov.sg/content/dam/datamall/datasets/LTA_DataMall_API_User_Guide.pdf), v6.10, §2.7 and Annex B: documented GET `https://datamall2.mytransport.sg/ltaodataservice/PV/ODTrain`, optional `Date=YYYYMM`, `AccountKey` header. Returns a temporary ZIP download link, not CSV rows directly. Last three months requestable; prior month generated by the 10th; link expires after 15 minutes. Authenticated response not tested. |
| Demand-to-station identifier crosswalk | Resolve composite interchange codes to local parents/platforms | [LTA static datasets](https://datamall.lta.gov.sg/content/datamall/en/static-data.html): downloadable **Train Station Codes and Chinese Names**, **Train Lines Codes**, **Train Station**, **Train Station Exit Point**. These are lookup/geospatial inputs, not transfer-time tables. |
| Verified topology, operating status and timing benchmarks | Resolve the interchange gaps and suspicious edges; assess timetable plausibility | [LTA MRT/LRT map](https://www.lta.gov.sg/content/ltagov/en/map/train.html) and [rail network page](https://www.lta.gov.sg/content/ltagov/en/getting_around/public_transport/rail_network.html): public web references. No official downloadable complete rail GTFS or train timetable API was verified in this review. |
| Transfer/access walking times and independent journey estimates | Calculate complete journeys rather than onboard time alone | SLA [OneMap API documentation](https://www.onemap.gov.sg/apidocs/) documents public-transport and walking routing; [routing documentation](https://www.onemap.gov.sg/apidocs/routing) shows `https://www.onemap.gov.sg/api/public/routingsvc/route` with authorization. API access requires a token; no authenticated query was tested. Route estimates can benchmark journeys, not supply an observed station transfer matrix. Otherwise use labelled assumptions. |
| Rail alignment geometry | Accurate map tracks and animation; not essential for first travel-time experiment | URA [Master Plan 2019 Rail Line layer](https://developers.data.gov.sg/datasets?agencies=Urban+Redevelopment+Authority+%28URA%29&resultId=d_222bfc84eb86c7c11994d02f8939da8d), via data.gov.sg download/API catalogue. Historical planning geometry is not proof of current operating track; verify currency and status before use. No endpoint was called. |
| Demographic distribution and geographic boundaries | Later age-group accessibility analysis | [SingStat geographic distribution datasets](https://www.singstat.gov.sg/find-data/explore-data-themes/population/geographic-distribution/latest-news-data) provide downloadable resident population tables. Match subzone boundary vintage separately. These aggregate tables do not identify individual rail passengers or reveal demographic OD flows. |

Expected OD schema from LTA's guide, **not a local file**: `YEAR_MONTH, DAY_TYPE, TIME_PER_HOUR, PT_TYPE, ORIGIN_PT_CODE, DESTINATION_PT_CODE, TOTAL_TRIPS`. Granularity is monthly totals by OD pair, hour and weekday versus weekends/holidays, not individual dates or real-time movements. Composite codes need mapping. Divide totals by the applicable number of days only when estimating an average day; route allocation remains a model. A local reference month cannot be assigned until downloaded content is inspected. ([LTA guide, Annex B](https://datamall.lta.gov.sg/content/dam/datamall/datasets/LTA_DataMall_API_User_Guide.pdf))

## Recommended next implementation step

**Prepare a separate, derived baseline graph for one declared 2026 scenario date after resolving provenance and checking the three unusual edges.** Preserve the raw feed; retain platform identities, add explicit verified interchange links with labelled walking-time assumptions, and compare a small set of journeys with official references. Acquire and validate one train OD month before reporting passenger-weighted impact. New-line timing and demographic allocation must remain explicit assumptions. No simulation engine is needed for this validation step.

Only this report was created. Original datasets were not edited; no application code, dependencies or simulation engine were created or changed. This is pre-hackathon research; competition implementation must be rebuilt during the hackathon.
