/* Same password + OTP + httpOnly-cookie contract as LEMPYRΛ. No token fallback. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.PresenceSession=api;})(globalThis,()=>{
  function client(fetcher=fetch,hostname=globalThis.location?.hostname){return {async request(path,body,signal){
    const endpoints=typeof module==='object'?require('./endpoints.js'):globalThis.PresenceEndpoints;
    const base=endpoints.resolve(hostname);let response;
    try{response=await fetcher(base+path,{method:body?'POST':'GET',credentials:'include',signal:signal||AbortSignal.timeout(20000),headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
    catch(_){throw new Error('Cannot reach the configured API. Check DNS/TLS or ask the operator to finish gateway setup. Access remains closed.');}
    const data=await response.json().catch(()=>({}));
    if(!response.ok){const error=new Error(data.error?.message||(typeof data.detail==='string'?data.detail:null)||'Gateway response '+response.status);error.status=response.status;error.path=path;throw error;}
    return data;
  }};}
  return {client};
});
