/* Fail closed. A legacy bearer token is never accepted as an OTP session. */
window.presenceReady=(async()=>{
  let message='This account has no active access. Return to sign-in.';
  try{const data=await PresenceSession.client().request('/entitlements');
    if(data.member===true)return true;
  }catch(error){message=error.status===401?'No verified session was received by this API. Sign in again after gateway setup is complete.':error.message;}
  window.presenceAccessError=message;
  const show=()=>{const status=document.querySelector('#request-status');if(status)status.textContent=message;};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
  return false;
})();
