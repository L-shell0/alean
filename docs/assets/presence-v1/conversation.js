/* Transport and single-flight primitives. No credentials or visual dependencies. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.PresenceConversation=api;})(globalThis,()=>{
  'use strict';
  function splitContent(content){
    let text='',images=[];
    if(Array.isArray(content))for(const part of content){
      if(part.type==='text')text+=part.text||'';
      if(part.type==='image_url')images.push(typeof part.image_url==='string'?part.image_url:part.image_url?.url);
    }else text=typeof content==='string'?content:'';
    text=text.replace(/!\[[^\]]*\]\(([^\s)]+)\)/g,(_,url)=>{images.push(url);return '';});
    return {text:text.trim(),images:[...new Set(images.filter(Boolean))].slice(0,4)};
  }
  async function consume(response,onText=()=>{}){
    if(!response.ok)throw new Error('Service response '+response.status);
    let text='',images=[];
    const append=value=>{const p=splitContent(value);text+=p.text;images.push(...p.images);onText(text);};
    if(!(response.headers.get('content-type')||'').includes('text/event-stream')){
      const data=await response.json();if(data.error)throw new Error('The service could not answer.');
      append(data.choices?.[0]?.message?.content); // No generation endpoint is called.
    }else{
      if(!response.body)throw new Error('Empty stream');
      const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',done=false,event=[];
      const dispatch=()=>{const raw=event.join('\n');event=[];if(!raw)return;
        if(raw==='[DONE]'){done=true;return;}
        const data=JSON.parse(raw);if(data.error)throw new Error('The service interrupted its answer.');
        const value=data.choices?.[0]?.delta?.content??data.choices?.[0]?.message?.content;
        // Preserve spaces across token boundaries; splitContent trims only final content.
        if(typeof value==='string'){text+=value;onText(text);}else if(value)append(value);
      };
      const line=s=>{if(!s)dispatch();else if(s.startsWith('data:'))event.push(s.slice(5).replace(/^ /,''));};
      let received=0;
      try{while(!done){const chunk=await reader.read();received+=chunk.value?.byteLength||0;if(received>2*1024*1024)throw new Error('Answer exceeds the 2 MB display limit');buffer+=decoder.decode(chunk.value||new Uint8Array(),{stream:!chunk.done});
        let idx;while((idx=buffer.indexOf('\n'))>=0){line(buffer.slice(0,idx).replace(/\r$/,''));buffer=buffer.slice(idx+1);}
        if(chunk.done){if(buffer)line(buffer.replace(/\r$/,''));dispatch();break;}
      }}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
    }
    const final=splitContent(text);return {text:final.text,images:[...new Set([...images,...final.images])].slice(0,4)};
  }
  function singleFlight(onBusy=()=>{}){let busy=false;return {get busy(){return busy;},async run(task){
    if(busy)return false;busy=true;onBusy(true);
    try{return await task();}finally{busy=false;onBusy(false);}
  }};}
  return {splitContent,consume,singleFlight};
});
