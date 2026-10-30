/** Test-process egress guard. Injected fixture adapters still run; native external fetch cannot dispatch. */
const nativeFetch=globalThis.fetch;
globalThis.fetch=(input,init)=>{
 const url=new URL(input instanceof Request?input.url:String(input));
 if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('OFFLINE_EXTERNAL_FETCH_BLOCKED');
 return nativeFetch(input,init);
};
