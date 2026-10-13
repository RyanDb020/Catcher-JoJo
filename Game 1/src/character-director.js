/* JoJo Catcher — Character Director 3.
   Original procedural Canvas2D character studies inspired by user references.
   No external image downloads or copied frames. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2, PI = Math.PI;
  const clamp = x => Math.max(0, Math.min(1, x));
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const ease = x => 1 - Math.pow(1 - clamp(x), 3);
  const ink = '#15101e';
  const ctxReady = c => !!(c && typeof c.save === 'function' && typeof c.ellipse === 'function');
  const tint = (c, x, y, r, rgb, a) => {
    const g = c.createRadialGradient(x, y, 3, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    c.fillStyle = g; c.fillRect(x-r, y-r, 2*r, 2*r);
  };
  function polygon(c, pts, fill, stroke=ink, weight=4) {
    c.beginPath(); pts.forEach((p,i) => i ? c.lineTo(p[0],p[1]) : c.moveTo(p[0],p[1]));
    c.closePath(); c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle=stroke; c.lineWidth=weight; c.lineJoin='round'; c.stroke(); }
  }
  function oval(c,x,y,rx,ry,fill,stroke=ink,weight=3,rotation=0) {
    c.beginPath(); c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rotation,0,TAU);
    c.fillStyle=fill; c.fill(); if (stroke) { c.strokeStyle=stroke;c.lineWidth=weight;c.stroke(); }
  }
  function line(c,points,color,width=3) {
    if (points.length < 2) return;
    c.beginPath(); c.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++) c.lineTo(points[i][0],points[i][1]);
    c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();
  }
  function limb(c,pts,thick,base,highlight,shadow) {
    // Articulated inked tube, shaded along the full bone, with joint cuffs.
    line(c,pts,ink,thick+9);
    line(c,pts,shadow,thick+3);
    line(c,pts,base,thick-5);
    c.save(); c.globalAlpha=.78; line(c,pts,highlight,Math.max(3,thick*.19));c.restore();
    pts.slice(1,-1).forEach(p=>oval(c,p[0],p[1],thick*.43,thick*.45,base,ink,3));
  }
  function armor(c,pts,base,light,cut) {
    polygon(c,pts,base,ink,4);
    const minX=Math.min(...pts.map(p=>p[0])),maxX=Math.max(...pts.map(p=>p[0]));
    const minY=Math.min(...pts.map(p=>p[1])),maxY=Math.max(...pts.map(p=>p[1]));
    polygon(c,[[minX+9,minY+8],[maxX-11,minY+12],[minX+(maxX-minX)*.54,minY+(maxY-minY)*.53]],light,null);
    if(cut)line(c,cut,'rgba(25,17,37,.66)',3);
  }
  function fist(c,x,y,s,fill,light) {
    c.save();c.translate(x,y);c.scale(s,s);
    polygon(c,[[-40,-22],[-28,-45],[25,-42],[43,-16],[41,30],[18,48],[-28,38],[-44,8]],fill,ink,5);
    polygon(c,[[-26,-39],[8,-38],[24,-21],[0,-8],[-30,-10]],light,null);
    for(let i=0;i<4;i++){
      const xx=-27+i*18;
      oval(c,xx,-5,10,19,i%2?fill:light,ink,2);
      line(c,[[xx-6,10],[xx-3,23]],'rgba(21,16,30,.58)',2);
    }
    armor(c,[[-48,20],[42,20],[32,47],[-31,48]],fill,light);
    c.restore();
  }
  function motion(c,x,y,t,col='#f0d7ff',count=18){
    c.save(); c.globalAlpha=.19+.16*Math.sin(t*7)**2;
    for(let i=0;i<count;i++){
      const a=i*2.3999 + t*1.9, r=92+(i%7)*28;
      line(c,[[x+Math.cos(a)*r,y+Math.sin(a)*r],
              [x+Math.cos(a)*(r+90),y+Math.sin(a)*(r+90)]],col,(i%4)+1);
    } c.restore();
  }
  function border(c,w,h,top,bottom,accent) {
    const bar=Math.min(h*.073,60); c.save();
    c.fillStyle='rgba(5,3,17,.94)';c.fillRect(0,0,w,bar);c.fillRect(0,h-bar,w,bar);
    c.fillStyle=accent;c.fillRect(0,bar-3,w*.35,3);c.fillRect(w*.64,h-bar, w*.36,3);
    c.font='bold '+Math.max(12,Math.min(20,w*.018))+'px Arial';
    c.textBaseline='middle';c.fillStyle='#ffefd3';
    c.textAlign='left';c.fillText(top,Math.max(16,w*.037),bar*.48);
    c.textAlign='right';c.fillText(bottom,w-Math.max(16,w*.037),h-bar*.51);
    c.restore();
  }
  function topBanner(c,w,h,title,accent='#b76cf3') {
    const bar=Math.min(h*.065,50);c.save();
    c.fillStyle='rgba(5,3,17,.83)';c.fillRect(0,0,w,bar);
    c.fillStyle=accent;c.fillRect(0,bar-3,w*.4,3);
    c.font='bold '+Math.max(12,Math.min(20,w*.017))+'px Arial';
    c.textBaseline='middle';c.textAlign='left';c.fillStyle='#ffefd3';
    // Keep phase labels between the score HUD (left) and energy HUD (right).
    c.textAlign='center';c.font='bold '+Math.max(11,Math.min(17,w*.014))+'px Arial';
    c.fillText(title,w*.55,bar*.52);
    c.restore();
  }
  function stage(c,w,h,rgb,t,intensity=1) {
    c.save();c.fillStyle='rgba(5,3,22,'+(intensity*.56)+')';c.fillRect(0,0,w,h);
    tint(c,w*.52,h*.5,h*.65,rgb,.33*intensity);
    c.strokeStyle='rgba(250,236,255,.08)';c.lineWidth=1;
    for(let i=0;i<10;i++){
      const y=((i*73+t*190)%(h+150))-75;
      c.beginPath();c.moveTo(0,y);c.lineTo(w,y-35);c.stroke();
    }
    c.restore();
  }
  function aura(c,shape,age,color='165,93,255',energy=1) {
    c.save(); const x=shape[0],y=shape[1],rx=shape[2],ry=shape[3];
    tint(c,x,y,Math.max(rx,ry)*1.5,color,.22*energy);
    c.translate(x,y);
    for(let i=0;i<4;i++){
      c.beginPath();
      for(let j=0;j<=55;j++){
        const angle=j/55*TAU, jitter=1+.044*Math.sin(angle*13+age*8+i*1.1)+.04*Math.sin(angle*29-age*12);
        const px=Math.cos(angle)*rx*jitter*(1+i*.095);
        const py=Math.sin(angle)*ry*jitter*(1+i*.095);
        if(!j)c.moveTo(px,py);else c.lineTo(px,py);
      }
      c.closePath(); c.strokeStyle='rgba('+color+','+(.35-i*.06)*energy+')';
      c.lineWidth=12-i*2;c.stroke();
    }
    c.restore();
  }
  function inkHatch(c,x,y,angle,len=26,n=5) {
    c.save();c.translate(x,y);c.rotate(angle);
    for(let i=0;i<n;i++)line(c,[[i*5,0],[i*5+len*.4,len]],'rgba(26,20,37,.22)',1.4);
    c.restore();
  }
  // GOLD / THE WORLD: crouched athletic figure, angular helm and joint armor.
  function worldFigure(c,time,freeze=false) {
    const p=freeze?0:Math.sin(time*12),lunge=freeze?1:smooth((time-.22)/.54);
    c.save();
    // Plated greaves and bent knees give the iconic predatory silhouette.
    limb(c,[[-64,129],[-164,212],[-142,304]],71,'#c49a35','#ffeb91','#a87426');
    limb(c,[[48,143],[111,231],[188,289]],77,'#d8a939','#fff2a2','#92601e');
    armor(c,[[-188,275],[-126,285],[-131,327],[-202,337]],'#e3bd4c','#fff0a0');
    armor(c,[[149,269],[223,280],[230,323],[146,317]],'#d7ac35','#fff0a0');
    oval(c,-159,212,47,38,'#f2c858','#fff6b4',2);
    oval(c,119,230,45,40,'#d7ab3f','#fff4b4',2);
    armor(c,[[-101,104],[91,110],[67,196],[-58,181]],'#d7a332','#ffe477');
    armor(c,[[-95,-98],[78,-108],[119,35],[52,126],[-64,126],[-113,26]],'#dcaf3f','#ffeb7a');
    polygon(c,[[-79,-73],[-11,-101],[19,-62],[-2,17],[-53,55]],'#e9ca59',ink,3);
    polygon(c,[[20,-91],[76,-79],[93,-12],[43,38],[16,-8]],'#bd841e',ink,3);
    inkHatch(c,-75,31,.2);inkHatch(c,52,36,-.35);
    // Back arm and tightly folded guards.
    limb(c,[[78,-65],[174,-43],[144,82]],62,'#e6b83e','#ffef9b','#a8791e');
    armor(c,[[131,24],[175,17],[177,92],[136,110]],'#c49a35','#ffe385');
    oval(c,170,-45,49,52,'#f3d367',ink,5);
    oval(c,158,-45,20,39,'#ffe897',null,0,-.25);
    // Helmet: tapered crown, sweeping cheek plates and narrow eyes.
    polygon(c,[[-53,-113],[-70,-175],[-32,-210],[18,-219],[66,-183],[53,-116],[23,-88],[-22,-89]],'#f5d26a',ink,5);
    polygon(c,[[-60,-159],[-21,-225],[29,-234],[58,-181],[13,-198]],'#ffe88f',ink,3);
    polygon(c,[[-65,-175],[-91,-211],[-55,-200],[-37,-219]],'#efc351',ink,4);
    polygon(c,[[42,-204],[85,-231],[64,-181],[57,-170]],'#b47f23',ink,4);
    polygon(c,[[-56,-150],[-5,-132],[-12,-102],[-47,-98]],'#c59229',ink,3);
    polygon(c,[[7,-139],[55,-160],[44,-114],[13,-97]],'#c18e28',ink,3);
    polygon(c,[[-47,-142],[-7,-139],[-12,-129],[-39,-130]],'#fff9cb',ink,2);
    polygon(c,[[7,-143],[42,-154],[35,-137],[12,-132]],'#fff9cb',ink,2);
    oval(c,-27,-135,3,4,'#d3403c',null);oval(c,25,-143,3,4,'#d3403c',null);
    polygon(c,[[-32,-105],[-2,-99],[22,-114],[11,-81],[-17,-79]],'#c48728',ink,3);
    // One enormous forward guard and punching fist; articulated motion.
    limb(c,[[-92,-68],[-169,3],[-137+32*lunge,112+24*p]],72,'#dbb042','#fff0a0','#986a24');
    oval(c,-173,12,43,42,'#f6d475',ink,5);
    armor(c,[[-176,65],[-100,71],[-89,108],[-165,119]],'#dbad37','#fff4a6');
    fist(c,-116+78*lunge,130+12*p,1.22+lunge*.14,'#dcb13c','#fff3a2');
    // Layered abdomen plates, engraved seams and small fasteners catch the light.
    for(let i=0;i<4;i++){
      const y=42+i*17,half=38-i*3;
      polygon(c,[[-half,y],[0,y+6],[half,y],[half-4,y+13],[0,y+17],[-half+4,y+13]],i%2?'#b8872e':'#d3a43e',ink,1.6);
      line(c,[[-half+5,y+2],[0,y+8],[half-5,y+2]],'#ffe8a0',1.4);
    }
    for(const [x,y] of [[-74,-62],[65,-63],[-143,78],[155,38],[-164,291],[189,295]]){
      oval(c,x,y,4,4,'#805822','#fff0b1',1);line(c,[[x-2,y],[x+2,y]],'#2d2530',1);
    }
    line(c,[[-28,-116],[-8,-111],[2,-117]],'#ffeeb9',1.5);
    line(c,[[-17,-93],[0,-91],[9,-99]],'#664627',1.7);
    // Signature segmented chest linework and glints.
    line(c,[[-93,-26],[-67,19],[-74,61]],'#8b6227',4);
    line(c,[[73,-65],[65,-2],[47,46]],'#8b6227',4);
    inkHatch(c,-111,104,.48,14,4);c.restore();
  }
  // STAR PLATINUM: huge purple mass, flaring hair, gold belt and expressive fists.
  function jotaro(c,t) {
    c.save();c.translate(-107,-18);c.rotate(-.09);
    // Long coat silhouette, peaked collar, brim and chain.
    polygon(c,[[-85,-29],[-32,-107],[22,-72],[76,30],[67,224],[6,196],[-69,225]],'#21232f',ink,5);
    polygon(c,[[-42,-105],[-90,-151],[-2,-136],[35,-95]],'#363b4b',ink,4);
    polygon(c,[[19,-101],[77,-166],[79,-78],[45,-63]],'#303743',ink,4);
    polygon(c,[[-31,214],[10,202],[-4,346],[-40,359]],'#292a34',ink,4);
    polygon(c,[[13,206],[61,197],[84,342],[49,349]],'#20232d',ink,4);
    oval(c,4,-155,39,50,'#a27665',ink,3);
    polygon(c,[[-43,-184],[31,-192],[42,-166],[17,-148],[-35,-148]],'#171b28',ink,4);
    polygon(c,[[-92,-157],[46,-160],[62,-146],[-73,-139]],'#232734',ink,4);
    line(c,[[48,-85],[67,-73],[71,-53],[88,-43]],'#e4b24e',8);
    oval(c,4,-166,15,4,'#111a20',null);
    c.restore();
  }
  function starFigure(c,time,phase) {
    const rate=phase===3?36:phase===2?25:12;
    const p=Math.sin(time*rate),strike=phase===0?0:phase===5?.12:Math.max(0,p);
    c.save();c.rotate(phase>=1&&phase<=3?Math.sin(time*rate*.5)*.055:phase===4?-.12:0);
    // Behind body: violet cloak hair, boots and muscular torso.
    for(let i=0;i<9;i++){
      const angle=-2.9+i*.27;
      polygon(c,[[0,-170],[-64+Math.cos(angle)*86,-176+Math.sin(angle)*103],
        [-31+i*7,-126]],i%2?'#232044':'#383056',ink,2);
    }
    limb(c,[[-55,118],[-64,241],[-83,345]],71,'#48356e','#a17cc6','#27213b');
    limb(c,[[58,111],[88,232],[93,346]],72,'#453565','#987cbe','#27213b');
    polygon(c,[[-98,311],[-48,306],[-45,365],[-116,366]],'#222534',ink,4);
    polygon(c,[[64,309],[124,305],[132,367],[66,371]],'#292333',ink,4);
    armor(c,[[-103,-116],[96,-121],[119,77],[81,163],[-84,159],[-120,48]],'#624581','#ba9bd9');
    polygon(c,[[-95,-99],[-38,-110],[-13,47],[-74,87]],'#a281c7',ink,3);
    polygon(c,[[44,-119],[85,-95],[82,82],[29,42]],'#412b6b',ink,3);
    armor(c,[[-91,112],[87,112],[86,146],[-90,143]],'#e7b85e','#ffedaa');
    for(let i=0;i<8;i++)oval(c,-64+i*18,127,6,9,'#fff0c0',ink,1);
    for(let i=0;i<4;i++){
      const yy=34+i*18;
      polygon(c,[[-34,yy],[-5,yy-4],[-5,yy+12],[-30,yy+16]],i%2?'#745791':'#9d80b7',ink,1);
      polygon(c,[[4,yy-4],[35,yy],[29,yy+16],[4,yy+12]],i%2?'#45315f':'#665080',ink,1);
    }
    line(c,[[-96,-92],[-46,-76],[-12,-55]],'#e0c5ee',2);line(c,[[18,-56],[52,-87],[86,-100]],'#cba9df',2);
    // Back shoulder / arm remains attached, front punches follow phase.
    limb(c,[[88,-94],[158,-17],[153+24*p,73]],66,'#60438a','#b49cd8','#352450');
    oval(c,152,-24,46,43,'#aa8bd5',ink,4);
    armor(c,[[128,52],[178,42],[191,113],[140,123]],'#31354a','#888b99');
    fist(c,172+25*strike,128+10*p,.92,'#5d4788','#d4beec');
    // Hair spike crest before face, two gold temples and fierce eyes.
    polygon(c,[[-53,-151],[-73,-220],[-26,-201],[-12,-239],[28,-213],
               [52,-229],[67,-177],[39,-128],[-39,-124]],'#211d48',ink,4);
    polygon(c,[[-46,-188],[-15,-238],[3,-184]],'#4f4386',null);
    polygon(c,[[-52,-158],[-28,-183],[34,-185],[51,-154],[38,-97],[-29,-95]],'#8466af',ink,4);
    polygon(c,[[-37,-184],[43,-181],[50,-164],[-38,-161]],'#ebc370',ink,3);
    oval(c,-20,-172,5,4,'#fff2bf',ink,1);
    oval(c,28,-172,5,4,'#fff2bf',ink,1);
    polygon(c,[[-40,-145],[-6,-149],[-12,-138],[-31,-135]],'#f9f9ff',ink,2);
    polygon(c,[[10,-150],[40,-148],[34,-135],[14,-140]],'#f9f9ff',ink,2);
    oval(c,-20,-140,4,4,'#cceeff',null);oval(c,22,-141,4,4,'#cceeff',null);
    line(c,[[-10,-109],[4,-105],[18,-109]],'#32264b',3);
    line(c,[[-38,-152],[-14,-157],[-5,-151]],'#2a2338',2);line(c,[[10,-155],[34,-154],[42,-149]],'#2a2338',2);
    line(c,[[-2,-148],[2,-127],[-5,-121]],'#4b355f',2);line(c,[[-29,-121],[-18,-111]],'#c1a1dc',2);line(c,[[21,-118],[32,-126]],'#aa88cb',2);
    // One attached leading arm: the finisher extends this limb rather than adding a third.
    if(phase===4){
      const q=smooth((time/8.359-.88)/.085),ex=-153+q*64,ey=-38-q*24,hx=-135+q*174,hy=91-q*73;
      limb(c,[[-93,-97],[ex,ey],[hx,hy]],76,'#725097','#d1abef','#392b5f');
      oval(c,ex,ey,47,43,'#b392d9',ink,4);
      c.save();c.translate(hx,hy);c.rotate(-.12+q*.28);
      armor(c,[[-44,-15],[39,-16],[45,21],[-43,23]],'#3a4056','#9da4bf');
      fist(c,0,42,1.25+q*.85,'#674d8b','#e0c8fc');c.restore();
    }else{
    // Leading giant arm, segmented gauntlet and foreshortened punch.
    limb(c,[[-93,-97],[-177,-35],[-160-55*strike,64-25*strike]],
      76,'#725097','#d1abef','#392b5f');
    oval(c,-179,-36,48,43,'#b392d9',ink,4);
    armor(c,[[-200,40],[-126,52],[-113,94],[-194,97]],'#3a4056','#9da4bf');
    fist(c,-156-119*strike,112-38*strike,1.17+.47*strike,'#674d8b','#e0c8fc');
    }
    inkHatch(c,-84,33,.32);inkHatch(c,57,47,-.5);
    c.restore();
  }
  // PUCCI AND MADE IN HEAVEN — translucent horse-shaped lower torso, armored
  // equine face, feathered shoulders and distinct human priest behind the stand.
  function pucci(c,t) {
    c.save();c.translate(-113,-50);c.rotate(-.10+Math.sin(t*5)*.025);
    polygon(c,[[-65,-103],[23,-112],[70,-9],[29,252],[-35,257],[-73,29]],'#291a38',ink,4);
    polygon(c,[[-17,-109],[25,-95],[12,78],[-21,130]],'#74445c',ink,3);
    polygon(c,[[-67,-90],[-7,-114],[43,-81],[22,-35],[-48,-20]],'#5b3c4b',ink,4);
    line(c,[[-4,-86],[-4,48]],'#d1a16c',7);
    line(c,[[-28,-17],[16,-17]],'#d6ba8b',3);
    limb(c,[[-55,-88],[-104,-16],[-111,46]],36,'#4d344b','#ab7091','#201625');
    limb(c,[[43,-79],[95,-20],[125,-52]],34,'#523347','#a67983','#211929');
    oval(c,-3,-166,35,48,'#7d5a57',ink,3);
    polygon(c,[[-44,-191],[-17,-223],[33,-211],[41,-170],[17,-194],[-30,-178]],'#e3d4d3',ink,3);
    oval(c,-13,-169,5,4,'#f4e9dd',null);
    // Priest collar, coat pleats, cross ornaments and sculpted facial features.
    polygon(c,[[-47,-96],[-8,-112],[37,-93],[15,-61],[-28,-64]],'#ded5ca',ink,2.5);
    polygon(c,[[-24,-95],[0,-104],[24,-90],[7,-71]],'#503449',null);
    for(let i=0;i<5;i++)line(c,[[-51+i*20,36],[-43+i*18,191]],'rgba(222,169,158,.24)',1.6);
    polygon(c,[[-9,-83],[4,-83],[4,50],[-9,50]],'#caa56d',null);
    polygon(c,[[-34,-17],[30,-17],[31,-10],[-35,-10]],'#c8a16c',null);
    polygon(c,[[-12,-184],[8,-190],[25,-182],[18,-167],[-4,-161]],'#886568',null);
    line(c,[[-24,-177],[-9,-180],[1,-175]],'#291b2b',2.8);
    line(c,[[8,-176],[23,-176],[29,-169]],'#291b2b',2.8);
    line(c,[[-2,-163],[3,-155],[-7,-151]],'#34222e',1.8);

    polygon(c,[[-56,238],[-7,237],[-25,351],[-67,355]],'#3a2337',ink,4);
    polygon(c,[[0,240],[43,236],[71,349],[17,350]],'#432c3d',ink,4);
    c.restore();
  }

  // Character Director 4: painted, anatomically joined curves replace the box rig
  // in the Made in Heaven reveal. All shapes are original authored vector paths.
  function heavenFigurePainted(c,t){
    const motion=Math.sin(t*2.1),stride=Math.sin(t*4.6),face=Math.sin(t*1.3)*.065;
    const dark='#26314e',edge='#30415c';
    function shape(points,base,shine,thick=3){
      c.beginPath();
      for(const p of points){
        if(p.length===2)c.moveTo(p[0],p[1]);
        else if(p.length===6)c.bezierCurveTo(...p);
        else if(p.length===4)c.quadraticCurveTo(...p);
      }
      c.closePath();c.fillStyle=base;c.fill();
      if(shine){c.strokeStyle=shine;c.lineWidth=thick;c.lineJoin='round';c.stroke();}
    }
    function stroke(points,col,w=2){
      c.beginPath();
      for(const p of points){
        if(p.length===2)c.moveTo(...p);
        else if(p.length===6)c.bezierCurveTo(...p);
        else if(p.length===4)c.quadraticCurveTo(...p);
      }
      c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.stroke();
    }
    function gradient(x0,y0,x1,y1,colors){
      const g=c.createLinearGradient(x0,y0,x1,y1);
      colors.forEach(([stop,col])=>g.addColorStop(stop,col));return g;
    }
    function joint(x,y,r){oval(c,x,y,r,r*.92,'#eaf7ff',edge,3);oval(c,x-r*.18,y-r*.23,r*.57,r*.43,'#9ebacf',null);}
    function feathers(side){
      c.save();c.scale(side,1);
      for(let i=0;i<7;i++){
        const a=i/6,xx=39+i*13,yy=-145+i*7;
        shape([[35,-134],[xx+2,yy-60+i*3,xx+25,yy-43,xx+21,yy-13],
          [xx+40,yy+14,xx+30,-107,42,-107]],i%2?'#c6dcea':'#f0faff',edge,2.6);
        stroke([[xx-3,yy-6],[xx+8,yy-33,xx+12,yy-29,xx+16,yy-11]],'#7294b2',1.6);
      }
      c.restore();
    }
    c.save();
    c.rotate(motion*.018);
    // Rear equine body and hindquarters carry a proper lower-anatomy silhouette.
    shape([[-84,68],[-119,111,-102,174,-65,191],[-12,217,80,202,99,141],
      [104,90,76,57,44,42]],gradient(-110,30,98,200,[[0,'#f9feff'],[.5,'#b8d2e5'],[1,'#688bb1']]),dark,5);
    // Independent hind legs bend at hock joints rather than rotating as rods.
    c.save();c.translate(-49,158);c.rotate(-.09+stride*.11);
    shape([[0,0],[-26,8,-41,46,-62,74],[-69,92,-51,111,-37,113],
      [-15,92,4,51,26,19]],gradient(-60,0,30,110,[[0,'#f9fcff'],[1,'#83a2c3']]),dark,4);
    joint(-57,83,19);
    shape([[-56,90],[-72,102,-91,126,-75,152],[-53,164,-22,147,-26,118]],
      '#f0f9fd',dark,3);
    shape([[-89,138],[-95,145,-112,159,-90,171],[-56,182,-35,157,-37,145]],
      '#e6c991',dark,3);c.restore();
    c.save();c.translate(64,161);c.rotate(.10-stride*.1);
    shape([[0,0],[18,5,41,33,54,81],[71,110,58,120,39,119],
      [16,91,-8,65,-17,29]],gradient(-22,0,74,120,[[0,'#f7fdff'],[1,'#7da2c4']]),dark,4);
    joint(48,94,17);
    shape([[47,90],[70,99,76,127,58,151],[35,164,24,152,31,121]],
      '#f0f9fc',dark,3);
    shape([[31,144],[18,150,23,172,49,173],[83,169,78,149,61,143]],
      '#e3c894',dark,3);c.restore();
    // Glistening embossed breastplate and waist seams on a slanted equine torso.
    shape([[-80,-63],[-114,-31,-122,51,-92,110],[-65,160,42,158,82,107],
      [122,47,104,-38,73,-73],[29,-91,-40,-92,-80,-63]],
      gradient(-100,-100,110,170,[[0,'#ffffff'],[.28,'#e4f6ff'],[.63,'#b5d1e2'],[1,'#7694b6']]),dark,5);
    shape([[-61,-38],[-82,0,-78,77,-48,110],[-16,129,40,107,62,66],
      [64,1,49,-53,18,-66],[-16,-74,-46,-57,-61,-38]],
      gradient(-65,-75,55,115,[[0,'#fffefe'],[.57,'#cddfe9'],[1,'#a1bdd3']]),edge,3);
    shape([[-48,106],[-33,121,35,123,51,107],[39,145,3,170,-37,144]],
      '#eff5f9',edge,3);
    stroke([[-79,28],[-67,71,-63,85,-44,100]],'#7195b0',3);
    stroke([[74,-3],[85,48,68,83,43,102]],'#6d8cab',3);
    for(let i=0;i<7;i++){
      const y=-20+i*16;
      stroke([[-46,y],[-36,y+3,-29,y+5,-17,y+2]],'rgba(75,106,147,.32)',1.2);
    }
    // Shoulder plumes, each with individual inner veins.
    feathers(-1);feathers(1);
    // True attached arm rigs; elbows remain at the end of the humerus.
    function arm(side,phase){
      c.save();c.scale(side,1);c.translate(0,Math.sin(t*3+phase)*7);
      shape([[71,-74],[99,-96,132,-60,127,-33],[120,-14,101,5,82,-1],
        [69,-6,61,-52,71,-74]],
        gradient(65,-90,133,0,[[0,'#ffffff'],[1,'#92b0c9']]),edge,3.6);
      shape([[105,-14],[132,-26,153,7,155,33],[161,66,131,91,112,66],
        [102,44,91,7,105,-14]],
        gradient(101,-15,163,100,[[0,'#e6f6ff'],[1,'#7696b6']]),dark,3.5);
      joint(118,-9,23);joint(137,64,19);
      shape([[115,77],[128,95,166,93,171,77],[178,52,161,46,148,53],
        [125,41,107,51,115,77]],'#e6f0fa',edge,3);
      for(let i=0;i<4;i++){
        shape([[126+i*10,57],[128+i*10,48,137+i*10,48,137+i*10,61],
          [136+i*10,79,124+i*10,77,126+i*10,57]],
          i%2?'#e7f3fb':'#ffffff',edge,1.4);
      }
      stroke([[111,23],[123,28,135,37,139,45]],'#9dbad0',2);
      c.restore();
    }
    arm(-1,0);arm(1,2);
    // Sculpted flank hinge ornament, set into armor rather than free-floating.
    oval(c,51,49,28,26,'#d4b991',dark,3);
    oval(c,51,49,18,17,'#f4e4c4',edge,2);
    oval(c,51,49,9,9,'#89acc5',dark,1.6);
    for(let i=0;i<7;i++){
      const a=i*TAU/7;oval(c,51+22*Math.cos(a),49+21*Math.sin(a),2.3,2.3,'#fff4dd',null);
    }
    // Character head is its own moving articulated piece, not an elliptical face.
    c.save();c.translate(0,-140);c.rotate(face);
    shape([[-52,0],[-68,-24,-61,-73,-36,-96],[-5,-119,38,-109,54,-75],
      [66,-40,61,-8,34,19],[12,26,-26,17,-52,0]],
      gradient(-64,-116,69,30,[[0,'#ffffff'],[.50,'#d7edfa'],[1,'#789cb5']]),dark,4.8);
    // Long, pointed facial plate with a pronounced horse-like muzzle.
    shape([[-23,-68],[5,-109,24,-96,33,-57],[27,-24,17,-14,23,6],
      [13,32,-7,51,-25,18],[-20,-7,-42,-23,-23,-68]],
      gradient(-25,-101,30,50,[[0,'#d6eefb'],[.35,'#f9fdff'],[1,'#86acc7']]),edge,3.8);
    shape([[-28,-51],[-4,-66,4,-68,10,-57],[-8,-42,-12,-35,-27,-30]],'#8dadc7',dark,2);
    shape([[15,-57],[31,-74,47,-76,49,-61],[51,-42,33,-39,19,-38]],'#a5c4d8',dark,2);
    shape([[-39,-29],[-14,-33,-7,-23,-8,-15],[-32,-9,-42,-15,-39,-29]],'#fff4db',edge,2);
    shape([[12,-23],[25,-39,45,-43,48,-26],[39,-10,18,-8,12,-23]],'#fff4db',edge,2);
    oval(c,-23,-23,3.2,5,'#6c4f85',null);oval(c,30,-23,3.2,5,'#6c4f85',null);
    stroke([[-15,18],[-2,27,9,25,16,18]],'#546b89',2);
    for(let side of [-1,1]){
      c.save();c.scale(side,1);
      shape([[46,-73],[67,-102,83,-132,88,-146],[82,-97,93,-62,69,-36],
        [56,-29,49,-40,46,-73]],'#e3f4ff',edge,3);
      shape([[56,-73],[72,-111,81,-121,79,-82],[74,-51,67,-44,56,-73]],
        '#9cbed9',null);
      c.restore();
    }
    // Front coronet with pointed central crest.
    shape([[-34,-90],[-13,-118,1,-142,10,-160],[25,-139,36,-114,47,-93],
      [16,-106,-10,-100,-34,-90]],'#c3e5f5',dark,3);
    stroke([[-17,-105],[8,-137,16,-141,26,-113]],'#ffffff',3);
    c.restore();
    // The silhouette remains legible when every VFX layer is disabled.
    c.restore();
  }

  function heavenFigure(c,time) {
    heavenFigurePainted(c,time);
  }
  function actor(c,key,w,h,x,y,size,frame,options={}){return !!root.JoJoStandArt?.draw(c,key,w*x,h*y,Math.min(w*size,h*.82),frame,options);}
  function figure(c,w,h,drawing,options={}) {
    const size=Math.min(w/960,h/740)*1.18*(options.zoom || 1);
    c.save(); c.translate(w*(options.x ?? .5),h*(options.y ?? .53));
    c.scale(size,size);drawing(c);
    c.restore();
  }
  function timeDial(c,w,h,progress,frozen=false){
    const r=Math.min(w,h)*.34,cx=w*.5,cy=h*.49;
    c.save();c.translate(cx,cy);c.rotate(-.14-(frozen?1:progress)*1.2);
    for(const factor of [1,1.08,1.19])oval(c,0,0,r*factor,r*factor,'rgba(0,0,0,0)','rgba(238,215,150,.28)',factor===1?2:1);
    for(let i=0;i<60;i++){
      const a=i*TAU/60,major=i%5===0;
      line(c,[[Math.sin(a)*r*(major?.88:.95),Math.cos(a)*r*(major?.88:.95)],[Math.sin(a)*r,Math.cos(a)*r]],major?'rgba(255,231,167,.75)':'rgba(192,226,241,.36)',major?2:1);
    }
    c.font='600 '+Math.max(10,r*.065)+'px Georgia';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#ead9ac';
    ['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'].forEach((n,i)=>c.fillText(n,Math.sin(i*TAU/12)*r*.78,-Math.cos(i*TAU/12)*r*.78));
    const dialT=frozen?1:progress,rotation=18*(1-Math.pow(1-dialT,3));
    for(const [gx,gy,gr,index] of [[-r*.34,r*.22,r*.16,0],[r*.08,r*.35,r*.12,1],[r*.37,r*.18,r*.18,2]]){c.save();c.translate(gx,gy);c.rotate(rotation*(index%2?-1:1));for(let j=0;j<18;j++){const a=j*TAU/18;line(c,[[Math.cos(a)*gr,Math.sin(a)*gr],[Math.cos(a)*(gr+5),Math.sin(a)*(gr+5)]],'rgba(214,215,190,.30)',3);}oval(c,0,0,gr,gr,'rgba(10,16,32,.10)','rgba(230,207,143,.40)',1.5);for(let j=0;j<5;j++){const a=j*TAU/5;line(c,[[0,0],[Math.cos(a)*gr,Math.sin(a)*gr]],'rgba(221,219,188,.28)',2);}c.restore();}
    if(progress>.77){const crack=(progress-.77)/.23;c.save();c.globalAlpha=crack;for(let j=0;j<7;j++){const a=j*TAU/7;line(c,[[0,0],[Math.cos(a)*r*.40,Math.sin(a)*r*.32],[Math.cos(a+.07)*r*.64,Math.sin(a+.07)*r*.61],[Math.cos(a)*r*.95,Math.sin(a)*r*.95]],'rgba(223,245,250,.65)',1.2);}c.restore();}
    c.rotate(-rotation);line(c,[[0,r*.12],[0,-r*.66]],'#efda9a',3);line(c,[[0,0],[r*.42,0]],'#bceaf4',2);
    oval(c,0,0,5,5,'#fff0bd',null);c.restore();
  }
  function worldLegacy(c,w,h,phase,t,settings={}) {
    if (!ctxReady(c)) return;
    c.save();
    const isSlow=phase==='slow',isRelease=phase==='release';
    if(phase==='freeze'){
      // Lock the pose, dial and dust in place; the actual paused arena stays visible.
      c.fillStyle='rgba(9,30,49,.46)';c.fillRect(0,0,w,h);
      timeDial(c,w,h,1,true);
      for(let i=0;i<38;i++){
        const x=(Math.sin(i*41.3)*.5+.5)*w,y=(Math.cos(i*17.7)*.5+.5)*h;
        line(c,[[x-3,y],[x+3,y]],'rgba(218,248,255,.6)',1);
        line(c,[[x,y-3],[x,y+3]],'rgba(218,248,255,.4)',1);
      }
      c.save();figure(c,w,h,cc=>worldFigure(cc,1,true),{zoom:.47,x:.80,y:.58});c.restore();
      border(c,w,h,'ZA WARUDO  /  TIME STOPPED','ALLE BALLEN STAAN STIL','#a7e4ed');
      c.restore();return;
    }
    if(isSlow){ // Atmospheric remnants leave the gameplay clear.
      c.strokeStyle='rgba(229,202,95,.14)';c.lineWidth=2;
      for(let i=0;i<6;i++){
        const xx=w*(.1+i*.17),yy=h*(.1+.12*Math.sin(i*3+t*4));
        line(c,[[xx,yy],[xx+23,yy+41],[xx+10,yy+67]],'rgba(229,202,95,.22)',1.2);
      }
      c.restore();return;
    }
    if(isRelease){
      stage(c,w,h,'222,173,67',t,.17);
      const ring=ease(t),r=ring*Math.max(w,h)*.85;
      c.strokeStyle='rgba(255,224,143,'+(1-ring)*.9+')';c.lineWidth=14*(1-ring)+2;
      oval(c,w*.5,h*.5,r,r*.68,'rgba(0,0,0,0)','rgba(255,238,169,'+(1-ring)+')',14*(1-ring)+2);
      if(t<.62){
        c.save();c.globalAlpha=.75*(1-smooth(t/.62));
        figure(c,w,h,cc=>worldFigure(cc,1,true),{zoom:.52+.08*t,x:.73,y:.34});
        c.restore();
      }
      topBanner(c,w,h,'THE WORLD  /  TIME RESUMES','#e9c458');
      c.restore();return;
    }
    stage(c,w,h,'255,193,65',t,.85);
    timeDial(c,w,h,smooth(Math.min(t/.82,1)),t>=.82);
    const entrance=ease(t/.28);
    const hero=smooth((t-.12)/.34);
    aura(c,[w*.51,h*.52,w*.19,h*.32],t*3,'246,185,63',hero);
    figure(c,w,h,cc=>worldFigure(cc,t*3,t>.81),
      {zoom:.66+hero*.28, x:.55-(1-entrance)*.32,y:.55+(1-entrance)*.14});
    if(t>.76){
      if(t<.88)motion(c,w*.51,h*.50,t,'#fff0be',16);
      tint(c,w*.53,h*.49,w*.30,'255,241,169',.10+.17*smooth((t-.76)/.24));
    }
    border(c,w,h,t<.34?'SUMMON  /  THE WORLD':t<.72?'THE WORLD  /  FULL REVEAL':'ZA WARUDO  /  FREEZE',
      t<.76?'CHRONOSTASIS':'TOKI YO TOMARE','#e1b43f');
    c.restore();
  }
  function oraLegacy(c,w,h,t,settings={}) {
    if (!ctxReady(c)) return;
    c.save(); const phase=t<.12?0:t<.37?1:t<.70?2:t<.88?3:t<.965?4:5;
    const age=t*8.359,first=ease(t/.12),power=[.25,.35,.65,.93,1,.12][phase];
    // Restrained screen tint: preserve gameplay and catcher safe area.
    stage(c,w,h,'151,72,235',t,.13+power*.12);
    aura(c,[w*.31,h*.32,w*.13,h*.22],age,'166,83,246',power*.72);
    // Signature double portrait: Jotaro behind a readable full-bodied Stand.
    if(!actor(c,'jotaro',w,h,.24,.58,.36,phase===5?5:phase<2?1:3))figure(c,w,h,cc=>jotaro(cc,age),{x:.18,y:.35,zoom:.43+first*.045});
    const zoom=(.43+first*.11+(phase===3?.05:0)+(phase===4?.095:0));
    if(phase>=2 && phase<=3){
      c.save();c.globalAlpha=.20;
      for(let i=3;i>=1;i--)
        figure(c,w,h,cc=>starFigure(cc,age-i*.10,phase),
          {x:.32+(i%2?-.028:.020),y:.34,zoom:zoom*(1+i*.018)});
      c.restore();
    }
    const painted=actor(c,'star',w,h,rootX,rootY,.53+(phase===4?.12:phase===3?.05:0),phase===0?0:phase===5?1:phase===4?5:phase===1?1:2+Math.floor(age*(phase===3?16:11))%3,{appear:Math.min(1,t*10),glow:'#ad7ced'});
    if(!painted)figure(c,w,h,cc=>starFigure(cc,age,phase),{x:.32,y:.32,zoom});
    if(phase>=1 && phase<=3){
      const n=phase===1?4:phase===2?8:14;
      motion(c,w*.33,h*.34,age,'#f3d7ff',n);
      c.save();
      for(let i=0;i<n;i++){
        const v=(t*(phase===3?56:32)+i/n)%1;
        c.globalAlpha=(1-v)*(.17+.28*power);
        c.translate(0,0);
        const xp=w*(.33+.19*(v-.5)+.055*Math.sin(i*2.2)),yp=h*(.23+.24*v);
        const size=Math.min(w,h)*(.018+.042*v);
        oval(c,xp,yp,size*.5,size,'#c29dea',null,0,.55*(i%2?1:-1));
      } c.restore();
    }
    if(phase===4){
      const k=smooth((t-.88)/.085);
      tint(c,w*.35,h*.35,Math.max(w,h)*.28,'248,224,255',(.16+.22*(1-k)));
      c.save();c.strokeStyle='rgba(255,242,190,'+(1-k)+')';c.lineWidth=5;
      for(let i=0;i<22;i++){
        const a=i*TAU/22;
        line(c,[[w*.35+Math.cos(a)*42,h*.35+Math.sin(a)*42],
                [w*.35+Math.cos(a)*(120+k*w*.32),h*.35+Math.sin(a)*(120+k*h*.28)]],
                'rgba(255,236,185,'+(1-k)+')',4);
      }c.restore();
    }
    root.JoJoVFX?.punches(c,w,h,t,age,'star');
    topBanner(c,w,h,['STAR PLATINUM  /  REVEAL','ORA  /  FIRST STRIKES','ORA ORA  /  BARRAGE',
      'STAR PLATINUM  /  OVERDRIVE','ORA!  /  FINAL IMPACT','STAND  /  RECOVERY'][phase],
      '#b76cf3');
    c.restore();
  }
  function heavenLegacy(c,w,h,t,variant='reveal') {
    if (!ctxReady(c)) return;
    c.save();
    const full=variant==='reveal', power=full?ease((t-.055)/.27):.65;
    // Five deliberate shot compositions synchronized to the 8.664 s intro:
    // omen / name reveal / manifestation / distortion / final pose.
    const shot=t<.065?0:t<.26?1:t<.54?2:t<.85?3:4;
    const entrance=smooth((t-.06)/.12), pull=smooth((t-.54)/.31);
    stage(c,w,h,'122,70,221',t,.26+.27*power);
    aura(c,[w*.52,h*.47,w*(.12+.12*power),h*(.18+.20*power)],t*4,'144,72,244',power);
    c.save();
    c.globalAlpha=.20+.80*entrance;
    figure(c,w,h,cc=>pucci(cc,t*7),{x:.41-.055*pull,y:.55+.018*Math.sin(t*14),zoom:.56+.10*power});
    figure(c,w,h,cc=>heavenFigure(cc,t*7+(shot===3?1.1:0)),
      {x:.55+.045*pull,y:.56-.045*power+.015*Math.sin(t*11),
       zoom:.66+power*.20+(shot===1?.16:0)+(shot===4?.07:0)});
    c.restore();
    if(shot===1 || shot===4){
      c.save(); c.globalCompositeOperation='screen';
      tint(c,w*.54,h*.39,w*.19,'230,208,255',(shot===1?.20:.13)*power);
      c.restore();
    }
    for(let i=0;i<7;i++){
      const x=w*(.15+i*.115),y=h*(.22+.11*Math.sin(i*3+t*7));
      c.strokeStyle='rgba(232,207,255,.3)';
      line(c,[[x,y],[x+12,y+19],[x-8,y+35]],'rgba(226,198,255,.21)',1.5);
    }
    if(full)border(c,w,h,'ENRICO PUCCI  /  MADE IN HEAVEN','THE END IS THE BEGINNING','#d8b4ff');
    c.restore();
  }
  function heavenEchoLegacy(c,w,h,t) {
    if (!ctxReady(c))return;
    c.save(); c.globalAlpha=.11+.13*Math.sin(t*PI);
    const s=Math.min(w/960,h/740)*1.06;
    c.translate(w*.71,h*.59);c.scale(s,s);heavenFigure(c,t*16);c.restore();
  }
  // CINEMATIC SCENES 5: deliberate compositions rather than one looping pose.
  function dioFigure(c,t){
    const gesture=t>.25&&t<.86?Math.sin(t*PI*14)*12:0;
    c.save();c.translate(0,-25+Math.sin(t*PI*8)*2);
    limb(c,[[-37,106],[-54,218],[-49,304]],48,'#cb9c36','#ffdf7b','#635223');
    limb(c,[[44,103],[71,209],[89,302]],50,'#d3a737','#ffdf7b','#635223');
    polygon(c,[[-64,286],[-21,292],[-20,321],[-79,323]],'#304334');
    polygon(c,[[65,287],[107,287],[128,321],[69,325]],'#304334');
    armor(c,[[-74,-93],[59,-102],[81,68],[47,135],[-48,133],[-86,39]],'#b98a25','#f9cf61');
    polygon(c,[[-28,-89],[25,-95],[38,73],[-30,72]],'#172b29',ink,3);
    line(c,[[-68,-82],[-15,-34],[-27,77]],'#fff0a3',3);
    line(c,[[58,-92],[23,-31],[30,77]],'#fff0a3',3);
    // Upraised hand with individual fingers; the pose precedes the Stand's lock.
    limb(c,[[-66,-66],[-121+gesture*.4,-143-gesture*.2],[-124+gesture,-232+gesture*.4]],42,'#c7952f','#ffe087','#695224');
    c.save();c.translate(-122+gesture,-239+gesture*.4);c.rotate(-.17+gesture*.006);oval(c,0,0,19,26,'#e1b799');
    for(let i=0;i<4;i++)line(c,[[-15+i*9,-3],[-19+i*10,-42+(i%2)*8]],'#e6c4a2',6);
    line(c,[[9,11],[34,-3]],'#e6c4a2',9);c.restore();
    limb(c,[[64,-57],[107,14],[105,85]],40,'#c7952f','#ffe087','#695224');
    fist(c,107,102,.55,'#ddb091','#f8dcc0');
    oval(c,0,-139,38,48,'#d7a88c',ink,3);
    polygon(c,[[-38,-151],[-50,-192],[-22,-194],[-16,-218],[0,-199],[18,-219],[28,-192],[48,-188],[34,-147]],'#e9c758',ink,3);
    polygon(c,[[-37,-168],[34,-170],[37,-158],[-38,-155]],'#355842',ink,2);
    line(c,[[-29,-147],[-11,-149],[-4,-143]],'#281f24',3);line(c,[[7,-144],[24,-148],[31,-145]],'#281f24',3);
    line(c,[[-8,-121],[8,-120],[15,-125]],'#533336',2);line(c,[[0,-143],[3,-130],[-3,-127]],'#754e40',2);
    oval(c,-50,210,13,13,'#38513e','#f6d374',2);oval(c,71,204,13,13,'#38513e','#f6d374',2);
    c.restore();
  }
  function equineStand(c,t,run=0){
    const stride=Math.sin(t*10)*run;
    c.save();c.lineJoin='round';
    // Four separated legs, hocks and hooves give a readable equine silhouette.
    for(const [hip,knee,hoof,side] of [[[-72,88],[-107,185],[-103,271],-1],[[0,94],[-18,201],[30,265],1],[[166,93],[220,175],[190,268],-1],[[213,89],[262,166],[302,264],1]]){
      const shift=stride*side*31;
      limb(c,[hip,[knee[0]+shift,knee[1]],[hoof[0]-shift*.6,hoof[1]]],31,'#c8d8df','#f6ffff','#566376');
      oval(c,knee[0]+shift,knee[1],19,18,'#d6e5ed','#27384b',2);
      polygon(c,[[hoof[0]-shift*.6-22,hoof[1]-10],[hoof[0]-shift*.6+17,hoof[1]-9],[hoof[0]-shift*.6+26,hoof[1]+16],[hoof[0]-shift*.6-27,hoof[1]+18]],'#37404f','#15212c',2);
    }
    const body=c.createLinearGradient(-90,0,220,130);body.addColorStop(0,'#edf9fc');body.addColorStop(.42,'#becfdc');body.addColorStop(1,'#66798f');
    oval(c,85,62,165,67,body,'#203043',4);
    for(let i=0;i<6;i++)line(c,[[5+i*27,4],[18+i*26,107]],'rgba(43,64,88,.35)',2);
    // Plated tail, not an extra leg.
    line(c,[[231,45],[272,65],[300,43],[313,87]],'#c3d2df',16);line(c,[[232,44],[274,64],[300,42],[314,86]],'#596b80',3);
    armor(c,[[-105,-101],[-10,-119],[40,-23],[12,93],[-88,96],[-128,10]],'#dce8ed','#ffffff');
    for(let i=0;i<5;i++)line(c,[[-89,-59+i*24],[-15,-72+i*24]],'#8298aa',2);
    limb(c,[[-109,-70],[-164,-9],[-149,53]],38,'#d0e1e9','#ffffff','#63768e');
    limb(c,[[-4,-85],[66,-53],[44,11]],36,'#d0e1e9','#ffffff','#63768e');
    fist(c,-146,65,.6,'#cadce9','#f6ffff');fist(c,39,22,.6,'#cadce9','#f6ffff');
    // Long horse muzzle, ears, nostril and mane; clearly unlike a humanoid head.
    polygon(c,[[-95,-96],[-114,-176],[-91,-233],[-55,-258],[-27,-226],[-35,-181],[-4,-143],[-45,-118]],'#d7e5ed','#213044',4);
    polygon(c,[[-110,-180],[-153,-164],[-190,-132],[-183,-110],[-138,-105],[-71,-147]],'#ecf6f6','#243447',3);
    polygon(c,[[-90,-226],[-97,-284],[-77,-267],[-61,-226]],'#e9f3f1','#243447',3);
    polygon(c,[[-44,-238],[-30,-279],[-18,-259],[-22,-221]],'#d9e5ea','#243447',3);
    for(let i=0;i<10;i++)polygon(c,[[-31,-239+i*10],[3+i*2,-221+i*11],[-34,-199+i*10]],i%2?'#71849c':'#b1c8d9','#25364a',1);
    oval(c,-97,-192,12,6,'#192a3d',null,0,-.25);oval(c,-97,-192,4,4,'#f8d889',null);
    oval(c,-171,-127,6,4,'#3d5264',null);line(c,[[-184,-115],[-151,-117],[-125,-131]],'#596d7f',2);
    // Embedded clock on the sternum, with real hands and separate ring plating.
    oval(c,-49,5,35,37,'#253348','#e4d4a5',4);oval(c,-49,5,28,30,'#cedbe0','#65798d',2);
    for(let i=0;i<12;i++){const a=i*TAU/12;line(c,[[-49+Math.sin(a)*21,5+Math.cos(a)*21],[-49+Math.sin(a)*26,5+Math.cos(a)*26]],'#334a62',1.5);}
    c.save();c.translate(-49,5);c.rotate(-t*1.6);line(c,[[0,0],[0,-24]],'#4c344e',2);line(c,[[0,0],[17,7]],'#4c344e',2);c.restore();
    for(const [x,y] of [[-95,-40],[6,-25],[35,60],[90,57],[144,55],[202,51]])oval(c,x,y,3,3,'#f6deb7','#657789',1);
    c.restore();
  }
  function heaven(c,w,h,t,variant='reveal',settings={}){
    if(!ctxReady(c))return;t=clamp(t);c.save();
    const manifest=smooth((t-.18)/.30),pull=smooth((t-.60)/.32),entry=ease(t/.20);
    stage(c,w,h,'116,98,202',t,.38);
    root.JoJoVFX?.manifestation(c,w,h,t,settings.elapsed||t*8.664,false);
    // Chapel-like arch and luminous floor establish an environment behind the pair.
    c.save();c.strokeStyle='rgba(192,173,229,.20)';c.lineWidth=3;
    for(let i=0;i<5;i++){const x=w*(.08+i*.21),r=w*.09;c.beginPath();c.moveTo(x-r,h*.84);c.lineTo(x-r,h*.32);c.bezierCurveTo(x-r,h*.06,x+r,h*.06,x+r,h*.32);c.lineTo(x+r,h*.84);c.stroke();}
    c.restore();
    tint(c,w*.61,h*.54,w*.25,'161,216,242',.15*manifest);
    // Pucci remains distinct in front-left; Stand manifests in full side silhouette.
    c.save();if(root.JoJoVFX&&!root.JoJoVFX.diagnostics.settings().reduced)c.transform(1,Math.sin((settings.elapsed||0)*3)*.012,Math.sin((settings.elapsed||0)*2)*.012,1,Math.sin((settings.elapsed||0)*3)*w*.006,Math.cos((settings.elapsed||0)*4)*h*.004);
    const painted=actor(c,'heaven',w,h,.52,.52,.80,t<.18?0:t<.5?1:t<.8?2+Math.floor((settings.elapsed||t*8.664)*3)%2:4,{alpha:entry,appear:Math.min(1,t*7),materialize:manifest,glow:'#bacef3'});
    c.restore();
    if(!painted)figure(c,w,h,cc=>pucci(cc,Math.min(t, .64)*3),{x:.31-(1-entry)*.12,y:.63,zoom:.83+pull*.05});
    c.save();c.globalAlpha=manifest;
    if(!painted)figure(c,w,h,cc=>equineStand(cc,t*3,pull*.3),{x:.57+pull*.02,y:.53,zoom:.75+manifest*.06});c.restore();
    if(t>.52){
      for(let i=0;i<10;i++){const yy=h*(.14+i*.065);line(c,[[w*.76,yy],[w*(.79+.16*pull),yy-.03*h]],'rgba(178,220,249,'+(.08+.18*pull)+')',1);}
    }
    root.JoJoVFX?.manifestation(c,w,h,t,settings.elapsed||t*8.664,true);
    border(c,w,h,t<.18?'PUCCI / THE FINAL PRAYER':t<.55?'MADE IN HEAVEN / MANIFESTATION':'TIME HAS NO LIMIT',t<.55?'THE STAND AWAKENS':'THE UNIVERSE WILL FOLLOW','#c6ddeb');
    c.restore();
  }
  function heavenEcho(c,w,h,t){
    if(!ctxReady(c))return;c.save();
    if(!actor(c,'heaven',w,h,.78,.63,.36,2+Math.floor(t*18)%2,{alpha:.85}))figure(c,w,h,cc=>equineStand(cc,t*4,.9),{x:.81,y:.65,zoom:.30});c.restore();
  }
  function world(c,w,h,phase,t,settings={}){
    if(!ctxReady(c))return;t=clamp(t);
    root.JoJoVFX?.timeStop(c,w,h,phase,t,settings.elapsed||0,settings.balls||[],false,settings.backdrop);
    if(phase==='slow'){worldLegacy(c,w,h,phase,t,settings);return;}
    if(phase==='freeze'){
      c.save();c.fillStyle='rgba(10,35,49,.23)';c.fillRect(0,0,w,h);
      c.save();c.translate(w*.5,h*.28);c.scale(.30,.30);c.translate(-w*.5,-h*.49);timeDial(c,w,h,1,true);c.restore();
      if(!actor(c,settings.character==='jotaro'?'star':'world',w,h,.84,.58,.25,1))figure(c,w,h,cc=>settings.character==='jotaro'?starFigure(cc,1,5):worldFigure(cc,1,true),{x:.84,y:.58,zoom:.29});
      root.JoJoVFX?.timeStop(c,w,h,phase,t,settings.elapsed||0,settings.balls||[],true,settings.backdrop);
      border(c,w,h,'ZA WARUDO / TIME LOCK',Number.isFinite(settings.remaining)?settings.remaining.toFixed(1)+' s REMAINING':'REALITY IS FROZEN','#a9e3e5');c.restore();return;
    }
    c.save();
    if(phase==='release'){
      const release=ease(t);stage(c,w,h,'83,173,193',t,.12*(1-release));
      for(let j=0;j<3;j++){const q=clamp((t-j*.09)/.65),r=ease(q)*Math.max(w,h);oval(c,w*.5,h*.48,r,r*.67,'rgba(0,0,0,0)','rgba(183,235,241,'+(.56*(1-q))+')',2+6*(1-q));}
      // The broken rim peels outward; the arena is visible throughout.
      for(let i=0;i<24;i++){const a=i*TAU/24,r=Math.min(w,h)*(.25+release*.6);c.save();c.translate(w*.5+Math.cos(a)*r,h*.48+Math.sin(a)*r*.7);c.rotate(a+t*2);line(c,[[-6,-13],[3,9],[10,14]],'rgba(246,222,158,'+(.6*(1-t))+')',2);c.restore();}
      root.JoJoVFX?.timeStop(c,w,h,phase,t,settings.elapsed||0,settings.balls||[],true,settings.backdrop);
      topBanner(c,w,h,'TIME RESUMES / THE WORLD MOVES AGAIN','#bce8e5');c.restore();return;
    }
    const p=smooth((t-.22)/.4),lock=smooth((t-.76)/.12);
    const elapsed=Number.isFinite(settings.elapsed)?settings.elapsed:t*4.5;
    const extended=Number.isFinite(settings.duration)&&settings.duration>8;
    const close=extended&&t>.32&&t<.72?Math.sin((t-.32)/.4*PI):0;
    const poseTime=extended?elapsed:t*2;
    stage(c,w,h,settings.character==='jotaro'?'136,90,210':'211,162,74',t,.63);
    timeDial(c,w,h,Math.min(t/.82,1),t>.82);
    if(!actor(c,settings.character==='jotaro'?'jotaro':'dio',w,h,.24,.56,.39,t<.22?0:t<.5?1:t<.76?3:4,{appear:Math.min(1,t*8),glow:'#f5cb79'}))figure(c,w,h,cc=>settings.character==='jotaro'?jotaro(cc,t):dioFigure(cc,t),{x:.24,y:.59,zoom:.65});
    // The Stand arrives from behind DIO, then locks into the final outstretched pose.
    c.save();c.translate(w*.018*Math.sin(t*PI)*(1-lock),0);
    if(!actor(c,settings.character==='jotaro'?'star':'world',w,h,.56+(1-p)*.1-close*.03,.50,.57+close*.10,t<.30?0:t<.64?1:t<.90?4:5,{alpha:p,appear:Math.min(1,p*1.7),glow:'#ffdf86'}))figure(c,w,h,cc=>settings.character==='jotaro'?starFigure(cc,poseTime,0):worldFigure(cc,poseTime,t>.90),{x:.56+(1-p)*.13-close*.035,y:.53-close*.02,zoom:.57+.26*p+close*.13});c.restore();
    if(t>.72&&t<.97){const q=clamp((t-.72)/.25),r=ease(q)*Math.max(w,h);oval(c,w*.52,h*.46,r,r*.66,'rgba(0,0,0,0)','rgba(235,222,178,'+(.75*(1-q))+')',4+6*(1-q));}
    root.JoJoVFX?.timeStop(c,w,h,phase,t,settings.elapsed||0,settings.balls||[],true,settings.backdrop);
    border(c,w,h,t<.22?(settings.character==='jotaro'?'JOTARO / STAR PLATINUM':'DIO / THE WORLD'):t<.76?(settings.character==='jotaro'?'STAR PLATINUM / CHRONOSTASIS':'THE WORLD / CHRONOSTASIS'):'ZA WARUDO / REALITY LOCK',extended?(t<.32?'REVEAL / THE COMMAND':t<.56?'STAND / CLOSE-UP':t<.80?'TIME PRESSURE / BUILD-UP':'REALITY LOCK / ACTIVATION'):'SPACE TO SKIP THE REVEAL','#ead29a');
    c.restore();
  }
  function ora(c,w,h,t,settings={}){
    if(!ctxReady(c))return;t=clamp(t);
    const phase=t<.12?0:t<.37?1:t<.70?2:t<.88?3:t<.965?4:5;
    const age=Number.isFinite(settings.elapsed)?settings.elapsed:t*8.359,power=[.15,.32,.55,.86,1,.14][phase];
    c.save();stage(c,w,h,'146,96,205',t,.15+power*.12);
    const rootX=phase===4?.53:.51,rootY=phase===4?.45:.46;
    if(!actor(c,'jotaro',w,h,.24,.58,.36,phase===5?5:phase<2?1:3))figure(c,w,h,cc=>jotaro(cc,age),{x:.25,y:.60,zoom:.47});
    const zoom=[.50,.61,.68,.74,.93,.58][phase];
    c.save();if(root.JoJoVFX&&!root.JoJoVFX.diagnostics.settings().reduced)c.transform(1,Math.sin(age*9)*.025,Math.sin(age*11)*.025,1,Math.sin(age*8)*w*.009,Math.cos(age*6)*h*.009);c.translate((phase>=1&&phase<=3?Math.sin(age*(phase===3?32:17))*w*.004:0),0);
    const painted=actor(c,'star',w,h,rootX,rootY,.53+(phase===4?.12:phase===3?.05:0),phase===0?0:phase===5?1:phase===4?5:phase===1?1:2+Math.floor(age*(phase===3?16:11))%3,{appear:Math.min(1,t*10),glow:'#ad7ced'});
    if(!painted)figure(c,w,h,cc=>starFigure(cc,age,phase),{x:rootX,y:rootY,zoom});c.restore();
    if(phase>=1&&phase<=3){
      const count=[0,4,8,12][phase],rate=phase===1?7:phase===2?13:21;
      for(let i=0;i<count;i++){
        const v=(age*rate/8.359+i/count)%1,side=i%2?1:-1;
        c.save();c.globalAlpha=.48*(1-v);c.translate(w*(.50+side*(.035+v*.13)),h*(.28+v*.32));c.rotate(side*(-.22+v*.28));
        const s=Math.min(w,h)/740*(.10+v*.44);c.scale(s,s);
        // Each ghost is a complete arm/fist, never a generic capsule particle.
        if(!painted)limb(c,[[0,-82],[side*25,-25],[side*18,12]],32,'#8063a9','#e0c8ee','#302340');
        if(!painted)fist(c,side*18,24,.68,'#8063a9','#ecd4fb');c.restore();
      }
    }
    if(phase===4){
      const q=smooth((t-.88)/.085);
      // A visible impact contour expands around the fist; it does not wash out the scene.
      for(let i=0;i<18;i++){const a=i*TAU/18,d=Math.min(w,h)*(.12+q*.25);line(c,[[w*.57+Math.cos(a)*d*.7,h*.49+Math.sin(a)*d*.7],[w*.57+Math.cos(a)*d,h*.49+Math.sin(a)*d]],'rgba(248,228,186,'+(.7*(1-q))+')',i%3===0?3:1);}
    }
    root.JoJoVFX?.punches(c,w,h,t,age,'star');
    topBanner(c,w,h,['STAR PLATINUM / REVEAL','ORA / FIRST STRIKES','ORA ORA / BARRAGE','STAR PLATINUM / OVERDRIVE','ORA! / FINAL IMPACT','STAND / RECOVERY'][phase],'#c4a3ed');
    c.restore();
  }

  root.JoJoCharacterDirector=Object.freeze({heaven,heavenEcho,ora,world,version:'5.0-scene-rebuild'});
})(typeof window!=='undefined'?window:globalThis);

