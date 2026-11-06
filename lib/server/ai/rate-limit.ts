import {AiError} from './errors.ts';

const MAX_WAIT_SECONDS=86400;

/** Reads provider guidance only; never invents a fallback or blocks a future request. */
function waitSeconds(headers:Headers):number|undefined {
 const value=headers.get('retry-after')?.trim();
 let seconds:number|undefined;
 if(value&&/^\d+$/.test(value))seconds=Number(value);
 else if(value&&/^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(value)){
  const date=Date.parse(value);
  if(Number.isFinite(date))seconds=Math.ceil((date-Date.now())/1000);
 }
 return seconds===undefined?undefined:Math.min(MAX_WAIT_SECONDS,Math.max(1,seconds));
}

/** An observed upstream 429; no state, local cooldown, retries or provider changes. */
export function providerRateLimitError(headers:Headers):AiError {
 return new AiError('The AI provider rate limit was reached. Try again later.','AI_RATE_LIMIT',429,undefined,waitSeconds(headers));
}

/** Only server-created, validated AI rate-limit errors can produce a hint. */
export function aiRateLimitHeaders(error:unknown):Record<string,string> {
 if(!(error instanceof AiError)||error.code!=='AI_RATE_LIMIT')return {};
 const seconds=error.retryAfterSeconds;
 return typeof seconds==='number'&&Number.isInteger(seconds)&&seconds>0&&seconds<=MAX_WAIT_SECONDS?{'Retry-After':String(seconds)}:{};
}
