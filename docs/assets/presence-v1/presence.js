/* One visual engine, two skins. No fetch, keys, LLM, audio or authentication. */
(() => {
  'use strict';
  const canvas=document.querySelector('.presence-canvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const aria=document.body.dataset.presence==='aria';
  const colors=aria?['#b80c35','#6f258e','#b55a89']:['#80dba4','#ae91d4','#cfdfd4'];
  const chars='01λ{}<>/+=:.*';
  const atlas=document.createElement('canvas'), cell=40, cols=16;
  atlas.width=cols*cell;atlas.height=Math.ceil(chars.length*3/cols)*cell;
  const ink=atlas.getContext('2d');if(!ink)return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let size=0,elapsed=0,previous=null,last=-Infinity,raf=0,visible=true,state='waiting',answerAt=-Infinity;
  const points=[];
  // Hex-like staggered lattice wrapped onto an ellipsoid: an ASCII skin.
  for(let row=0;row<24;row++)for(let col=0;col<32;col++){
    points.push({theta:(col+(row%2)*.5)/32*Math.PI*2,
      phi:(row+.5)/24*Math.PI,
      glyph:(row*7+col*3)%chars.length,
      phase:row*.38+col*.29,color:(row+col)%9<6?0:(row+col)%2+1});
  }
  const buildAtlas=()=>{
    ink.clearRect(0,0,atlas.width,atlas.height);
    ink.font='500 27px PresenceMono,monospace';ink.textAlign='center';ink.textBaseline='middle';
    colors.forEach((color,c)=>{ink.fillStyle=color;for(let g=0;g<chars.length;g++){
      const i=c*chars.length+g;ink.fillText(chars[g],(i%cols+.5)*cell,(Math.floor(i/cols)+.5)*cell);
    }});
  };
  const draw=t=>{
    ctx.clearRect(0,0,size,size);
    const pulse=state==='pulse'?1.4:state==='breathing'?.85:.5;
    const breath=1+.035*Math.sin(t*pulse);
    const reveal=state==='answer'?(motion.matches?1:Math.min(1,Math.max(0,(t-answerAt)/.75))):0;
    const opening=1-Math.pow(1-reveal,3),shock=Math.sin(reveal*Math.PI);
    // Fine hexagonal seams: a geometric shell, not a photoreal face.
    ctx.strokeStyle=colors[0];ctx.lineWidth=.65;ctx.globalAlpha=.13;
    const r=size*.35*breath*(1+.16*opening);
    for(let ring=0;ring<3;ring++){
      ctx.beginPath();
      for(let i=0;i<=6;i++){
        const a=i*Math.PI/3+t*.025*(ring%2?-1:1)*(aria?-1:1);
        const x=size/2+Math.cos(a)*r*(.72+ring*.15),y=size/2+Math.sin(a)*r*(.72+ring*.15);
        if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }ctx.stroke();
    }
    for(const p of points){
      const theta=p.theta+t*.13*(aria?-1:1);
      const wave=.04*Math.sin(p.phi*6+theta*2-t*pulse);
      const rad=size*.34*breath*(1+wave+.16*opening+.11*shock);
      const x=Math.cos(theta)*Math.sin(p.phi)*rad;
      const z=Math.sin(theta)*Math.sin(p.phi);
      const y=Math.cos(p.phi)*rad*1.08;
      const front=(z+1)/2;
      // A sinuous bright meridian gives the snake-like travelling presence.
      const stripe=.5+.5*Math.cos(theta-p.phi*2.4+t*.4);
      ctx.globalAlpha=(aria?.2+.8*front:.08+.7*front)*(.45+.55*Math.pow(stripe,4));
      if(!aria)ctx.globalAlpha*=1-.8*opening*Math.exp(-(x*x+y*y)/(size*size*.055));
      const side= Math.max(8,size*(.017+.01*front));
      const glyph=(p.glyph+Math.floor(t*.22+p.phase))%chars.length;
      const i=p.color*chars.length+glyph;
      ctx.drawImage(atlas,i%cols*cell,Math.floor(i/cols)*cell,cell,cell,
        Math.round(size/2+x-side/2),Math.round(size/2+y-side/2),side,side);
    }ctx.globalAlpha=1;
  };
  const tick=now=>{
    raf=0;if(document.hidden||!visible||motion.matches)return;
    if(previous!==null)elapsed+=Math.min(now-previous,100)/1000;previous=now;
    if(now-last>=1000/60-1){draw(elapsed);last=now;}
    raf=requestAnimationFrame(tick);
  };
  const sync=()=>{cancelAnimationFrame(raf);raf=0;previous=null;
    if(motion.matches)draw(0);else if(visible&&!document.hidden)raf=requestAnimationFrame(tick);};
  document.addEventListener('presence-state',event=>{
    const next=event.detail==='working'?'pulse':event.detail==='answer'&&!aria?'answer':'waiting';
    if(next==='answer'&&state!=='answer')answerAt=elapsed;
    state=next;
    if(motion.matches)draw(elapsed);
  });
  const resize=()=>{size=canvas.getBoundingClientRect().width;if(!size)return;
    const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.floor(size*dpr);canvas.height=Math.floor(size*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);draw(elapsed);};
  document.querySelectorAll('[data-state]').forEach(button=>button.addEventListener('click',()=>{
    state=button.dataset.state;
    document.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    document.querySelector('.entity-label').textContent=button.textContent.toUpperCase();
    if(motion.matches)draw(0);
  }));
  buildAtlas();resize();sync();
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(canvas);
  document.addEventListener('visibilitychange',sync);motion.addEventListener('change',sync);
  if(document.fonts)document.fonts.ready.then(()=>{buildAtlas();draw(elapsed);});
})();
