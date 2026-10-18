/* Same password + OTP + httpOnly-cookie contract as LEMPYRΛ. No token fallback. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.PresenceSession=api;})(globalThis,()=>{
  function client(fetcher=fetch){return {async request(path,body,signal){
    const response=await fetcher('https://sar1a.lempyra.com'+path,{method:body?'POST':'GET',credentials:'include',signal:signal||AbortSignal.timeout(20000),headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){const error=new Error(data.error?.message||'Gateway response '+response.status);error.status=response.status;throw error;}
    return data;
  }};}
  return {client};
});
