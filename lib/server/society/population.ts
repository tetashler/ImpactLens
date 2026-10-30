import {ensure} from '../../experiments/validation.ts';
import {populationView,buildPopulation} from '../population/store.ts';
/** Increase only the bounded source view when it lacks enough eligible adults; never synthesize extra traits. */
export function populationForActive(agents:number){
 ensure(Number.isSafeInteger(agents)&&agents>=4&&agents<=100,'SOCIAL_ACTIVE_LIMIT');
 const population=buildPopulation({size:10000,seed:'impactlens-society-v1'});
 let limit=128,view=populationView(population,limit);
 while(view.residents.filter(r=>Number(r.ageGroup.split('_')[0])>=20).length<agents&&limit<256){limit=Math.min(256,limit+32);view=populationView(population,limit);}
 ensure(view.residents.filter(r=>Number(r.ageGroup.split('_')[0])>=20).length>=agents,'SOCIAL_POPULATION_CAPACITY');
 return view;
}
