/** Server-owned site names for planning; never an assignment of residents or facility outcomes. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {DynamicDraft,DynamicRequest} from '../../dynamic-scenarios/plan.ts';
import type {HybridLocation} from '../../interventions/explore-contract.ts';
import {checkPlan} from '../../dynamic-scenarios/diagnostics.ts';
import {locatePlottedSites} from '../interventions/location.ts';

const instruction='These planning-area and subzone names are authoritative only for the plotted coordinates in the supplied official boundary snapshot; they override model guesses and unrelated source locations. Keep each point separate. Do not turn the site location, land use or feasibility into an AI-proposed assumption. Unresolved site names remain unknown; never guess them from examples, point labels, demographic areas or search results. This lookup does not locate residents or establish current land use, nearby services or project feasibility.';
export interface PlannerSiteContext {
 provenance:'official-boundary-lookup';
 status:'resolved'|'partial'|'unavailable'|'not-plotted';
 sites:HybridLocation[];
 instruction:string;
}
export function plannerSiteContext(request:DynamicRequest,locate:typeof locatePlottedSites=locatePlottedSites):PlannerSiteContext {
 if(!request.geometry.features.some(f=>f.kind==='point'))return {provenance:'official-boundary-lookup',status:'not-plotted',sites:[],instruction};
 try{
  const sites=locate(request.geometry);
  return {provenance:'official-boundary-lookup',status:sites.length&&sites.every(s=>s.planningArea!==null&&s.subzone!==null)?'resolved':'partial',sites,instruction};
 }catch{return {provenance:'official-boundary-lookup',status:'unavailable',sites:[],instruction};}
}

type PlaceKind='planningArea'|'subzone';
let places:{name:string;kinds:Set<PlaceKind>}[]|undefined;
function officialPlaces(){
 if(places)return places;
 const features=JSON.parse(readFileSync(join(process.cwd(),'data/geography/MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson'),'utf8')).features as {properties:Record<string,unknown>}[];
 const names=new Map<string,Set<PlaceKind>>();
 for(const feature of features)for(const [field,kind]of [['PLN_AREA_N','planningArea'],['SUBZONE_N','subzone']] as const){
  const value=feature.properties[field];if(typeof value!=='string')continue;
  const name=value.toLocaleLowerCase('en-SG');if(!names.has(name))names.set(name,new Set());names.get(name)!.add(kind);
 }
 places=[...names].map(([name,kinds])=>({name,kinds})).sort((a,b)=>b.name.length-a.name.length);return places;
}

/** Narrow direct-placement guard, not a ban on discussing or comparing other neighbourhoods. */
export function assertGeneratedSiteAssumptions(draft:Pick<DynamicDraft,'description'|'assumptions'>&Partial<Pick<DynamicDraft,'trigger'>>,request:DynamicRequest):void {
 const sites=plannerSiteContext(request).sites.filter(s=>s.planningArea!==null||s.subzone!==null);if(!sites.length)return;
 const names=officialPlaces();
 const placement=/(?:\b(?:plotted|selected|drawn|marked|proposed)\s+(?:[a-z'-]+\s+){0,3}(?:location|site|point|marker|polyclinic|facility)|\b(?:the|this|that)\s+(?:location|site|point|marker))\s+(?:(?:is|lies|sits|falls|will be|would be|has been)(?:\s+(?:currently|located|situated|positioned|assumed to be|an? (?:currently )?(?:unbuilt|vacant|undeveloped) site)){0,3}\s+)?(?:in|within|inside|at)\s+(?:the\s+)?/gi;
 const inspect=(text:string,path:string)=>{
  // Source quotations and questions are not assertions of the scenario's location.
  const unquoted=text.replace(/["\u201c][^"\u201d]*["\u201d]/g,span=>' '.repeat(span.length));
  for(const match of unquoted.matchAll(placement)){
   const index=match.index!,before=unquoted.slice(0,index).split(/[.!?;]/).at(-1)??'',after=unquoted.slice(index);
   if(/\b(?:if|unless|whether|suppose|supposing)\b/i.test(before)||/(?:compare(?:d)?\s+(?:with|to)|unlike)\s+(?:an?|the)?\s*$/i.test(before)||/^[^.!?;]*\?/.test(after))continue;
   const tail=unquoted.slice(index+match[0].length).toLocaleLowerCase('en-SG');
   const place=names.find(p=>tail.startsWith(p.name)&&!/[a-z0-9]/.test(tail[p.name.length]??''));
   if(!place){
    // A named administrative unit absent from this snapshot cannot override its resolved label either.
    const unknown=/^([a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){0,3})\s+(planning\s+area|subzone)\b/.exec(tail);
    if(unknown)checkPlan(false,'plan.site_location_conflict',path,text);
    continue;
   }
   const suffix=tail.slice(place.name.length),kind:PlaceKind|undefined=/^\s+planning\s+area\b/.test(suffix)?'planningArea':/^\s+subzone\b/.test(suffix)?'subzone':undefined;
   const kinds=kind?[kind]:[...place.kinds];
   checkPlan(sites.some(site=>kinds.some(k=>site[k]?.toLocaleLowerCase('en-SG')===place.name)),'plan.site_location_conflict',path,text);
  }
 };
 inspect(draft.description,'draft.description');if(draft.trigger)inspect(draft.trigger,'draft.trigger');draft.assumptions.forEach((a,i)=>inspect(a.text,`draft.assumptions[${i}].text`));
}
