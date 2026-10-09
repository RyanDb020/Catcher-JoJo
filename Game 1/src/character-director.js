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
    c.fillText(title,Math.max(16,w*.037),bar*.52);
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
    const p=Math.sin(time*12),lunge=freeze?1:smooth((time-.22)/.54);
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
    c.save();
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
    // Leading giant arm, segmented gauntlet and foreshortened punch.
    limb(c,[[-93,-97],[-177,-35],[-160-55*strike,64-25*strike]],
      76,'#725097','#d1abef','#392b5f');
    oval(c,-179,-36,48,43,'#b392d9',ink,4);
    armor(c,[[-200,40],[-126,52],[-113,94],[-194,97]],'#3a4056','#9da4bf');
    fist(c,-156-119*strike,112-38*strike,1.17+.47*strike,'#674d8b','#e0c8fc');
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
    polygon(c,[[-56,238],[-7,237],[-25,351],[-67,355]],'#3a2337',ink,4);
    polygon(c,[[0,240],[43,236],[71,349],[17,350]],'#432c3d',ink,4);
    c.restore();
  }
  function heavenFigure(c,time) {
    const gallop=Math.sin(time*8),lean=Math.sin(time*2)*.05;
    c.save();c.rotate(lean);
    // Hooves and forward horse-like legs.
    limb(c,[[-51,129],[-103,229],[-112+13*gallop,323]],48,'#bed1e1','#f3faff','#7a90ae');
    limb(c,[[46,136],[127,227],[150-14*gallop,315]],48,'#d2e3ee','#fffaf4','#758ba5');
    polygon(c,[[-143,300],[-97,297],[-93,339],[-158,350]],'#e8d7a5',ink,3);
    polygon(c,[[122,303],[168,301],[185,341],[128,349]],'#f0d0a2',ink,3);
    // Equine neck and tapered nose, layered ceramic chest armor.
    polygon(c,[[-79,-48],[83,-65],[108,61],[65,167],[-59,178],[-107,88]],
      '#d3e9ef',ink,5);
    polygon(c,[[-43,-40],[17,-82],[65,-54],[43,93],[-6,134],[-57,85]],'#f4f9ff',ink,4);
    polygon(c,[[-8,55],[39,83],[18,133],[-32,128]],'#b5c9dd',ink,3);
    polygon(c,[[-42,98],[47,103],[20,172],[-31,168]],'#ffffff',ink,4);
    polygon(c,[[-30,127],[18,130],[-3,165]],'#eac3bd',null);
    // Winged feather fans.
    for(const side of [-1,1])for(let i=0;i<5;i++){
      const x=side*(55+i*16),y=-73-i*18;
      polygon(c,[[side*38,-78],[x,y-61],[side*(75+i*11),y-5]],
        i%2?'#dee5f9':'#b9d6ec',ink,2);
    }
    limb(c,[[-88,-54],[-153,-2],[-143+20*gallop,91]],39,'#dae9ee','#ffffff','#839bb6');
    limb(c,[[83,-55],[142,-6],[146-19*gallop,82]],41,'#e0eff2','#ffffff','#879bb2');
    fist(c,-140+20*gallop,100,.58,'#e1ecf5','#ffffff');
    fist(c,143-20*gallop,91,.58,'#d6e2eb','#fff7ed');
    // Long pointy mask, temple plume and eyes.
    polygon(c,[[-52,-165],[12,-205],[68,-163],[61,-116],[22,-89],[-40,-102]],'#e6f4ff',ink,4);
    polygon(c,[[-23,-166],[17,-226],[46,-159],[20,-136]],'#8ebad0',ink,3);
    polygon(c,[[-57,-157],[-84,-184],[-59,-112]],'#cde4f5',ink,3);
    polygon(c,[[60,-158],[88,-187],[67,-112]],'#d9e7ec',ink,3);
    polygon(c,[[-60,-126],[-17,-115],[-8,-100],[-53,-102]],'#96b9d2',ink,3);
    polygon(c,[[12,-111],[58,-126],[50,-100],[18,-95]],'#a0bfd8',ink,3);
    polygon(c,[[-42,-130],[-8,-126],[-21,-116],[-42,-118]],'#fff7d5',ink,2);
    polygon(c,[[12,-127],[46,-136],[34,-119],[19,-115]],'#fff7d5',ink,2);
    oval(c,-25,-123,3,4,'#75457d',null);oval(c,28,-126,3,4,'#75457d',null);
    polygon(c,[[-18,-100],[17,-94],[34,-56],[-10,-63]],'#c9e1ee',ink,4);
    line(c,[[-11,-76],[8,-73],[17,-80]],'#5a6e85',3);
    oval(c,46,37,20,17,'#f5d9ab',ink,3);
    oval(c,46,37,9,8,'#9db6ce',ink,2);
    inkHatch(c,52,93,-.4,13,4);
    c.restore();
  }
  function figure(c,w,h,drawing,options={}) {
    const size=Math.min(w/960,h/740)*1.18*(options.zoom || 1);
    c.save(); c.translate(w*(options.x ?? .5),h*(options.y ?? .53));
    c.scale(size,size);drawing(c);
    c.restore();
  }
  function world(c,w,h,phase,t,settings={}) {
    if (!ctxReady(c)) return;
    c.save();
    const isSlow=phase==='slow',isRelease=phase==='release';
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
    stage(c,w,h,'255,193,65',t,.98);
    const entrance=ease(t/.28);
    const hero=smooth((t-.12)/.34);
    aura(c,[w*.51,h*.52,w*.19,h*.32],t*3,'246,185,63',hero);
    figure(c,w,h,cc=>worldFigure(cc,t*3,t>.81),
      {zoom:.74+hero*.43, x:.55-(1-entrance)*.32,y:.55+(1-entrance)*.14});
    if(t>.76){
      motion(c,w*.51,h*.50,t,'#fff0be',24);
      tint(c,w*.53,h*.49,w*.30,'255,241,169',.10+.17*smooth((t-.76)/.24));
    }
    border(c,w,h,t<.34?'SUMMON  /  THE WORLD':t<.72?'THE WORLD  /  FULL REVEAL':'ZA WARUDO  /  FREEZE',
      t<.76?'CHRONOSTASIS':'TOKI YO TOMARE','#e1b43f');
    c.restore();
  }
  function ora(c,w,h,t,settings={}) {
    if (!ctxReady(c)) return;
    c.save(); const phase=t<.12?0:t<.37?1:t<.70?2:t<.88?3:t<.965?4:5;
    const age=t*8.359,first=ease(t/.12),power=[.25,.35,.65,.93,1,.12][phase];
    // Restrained screen tint: preserve gameplay and catcher safe area.
    stage(c,w,h,'151,72,235',t,.13+power*.12);
    aura(c,[w*.31,h*.32,w*.13,h*.22],age,'166,83,246',power*.72);
    // Signature double portrait: Jotaro behind a readable full-bodied Stand.
    figure(c,w,h,cc=>jotaro(cc,age),{x:.18,y:.35,zoom:.43+first*.045});
    const zoom=(.43+first*.11+(phase===3?.05:0)+(phase===4?.095:0));
    if(phase>=2 && phase<=3){
      c.save();c.globalAlpha=.20;
      for(let i=3;i>=1;i--)
        figure(c,w,h,cc=>starFigure(cc,age-i*.10,phase),
          {x:.32+(i%2?-.028:.020),y:.34,zoom:zoom*(1+i*.018)});
      c.restore();
    }
    figure(c,w,h,cc=>starFigure(cc,age,phase),{x:.32,y:.32,zoom});
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
    topBanner(c,w,h,['STAR PLATINUM  /  REVEAL','ORA  /  FIRST STRIKES','ORA ORA  /  BARRAGE',
      'STAR PLATINUM  /  OVERDRIVE','ORA!  /  FINAL IMPACT','STAND  /  RECOVERY'][phase],
      '#b76cf3');
    c.restore();
  }
  function heaven(c,w,h,t,variant='reveal') {
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
  function heavenEcho(c,w,h,t) {
    if (!ctxReady(c))return;
    c.save(); c.globalAlpha=.18+.22*Math.sin(t*PI);
    const s=Math.min(w/960,h/740)*1.06;
    c.translate(w*.71,h*.59);c.scale(s,s);heavenFigure(c,t*16);c.restore();
  }
  root.JoJoCharacterDirector=Object.freeze({heaven,heavenEcho,ora,world,version:'3.0-character-rebuild'});
})(typeof window!=='undefined'?window:globalThis);
