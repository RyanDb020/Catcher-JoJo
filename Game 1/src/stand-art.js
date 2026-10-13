// Original generated pose atlases. Rendering uses a small bounded number of cached textures.
(function(root){
 'use strict';
 const keys=['star','world','experience','hand','tusk','cmoon','crimson','dio','jotaro','heaven'];
 const bank=new Map();
 for(const key of keys){if(typeof Image==='undefined')break;const img=new Image();img.decoding='async';img.src='assets/stand-art/'+key+'.webp?v=art-1';bank.set(key,img);}
 const ready=key=>{const img=bank.get(key);return !!(img&&img.complete&&img.naturalWidth>0);};
 function draw(c,key,x,y,size,frame=0,options={}){
  if(!ready(key)||!c||typeof c.drawImage!=='function')return false;
  const img=bank.get(key),sw=img.naturalWidth/3,sh=img.naturalHeight/2,f=Math.max(0,Math.min(5,Math.floor(frame))),aspect=sw/sh;
  const w=size,h=size/aspect;
  c.save();c.translate(x,y);if(options.rotate)c.rotate(options.rotate);if(options.flip)c.scale(-1,1);
  c.globalAlpha*=options.alpha??1;
  if(options.glow){c.shadowColor=options.glow;c.shadowBlur=Math.min(20,size*.035);}
  if(Number.isFinite(options.appear)&&options.appear<1){const p=Math.max(0,options.appear);c.beginPath();c.rect(-w/2,h/2-h*p,w,h*p);c.clip();}
  // The overdrive atlas cell has neighbouring boots crossing its lower side margins.
  // Clip only those margins; retain the full upper-body strike and main feet.
  if(key==='heaven'&&f<=1){c.beginPath();c.rect(-w*.43,-h/2,w*.93,h*.93);c.rect(-w*.43,h*.43,w*.53,h*.07);c.rect(w*.34,h*.43,w*.16,h*.07);c.clip();}
  if(key==='world'&&f===4){c.beginPath();c.rect(-w/2,-h/2,w,h*.70);c.rect(-w*.415,h*.20,w*.83,h*.30);c.clip();}
  if(Number.isFinite(options.materialize)&&options.materialize<1){const p=Math.max(0,options.materialize);c.beginPath();c.rect(-w/2,-h/2,w*.52,h);for(let j=0;j<3;j++){const q=Math.max(0,Math.min(1,p*1.4-j*.12));c.rect(w*.02,-h/2+j*h/3,w*.48,h/3*q);}c.clip();}
  c.drawImage(img,(f%3)*sw,Math.floor(f/3)*sh,sw,sh,-w/2,-h/2,w,h);c.restore();return true;
 }
 function phasePose(t,seconds,kind){
  if(kind==='hand')return t<.18?0:t<.32?1:t<.55?2:t<.72?3:5;
  if(kind==='tusk')return t<.2?0:t<.35?1:t<.75?2+Math.floor(seconds*7)%3:5;
  if(kind==='cmoon')return t<.14?0:t<.3?1:t<.8?2+Math.floor(seconds*2)%3:5;
  return t<.12?0:t<.25?1:t<.84?2+Math.floor(seconds*11)%3:t<.965?5:1;
 }
 function pack(c,w,h,x,catcherY,kind,t,seconds,quality=1){
  const key=kind==='muda'?'world':kind==='giorno'?'experience':kind;
  if(!ready(key))return false;
  const size=Math.min(w*.39,h*(kind==='tusk'?.30:.50),kind==='tusk'?290:480),y=catcherY-size*.50-15;
  const frame=phasePose(t,seconds,kind),strike=t>.25&&t<.84,bob=kind==='cmoon'?Math.sin(seconds*2.7)*8:Math.sin(seconds*(strike?12:3))*3;
  if(strike&&quality>0&&(kind==='muda'||kind==='giorno')){
   draw(c,key,x-size*.04,y+bob,size,2+(Math.floor(seconds*11)+2)%3,{alpha:.13,glow:kind==='muda'?'#ecc15b':'#ef87c2'});
  }
  draw(c,key,x+(strike?Math.sin(seconds*8)*4:0),y+bob,size,frame,{appear:Math.min(1,t*8),glow:quality>0?({hand:'#a3dcff',tusk:'#ffb7ed',cmoon:'#acdf89',muda:'#ffe08a',giorno:'#f2bb5d'})[kind]:null});
  if(quality>0&&kind==='hand'&&t>.25&&t<.75){const q=(t-.25)/.5;c.save();c.strokeStyle='rgba(156,216,255,'+(1-q)*.75+')';c.lineWidth=3;c.beginPath();c.ellipse(x,catcherY-size*.38,size*(.25+.62*q),size*.15,-.1,Math.PI*.88,Math.PI*1.97);c.stroke();c.restore();}
  if(quality>0&&kind==='tusk'){c.save();c.translate(x,y-size*.19);c.rotate(seconds*5);c.strokeStyle='rgba(255,209,237,.62)';c.lineWidth=2;for(let j=0;j<3;j++){c.beginPath();c.arc(0,0,12+j*9+Math.sin(seconds*4)*2,j,Math.PI*1.8+j);c.stroke();}c.restore();}
  return true;
 }
 function king(c,w,h,t,seconds,active,snapshots=[],quality=1){
  if(!ready('crimson'))return false;
  c.save();const entry=Math.min(1,t*8),out=t>.86?(1-t)/.14:1;
  c.fillStyle='rgba(35,0,13,'+(active?.37:.1)*entry*out+')';c.fillRect(0,0,w,h);
  if(quality>0){
   for(let i=0;i<5;i++){const sx=(i+.5)/5*w,off=Math.sin(seconds*14+i*4)*(active?32:6);c.strokeStyle='rgba(250,92,118,'+(active?.45:.18)*out+')';c.lineWidth=1.5;c.beginPath();c.moveTo(sx+off,110);c.lineTo(sx-off,h*.82);c.stroke();
    const snap=snapshots[Math.max(0,snapshots.length-1-(i+1)*8)];if(snap){c.strokeStyle='rgba(255,140,169,'+(.18-i*.022)*out+')';for(const b of snap.balls||[]){if(b.y<0||b.y>h)continue;c.beginPath();c.ellipse(b.x+off,b.y-i*13,17,17,0,0,Math.PI*2);c.stroke();}}}
  }
  const size=Math.min(w*.46,h*.72),x=w*.62+Math.sin(seconds*4)*3,y=h*.52;
  if(active&&quality>0){draw(c,'crimson',x-15,y+5,size,3,{alpha:.14*out});draw(c,'crimson',x+17,y-4,size,2,{alpha:.12*out});}
  draw(c,'crimson',x,y,size,active?phasePose(t,seconds,'crimson'):5,{alpha:entry*out,glow:quality>0?'#da345f':null});
  c.restore();return true;
 }
 function fist(c,key,x,y,size,angle=0,alpha=1){
  if(!ready(key))return false;const img=bank.get(key),sw=img.naturalWidth/3,sh=img.naturalHeight/2;
  c.save();c.translate(x,y);c.rotate(angle*.15);c.globalAlpha*=alpha;
  c.drawImage(img,2*sw+sw*.06,sh+sh*.10,sw*.65,sh*.62,-size*.5,-size*.5,size,size*.95);c.restore();return true;
 }
 function icon(c,key,x,y,size){
  if(!ready(key))return false;const img=bank.get(key),sw=img.naturalWidth/3,sh=img.naturalHeight/2;c.save();c.beginPath();c.arc(x,y,size/2,0,Math.PI*2);c.clip();c.drawImage(img,sw*.18,0,sw*.64,sh*.48,x-size/2,y-size/2,size,size);c.restore();return true;
 }
 root.JoJoStandArt=Object.freeze({draw,pack,king,fist,icon,ready,phasePose,snapshot:()=>({ready:[...bank.keys()].filter(ready),total:keys.length}),version:'1.0'});
})(typeof window==='undefined'?globalThis:window);
