/* JOJO CATCHER: COSMIC DIRECTOR 3.0
   Original Canvas2D cosmic environments and staged destruction/rebirth.
   No third-party character art, footage, music or voice recordings.
   All phases are normalized [0,1], deterministic and frame-rate independent. */
(function(root){
'use strict';
const PI=Math.PI,TAU=PI*2;
const clamp=v=>Math.max(0,Math.min(1,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const ease=v=>1-Math.pow(1-clamp(v),3);
const hash=n=>{const x=Math.sin(n*127.1+78.233)*43758.5453;return x-Math.floor(x);};
const palette={
 old:['#1b153a','#46325e','#b779e8'], reborn:['#07182f','#174a71','#56aace','#e3d5ff'],
 shards:['#7952a0','#ce9eef','#ecd5a8']
};
const stars=Array.from({length:260},(_,i)=>({x:hash(i*3+1),y:hash(i*3+2),
 z:.18+hash(i*7+5)*.82,r:.4+hash(i*8+9)*1.65,hue:hash(i*11+7)}));
function grad(c,x,y,r,stops){const g=c.createRadialGradient(x,y,0,x,y,Math.max(1,r));for(const [p,col] of stops)g.addColorStop(p,col);return g;}
function poly(c,points,fill,stroke=null,lw=1){
 if(!points.length)return;c.beginPath();c.moveTo(points[0][0],points[0][1]);
 for(let i=1;i<points.length;i++)c.lineTo(points[i][0],points[i][1]);c.closePath();
 if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}
}
function path(c,points,col,width=2){if(points.length<2)return;c.beginPath();c.moveTo(points[0][0],points[0][1]);
 for(let i=1;i<points.length;i++)c.lineTo(points[i][0],points[i][1]);
 c.lineCap='round';c.lineJoin='round';c.strokeStyle=col;c.lineWidth=width;c.stroke();}
function ellipse(c,x,y,rx,ry,color,angle=0){
 c.save();c.translate(x,y);c.rotate(angle);c.beginPath();
 c.ellipse(0,0,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);c.fillStyle=color;c.fill();c.restore();
}
function fill(c,w,h,color){c.fillStyle=color;c.fillRect(0,0,w,h);}
function mist(c,w,h,x,y,rx,ry,rgb,opacity){
 c.save();c.translate(x,y);c.scale(1,ry/rx);
 c.fillStyle=grad(c,0,0,rx,[[0,'rgba('+rgb+','+opacity+')'],
 [.35,'rgba('+rgb+','+(opacity*.47)+')'],[1,'rgba('+rgb+',0)']]);
 c.beginPath();c.arc(0,0,rx,0,TAU);c.fill();c.restore();
}
function starfield(c,w,h,t,scene='old',amount=1){
 c.save();const newWorld=scene==='new';
 for(const s of stars){
  const x=((s.x+t*s.z*.035)%1)*w,y=((s.y+t*s.z*.020)%1)*h;
  const r=s.r*(.68+s.z*1.8);
  const brightness=amount*(.45+.44*s.z);
  c.fillStyle=newWorld?
    'rgba(201,235,255,'+brightness+')':'rgba(198,168,255,'+brightness+')';
  c.fillRect(x,y,r,r);
  if(s.z>.82 && s.hue>.75){
   path(c,[[x-4*r,y],[x+5*r,y]],newWorld?'rgba(205,235,255,.34)':'rgba(218,190,255,.30)',.7);
   path(c,[[x,y-4*r],[x,y+4*r]],newWorld?'rgba(205,235,255,.34)':'rgba(218,190,255,.30)',.7);
  }
 }
 c.restore();
}
function sky(c,w,h,t,type='old',opacity=1){
 c.save();c.globalAlpha=opacity;
 const g=c.createLinearGradient(0,0,w,h);const pal=palette[type==='new'?'reborn':'old'];
 g.addColorStop(0,pal[0]);g.addColorStop(.49,pal[1]);g.addColorStop(1,type==='new'?'#050a1d':'#060414');fill(c,w,h,g);
 for(let i=0;i<(type==='new'?10:6);i++){
  const side=(i%2?1:-1),px=w*(.5+side*(.12+.28*hash(i*9+1)))+Math.sin(t*(i%3+1)+i)*w*.08;
  const py=h*(.13+hash(i*7+8)*.76),rad=w*(.15+.1*hash(i*3+3));
  mist(c,w,h,px,py,rad,rad*.37,
    type==='new'?(i%2?'58,137,225':'174,96,215'):(i%2?'126,54,181':'89,51,181'),
    type==='new'?.22:.17);
 }
 starfield(c,w,h,t,type,opacity);
 c.restore();
}
function corridor(c,w,h,t,strength=1){
 c.save();
 const vanishing=[w*(.5+.07*Math.sin(t*5)),h*.48];
 for(let i=0;i<16;i++){
  let d=(i+1)/16;let drift=t*(.3+strength*.8);
  let a=i*2.39996+drift;
  const x=vanishing[0]+Math.cos(a)*w*(.1+d*.52), y=vanishing[1]+Math.sin(a)*h*(.10+d*.59);
  path(c,[[vanishing[0]+Math.cos(a)*8,vanishing[1]+Math.sin(a)*8],[x,y]],
    'rgba(209,169,255,'+(.06+d*.21*strength)+')',1+2*d);
 }
 c.restore();
}
function lightRay(c,w,h,t,alpha=1){
 const x=w*.51,y=h*.51;
 c.save();c.globalCompositeOperation='screen';c.globalAlpha=alpha;
 for(let i=0;i<18;i++){
  const a=i*TAU/18+t*.13;
  poly(c,[[x,y],[x+Math.cos(a-.028)*w*.75,y+Math.sin(a-.028)*h*.90],
  [x+Math.cos(a+.028)*w*.75,y+Math.sin(a+.028)*h*.90]],
  'rgba(148,206,255,.10)');
 }
 c.restore();
}
function shatteredPlane(c,w,h,i,t,snapshot,close=1){
 const a=i*2.399+Math.sin(i*11)*.25,dist=(.11+.18*hash(i*6+4))*Math.min(w,h);
 const detach=smooth(t/.40);
 const pull=smooth((t-.27)/.55);
 const approach=1+detach*(.4+hash(i*4+5)*1.5);
 const d=dist*approach*(1-pull*.94);
 const x=w*.5+Math.cos(a+t*2.1)*d,y=h*.51+Math.sin(a+t*2.1)*d*.72;
 const s=clamp(1-pull)*Math.min(w,h)*(.055+.085*hash(i*9+3))*close;
 if(s<1)return;
 const angle=a+detach*(i%2?1:-1)*(1.4+hash(i*9)*3)+pull*5;
 const shape=[[-1.15,-.57],[.15,-.81],[1,.16],[.63,.95],[-.91,.67]];
 c.save();c.translate(x,y);c.rotate(angle);
 c.scale(s,s*.78);
 poly(c,shape,'rgba(24,15,49,.92)','rgba(240,188,255,.64)',.045);
 // Reflection of the real, previously played game inside the broken pane.
 c.save();c.beginPath();c.moveTo(shape[0][0],shape[0][1]);
 for(let j=1;j<shape.length;j++)c.lineTo(shape[j][0],shape[j][1]);
 c.closePath();c.clip();
 c.fillStyle='rgba(65,47,120,.76)';c.fillRect(-1.2,-1,2.4,2);
 const sample=snapshot && snapshot.balls && snapshot.balls.length?
 snapshot.balls[i%snapshot.balls.length]:null;
 if(sample){
  const rx=(sample.x/Math.max(1,w)-.5)*1.7,ry=(sample.y/Math.max(1,h)-.5)*1.3;
  ellipse(c,rx,ry,.20,.20,sample.gold?'#ffe18c':'#ff78c1');
  ellipse(c,rx-.065,ry-.09,.06,.06,'rgba(255,255,255,.66)');
 }
 if(snapshot){
  const catcher=(snapshot.catcherX/Math.max(1,w)-.5)*1.5;
  poly(c,[[catcher-.40,.50],[catcher+.40,.50],[catcher+.30,.75],[catcher-.30,.75]],
    'rgba(210,133,249,.92)','#f6d4ff',.035);
 }
 for(let j=0;j<8;j++) {
  const sx=hash(i*17+j*6)*2.4-1.2,sy=hash(i*19+j*3)*2-1;
  ellipse(c,sx,sy,.018,.025,'rgba(244,218,255,.73)');
 }
 c.restore();
 path(c,[[-1.05,-.56],[-.36,-.11],[.28,-.28],[.95,.15]],'rgba(245,205,255,.75)',.03);
 c.restore();
}
function angularFractures(c,w,h,t){
 c.save();const p=smooth(t/.45),cx=w*.5,cy=h*.52;
 for(let k=0;k<9;k++){
  const a=k*TAU/9+.2,range=Math.min(w,h)*(1.1-.2*p);
  const u=range*.3,v=range*(.38+.4*p);
  const pts=[[cx+Math.cos(a)*u,cy+Math.sin(a)*u],
   [cx+Math.cos(a+.10)*v,cy+Math.sin(a+.1)*v],
   [cx+Math.cos(a-.08)*v*1.6,cy+Math.sin(a-.08)*v*1.6]];
  path(c,pts,'rgba(244,189,255,'+(.14+.48*p)+')',2.6);
 }
 c.restore();
}
function singularity(c,w,h,t){
 const x=w*.50,y=h*.50,p=smooth((t-.20)/.71),final=smooth((t-.87)/.13);
 const base=Math.min(w,h)*(.14+.26*p)*(1-final*.96);
 c.save();
 // Accretion disk: elliptical, tilted and asymmetrically brighter.
 for(let j=0;j<11;j++){
  const r=base*(1.3+j*.24)*(1-final);
  c.save();c.translate(x,y);c.rotate(-.23+t*2);
  c.beginPath();c.ellipse(0,0,r,r*.30,0,0,TAU);
  c.lineWidth=(14-j)*(.65+2*p);c.strokeStyle='rgba('+(j%3?'185,99,245':'255,196,116')+','+
    ((.28+.22*Math.sin(t*7+j))*p*(1-final))+')';
  c.stroke();c.restore();
 }
 mist(c,w,h,x,y,base*2.4,base*1.3,'159,79,224',(.24+.40*p)*(1-final));
 ellipse(c,x,y,base,base*.95,'rgba(2,1,8,.98)');
 c.strokeStyle='rgba(252,213,255,'+(.4+.4*p)*(1-final)+')';
 c.lineWidth=3+p*7;c.beginPath();c.ellipse(x,y,base*1.03,base*.97,0,0,TAU);c.stroke();
 // Fragments orbit on Z-depth paths rather than uniform circles.
 for(let i=0;i<80;i++){
  const z=.16+hash(i*9)*.84,angle=hash(i*5)*TAU+t*(7+z*9)+i*.06;
  const radius=base*(1.2+z*2.5)*(1-final);
  const xx=x+Math.cos(angle)*radius,yy=y+Math.sin(angle)*radius*.34;
  c.fillStyle=i%3?'rgba(210,172,255,.70)':'rgba(255,227,173,.82)';
  c.fillRect(xx,yy,1.5+z*2,1.5+z*2);
 }
 if(final>.0){
   ellipse(c,x,y,base*.2+2,base*.2+2,'rgba(255,251,234,'+final+')');
 }
 c.restore();
}
function collapse(c,w,h,t,history=[],quality=2){
 if(root.JoJoVFX)return root.JoJoVFX.collapse(c,w,h,t,history);
 if(!c||typeof c.save!=='function')return;
 t=clamp(t);const snap=history.length?history[Math.max(0,Math.floor((1-t)*(history.length-1)))]:null;
 c.save();
 sky(c,w,h,t,'old');
 if(t<.72){
  // Existing arena shatters; large recognizable scenic pieces float in layered space.
  const p=smooth(t/.22);
  c.globalAlpha=1-.64*smooth((t-.46)/.35);
  for(let j=0;j<7;j++){
   const x=w*(j/6)+Math.sin(j*2.5+t*7)*w*.03,y=h*(.70+.12*Math.sin(j+t));
   poly(c,[[x-w*.14,y+h*.22],[x-w*.11,y-h*.12],[x+w*.03,y-h*.16],[x+w*.15,y+h*.19]],
     'rgba('+(j%2?'51,30,87':'27,19,56')+','+(.7+p*.3)+')','rgba(161,107,225,.35)',1.5);
  }
  c.globalAlpha=1;
 }
 angularFractures(c,w,h,t);
 corridor(c,w,h,t,.6+smooTH(t)*1.4);
 for(let i=0;i<(quality===0?8:quality===1?13:19);i++)shatteredPlane(c,w,h,i,t,snap);
 // Luminous streams accelerate toward the gravity core.
 const warp=smooth((t-.38)/.49);
 if(warp>0){
  c.save();c.globalCompositeOperation='screen';
  for(let i=0;i<96;i++){
   const a=i*2.39996+t*(2+hash(i*7)*2),d=Math.min(w,h)*(1.3-hash(i*8)*.3)*(1-warp*.87);
   const x=w*.5+Math.cos(a)*d,y=h*.5+Math.sin(a)*d*.7;
   path(c,[[x,y],[w*.5+(x-w*.5)*(.97-.27*warp),h*.5+(y-h*.5)*(.97-.27*warp)]],
   'rgba(210,184,255,'+(.14+.55*warp)+')',1+3*hash(i*3));
  }c.restore();
 }
 if(t>.17)singularity(c,w,h,t);
 // Final point contracts, nearly silent black frame, then one precisely timed flash.
 if(t>.91){
  const black=smooth((t-.91)/.055);
  fill(c,w,h,'rgba(1,1,8,'+(black*.98)+')');
  if(t>.959){
   mist(c,w,h,w*.5,h*.5,Math.min(w,h)*.10,Math.min(w,h)*.10,'255,244,255',
        Math.max(.04,smooth((t-.959)/.041)));
   // The seed stays visible; no screen-wide white frame obscures the collapse.
  }
 }
 c.restore();
}
function smooTH(x){return smooth(x);}
function planet(c,w,h,t){
 const appear=smooth((t-.32)/.25);if(!appear)return;
 const x=w*(.81+.07*(1-appear)),y=h*.27,r=Math.min(w,h)*(.08+.12*appear);
 c.save();c.globalAlpha=appear;
 mist(c,w,h,x,y,r*2,r*2,'82,180,255',.22);
 const g=c.createLinearGradient(x-r,y-r,x+r,y+r);
 g.addColorStop(0,'#e1ffff');g.addColorStop(.23,'#769bc2');g.addColorStop(.55,'#32476e');g.addColorStop(1,'#10142d');
 ellipse(c,x,y,r,r,g);
 c.save();c.beginPath();c.arc(x,y,r,0,TAU);c.clip();
 for(let i=0;i<9;i++){
  const xx=x-r*.87+i*r*.23,yy=y-r*.38+Math.sin(i*2.3+t*3)*r*.30;
  path(c,[[xx,yy],[xx+r*.55,yy+r*.25]],'rgba(226,244,255,.20)',r*.10);
 }
 c.restore();
 c.save();c.translate(x,y);c.rotate(-.38);
 c.beginPath();c.ellipse(0,0,r*1.78,r*.46,0,0,TAU);
 c.strokeStyle='rgba(203,229,251,.74)';c.lineWidth=6;c.stroke();
 c.beginPath();c.ellipse(0,0,r*1.91,r*.49,0,0,TAU);
 c.strokeStyle='rgba(110,165,255,.46)';c.lineWidth=3;c.stroke();
 c.restore();c.restore();
}
function nebula(c,w,h,t){
 c.save();c.globalCompositeOperation='screen';
 // Fine filaments and diffuse dust replace the broad, hard-edged tubes.
 for(let i=0;i<24;i++){
  const x=w*(.16+hash(i*7)*.68),y=h*(.18+hash(i*3)*.40),r=w*(.075+hash(i*13)*.15);
  mist(c,w,h,x,y,r,r*.38,i%2?'83,150,236':'167,103,213',.10);
 }
 for(let i=0;i<48;i++){
  const x=w*(-.12+i*.026),y=h*(.31+.08*Math.sin(i*.21+t*.25));
  c.beginPath();c.moveTo(x,y);
  c.bezierCurveTo(x+w*.12,y-h*.16,x+w*.21,y+h*.17,x+w*.40,y-h*.08);
  c.strokeStyle=i%3?'rgba(153,199,255,.055)':'rgba(232,191,255,.08)';c.lineWidth=1+hash(i)*2;c.stroke();
 }
 c.restore();
}
function clockwork(c,x,y,r,t,reverse=true){
 const spin=(reverse?-1:1)*(t*TAU*(1+t*2));
 c.save();c.translate(x,y);
 const g=c.createRadialGradient(-r*.2,-r*.3,2,0,0,r);g.addColorStop(0,'#303345');g.addColorStop(1,'#0b1325');
 ellipse(c,0,0,r,r,g);c.strokeStyle='#e7d1a0';c.lineWidth=2;c.beginPath();c.arc(0,0,r,0,TAU);c.stroke();
 for(const factor of [.93,1.04,1.08]){c.beginPath();c.arc(0,0,r*factor,0,TAU);c.strokeStyle='rgba(184,161,119,.55)';c.lineWidth=1;c.stroke();}
 for(let i=0;i<60;i++){
  const angle=i*TAU/60;c.strokeStyle=i%5?'#627086':'#e4d2a7';c.lineWidth=i%5?1:2;
  path(c,[[Math.sin(angle)*r*(i%5?.90:.84),-Math.cos(angle)*r*(i%5?.90:.84)],[Math.sin(angle)*r*.94,-Math.cos(angle)*r*.94]],c.strokeStyle,c.lineWidth);
 }
 c.font='600 '+Math.max(10,r*.10)+'px Georgia';c.fillStyle='#f1dfb5';c.textAlign='center';c.textBaseline='middle';
 ['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'].forEach((n,i)=>{const a=i*TAU/12;c.fillText(n,Math.sin(a)*r*.74,-Math.cos(a)*r*.74);});
 // Three exposed, meshing gears spin in opposite directions behind the hands.
 for(let j=0;j<3;j++){
  const gx=(j-1)*r*.31,gy=r*(j%2?.19:.29),gr=r*.19;
  c.save();c.translate(gx,gy);c.rotate(spin*(j%2?-1.3:1.3));
  c.beginPath();for(let k=0;k<48;k++){const a=k*TAU/48,rad=gr*(k%4<2?1:.83);const xx=Math.cos(a)*rad,yy=Math.sin(a)*rad;if(k)c.lineTo(xx,yy);else c.moveTo(xx,yy);}c.closePath();c.fillStyle='#374351';c.strokeStyle='#c7b88c';c.lineWidth=1.3;c.fill();c.stroke();
  c.beginPath();c.arc(0,0,gr*.54,0,TAU);c.stroke();
  for(let k=0;k<6;k++){const a=k*TAU/6;path(c,[[Math.cos(a)*gr*.25,Math.sin(a)*gr*.25],[Math.cos(a)*gr*.77,Math.sin(a)*gr*.77]],'#a19073',2);}
  c.restore();
 }
 for(const [angle,length,color,weight] of [[spin,r*.65,'#e9d9b4',4],[spin*.24+1.3,r*.42,'#b6d4de',5],[spin*2.7,r*.78,'#b18dc8',1]]){
  c.save();c.rotate(angle);path(c,[[0,r*.12],[0,-length]],color,weight);c.restore();
 }
 ellipse(c,0,0,r*.034,r*.034,'#fbebc7');c.restore();
}
function rewind(c,w,h,t,history=[],quality=2,assets={}){
 if(root.JoJoVFX)return root.JoJoVFX.rewind(c,w,h,t,history,assets);
 c.save();fill(c,w,h,'rgba(12,11,30,.35)');
 const count=history.length,progress=1-smooth(t),index=Math.floor(progress*Math.max(0,count-1));
 const r=Math.min(w,h)*.265,cy=h*.43;
 clockwork(c,w*.5,cy,r,t,true);
 // Small memories remain real gameplay data, behind the central clock's reverse motion.
 const panelW=Math.min(w*.19,230),panelH=panelW*.53,y=h*.80;
 for(let i=0;i<3;i++){
  const snap=history[Math.max(0,Math.min(count-1,index+(i-1)*Math.max(1,Math.floor(count*.16))))];if(!snap)continue;
  const x=w*.5+(i-1)*panelW*1.19;
  c.save();c.translate(x,y);c.rotate((i-1)*.025);
  c.fillStyle='rgba(11,15,34,.94)';c.fillRect(-panelW/2,-panelH/2,panelW,panelH);c.strokeStyle='#b9a0cf';c.lineWidth=1;c.strokeRect(-panelW/2,-panelH/2,panelW,panelH);
  c.save();c.beginPath();c.rect(-panelW/2,-panelH/2,panelW,panelH);c.clip();
  for(const ball of snap.balls||[]){const bx=(ball.x/w-.5)*panelW,by=(ball.y/h-.5)*panelH;path(c,[[bx,by+9],[bx,by]],'#685c9b',1);ellipse(c,bx,by,3,3,ball.gold?'#ffe0a3':'#df98ed');}
  const bx=(snap.catcherX/w-.5)*panelW,bw=Math.max(12,snap.catcherWidth/w*panelW);poly(c,[[bx,panelH*.31],[bx+bw,panelH*.31],[bx+bw*.82,panelH*.43],[bx+bw*.18,panelH*.43]],'#ae7fcf','#f1d6ff',1);c.restore();
  c.font='600 '+Math.max(9,Math.min(13,w*.015))+'px Arial';c.textAlign='left';c.fillStyle='#d0bbec';c.fillText('SCORE '+snap.score,-panelW*.44,-panelH*.31);c.restore();
 }
 for(let i=0;i<(quality?36:16);i++){
  const angle=i*2.399,rr=Math.min(w,h)*(.32+hash(i)*.36),x=w*.5+Math.cos(angle-t*2)*rr,yy=cy+Math.sin(angle-t*2)*rr*.8;
  path(c,[[x,yy],[x+Math.sin(angle)*12,yy-Math.cos(angle)*12]],'rgba(182,204,241,.25)',1);
 }
 const left=w*.20,right=w*.80,yy=h*.93;path(c,[[left,yy],[right,yy]],'#74658d',1);
 ellipse(c,mix(left,right,progress),yy,3,3,'#fae7ff');c.restore();
}
function accelerate(c,w,h,t){
 c.save();sky(c,w,h,t*12,'old');
 // The environment cycles daylight, stretches stars and shifts the curved horizon.
 const daylight=Math.sin(t*PI*6)**2*.20;fill(c,w,h,'rgba(164,194,221,'+daylight+')');
 const horizon=h*(.78-.06*Math.sin(t*PI*4));
 for(let i=0;i<14;i++){
  const x=((i/14-t*(.2+t*1.5)+3)%1)*w,ww=w*(.023+.011*hash(i));
  poly(c,[[x,h],[x,horizon-h*(.09+.16*hash(i*7))],[x+ww,horizon-h*(.1+.12*hash(i*5))],[x+ww,h]],'#10172c','#5c6584',1);
 }
 for(let i=0;i<90;i++){
  const a=hash(i*9)*TAU,rr=Math.min(w,h)*(.2+hash(i*5)*.9),length=.03+t*.30;
  path(c,[[w*.5+Math.cos(a)*rr,h*.43+Math.sin(a)*rr*.7],[w*.5+Math.cos(a)*rr*(1+length),h*.43+Math.sin(a)*rr*.7*(1+length)]],'rgba(211,220,245,'+(.15+t*.22)+')',1);
 }
 clockwork(c,w*.19,h*.32,Math.min(w,h)*.10,t*3,false);clockwork(c,w*.82,h*.61,Math.min(w,h)*.13,t*4,false);c.restore();
}
function birthHorizon(c,w,h,t){
 const reveal=smooth((t-.43)/.33);if(reveal<=0)return;
 c.save();c.globalAlpha=reveal;
 // A vast curved planetary horizon with atmosphere and depth.
 const x=w*.45,y=h*1.32,r=Math.max(w,h)*.75;
 mist(c,w,h,x,h*.98,w*.70,h*.29,'61,141,222',.35);
 c.beginPath();c.arc(x,y,r,PI*1.06,PI*1.94);
 c.lineWidth=Math.max(8,h*.035);
 c.strokeStyle='rgba(126,213,246,.44)';c.stroke();
 c.beginPath();c.arc(x,y,r+h*.01,PI*1.06,PI*1.94);
 c.lineWidth=2;c.strokeStyle='rgba(237,247,255,.65)';c.stroke();
 c.restore();
}
function genesis(c,w,h,t){
 const p=smooth((t-.12)/.28);
 const x=w*.5,y=h*.52;
 c.save();c.globalCompositeOperation='screen';
 lightRay(c,w,h,t,(1-p)*.88);
 for(let j=0;j<7;j++){
  const q=clamp((t-.12-j*.018)/.27),r=ease(q)*Math.max(w,h)*(j%3===0?.82:.65);
  c.beginPath();c.ellipse(x,y,r,r*(.63+.08*j),j*.11,0,TAU);
  c.lineWidth=(13-j)*(1-q)+2;
  c.strokeStyle=j%2?'rgba(170,201,255,'+(.37*(1-q))+')':'rgba(255,224,255,'+(.53*(1-q))+')';
  c.stroke();
 }
 for(let i=0;i<66;i++){
  const a=i*2.39996+Math.sin(i*7)*.12,progress=ease(clamp((t-.13)/.25));
  const d=Math.min(w,h)*progress*(.65+hash(i*7)*.8),px=x+Math.cos(a)*d,py=y+Math.sin(a)*d*.8;
  path(c,[[x+Math.cos(a)*d*.29,y+Math.sin(a)*d*.29],[px,py]],
    'rgba(177,215,255,'+(.33*(1-progress*.5))+')',1+hash(i)*3);
 }
 mist(c,w,h,x,y,Math.max(w,h)*(.09+.39*p),h*(.10+.46*p),'150,200,255',(.65*(1-p)));
 c.restore();
}
function rebirth(c,w,h,t,quality=2){
 if(root.JoJoVFX)return root.JoJoVFX.rebirth(c,w,h,t);
 if(!c||typeof c.save!=='function')return;
 t=clamp(t);c.save();
 fill(c,w,h,'#01030c');
 const first=smooth(t/.13);
 // In the very first beat only a tiny, bright seed remains.
 if(t<.155){
  const r=Math.min(w,h)*(.007+first*.033);
  mist(c,w,h,w*.5,h*.52,r*10,r*9,'163,201,255',.44*first);
  ellipse(c,w*.5,h*.52,r,r,'#faffff');
  for(let i=0;i<15;i++){
   const a=i*2.39996,outer=r*(4+hash(i*3)*8);
   path(c,[[w*.5+Math.cos(a)*outer,h*.52+Math.sin(a)*outer],
   [w*.5+Math.cos(a)*r,h*.52+Math.sin(a)*r]],
   'rgba(194,229,255,'+(.36*first)+')',1);
  }
 }
 if(t>.12){
  const newSky=smooth((t-.14)/.23);
  sky(c,w,h,t*1.7,'new',newSky);
  genesis(c,w,h,t);
  const fade=smooth((t-.27)/.20);
  c.save();c.globalAlpha=fade;
  nebula(c,w,h,t);
  planet(c,w,h,t);
  birthHorizon(c,w,h,t);
  c.restore();
  // Star streams peel out from the center, become a stable stellar environment.
  const emerging=smooth((t-.31)/.34);
  c.save();c.globalAlpha=1-emerging;
  corridor(c,w,h,t,2.0);
  c.restore();
 }
 if(t>.70){
  const veil=smooth((t-.70)/.30);
  // Galaxy clears from the center into the new gameplay world.
  const g=c.createRadialGradient(w*.5,h*.65,10,w*.5,h*.65,Math.max(w,h)*.7);
  g.addColorStop(0,'rgba(2,4,20,0)');
  g.addColorStop(1,'rgba(2,4,20,'+(.45*veil)+')');
  fill(c,w,h,g);
 }
 c.restore();
}
function intro(c,w,h,t){
 if(!c||typeof c.save!=='function')return;
 t=clamp(t);c.save();
 const camera=smooth((t-.02)/.35),fracture=smooth((t-.55)/.36);
 sky(c,w,h,t,'old');
 const dark=c.createLinearGradient(0,0,w,h);
 dark.addColorStop(0,'rgba(3,2,19,.95)');
 dark.addColorStop(.6,'rgba(21,7,51,'+(1-camera*.65)+')');
 dark.addColorStop(1,'rgba(3,2,15,.92)');
 fill(c,w,h,dark);
 const x=w*.51,y=h*.5;
 mist(c,w,h,x,y,w*(.10+.20*camera),h*(.15+.32*camera),'147,99,244',.25+.27*camera);
 for(let i=0;i<12;i++){
  const a=i*TAU/12+t*3,dist=Math.min(w,h)*(.25+.20*fracture),xx=x+Math.cos(a)*dist,yy=y+Math.sin(a)*dist;
  c.save();c.translate(xx,yy);c.rotate(a+t*3);
  poly(c,[[-11,-28],[14,-4],[4,37],[-6,17]],'rgba(157,125,224,'+(.17+.33*fracture)+')');
  c.restore();
 }
 corridor(c,w,h,t,.16+fracture*.75);
 if(t>.58){
  for(let k=0;k<7;k++){
   const a=k*TAU/7+t*3,d=Math.min(w,h)*(.12+.35*fracture);
   path(c,[[x+Math.cos(a)*d*.4,y+Math.sin(a)*d*.4],
    [x+Math.cos(a)*d,y+Math.sin(a)*d]],'rgba(220,191,255,'+(.14+fracture*.46)+')',1+fracture*3);
  }
 }
 if(t>.89){
  const q=smooth((t-.89)/.11);
  mist(c,w,h,x,y,Math.max(w,h)*(.08+.12*q),Math.max(w,h)*(.08+.12*q),'221,205,255',q*.36);
 }
 c.restore();
}
root.JoJoCosmicDirector=Object.freeze({intro,collapse,rebirth,rewind,accelerate,sky,clockworkMini:clockwork,version:'4.0.0',diagnostics:{
  collapseStages:['reality-fracture','gravitational-collapse','everything-falls-apart','final-singularity'],
  rebirthStages:['first-light','cosmic-genesis','new-cosmos','gameplay-reveal']
}});
})(typeof window!=='undefined'?window:globalThis);

