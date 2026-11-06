/** Browser-safe identities. Credentials and transport configuration stay on the server. */
export const INFERENCE_MODEL='deepseek/deepseek-v4-flash-0731' as const;
export const INFERENCE_PROVIDER='digitalocean' as const;
export const CLAUDE_INFERENCE_MODEL='claude-haiku-5-5' as const;
export const CLAUDE_INFERENCE_PROVIDER='anthropic' as const;
const IDENTITIES=[
 Object.freeze({model:INFERENCE_MODEL,provider:INFERENCE_PROVIDER,gateway:'OpenRouter',servingProvider:'DigitalOcean',executionProvider:'openrouter',label:'DeepSeek V4 Flash 0731'} as const),
 Object.freeze({model:CLAUDE_INFERENCE_MODEL,provider:CLAUDE_INFERENCE_PROVIDER,gateway:'Anthropic',servingProvider:'Anthropic',executionProvider:'anthropic',label:'Claude Haiku 5.5'} as const),
] as const;
export type InferenceIdentity=typeof IDENTITIES[number];
export type InferenceModel=InferenceIdentity['model'];
export type InferenceProvider=InferenceIdentity['provider'];
export type InferenceGateway=InferenceIdentity['gateway'];
export type InferenceServingProvider=InferenceIdentity['servingProvider'];
export type InferenceExecutionProvider=InferenceIdentity['executionProvider'];
export function inferenceIdentityFor(model:unknown,provider:unknown):InferenceIdentity|null {
 return IDENTITIES.find(identity=>identity.model===model&&identity.provider===provider)??null;
}
export function servingIdentityMatches(model:unknown,provider:unknown,servingModel:unknown,servingProvider:unknown):boolean {
 const identity=inferenceIdentityFor(model,provider);
 return identity!==null&&servingModel===identity.model&&servingProvider===identity.servingProvider;
}
/** Records without a requested-provider field still require a registered exact serving pair. */
export function verifiedModelIdentity(model:unknown,servingModel:unknown,servingProvider:unknown):InferenceIdentity|null {
 return IDENTITIES.find(identity=>identity.model===model&&servingModel===identity.model&&servingProvider===identity.servingProvider)??null;
}
