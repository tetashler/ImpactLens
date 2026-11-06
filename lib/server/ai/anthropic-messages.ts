import {fetchJson,object} from './http.ts';

export interface AnthropicMessagesInput {
 model:string;system:string;user:string;schema:unknown;maxOutputTokens:number;
}
const URL='https://api.anthropic.com/v1/messages';
const formats=new Set(['date-time','time','date','duration','email','hostname','uri','ipv4','ipv6','uuid']);
const constraints=new Set(['minimum','maximum','exclusiveMinimum','exclusiveMaximum','multipleOf','minLength','maxLength','minItems','maxItems','uniqueItems','contains','minContains','maxContains','minProperties','maxProperties','pattern']);

/** Anthropic's supported subset is a wire aid; application validators remain authoritative. */
function nativeSchema(schema:unknown):unknown|null{
 let unions=0,optional=0,nodes=0,supported=true;
 const visit=(value:unknown):unknown=>{
  if(!value||typeof value!=='object'||Array.isArray(value)){supported=false;return {};}
  nodes++;const source=object(value),result:Record<string,unknown>={},guidance:Record<string,unknown>={};
  if(source.anyOf||Array.isArray(source.type))unions++;
  const properties=object(source.properties),required=Array.isArray(source.required)?source.required:[];
  optional+=Object.keys(properties).filter(key=>!required.includes(key)).length;
  for(const [key,item]of Object.entries(source)){
   if(constraints.has(key)){
    if(key==='minItems'&&(item===0||item===1))result[key]=item;
    else guidance[key]=item;
   }else if(key==='properties'||key==='$defs'||key==='definitions')result[key]=Object.fromEntries(Object.entries(object(item)).map(([name,child])=>[name,visit(child)]));
   else if(key==='items')result[key]=visit(item);
   else if(key==='anyOf'||key==='allOf'){if(!Array.isArray(item))supported=false;else result[key]=item.map(visit);}
   else if(key==='additionalProperties'){if(item!==false)supported=false;result[key]=false;}
   else if(key==='format'){if(typeof item==='string'&&formats.has(item))result[key]=item;else guidance[key]=item;}
   else if(key==='$ref'){
    // Avoid recursive references and allOf/ref combinations without resolving a second schema language.
    supported=false;
   }else if(['type','required','enum','const','description','title','default','$schema'].includes(key))result[key]=item;
   else supported=false;
  }
  if(source.type==='object'||source.properties)result.additionalProperties=false;
  if(Object.keys(guidance).length)result.description=[source.description,'Application constraints: '+JSON.stringify(guidance)].filter(Boolean).join('\n');
  return result;
 };
 const result=visit(schema);
 // A conservative grammar-size guard also avoids long cold schema compilations.
 return supported&&unions<=16&&optional<=24&&nodes<=180&&JSON.stringify(result).length<=24000?result:null;
}

export function prepareAnthropicMessages(input:AnthropicMessagesInput){
 const projected=nativeSchema(input.schema);
 const haiku=input.model==='claude-haiku-5-5';
 const requestBody={model:input.model,max_tokens:input.maxOutputTokens,stream:false,
  ...(haiku?{thinking:{type:'disabled'}}:{}),
  system:input.system+'\nReturn one JSON value matching the application schema. No markdown or additional prose.'+
   (projected===null?'\nApplication JSON Schema (all constraints are validated locally):\n'+JSON.stringify(input.schema):''),
  messages:[{role:'user',content:input.user}],
  output_config:{...(haiku?{effort:'low'}:{}),...(projected===null?{}:{format:{type:'json_schema',schema:projected}})},
 };
 return {url:URL,requestBody,body:JSON.stringify(requestBody)};
}

/** Exactly one native Messages request; caller owns deadlines and response validation. */
export async function requestAnthropicMessages(input:AnthropicMessagesInput&{key:string;fetcher:typeof fetch;signal:AbortSignal}):Promise<unknown>{
 const prepared=prepareAnthropicMessages(input);
 return fetchJson(input.fetcher,prepared.url,{method:'POST',headers:anthropicHeaders(input.key),body:prepared.body,signal:input.signal});
}

export function anthropicHeaders(key:string){return {'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'};}
