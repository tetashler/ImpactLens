import {inferenceIdentityFor,INFERENCE_MODEL,INFERENCE_PROVIDER,CLAUDE_INFERENCE_MODEL,CLAUDE_INFERENCE_PROVIDER} from '../../inference/model-identity.ts';

/** Explicit selection only: credentials never silently switch providers. */
export function activeInferenceRoute(env:Record<string,string|undefined>=process.env){
 const identity=env.AI_PROVIDER?.trim()==='anthropic'
  ?inferenceIdentityFor(CLAUDE_INFERENCE_MODEL,CLAUDE_INFERENCE_PROVIDER)
  :inferenceIdentityFor(INFERENCE_MODEL,INFERENCE_PROVIDER);
 if(!identity)throw new Error('Invalid built-in inference route.');
 return {model:identity.model,provider:identity.provider,gateway:identity.gateway,executionProvider:identity.executionProvider};
}

export function configuredInferenceKey(env:Record<string,string|undefined>=process.env):string{
 return (env.AI_PROVIDER?.trim()==='anthropic'?env.ANTHROPIC_API_KEY:env.OPENROUTER_API_KEY)?.trim()??'';
}
