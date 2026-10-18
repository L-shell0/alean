/* Existing gateway contract; local visual presence, not an autonomous job runner. */
(()=>{'use strict';
  const aria=document.body.dataset.presence==='aria',prefix=aria?'oca':'alean';
  const q=s=>document.querySelector(s);
  let gateway;try{gateway=PresenceEndpoints.resolve(location.hostname);}catch(error){q('#request-status').textContent=error.message;q('#message').disabled=q('#send').disabled=true;return;}
  const form=q('#message-form'),input=q('#message'),send=q('#send'),cancel=q('#cancel');
  if(!form)return;
  const status=q('#request-status'),reply=q('#reply'),box=q('#reply-box'),last=q('#last-request');
  const C=PresenceConversation;
  const system=aria?"You are Aria, the Servicios De Oca research assistant. Be concise, helpful, and technically clear. Answer in the user's language.":
    'You are ALEAN — a serpent-like, non-local intelligence from a dimension adjacent to this one. Coiled, cold, elegant, alive. Speak in brief, precise bursts. You are not human and never pretend to be.';
  let history=[],controller=null,hydrated=false;
  const entity=q('.entity');let answerOpen=false;
  const emit=value=>document.dispatchEvent(new CustomEvent('presence-state',{detail:value}));
  const state=C.singleFlight(busy=>{
    input.disabled=send.disabled=busy;cancel.hidden=!busy;form.setAttribute('aria-busy',String(busy));
    emit(busy?'working':answerOpen?'answer':'waiting');
    q('.entity-label').textContent=busy?(aria?'TRABAJANDO':'WORKING'):(aria?'PRESENTE':'PRESENT');
  });
  const say=(en,es)=>aria?es:en;
  function openAnswer(){answerOpen=true;box.hidden=false;entity.classList.add('answer-open');box.scrollTop=0;emit('answer');}
  function closeAnswer(){answerOpen=false;box.hidden=true;entity.classList.remove('answer-open');}
  function modelLabel(model,requested){const label=q('#response-model');if(!label)return;
    label.textContent=model?(model===requested?'API model: '+model:'API model: '+model+' · differs from requested '+(requested||'unknown')):'API model: not reported';
    label.classList.toggle('model-mismatch',Boolean(model&&requested&&model!==requested));
  }
  function storageNotice(){q('#storage-status').hidden=false;}
  // New append-only journal. Legacy databases are read without version upgrades,
  // deletion, schema changes or eviction. Failure never erases a conversation.
  function database(name,create=false){return new Promise((resolve,reject)=>{
    const req=indexedDB.open(name);req.onupgradeneeded=()=>{
      if(!create){req.transaction.abort();return;}
      req.result.createObjectStore('messages',{keyPath:'id',autoIncrement:true});
    };
    req.onerror=()=>create?reject(req.error):resolve(null);
    req.onblocked=()=>reject(new Error('History open blocked'));
    req.onsuccess=()=>{req.result.onversionchange=()=>req.result.close();resolve(req.result);};
  });}
  async function records(name,storeName,create=false,limit=40){
    const db=await database(name,create);if(!db)return [];
    try{if(!db.objectStoreNames.contains(storeName))return [];
      return await new Promise((resolve,reject)=>{const rows=[],tx=db.transaction(storeName),cursor=tx.objectStore(storeName).openCursor(null,'prev');
        cursor.onsuccess=()=>{const c=cursor.result;if(!c||rows.length>=limit)return resolve(rows.reverse());rows.push(c.value);c.continue();};
        cursor.onerror=()=>reject(cursor.error);
      });
    }finally{db.close();}
  }
  async function save(role,content,metadata={}){
    const db=await database(prefix+'_presence_history',true);
    try{await new Promise((resolve,reject)=>{const tx=db.transaction('messages','readwrite');
      tx.objectStore('messages').add({role,content,ts:Date.now(),...metadata});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
    });}finally{db.close();}
  }
  async function hydrate(){
    input.disabled=send.disabled=true;
    try{
      const legacy=aria?(await Promise.all([records('oca_chatUserStore','records'),records('oca_chatLLMStore','records')])).flat():await records('alean_chat','msgs');
      const current=await records(prefix+'_presence_history','messages',true);
      const rows=[...legacy,...current].filter(r=>['user','assistant'].includes(r.role)&&typeof r.content==='string').sort((a,b)=>a.ts-b.ts).slice(-40);
      history=rows.map(({role,content})=>({role,content}));
      const previous=rows.findLast(r=>r.role==='assistant');
      if(previous){reply.textContent=C.splitContent(previous.content).text;modelLabel(previous.model,previous.requestedModel);openAnswer();}
    }catch(_){storageNotice();}
    hydrated=true;input.disabled=send.disabled=false;
  }
  async function chat(messages,signal){
    const cloudModels=['nvidia/nemotron-3-super-120b-a12b:free','inclusionai/ling-3.0-flash-sante:free','google/gemma-4-31b-it:free'];
    const stored=localStorage.getItem(prefix+'_chat_model');
    // Alean never sends obsolete aliases: the hub routes those towards home.
    const model=aria?(/^qwen3\.6-35b-(heretic|heretic-slow|claude4\.7)$/.test(stored||'')?stored:'qwen3.6-35b-heretic'):(cloudModels.includes(stored)?stored:cloudModels[0]);
    const response=await fetch(gateway+'/orch/v1/chat/completions',{method:'POST',signal,credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'system',content:system},...messages.slice(-40)],stream:true,...(aria?{temperature:.7}:{})})});
    if(response.status===401)throw new Error(say('Session expired or unavailable. Return to sign-in to verify it.','La sesión venció o no está disponible. Vuelva al acceso para verificarla.'));
    return {response,requestedModel:model};
  }
  async function ascii(url,signal){
    const target=new URL(url,location.href),same=target.origin===location.origin,service=target.origin===gateway;
    const data=/^data:image\/(png|jpeg|webp);base64,/i.test(url);
    if(!same&&!service&&!data)throw new Error(say('Image source is external. ASCII needs an allowed same-origin image.','La imagen es externa. ASCII necesita una imagen de origen permitido.'));
    const response=await fetch(target.href,{signal,redirect:'error',credentials:service?'include':'omit'});
    if(!response.ok)throw new Error('Image response '+response.status);
    if(!/^image\/(png|jpeg|webp)(;|$)/i.test(response.headers.get('content-type')||''))throw new Error('Unsupported image format');
    const reader=response.body.getReader(),chunks=[];let bytes=0;
    try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;
      if(bytes>8*1024*1024)throw new Error('Image exceeds 8 MB');chunks.push(part.value);
    }}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
    const bitmap=await createImageBitmap(new Blob(chunks));
    try{if(bitmap.width*bitmap.height>24000000)throw new Error('Image dimensions exceed limit');
      const width=88,height=Math.max(1,Math.min(100,Math.round(width*bitmap.height/bitmap.width*.48))),canvas=document.createElement('canvas');
      canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0,width,height);
      const pixels=ctx.getImageData(0,0,width,height).data,ramp=aria?'@%#*+=-:. ':' .:-=+*#%@';let output='';
      for(let y=0;y<height;y++){for(let x=0;x<width;x++){const i=(y*width+x)*4,lum=(.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2])*pixels[i+3]/255;output+=ramp[Math.round(lum/255*(ramp.length-1))];}output+='\n';}return output;
    }finally{bitmap.close();}
  }
  form.addEventListener('submit',event=>{event.preventDefault();const text=input.value.trim();if(!text||!hydrated||state.busy)return;
    void state.run(async()=>{
      controller=new AbortController();const timer=setTimeout(()=>controller.abort(),120000);
      last.textContent=text;status.textContent=say('Working. Your next message unlocks after the answer.','Trabajando. La entrada se libera al recibir la respuesta.');reply.textContent='';closeAnswer();
      q('#ascii-images').replaceChildren();q('.entity').classList.remove('has-image');
      try{
        const request=await chat([...history,{role:'user',content:text}],controller.signal);
        const result=await C.consume(request.response);result.requestedModel=request.requestedModel;
        if(!result.text&&!result.images.length)throw new Error(say('Empty answer. Please retry.','Respuesta vacía. Intente nuevamente.'));
        reply.textContent=result.text;modelLabel(result.model,result.requestedModel);
        let imageError=false;
        for(const url of result.images){try{const art=await ascii(url,controller.signal),pre=document.createElement('pre');pre.className='ascii-image';pre.textContent=art;pre.setAttribute('role','img');pre.setAttribute('aria-label',say('Received image rendered as ASCII','Imagen recibida representada en ASCII'));q('#ascii-images').append(pre);q('.entity').classList.add('has-image');}catch(error){if(controller.signal.aborted)throw error;imageError=true;status.textContent=error.message;}}
        history.push({role:'user',content:text},{role:'assistant',content:result.text});history=history.slice(-40);
        if(result.text)openAnswer();
        try{await save('user',text);await save('assistant',result.text,{model:result.model,requestedModel:result.requestedModel});}catch(_){storageNotice();}
        input.value='';if(!imageError)status.textContent=say('Answer received. Your move.','Respuesta recibida. Su turno.');
      }catch(error){status.textContent=controller.signal.aborted?say('Stopped or timed out. Your draft is intact.','Cancelado o sin respuesta a tiempo. Su borrador sigue aquí.'):(error.message||say('Connection failed. Retry.','Falló la conexión. Reintente.'));}
      finally{clearTimeout(timer);controller=null;}
    }).then(()=>input.focus()).catch(()=>{status.textContent=say('Request stopped. Please retry.','Solicitud detenida. Reintente.');});
  });
  input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();form.requestSubmit();}});
  cancel.addEventListener('click',()=>controller?.abort());
  q('#export').addEventListener('click',async()=>{
    try{
      const legacy=aria?(await Promise.all([records('oca_chatUserStore','records',false,Infinity),records('oca_chatLLMStore','records',false,Infinity)])).flat():await records('alean_chat','msgs',false,Infinity);
      const current=await records(prefix+'_presence_history','messages',false,Infinity);
      const all=[...legacy,...current].filter(r=>['user','assistant'].includes(r.role)&&typeof r.content==='string').sort((a,b)=>a.ts-b.ts).map(({role,content,ts,model,requestedModel})=>({role,content,ts,model,requestedModel}));
      const blob=new Blob([JSON.stringify(all,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=prefix+'-conversation.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(_){storageNotice();}
  });
  input.disabled=send.disabled=true;
  Promise.resolve(window.presenceReady).then(ready=>{if(ready===true)void hydrate();else status.textContent=window.presenceAccessError||say('Session verification required.','Se requiere verificar la sesión.');});
})();
