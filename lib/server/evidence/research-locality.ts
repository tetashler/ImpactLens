/** Research context for hypothetical sites only; never an assignment of residents or demographics. */
import type {ScenarioGeometry} from '../../plots/geometry.ts';
import {safeRequestedLocality} from '../../grounding/geographic-coverage.ts';
import {locatePlottedSites} from '../interventions/location.ts';

export function researchLocality(geometry:ScenarioGeometry,questionLocality?:string|null,locate:typeof locatePlottedSites=locatePlottedSites):string|null {
 const fallback=safeRequestedLocality(questionLocality);
 if(!geometry.features.some(feature=>feature.kind==='point'))return fallback;
 try {
  const areas=[...new Set(locate(geometry).flatMap(site=>{const area=safeRequestedLocality(site.planningArea);return area?[area]:[];}))];
  return areas.length===1?areas[0]:areas.length>1?null:fallback;
 }catch{return fallback;}
}
