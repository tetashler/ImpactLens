# Employed Residents Aged 15 Years and Over by Planning Area of Workplace, Usual Mode of Transport to Work and Planning Region of Residence (Census of Population 2020)

Original unmodified CSV snapshot, downloaded through the official public data.gov.sg API.

- Reference period: Census of Population2020; planning geography: Master Plan2019.
- Publisher: Singapore Department of Statistics.
- Original publication: https://data.gov.sg/datasets/d_5b38192e9c6f8d2c5f38c70939c76e71/view
- Source table: https://tablebuilder.singstat.gov.sg/table/CT/17586
- Licence: https://data.gov.sg/open-data-licence
- Acquisition: 2026-10-31T13:06:45.778Z
- SHA256: `5a2fa157e0dc8d7df17813f0a1baab2be68f9985ed2e0c9badef761aaba33735`
- Records/columns: 48 / 31

`source-metadata.json` retains exact source identity/schema, acquisition endpoint, exclusions and attribution. The original CSV bytes are preserved. The object-store URL query is intentionally omitted because its expiring signature is not durable source provenance.

Missing, dash and NA values remain unknown/nil-negligible, not measured zero. Column labels in the original source remain authoritative. This aggregate table does not identify individual people, employers, full home-work trajectories or work schedules. Different source inclusion rules are not silently reconciled.

## Grain and denominator

workplace planning area, residence planning region, broad transport mode. Employed residents aged15+ excluding full-time students and overseas6+months; published total2,177,456. Recipe 1.0.1 uses the available residence-region and broad-mode joint for unambiguous public-transport and car/taxi modes; detailed residence-PA disaggregation and other/mixed-mode regional-total fallback are explicitly synthetic.

Attribution: Contains information from the named SingStat Census2020 dataset accessed on 2026-10-31 from data.gov.sg, made available under the Singapore Open Data Licence1.0. No government endorsement.
