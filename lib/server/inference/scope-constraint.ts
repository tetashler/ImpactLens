/** Conservative generation constraint for explicit domestic Singapore interventions only. */
const names=new Intl.DisplayNames(['en'],{type:'region'});
const foreignNames:string[]=[];
for(let a=65;a<=90;a++)for(let b=65;b<=90;b++){const code=String.fromCharCode(a,b),name=names.of(code);if(name&&name!==code&&name!=='Singapore')foreignNames.push(name.toLowerCase().replace(/[^a-z]+/g,' ').trim());}
export function domesticSingaporeConstraint(question:string,planningAreaName?:string|null){
 const text=' '+question.toLowerCase().replace(/[^a-z]+/g,' ').trim()+' ';
 if(!text.includes(' singapore ')||!(/\b(?:nationwide|national|domestic|within singapore)\b/i.test(question)||planningAreaName&&text.includes(' '+planningAreaName.toLowerCase()+' ')))return false;
 if(/\b(?:international|worldwide|global|foreign|overseas|abroad|borders?|exports?|imports?|bilateral|trade|travel|tourism|migration|between|with|joint)\b|cross[- ]border|supply[- ]chain/i.test(question))return false;
 if(foreignNames.some(name=>name&&text.includes(' '+name+' '))||/\b(?:USA|U\.S\.|UK|U\.K\.)\b/i.test(question))return false;
 // Unresolved place phrases are left to the general planner, never forced into Singapore.
 const places=[...question.matchAll(/\bin\s+(?:the\s+)?([a-z][a-z -]{0,60})/ig)].map(m=>m[1].trim().toLowerCase());
 return places.every(place=>place==='singapore'||place===planningAreaName?.toLowerCase());
}
