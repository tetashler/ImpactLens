import type { ImpactAssumptions } from './types.ts';
/** Deliberately invented trip scenario; geography labels alone do not establish NS4 usage. */
export const illustrativeDemand: ImpactAssumptions={
  id:'illustrative-cck-demand',version:1,referenceDate:'2026-10-27',seed:'phase4c-demo',unassigned:'retain-unknown',
  description:'Illustrative Choa Chu Kang sensitivity scenario: 80% representative participation; NS4 origins; destination shares NE16 50%, NS4 25%, NS5 25%. Not observed trips or commuting probabilities.',
  travel:{method:'destination-distribution',participationRate:0.8,origins:{method:'explicit-stations',rules:[{planningArea:'choa-chu-kang',stationId:'NS4'}]},destinations:[{stationId:'NE16',share:0.5},{stationId:'NS4',share:0.25},{stationId:'NS5',share:0.25}]},
};
