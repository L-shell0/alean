(()=>{'use strict';
  const api=PresenceSession.client(),form=document.querySelector('#login-form');if(!form)return;
  const aria=document.body.dataset.presence==='aria',say=(a,b)=>aria?b:a;
  const user=document.querySelector('#username'),password=document.querySelector('#password'),otp=document.querySelector('#otp');
  const button=document.querySelector('#submit'),resend=document.querySelector('#resend'),back=document.querySelector('#change-account'),status=document.querySelector('#status');
  let stage='password',busy=false,cooldown=0;
  const lock=value=>{busy=value;button.disabled=value;user.disabled=password.disabled=otp.disabled=value;back.disabled=value;resend.disabled=value||Date.now()<cooldown;document.dispatchEvent(new CustomEvent('presence-state',{detail:value?'working':'waiting'}));};
  function stageView(value){stage=value;const code=value==='otp';document.querySelector('#credentials-fields').hidden=code;document.querySelector('#otp-fields').hidden=!code;resend.hidden=back.hidden=!code;
    button.textContent=code?say('Verify and enter →','Verificar y entrar ←'):say('Send my OTP →','Enviar mi OTP ←');
    otp.required=code;user.required=password.required=!code;(code?otp:user).focus();
  }
  function errorText(error){return error.message||say('Gateway unavailable. Please retry.','La puerta de enlace no está disponible. Reintente.');}
  form.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;
    if(stage==='otp'&&!/^\d{6}$/.test(otp.value)){status.textContent=say('Enter six digits.','Ingrese seis dígitos.');return;}
    lock(true);status.textContent=say('Verifying…','Verificando…');
    try{if(stage==='password'){
      const data=await api.request('/auth/login',{username:user.value.trim(),password:password.value});
      if(!data.otp_sent)throw Error(say('The gateway did not confirm OTP delivery.','La puerta de enlace no confirmó el envío del OTP.'));
      password.value='';stageView('otp');cooldown=Date.now()+30000;
      status.textContent=say('Code sent through your configured channel.','Código enviado por su canal configurado.');
    }else{
      const data=await api.request('/auth/otp/verify',{username:user.value.trim(),otp:otp.value});
      if(data.ok!==true)throw Error(say('OTP verification was not confirmed.','La verificación OTP no fue confirmada.'));
      // Verification success alone is not proof that a cross-site cookie persisted.
      let session;try{session=await api.request('/entitlements');}catch(error){
        if(error.status===401)throw Error(say('The code was accepted, but this API received no session cookie. Gateway/session setup needs review; do not reuse this OTP.','El código fue aceptado, pero esta API no recibió la cookie de sesión. Revise el gateway; no reutilice este OTP.'));
        throw error;
      }
      if(!session.member)throw Error(say('This account has no active access.','Esta cuenta no tiene acceso activo.'));
      const prefix=aria?'oca':'alean';for(const key of ['token','refresh','user'])sessionStorage.removeItem(prefix+'_'+key);
      otp.value='';location.replace('../app/');
    }}catch(error){status.textContent=errorText(error);}
    finally{lock(false);if(stage==='otp')otp.focus();}
  });
  resend.addEventListener('click',async()=>{if(busy||Date.now()<cooldown)return;lock(true);
    try{await api.request('/auth/otp/resend',{username:user.value.trim()});cooldown=Date.now()+30000;status.textContent=say('A new code was requested.','Se solicitó un nuevo código.');}catch(error){status.textContent=errorText(error);}finally{lock(false);}
  });
  back.addEventListener('click',()=>{if(busy)return;otp.value=password.value='';stageView('password');status.textContent='';});
  const timer=setInterval(()=>{if(!busy)resend.disabled=Date.now()<cooldown;},1000);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  otp.addEventListener('input',()=>{otp.value=otp.value.replace(/\D/g,'').slice(0,6);});stageView('password');
})();
