/* Original Canvas choreography: deterministic seconds, bounded geometry, no async effects.
   Visual reconstructions use ball/catcher history; they do not undo saved game progress. */
(function(root){
'use strict';
const TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x)),lerp=(a,b,t)=>a+(b-a)*t,
 smooth=x=>{x=clamp(x);return x*x*(3-2*x)},out=x=>1-(1-clamp(x))**3,
 hash=n=>{const a=Math.sin(n*127.1+17.7)*43758.5453;return a-Math.floor(a)},fract=x=>x-Math.floor(x);
const glowCache=new Map();let flashClock=0,lastFlashAt=-1000;
let config={quality:2,reduced:false,flashes:true,shake:true,particles:true};
const stars=Array.from({length:180},(_,i)=>({x:hash(i*4),y:hash(i*4+1),z:.2+hash(i*4+2)*.8}));
const blocks=Array.from({length:72},(_,i)=>{const building=i%12,row=Math.floor(i/12);return {building,row,seed:hash(i*19),depth:.35+hash(i*7)*.65};});
const count=(n)=>Math.ceil(n*(config.reduced?.35:config.quality===0?.5:config.quality===1?.75:1));
function configure(s={},now=0){flashClock=now;config={...config,quality:Number(s.quality)||0,reduced:!!s.reduced,flashes:s.flashes!==false,shake:s.shake!==false,particles:s.particles!==false};}
function stroke(c,pts,col,width=1){if(pts.length<2)return;c.beginPath();c.moveTo(...pts[0]);for(let j=1;j<pts.length;j++)c.lineTo(...pts[j]);c.strokeStyle=col;c.lineWidth=width;c.lineCap='round';c.stroke();}
function polygon(c,pts,col,edge){c.beginPath();c.moveTo(...pts[0]);for(let j=1;j<pts.length;j++)c.lineTo(...pts[j]);c.closePath();c.fillStyle=col;c.fill();if(edge){c.strokeStyle=edge;c.lineWidth=1;c.stroke();}}
function disk(c,x,y,r,col){c.beginPath();c.arc(x,y,Math.max(.1,r),0,TAU);c.fillStyle=col;c.fill();}
function glow(c,x,y,r,rgb,alpha=.5){if(r<1||alpha<=0)return;if(root.document?.createElement){let img=glowCache.get(rgb);if(!img){img=root.document.createElement('canvas');img.width=img.height=128;const cc=img.getContext('2d'),g=cc.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,`rgba(${rgb},1)`);g.addColorStop(.2,`rgba(${rgb},.4)`);g.addColorStop(1,`rgba(${rgb},0)`);cc.fillStyle=g;cc.fillRect(0,0,128,128);if(glowCache.size>=20)glowCache.delete(glowCache.keys().next().value);glowCache.set(rgb,img);}c.save();c.globalAlpha*=alpha;c.drawImage(img,x-r,y-r,r*2,r*2);c.restore();return;}const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${rgb},${alpha})`);g.addColorStop(.2,`rgba(${rgb},${alpha*.4})`);g.addColorStop(1,`rgba(${rgb},0)`);disk(c,x,y,r,g);}
function camera(c,w,h,seconds,power=1,zoom=1){c.translate(w*.5,h*.5);if(config.shake&&!config.reduced)c.translate(Math.sin(seconds*47)*power*3,Math.cos(seconds*53)*power*2);c.scale(zoom,zoom);c.translate(-w*.5,-h*.5);}
function lightning(c,w,h,seed,t,strength=1,color='221,167,255'){
 const p=fract(t*.75+seed*.21),a=seed*2.399+Math.sin(t)*.2,reach=Math.min(w,h)*(.2+.7*p),pts=[];
 for(let j=0;j<13;j++){const d=j/12*reach,jitter=(hash(seed*21+j)-.5)*28*Math.sin(j/12*Math.PI);pts.push([w*.5+Math.cos(a)*d+Math.sin(a)*jitter,h*.5+Math.sin(a)*d+Math.cos(a)*jitter]);}
 stroke(c,pts,`rgba(${color},${strength*(1-p)*.7})`,1+2*strength);
 for(let k=3;k<11;k+=3){const [x,y]=pts[k],branch=[];for(let j=0;j<5;j++)branch.push([x+Math.cos(a+.7)*j*reach*.05,y+Math.sin(a+.7)*j*reach*.05+(hash(seed+k+j)-.5)*15]);stroke(c,branch,`rgba(${color},${strength*(1-p)*.6})`,1);}
 stroke(c,pts,`rgba(255,248,255,${strength*(1-p)*.55})`,.7);
}
function shock(c,w,h,x,y,t,scale=1,color='220,200,255'){
 if(t<=0||t>=1)return;const r=out(t)*Math.max(w,h)*scale;c.save();c.translate(x,y);c.scale(1,.72+.2*t);c.beginPath();
 for(let i=0;i<=64;i++){const a=i/64*TAU,rr=r*(1+.045*Math.sin(a*7+t*12));if(i)c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);else c.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}
 c.strokeStyle=`rgba(${color},${(1-t)*.65})`;c.lineWidth=2+6*(1-t);c.stroke();c.restore();
}
function sky(c,w,h,time,mode='flow',power=1){
 const cx=w*.5,cy=h*.46;time*=config.reduced?.18:1;c.save();
 for(let i=0;i<count(stars.length);i++){const s=stars[i];let x,y,ox,oy;
  if(mode==='pull'){const a=Math.atan2((s.y-.5)*h,(s.x-.5)*w)+time*s.z*.8,r=Math.hypot((s.x-.5)*w,(s.y-.5)*h)*(1-.82*power);x=cx+Math.cos(a)*r;y=cy+Math.sin(a)*r;ox=cx+Math.cos(a-.06*power)*r*1.2;oy=cy+Math.sin(a-.06*power)*r*1.2;}
  else if(mode==='birth'){const a=i*2.399,r=(.05+s.z*.95)*Math.max(w,h)*power;const settle=smooth((power-.68)/.32);x=lerp(cx+Math.cos(a+time*.06)*r,s.x*w,settle);y=lerp(cy+Math.sin(a+time*.06)*r*.8,s.y*h,settle);ox=x-(x-cx)*(.24*(1-settle));oy=y-(y-cy)*(.24*(1-settle));}
  else{x=fract(s.x+Math.sin(time*.2)*s.z*.04)*w;y=fract(s.y-time*s.z*.13*power)*h;ox=x+Math.sin(time*.35)*power*12*s.z;oy=y+power*(8+45*s.z);}
  stroke(c,[[ox,oy],[x,y]],`rgba(194,222,255,${.25+s.z*.5})`,.5+s.z);disk(c,x,y,.4+s.z*1.4,'#e5efff');
 }c.restore();
}
function burst(c,x,y,time,seed,color='225,184,255',size=1){
 if(!config.particles||time<0||time>1)return;for(let i=0;i<count(18);i++){const a=i*2.399+seed,dist=(10+90*hash(i+seed))*out(time)*size,px=x+Math.cos(a)*dist,py=y+Math.sin(a)*dist+time*time*20*size;
 stroke(c,[[px-Math.cos(a)*(7+time*9)*size,py-Math.sin(a)*(7+time*9)*size],[px,py]],`rgba(${color},${(1-time)*.85})`,1+hash(i)*2);}
}
function impact(c,w,h,x,y,beat,power=1,color='211,165,255',allowFlash=true){
 if(beat<0||beat>1)return;const q=out(beat);c.save();c.globalCompositeOperation='screen';
 if(allowFlash&&config.flashes&&!config.reduced&&beat<.2&&flashClock-lastFlashAt>=330){lastFlashAt=flashClock;glow(c,x,y,Math.min(w,h)*(.03+.1*power),color,(1-beat/.2)*.75);}
 for(let j=0;j<12;j++){const a=j*TAU/12,inner=(12+40*q)*power,r=(25+95*q)*power;stroke(c,[[x+Math.cos(a)*inner,y+Math.sin(a)*inner],[x+Math.cos(a)*r,y+Math.sin(a)*r]],`rgba(${color},${(1-beat)*.8})`,j%3?1:3);}
 c.restore();shock(c,w,h,x,y,beat,.25*power,color);burst(c,x,y,beat,3,color,power);
}
function manifestation(c,w,h,t,seconds,front=false){
 const pull=smooth(t/.28),manifest=smooth((t-.22)/.35),release=smooth((t-.72)/.28),cx=w*.51,cy=h*.50;
 c.save();if(!front){
  camera(c,w,h,seconds,release,1+Math.sin(t*Math.PI)*.025);
  for(let j=0;j<3;j++){const q=fract(seconds*.22+j/3),pts=[];for(let k=0;k<36;k++){const x=k/35*w,y=h*q+Math.sin(k*.45-seconds*3)*h*.025*(config.reduced?.2:1);pts.push([x,y]);}stroke(c,pts,`rgba(171,206,255,${.24*(1-q)})`,2);}
  for(let i=0;i<7;i++){const a=i*2.399+seconds*.6,r=Math.min(w,h)*(.14+.17*(1-pull)+Math.sin(seconds*2+i)*.025),p=fract(seconds*.6+i/7);stroke(c,[[cx+Math.cos(a)*r,cy+Math.sin(a)*r],[cx+Math.cos(a+.5)*r*.55,cy+Math.sin(a+.5)*r*.55],[cx,cy]],`rgba(192,197,255,${.16+.3*pull})`,2);disk(c,cx+Math.cos(a)*r*(1-p),cy+Math.sin(a)*r*(1-p),3,'#d8eaff');}
  for(let i=0;i<6;i++)lightning(c,w,h,i,seconds*.7,.5+manifest);
  // The developing aura lifts individual floor sections, then ejects them at release.
  for(let i=0;i<count(16);i++){const x0=w*(.08+i*.057),q=hash(i+20),lift=manifest*(.02+.09*q),eject=release*(config.reduced?.05:1),x=x0+(x0-w*.51)*eject*.5,y=h*.90-lift*h-eject*h*(.12+.24*q);masonry(c,x,y,Math.min(w,h)*(.022+.015*q),eject*(q-.5)*5,.7,manifest,i+600);glow(c,x,y+10,22,'184,206,255',.18*manifest);}

  sky(c,w,h,seconds,'flow',.15+release*3.5);
  for(let i=0;i<3;i++){const p=fract(seconds*.35+i/3);shock(c,w,h,cx,cy,p,.35+.3*manifest,'155,186,245');}
 }else{
  for(let i=0;i<count(9);i++){const q=fract(seconds*.45+i/9),x=w*(.56+.075*Math.sin(q*12+i)),y=h*(.80-q*.56);glow(c,x,y,14+manifest*12,'191,221,255',.22);stroke(c,[[x-4,y+24],[x,y],[x+8,y-16]],'rgba(223,238,255,.65)',1.5);}
  for(let i=0;i<4;i++){const open=smooth((t-.30-i*.08)/.28),x=w*(.14+i*.24),y=h*(.20+hash(i)*.48);if(open>0){const pts=[[x-40*open,y-90*open],[x+12*open,y-30*open],[x-8*open,y+20*open],[x+30*open,y+100*open]];stroke(c,pts,'#050312',16*open);stroke(c,pts,'rgba(208,177,255,.95)',3);stroke(c,pts,'rgba(255,240,255,.75)',1);glow(c,x,y,70*open,'161,105,255',.15);}}
  // Traversing light sheets reveal different body layers, never a single opacity fade.
  if(manifest<1){for(let j=0;j<3;j++){const y=h*(.8-(t*1.7+j*.18)%1*.7);stroke(c,[[w*.35,y+12],[w*.51,y],[w*.74,y-20]],'rgba(213,240,255,.55)',2);}}
  glow(c,w*.60,h*.54,Math.min(w,h)*(.16+.025*Math.sin(seconds*4)),'129,175,255',.18+.10*manifest);
  if(t>.55&&t<.70)impact(c,w,h,w*.61,h*.49,(t-.55)/.15,1.3,'228,235,255');
  if(t>.76)for(let i=0;i<count(22);i++){const y=fract(hash(i)*1.3-seconds*.4)*h;stroke(c,[[w*hash(i+71),y],[w*hash(i+71)-w*.22*release,y+10]],'rgba(181,210,255,.4)',1);}
 }c.restore();
}
function sample(history,t){if(!history.length)return null;const pos=(1-smooth(t))*(history.length-1),i=Math.floor(pos),a=history[i],b=history[Math.min(i+1,history.length-1)],k=pos-i;return {a,b,k};}
function historyScene(c,w,h,t,history,x=0,y=0,scale=1,assets={}){const s=sample(history,t);if(!s)return;c.save();c.translate(x,y);c.scale(scale,scale);
 const {a,b,k}=s;c.scale(w/(a.width||w),h/(a.height||h));for(let j=0;j<(a.balls||[]).length;j++){const p=a.balls[j],q=b.balls[j]||p,xx=lerp(p.x,q.x,k),jump=Math.abs(p.y-q.y)>(a.height||h)*.6,yy=jump?(k<.5?p.y:q.y):lerp(p.y,q.y,k),r=13;
  if(yy<-100||yy>h+100)continue;const next=history[Math.max(0,Math.floor((1-smooth(clamp(t+.025)))*(history.length-1)))]?.balls[j]||p;
  stroke(c,[[xx,yy],[next.x,next.y]],'rgba(155,213,255,.7)',3);glow(c,xx,yy,34,p.gold?'255,207,117':'215,128,247',.27);const orb=assets[p.kind==='bomb'?'bomb':p.gold?'gold':'normal'];if(orb)c.drawImage(orb,xx-r*1.3,yy-r*1.3,r*2.6,r*2.6);else{disk(c,xx,yy,r,p.gold?'#ffe097':'#db7bbb');disk(c,xx-4,yy-5,3,'#fff2fc');}
 }
 const bx=lerp(a.catcherX,b.catcherX,k),bw=lerp(a.catcherWidth,b.catcherWidth,k),sourceH=a.height||h,by=a.catcherY??sourceH*.88,bh=a.catcherHeight??sourceH*.08;if(assets.catcher)c.drawImage(assets.catcher,bx-8,by-5,bw+16,bh+10);else polygon(c,[[bx,by],[bx+bw,by],[bx+bw*.85,by+bh],[bx+bw*.15,by+bh]],'#675079','#d4b8ed');
 c.restore();}
function rewind(c,w,h,t,history=[],assets={}){
 c.save();c.fillStyle='#060b1b';c.fillRect(0,0,w,h);const seconds=t*8.2,layer=smooth((t-.3)/.4);camera(c,w,h,seconds,.2,1+.05*Math.sin(t*Math.PI));
 if(assets.space){c.save();c.globalAlpha*=.35;c.drawImage(assets.space,0,0,w,h);c.restore();}sky(c,w,h,seconds,'flow',.7+t*4);
 // Full-screen interpolated ball/catcher data moves backwards, with a changing camera.
 c.save();c.translate(w*.5,h*.48);c.rotate(config.reduced?0:Math.sin(t*TAU)*.045);c.translate(-w*.5,-h*.48);historyScene(c,w,h,t,history,0,0,1,assets);c.restore();
 for(let i=0;i<3;i++){const p=fract(t*2.5+i*.33),pw=w*(.20+.14*layer),ph=h*.35,xx=w*(.1+.35*i)+Math.sin(seconds+i)*w*.06,yy=h*(.27+.13*Math.sin(seconds*.7+i));
  c.save();c.translate(xx,yy);c.rotate((i-1)*.07+Math.sin(seconds+i)*.025);c.beginPath();c.rect(-pw/2,-ph/2,pw,ph);c.clip();c.fillStyle='rgba(16,29,61,.82)';c.fillRect(-pw/2,-ph/2,pw,ph);if(assets.space)c.drawImage(assets.space,-pw/2,-ph/2,pw,ph);c.translate(-pw/2,-ph/2);c.scale(pw/w,ph/h);historyScene(c,w,h,clamp(t+(i-1)*.12),history,0,0,1,assets);c.restore();
  stroke(c,[[xx-pw/2,yy-ph/2],[xx+pw/2,yy-ph/2],[xx+pw/2,yy+ph/2]],'rgba(180,214,255,.65)',1);
  burst(c,xx,yy,p,i,'161,209,255',.35);
 }
 for(let i=0;i<5;i++)lightning(c,w,h,i,seconds*.5,.25+layer*.5,'135,210,255');
 // Energy impacts are reconstructed in reverse: debris and rays return to ball origins.
 const snap=sample(history,t)?.a;for(let i=0;i<Math.min(3,snap?.balls.length||0);i++){const b=snap.balls[i];burst(c,b.x,b.y,1-fract(seconds*.45+i*.31),i,'222,171,255',.65);}
 if(root.JoJoCosmicDirector?.clockworkMini)root.JoJoCosmicDirector.clockworkMini(c,w*.89,h*.18,Math.min(w,h)*.065,t,true);
 c.restore();
}
function masonry(c,x,y,size,angle,depth,crack=0,seed=0){
 c.save();c.translate(x,y);c.rotate(angle);const ww=size,hh=size*(.7+hash(seed)*.9),th=size*.22;
 const cut=crack*ww*(.08+.15*hash(seed+8));polygon(c,[[-ww/2+cut,-hh/2],[ww*.10,-hh/2-cut*.4],[ww/2,-hh/2+cut],[ww/2,hh*.18],[ww*.40,hh/2],[-ww*.17,hh/2-cut*.3],[-ww/2,hh*.27]],seed%3===0?'#686373':depth>.65?'#5c4f78':'#292940','#a791c0');
 polygon(c,[[ww/2,-hh/2],[ww/2+th,-hh/2-th],[ww/2+th,hh/2-th],[ww/2,hh/2]],'#1b2135','#806789');
 polygon(c,[[-ww/2,-hh/2],[-ww/2+th,-hh/2-th],[ww/2+th,-hh/2-th],[ww/2,-hh/2]],'#89728f');
 if(size>20&&seed<500){for(let j=0;j<6;j++){c.fillStyle=j%3===0?'#4d6878':'#172333';c.fillRect(-ww*.36+(j%3)*ww*.27,-hh*.29+Math.floor(j/3)*hh*.32,ww*.14,hh*.17);}for(let j=0;j<3;j++)stroke(c,[[-ww*.46,hh*(-.1+j*.22)],[ww*.43,hh*(-.1+j*.22)]],'#8c789e',1);}else{stroke(c,[[-ww*.4,-hh*.15],[ww*.3,hh*.15]],'#92819b',1);}
 if(crack>0)stroke(c,[[-ww*.3,-hh*.46],[-ww*.07,-hh*.13],[ww*.1,hh*.03],[-ww*.04,hh*.46*crack]],`rgba(220,183,255,${crack})`,1+crack*2);c.restore();
}
function collapse(c,w,h,t,history=[]){
 c.save();c.fillStyle='#070719';c.fillRect(0,0,w,h);const pull=smooth((t-.45)/.48),ramp=smooth(t/.22),sec=t*6.4,cx=w*.5,cy=h*.43;
 camera(c,w,h,sec,ramp*(1-pull),1+pull*.23);sky(c,w,h,sec,'pull',pull);
 // Whole architectural silhouettes shake first, before individual masonry comes loose.
 c.save();c.globalAlpha=1-smooth((t-.22)/.25);for(let i=0;i<12;i++){const x=w*(.035+i*.082)+Math.sin(sec*20+i)*ramp*3,bw=w*.05,bh=h*(.20+.10*hash(i)),base=h*.89;polygon(c,[[x-bw/2,base],[x-bw/2,base-bh],[x+bw*.12,base-bh-18],[x+bw/2,base-bh+8],[x+bw/2,base]],'#1b2236','#7a6a94');for(let j=0;j<12;j++){c.fillStyle=j%3?'#303e52':'#9a83ab';c.fillRect(x-bw*.36+(j%3)*bw*.27,base-bh+12+Math.floor(j/3)*bh*.20,bw*.13,bh*.10);}stroke(c,[[x-bw*.25,base-bh],[x+bw*.1,base-bh*.65],[x-bw*.12,base-bh*.32],[x+bw*.3,base]],`rgba(221,171,255,${ramp*.7})`,2);}c.restore();
 // Perspective ground fractures, separates into stone slabs, then follows gravity inward.
 for(let i=0;i<count(24);i++){const d=(i+1)/24,xx=(hash(i*7)-.5)*w*1.3,yy=h*(.60+d*.44),lift=smooth((t-.20-hash(i)*.15)/.4);
  const x=lerp(cx+xx,cx,pull),y=lerp(yy-lift*h*.22,cy,pull),size=(22+d*65)*(1-pull);
  masonry(c,x,y,size,Math.sin(i)*lift*2+pull*5,.8,lift,i+500);
 }
 // Twelve buildings assembled from six independently cracking facade/roof sections.
 for(let i=0;i<count(blocks.length);i++){const b=blocks[i],delay=b.seed*.15,detach=smooth((t-.18-delay)/.30),bw=w/15,x0=w*(.035+b.building*.082),bh=h*(.030+.016*b.depth),base=h*.87;
  const x=lerp(x0+Math.sin(sec*20+b.building)*ramp*4+(b.seed-.5)*detach*w*.25,cx,pull),
   y=lerp(base-b.row*bh-detach*h*(.12+b.depth*.29)+Math.sin(sec*2+b.seed)*detach*25,cy,pull),
   size=(bw*(.65+b.depth*.25))*(1-pull*.98),angle=detach*(b.seed-.5)*4+pull*(2+b.depth*5);
  masonry(c,x,y,size,angle,b.depth,ramp,i);
 }
 for(let i=0;i<4;i++)lightning(c,w,h,i,sec,.4+.5*ramp);
 if(t>.38)singularity(c,w,h,smooth((t-.38)/.58),sec);
 // Delayed destruction transfers from one facade to the next, then falls inward.
 for(let i=0;i<8;i++){const q=(t-(.18+i*.047))/.24;if(q>0&&q<1){const x=w*(.08+i*.12),y=h*(.70-hash(i)*.22);impact(c,w,h,x,y,q,.85,'244,174,255');reaction(c,w,h,x,y,q,i,1.3,'244,174,255');}}
 if(t>.93){c.fillStyle=`rgba(0,0,5,${smooth((t-.93)/.07)})`;c.fillRect(0,0,w,h);}
 c.restore();
}
function singularity(c,w,h,t,seconds){
 const cx=w*.5,cy=h*.43,r=Math.min(w,h)*(.035+.16*Math.sin(t*Math.PI)),swallow=smooth((t-.85)/.15);
 c.save();c.globalCompositeOperation='screen';glow(c,cx,cy,r*3,'199,122,255',.45*(1-swallow));
 for(let i=0;i<count(96);i++){const band=hash(i+77),a=i*2.399+seconds*(3.8-band*2),d=r*(1.28+band*.85),x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d*.32;stroke(c,[[cx+Math.cos(a-.12)*d,cy+Math.sin(a-.12)*d*.32],[x,y]],i%3?'rgba(255,198,158,.66)':'rgba(219,157,255,.8)',1+band*3);}
 // Distinct orbiting arcs shear across the near/far halves of the accretion disc.
 for(let j=0;j<7;j++){const rr=r*(1.3+j*.15),a=seconds*(2+j*.13);c.save();c.translate(cx,cy);c.rotate(-.3);c.scale(1,.32);c.beginPath();c.arc(0,0,rr,a,a+Math.PI*1.5);c.lineWidth=3+j%3*2;c.strokeStyle=j%2?'#db9fff':'#ffe6b5';c.stroke();c.restore();}
 for(let i=0;i<count(50);i++){const p=fract(seconds*(.23+.12*hash(i))+i/50),a=i*2.399+seconds*2+p*5+p*p*p*7,d=r+(1-p)**.45*Math.min(w,h)*.6,x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d*.4;
  const bent=[];for(let j=0;j<8;j++){const k=j/7,aa=a-.30*(1-k),dd=d*(1+.13*(1-k));bent.push([cx+Math.cos(aa)*dd,cy+Math.sin(aa)*dd*.4]);}stroke(c,bent,'rgba(222,171,255,.72)',2);
  if(p>.80&&p<.95){const q=(p-.80)/.15;stroke(c,[[cx,cy],[cx+Math.cos(a)*r*2.3*q,cy+Math.sin(a)*r*2.3*q]],`rgba(255,219,247,${1-q})`,3);}
  if(i%7===0)masonry(c,x,y,8+18*(1-p),a,1,1,i);
  if(p>.92)glow(c,x,y,20,'249,204,255',.65*(1-(p-.92)/.08));
 }
 c.globalCompositeOperation='source-over';disk(c,cx,cy,r,'#000009');
 // Lensed star arcs visibly bend around the event horizon.
 for(let i=0;i<5;i++){c.beginPath();c.ellipse(cx,cy,r*(1.07+i*.11),r*(1.06+i*.08),seconds*.10,Math.PI*.05,Math.PI*.85);c.strokeStyle=`rgba(225,212,255,${.65-i*.1})`;c.lineWidth=1.5;c.stroke();}
 shock(c,w,h,cx,cy,fract(seconds*.45),.45,'173,138,249');c.restore();
}
const galaxyCache=new Map();
function galaxy(c,x,y,r,seconds,alpha,seed=0){
 if(alpha<=0)return;
 if(root.document?.createElement){let image=galaxyCache.get(seed);if(!image){image=root.document.createElement('canvas');image.width=image.height=256;const g=image.getContext('2d');g.translate(128,128);g.globalCompositeOperation='screen';glow(g,0,0,54,'167,187,247',.6);for(let arm=0;arm<3;arm++){const pts=[];for(let j=0;j<36;j++){const q=j/36,a=arm*TAU/3+q*5;pts.push([Math.cos(a)*q*115,Math.sin(a)*q*115]);}stroke(g,pts,'rgba(118,130,218,.18)',12);stroke(g,pts,'rgba(188,192,246,.30)',3);}for(let j=0;j<300;j++){const q=Math.sqrt(hash(j*7+seed+1)),a=j%3*TAU/3+q*5+(hash(j*11+seed)-.5)*.50,rr=q*112;disk(g,Math.cos(a)*rr,Math.sin(a)*rr,.4+hash(j*13)*1.2,j%7?'rgba(187,204,251,.7)':'rgba(255,221,173,.9)');}glow(g,0,0,24,'255,236,216',.95);galaxyCache.set(seed,image);}c.save();c.translate(x,y);c.rotate(seconds*.12+seed*.6);c.scale(1,.56);c.beginPath();c.arc(0,0,r*Math.sqrt(alpha),0,TAU);c.clip();c.globalAlpha*=.2+.8*alpha;c.drawImage(image,-r,-r,r*2,r*2);c.restore();return;}
 c.save();c.globalAlpha=alpha;c.translate(x,y);c.rotate(seconds*.12);c.scale(1,.5);for(let arm=0;arm<3;arm++){const pts=[];for(let j=0;j<28;j++){const q=j/28,a=arm*TAU/3+q*5,rr=q*r;pts.push([Math.cos(a)*rr,Math.sin(a)*rr]);}stroke(c,pts,'rgba(182,153,248,.5)',2);}glow(c,0,0,r*.4,'222,200,255',.8);c.restore();
}
function rebirth(c,w,h,t){
 c.save();c.fillStyle='#000006';c.fillRect(0,0,w,h);if(t<.035){c.restore();return;}
 const seed=smooth((t-.035)/.11),bang=clamp((t-.18)/.24),expand=out(bang),cosmos=smooth((t-.27)/.27),fly=smooth((t-.66)/.32),seconds=t*8.5;
 camera(c,w,h,seconds,bang<1?Math.sin(bang*Math.PI)*1.5:0,1+fly*.12);
 if(t<.23){glow(c,w*.5,h*.46,Math.min(w,h)*(.025+.035*seed),'199,222,255',.65*seed);disk(c,w*.5,h*.46,2+seed*4*(1+.2*Math.sin(seconds*12)),'#f5f8ff');for(let i=0;i<count(24);i++){const a=i*2.399+seconds*(1+seed*3),d=Math.min(w,h)*(.12-.10*seed),x=w*.5+Math.cos(a)*d,y=h*.46+Math.sin(a)*d;stroke(c,[[x,y],[x+Math.sin(a)*12,y-Math.cos(a)*12]],'#aec7ff',1.5);}}
 if(t>.18){
  if(config.flashes&&!config.reduced&&t<.195){c.fillStyle=`rgba(230,244,255,${(1-(t-.18)/.015)*.9})`;c.fillRect(0,0,w,h);}
  for(let j=0;j<3;j++)shock(c,w,h,w*.5,h*.46,(t-.18-j*.045)/.30,1.3+j*.2,'203,232,255');
  sky(c,w,h,seconds,'birth',expand);shock(c,w,h,w*.5,h*.46,bang,1.3,'203,232,255');impact(c,w,h,w*.5,h*.46,bang,2.1,'219,235,255');
  // Gas clouds condense along travelling filaments, followed by rotating galaxies.
  for(let i=0;i<count(14);i++){const a=i*2.399+seconds*.08,d=Math.min(w,h)*(.22+hash(i)*.55)*(1+fly),x=w*.5+Math.cos(a)*d,y=h*.46+Math.sin(a)*d*.7;glow(c,x,y,Math.min(w,h)*(.06+.09*hash(i)),i%2?'99,119,244':'186,107,219',cosmos*.45);}
  for(let i=0;i<3;i++)galaxy(c,w*.5+(w*(.18+i*.32)-w*.5)*(1+fly*(config.reduced?.1:1.7))+Math.sin(seconds*.2+i)*w*.04,h*.46+(h*(.30+(i%2)*.35)-h*.46)*(1+fly*(config.reduced?.1:1.7)),Math.min(w,h)*(.10+i*.04)*(1+fly*(config.reduced?.2:2.8)),seconds+i,smooth((t-.35-i*.035)/.20),i);
 }
 if(t>.29){c.save();c.globalAlpha=cosmos;c.globalCompositeOperation='screen';for(let i=0;i<count(48);i++){const pts=[],offset=(hash(i*17)-.5)*.28;for(let j=0;j<12;j++){const q=j/11,x=w*(-.12+q*1.24),y=h*(.10+q*.57+offset+.055*Math.sin(q*9+i*.3+seconds*.15));pts.push([x,y]);}stroke(c,pts,i%2?'rgba(124,152,238,.18)':'rgba(194,137,229,.16)',.7+hash(i)*3);}c.restore();}
 if(t>.60){const p=smooth((t-.60)/.17),x=w*(.84-fly*.09),y=h*(.30+fly*.08),r=Math.min(w,h)*(.03+.12*p)*(1+fly*.35);glow(c,x,y,r*1.4,'106,190,255',.25);const g=c.createLinearGradient(x-r,y-r,x+r,y+r);g.addColorStop(0,'#d3efff');g.addColorStop(.4,'#608bab');g.addColorStop(1,'#12192e');disk(c,x,y,r,g);c.save();c.beginPath();c.arc(x,y,r,0,TAU);c.clip();for(let i=0;i<8;i++)stroke(c,[[x-r,y+(i-4)*r*.2],[x+r,y+(i-4)*r*.2+Math.sin(seconds+i)*r*.17]],'#668ca8',r*.04);c.restore();}
 if(t>.79){const p=smooth((t-.79)/.21);for(let i=0;i<10;i++){const x=i*w/9,y=h*(.86+.03*Math.sin(i));masonry(c,x,y,Math.min(w,h)*.075*p,0,.4,0,i);}}
 c.restore();
}
function arm(c,shoulder,elbow,wrist,width,color){stroke(c,[shoulder,elbow,wrist],'#302543',width+6);stroke(c,[shoulder,elbow,wrist],color,width);stroke(c,[[shoulder[0]-3,shoulder[1]-3],[elbow[0]-3,elbow[1]-3],[wrist[0]-3,wrist[1]-3]],'#c8a7ed',Math.max(2,width*.2));disk(c,...elbow,width*.53,'#9880c3');}
function gauntlet(c,x,y,r,side,kind){c.save();c.translate(x,y);c.rotate(side*.13);polygon(c,[[-r*.7,-r*.45],[-r*.45,-r*.85],[r*.5,-r*.85],[r*.85,-r*.35],[r*.65,r*.60],[-r*.55,r*.7]],kind==='star'?'#9978c5':'#deb556','#e8d2f4');polygon(c,[[r*.58,-r*.6],[r*.85,-r*.35],[r*.65,r*.60],[r*.4,r*.38]],kind==='star'?'#513d72':'#84672b');for(let i=0;i<4;i++){disk(c,-r*.48+i*r*.30,-r*.35,r*.22,kind==='star'?'#bf9ce7':'#f5d479');stroke(c,[[-r*.48+i*r*.3,-r*.12],[-r*.5+i*r*.3,r*.30]],'#665080',Math.max(1,r*.03));}disk(c,-r*.58,r*.30,r*.24,kind==='star'?'#a383cb':'#d1a443');if(kind==='experience')disk(c,0,0,r*.18,'#bf638b');c.restore();}
// A strike is a continuous trajectory, with a separately timed contact and aftermath.
function strikePose(cycle,seed,finish=false){
 const side=seed%2?1:-1,angle=(hash(seed+31)-.5)*1.7;
 const reach=cycle<.20?-.12*smooth(cycle/.20):cycle<.52?-.12+1.12*out((cycle-.20)/.32):1-.85*smooth((cycle-.64)/.36);
 return {side,angle,reach,contact:clamp((cycle-.52)/.40),hit:cycle>=.52&&cycle<.92,finish};
}
function reaction(c,w,h,x,y,q,seed,power,color){
 if(q<0||q>=1)return;
 const fade=(1-q)**2,travel=out(q),size=Math.min(w,h);
 c.save();c.globalAlpha*=fade;
 // Broken chips have inertia and gravity; dust travels slower than hot fragments.
 if(config.particles)for(let j=0;j<count(22);j++){
  const a=hash(seed*37+j)*TAU,v=(.04+hash(j+seed)*.16)*size*power,
   px=x+Math.cos(a)*v*travel,py=y+Math.sin(a)*v*travel+q*q*size*.12;
  if(j%3===0){c.save();c.translate(px,py);c.rotate(a+q*(hash(j)*8-4));polygon(c,[[-5,-3],[3,-5],[7,1],[1,5]],'#756784','#e5cfff');c.restore();}
  else if(j%3===1)glow(c,px,py,(8+q*16)*power,color,.16);
  else stroke(c,[[px-Math.cos(a)*12,py-Math.sin(a)*12],[px,py]],`rgba(${color},.9)`,2);
 }
 // Cracks propagate from the pressure point and remain while the dust settles.
 for(let j=0;j<5;j++){const a=j*1.26+seed,rr=size*.20*power*travel,pts=[[x,h*.83]];for(let k=1;k<5;k++){const d=rr*k/4;pts.push([x+Math.cos(a)*d,h*.83+Math.sin(a)*d*.18+(hash(seed+j+k)-.5)*8]);}stroke(c,pts,'rgba(8,5,19,.8)',4);stroke(c,pts,`rgba(${color},.65)`,1);}
 // A reflected light sheet and projected shadow cross the floor at contact.
 const floor=h*.83;glow(c,x,floor,size*.30*power,color,.24*fade);
 c.fillStyle=`rgba(0,0,8,${.3*fade})`;c.beginPath();c.ellipse(x+(x-w*.5)*q,floor,size*.16*power,size*.014,0,0,TAU);c.fill();
 shock(c,w,h,x,y,q,.25*power,color);c.restore();
}
function punches(c,w,h,t,seconds,kind='star'){
 if(t<.12||t>.985)return;c.save();
 const finish=t>.88,color=kind==='star'?'190,155,255':'255,222,136',size=Math.min(w,h),cx=w*.54,cy=h*.43;
 const rate=t<.37?4:t<.70?8:12,n=finish?1:config.reduced?2:4;
 for(let i=n-1;i>=0;i--){
  const clock=seconds*rate*.5+i*.23,seed=finish?99:Math.floor(clock)*4+i,
   cycle=finish?clamp((t-.88)/.10):fract(clock),pose=strikePose(cycle,seed,finish),{side,angle,reach}=pose,
   depth=finish?2.0:.95+i*.12,shoulder=[cx+side*size*.11,cy-size*.13],
   target=[cx+Math.sin(angle)*size*.24,cy+Math.cos(angle)*size*(finish?.31:.20)],
   start=[shoulder[0]+side*size*.09,shoulder[1]+size*.02],
   wrist=[lerp(start[0],target[0],reach),lerp(start[1],target[1],reach)],
   elbow=[lerp(shoulder[0]+side*size*.16,wrist[0],.48),lerp(cy+size*.06,wrist[1],.45)];
  c.globalAlpha=finish||i===0?1:.65;
  if(!config.reduced)for(let j=1;j<=5;j++){
   const old=strikePose(Math.max(0,cycle-j*.025),seed,finish).reach,
    wx=lerp(start[0],target[0],old),wy=lerp(start[1],target[1],old);
   stroke(c,[[wx,wy],[wrist[0],wrist[1]]],`rgba(${color},${.22/j})`,size*.035*depth);
  }
  arm(c,shoulder,elbow,wrist,size*.045*depth,kind==='star'?'#8263aa':'#c99c46');
  glow(c,wrist[0],wrist[1],size*.09*depth,color,.12+.35*Math.max(0,reach));
  gauntlet(c,wrist[0],wrist[1],size*(.052+.039*Math.max(0,reach))*depth,side,kind);
  if(pose.hit){impact(c,w,h,...target,pose.contact,finish?2.5:1.05,color);reaction(c,w,h,...target,pose.contact,seed,finish?2.3:1.05,color);}
 }
 if(finish){const q=(t-.932)/.053;if(q>=0){shock(c,w,h,cx,h*.65,q,.95,color);reaction(c,w,h,cx,h*.65,q,99,2.5,color);}}
 c.restore();
}
// Render-only residual motion: physics/scoring remain safely paused during the reveal.
function timeObjectOffset(w,h,t,seconds,b){
 if(config.reduced)return 0;
 const wave=out((t-.55)/.35),arrival=Math.max(.01,Math.hypot(b.x-w*.56,b.y-h*.49)/(Math.hypot(w,h)*.72)),settle=1-smooth(wave/arrival);
 return settle===0?0:Math.sin(seconds*3+b.x*.01)*Math.min(34,h*.04)*settle;
}
function timeStop(c,w,h,phase,t,seconds,balls=[],front=false,backdrop=null){
 const release=phase==='release',held=phase==='freeze'||phase==='slow',
 wave=release?out(t):held?1:out((t-.55)/.35),cx=w*.56,cy=h*.49,maxR=Math.hypot(w,h)*.72,r=wave*maxR;
 c.save();
 if(!front){
  if(backdrop&&!config.reduced){c.save();c.globalAlpha=.30*wave;for(let j=0;j<count(18);j++){
   const y=j*h/count(18),offset=held?Math.sin(j*2)*10:Math.sin(seconds*8+j*1.7)*24*Math.sin(wave*Math.PI);
   c.drawImage(backdrop,0,y/h*backdrop.height,backdrop.width,backdrop.height/count(18),offset,y,w,h/count(18)+1);
  }c.restore();}
  // The changed illumination occupies only the region reached by the front.
  c.save();c.beginPath();c.arc(cx,cy,Math.max(.1,r),0,TAU);c.clip();c.fillStyle=`rgba(94,75,27,${release?.25*(1-t):.25})`;c.fillRect(0,0,w,h);c.restore();
  for(const b of balls){if(b.y<0||b.y>h)continue;
   const distance=Math.hypot(b.x-cx,b.y-cy),arrival=distance/maxR,
    locked=held||wave>=arrival,local=held?1:clamp((wave-arrival)/.12);
   if(!release&&!locked){const drift=config.reduced?0:(1-wave)*Math.sin(seconds*3+b.x)*12;stroke(c,[[b.x+drift,b.y-28],[b.x,b.y]],'rgba(176,222,255,.55)',2);}
   if(locked&&!release){glow(c,b.x,b.y,30,'255,224,143',.2);for(let k=0;k<3;k++){const a=k*2.399;polygon(c,[[b.x+Math.cos(a)*20,b.y+Math.sin(a)*20],[b.x+Math.cos(a+.2)*29,b.y+Math.sin(a+.2)*29],[b.x+Math.cos(a+.3)*19,b.y+Math.sin(a+.3)*19]],`rgba(255,225,158,${.6*local})`);}}
   if(release){const q=(t-arrival*.35)/.38;if(q>0&&q<1){reaction(c,w,h,b.x,b.y,q,Math.floor(b.x),.6,'255,225,152');impact(c,w,h,b.x,b.y,q,.55,'255,225,152');}}
  }
 }else{
  if(!held&&wave>0&&wave<1){
   c.save();c.globalCompositeOperation='screen';c.beginPath();c.arc(cx,cy,Math.max(.1,r),0,TAU);c.strokeStyle=`rgba(255,230,163,${Math.sin(wave*Math.PI)*.85})`;c.lineWidth=config.reduced?2:10;c.stroke();glow(c,cx,cy,Math.min(w,h)*.35,'255,202,104',.35*Math.sin(wave*Math.PI));c.restore();
  }
  for(let i=0;i<count(40);i++){const a=i*2.399,d=Math.min(w,h)*(.14+hash(i)*.65),q=release?clamp((t-hash(i)*.30)/.65):1,
   x=cx+Math.cos(a)*d*(1+q*(release?1.5:0)),y=cy+Math.sin(a)*d*.8*(1+q*(release?1.5:0));
   if(!release&&d>r)continue;c.save();c.translate(x,y);c.rotate(a+(release?q*3:0));c.globalAlpha*=release?1-q:.55;
   polygon(c,[[-3,-17],[6,-4],[1,18],[-2,4]],'#ffe6ac','#fff4ce');c.restore();
  }
  if(!release&&t>.55&&t<.65)impact(c,w,h,cx,cy,(t-.55)/.10,2,'255,227,159');
  if(release){shock(c,w,h,cx,cy,t,.95,'186,226,255');if(t<.35)impact(c,w,h,cx,cy,t/.35,1.8,'255,227,159');}
 }
 c.restore();
}
function attack(c,w,h,kind,t,seconds,x,y){if(kind==='muda'||kind==='giorno'){c.save();c.translate(x,y);c.scale(.44,.44);c.translate(-w*.54,-h*.43);punches(c,w,h,t,seconds,kind==='muda'?'world':'experience');c.restore();}else if(kind==='hand'&&seconds>.14&&seconds<1.05){const q=(seconds-.14)/.91;stroke(c,[[x-120+q*180,y-100],[x+40+q*120,y],[x-120+q*200,y+100]],'rgba(147,216,255,.75)',5*(1-q)+1);burst(c,x+q*100,y,q,11,'154,217,255',1);}else if(kind==='cmoon'&&seconds<4){for(let i=0;i<4;i++){const q=fract(seconds*.5+i*.25);stroke(c,[[x-150,y+100-q*260],[x-110,y+70-q*260],[x+110,y+70-q*260],[x+150,y+100-q*260]],'rgba(162,231,132,.45)',2);}}else if(kind==='tusk'){const q=fract(seconds*2);stroke(c,[[x+Math.cos(seconds*8)*25,y+Math.sin(seconds*8)*25],[x+120*q,y-180*q]],'rgba(249,161,218,.65)',3);}}
let hits=[],lastHitClock=null;
function emitHit(x,y,power=1,color='211,165,255'){if(hits.length>=24)hits.shift();hits.push({x,y,power,color,age:0});}
function clear(){hits=[];lastHitClock=null;lastFlashAt=-1000;}
function drawHits(c,w,h,now,frozen=false){const dt=lastHitClock===null?0:Math.max(0,Math.min(50,now-lastHitClock));lastHitClock=now;for(let i=hits.length-1;i>=0;i--){const hit=hits[i];if(!frozen)hit.age+=dt;if(hit.age>700){hits.splice(i,1);continue;}impact(c,w,h,hit.x,hit.y,hit.age/700,hit.power,hit.color,!frozen);}}
function gesture(c,x,y,size,seconds,kind='world'){const motion=config.reduced?.2:1;c.save();for(const side of [-1,1]){const bend=Math.sin(seconds*2+side)*motion;const shoulder=[x+side*size*.19,y-size*.26],elbow=[x+side*size*(.27+.025*bend),y-size*(.07+.02*bend)],wrist=[x+side*size*(.10+.02*bend),y-size*(.23+.035*bend)];arm(c,shoulder,elbow,wrist,size*.054,kind==='star'?'#8263aa':'#c99c46');gauntlet(c,wrist[0],wrist[1],size*.065,side,kind);}c.restore();}
function fist(c,kind,x,y,size,side=1){gauntlet(c,x,y,size*.5,side,kind);return true;}
root.JoJoVFX=Object.freeze({timeObjectOffset,gesture,fist,configure,emitHit,drawHits,clear,manifestation,rewind,collapse,rebirth,singularity,punches,timeStop,attack,sky,camera,version:'6.0',diagnostics:{strikePose,reaction,history:sample,hitCount:()=>hits.length,glowTextures:()=>glowCache.size,blockCount:blocks.length,starCount:stars.length,settings:()=>({...config}),strikeRate:t=>t<.37?4:t<.70?8:12}});
})(typeof window!=='undefined'?window:globalThis);
