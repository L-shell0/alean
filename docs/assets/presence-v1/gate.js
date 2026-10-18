/* Fail closed. A legacy bearer token is never accepted as an OTP session. */
window.presenceReady=(async()=>{
  try{const data=await PresenceSession.client().request('/entitlements');
    if(data.member===true)return true;
  }catch(_){}
  location.replace('../login/');return false;
})();
