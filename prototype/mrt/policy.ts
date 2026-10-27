// Reviewed evidence is an allow-list, never a name/proximity-based merge rule.
export const INTERCHANGES = [
  {
    canonical: 'NS4', alias: 'BP1', name: 'Choa Chu Kang',
    source: 'https://www.lta.gov.sg/content/dam/ltagov/who_we_are/statistics_and_publications/books/pdf/REthink_190918web.pdf',
  },
  {
    canonical: 'DT1', alias: 'BP6', name: 'Bukit Panjang',
    source: 'https://www.lta.gov.sg/content/dam/ltagov/news/press/2025/250106_DTL2e_System_map_DTL2_AnnexC.pdf',
  },
] as const;

export const SUSPECT_PAIRS = [
  { from: 'NS13', to: 'NS18', reason: 'Yishun to Braddell skips intervening calls; service intent unverified.' },
  { from: 'NS16', to: 'NS20', reason: 'Ang Mo Kio to Novena occurs in a northbound-labelled trip; direction and calls conflict.' },
  { from: 'CC33', to: 'TE23', reason: 'Marina Bay to Tanjong Rhu omits Gardens by the Bay; service intent unverified.' },
] as const;
export const REVIEW_DATE = '2026-10-27';
