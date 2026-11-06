import type {AiConfig} from './config.ts';
import type {AiResult,StructuredRequest} from './provider.ts';
import {encodeInput,invalidResponse,object,parseOutput,tokenCount} from './http.ts';
import {requestAnthropicMessages} from './anthropic-messages.ts';

/** Direct Messages API; no catalogue, alternate provider, retry or local cooldown. */
export async function generateAnthropic(config:AiConfig,request:StructuredRequest,fetcher:typeof fetch,signal:AbortSignal):Promise<AiResult>{
 const raw=object(await requestAnthropicMessages({key:config.apiKey,model:config.model,system:request.system,user:encodeInput({context:request.context,user:request.user}),schema:request.schema,maxOutputTokens:config.maxOutputTokens,fetcher,signal}));
 if(raw.type!=='message'||raw.role!=='assistant'||raw.model!==config.model||raw.stop_reason!=='end_turn'||!Array.isArray(raw.content)||raw.content.length!==1)throw invalidResponse();
 const content=object(raw.content[0]);if(content.type!=='text')throw invalidResponse();
 const value=parseOutput(content.text),usage=object(raw.usage);
 const baseInput=tokenCount(usage.input_tokens),cacheRead=usage.cache_read_input_tokens===undefined?0:tokenCount(usage.cache_read_input_tokens),cacheWrite=usage.cache_creation_input_tokens===undefined?0:tokenCount(usage.cache_creation_input_tokens);
 const inputTokens=baseInput===null||cacheRead===null||cacheWrite===null?null:tokenCount(baseInput+cacheRead+cacheWrite),outputTokens=tokenCount(usage.output_tokens);
 return {value,provider:'anthropic',model:config.model,usage:{inputTokens,outputTokens,totalTokens:inputTokens===null||outputTokens===null?null:inputTokens+outputTokens}};
}
