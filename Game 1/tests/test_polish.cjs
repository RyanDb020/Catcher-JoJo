const fs=require('fs'),vm=require('vm'),assert=require('assert');
const path=require('path');
const code=fs.readFileSync(path.join(__dirname,'..','src','sketch.js'),'utf8');
let now=0, soundPlay=0; const storage={};
const context={
 console,Math,JSON,String,Number,Array,Object,window:{},windowWidth:1280,windowHeight:720,width:1280,height:720,
 deltaTime:16.6667,frameCount:0, key:'',keyCode:0, RIGHT_ARROW:39,LEFT_ARROW:37,ENTER:13,ESCAPE:27,
 PI:Math.PI,TWO_PI:2*Math.PI,HALF_PI:Math.PI/2,CLOSE:'close',CENTER:'center',LEFT:'left',RIGHT:'right',BOLD:'bold',NORMAL:'normal',
 drawingContext:{createRadialGradient(){return {addColorStop(){}}},createLinearGradient(){return {addColorStop(){}}},save(){},restore(){},beginPath(){},ellipse(){},arc(){},moveTo(){},lineTo(){},stroke(){},fill(){},closePath(){},clip(){},translate(){},scale(){},rotate(){},drawImage(){},strokeText(){},fillText(){},setLineDash(){},fillStyle:'',strokeStyle:'',font:'',textAlign:'',textBaseline:'',lineJoin:'',lineWidth:1,globalAlpha:1,fillRect(){},shadowBlur:0,shadowColor:''},
 localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=String(v)},
 document:{getElementById(){return {hidden:true,addEventListener(){}}},querySelectorAll(){return []},querySelector(){return null}},
 Audio: class{addEventListener(){}pause(){}play(){soundPlay++;return Promise.resolve()}set currentTime(v){}set volume(v){}},
 getAudioContext(){return {state:'suspended'}},userStartAudio(){},
 loadSound(p,success){const snd={playing:false,setVolume(){},play(){this.playing=true;soundPlay++},loop(){this.playing=true},stop(){this.playing=false},isPlaying(){return this.playing}};if(success)success();return snd},
 createCanvas(w,h){context.width=w; context.height=h},resizeCanvas(w,h){context.width=w;context.height=h},frameRate(){},textFont(){},keyIsDown(){return false},
 random(a,b){if(Array.isArray(a))return a[0];if(a===undefined)return .5;if(b===undefined)return a/2;return (a+b)/2},
 max:Math.max,min:Math.min,abs:Math.abs,pow:Math.pow,sqrt:Math.sqrt,floor:Math.floor,ceil:Math.ceil,
 cos:Math.cos,sin:Math.sin,constrain:(x,a,b)=>Math.min(b,Math.max(a,x)),lerp:(a,b,t)=>a+(b-a)*t,dist:Math.hypot,
 atan2:Math.atan2,color(...v){return {setAlpha(){},v}},
};
for(const op of ['push','pop','rectMode','strokeWeight','stroke','fill','noFill','noStroke','circle','rect','line','point','ellipse','quad','translate','scale','rotate','text','textSize','textStyle','textAlign','beginShape','vertex','endShape','background','arc','triangle'])context[op]=()=>{};
const c=vm.createContext(context);vm.runInContext(code,c,{filename:'sketch.js'});
function run(s){return vm.runInContext(s,c)};
function tick(n=1){for(let i=0;i<n;i++){context.frameCount++;run('draw()')}};
function finishUniverse(){let i=0;while(run('universeReset.active')&&i++<3000)tick();assert(!run('universeReset.active'),'Universe reset exceeded its bounded completion time');}
let checks=0;function test(label,fn){fn();console.log('PASS:',label);checks++}
test('setup, preload and render start screen',()=>{run('preload(); setup()');tick(8);assert.equal(run('balls.length'),6);assert.equal(run('stars.length'),100)});
test('production scripts and every declared local audio file exist',()=>{
 const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const file of ['vendor/p5.min.js','vendor/p5.sound.min.js','src/character-director.js','src/cosmic-director.js','assets/cinematic/district-bed.mp3','assets/cinematic/defeat.mp3','assets/cinematic/time-activate.mp3'])assert(fs.existsSync(path.join(root,file)),file);
 for(const key of ['catch','perfect','power','punch','impact','rewind','rebirth','roller','miss'])assert(fs.existsSync(path.join(root,'assets',`sfx-${key}.mp3`)),`sfx-${key}.mp3`);
 assert(html.includes('src="vendor/p5.min.js"')&&html.includes('src="vendor/p5.sound.min.js"')&&html.includes('src/cosmic-director.js')&&html.includes('src/character-director.js')&&html.includes('src/sketch.js'));
});
test('start game and spawn world',()=>{run('gameStarted=true; audioUnlocked=true');tick(12);assert.equal(run('gameStarted'),true)});
test('perfect catch awards points and energy',()=>{run('balls[0].y=catcherY - BALL_SIZE/2+2; balls[0].x=catcherX+catcherWidth/2;');tick();assert(run('score')>=3);assert(run('perfectCatches')>=1);assert(run('standEnergy')>0)});
test('freeze completely stops catch scoring and power-up collection',()=>{run('startTimeStop(width/2,height/2)');const score=run('score');run('balls[0].y=catcherY+1;balls[0].x=catcherX+20;powerUps=[{x:catcherX+20,y:catcherY+2,type:"stand"}]');tick(8);assert.equal(run('score'),score);assert.equal(run('powerUps.length'),1)});
test('time stop transitions to freeze -> slow -> release -> idle',()=>{tick(275);assert.equal(run('timeStop.phase'),'freeze');const score=run('score');tick(10);assert.equal(run('score'),score);tick(75);assert.equal(run('timeStop.phase'),'slow');tick(460);assert(['release','idle'].includes(run('timeStop.phase')));tick(90);assert.equal(run('timeStop.phase'),'idle')});
test('ORA delays score until the distance-based punch reaches its target',()=>{run('standEnergy=100;balls[0].x=width/2;balls[0].y=height/2;startStandRush()');const pre=run('score');tick(1);assert.equal(run('score'),pre);tick(71);assert(run('standPunches.length')>0);const flight=run('standPunches[0].duration');assert(flight>=150&&flight<=290);tick(Math.ceil(flight/16.6667)+2);assert(run('score')>pre)});
test('Road Roller impact matches its visible landing and outlasts vehicle cleanup',()=>{run('standRush.active=false;standPunches=[];standEnergy=100; startRoadRoller()');assert.equal(run('roadRoller.active'),false);run('timeStop.phase="freeze";timeStop.phaseStart=gameMillis(); startRoadRoller()');assert.equal(run('roadRoller.active'),true);assert.equal(run('standEnergy'),0);tick(80);assert.equal(run('roadRoller.landed'),false);tick(4);assert.equal(run('roadRoller.landed'),true);tick(84);assert.equal(run('roadRoller.active'),true);assert.equal(run('roadRollerImpact.active'),true);tick(25);assert.equal(run('roadRoller.active'),false);assert.equal(run('roadRollerImpact.active'),true);tick(32);assert.equal(run('roadRollerImpact.active'),false)});
test('King Crimson protects lives for a timed interval',()=>{run('timeStop.phase="idle";standEnergy=100;gameOver=false;startKingCrimson()');assert.equal(run('kingCrimson.active'),true);const lives=run('lives');run('balls[0].y=height + 10;balls[0].gold=false');tick();assert.equal(run('lives'),lives);tick(100);assert.equal(run('kingCrimson.active'),false)});
test('bomb catch awards bonus and chain effects',()=>{run('balls[0].kind="bomb"; balls[0].gold=false; balls[0].x=catcherX+10; balls[0].y=catcherY+1;balls[1].x=catcherX+25;balls[1].y=catcherY-25;');const old=run('score');tick();assert(run('score')>old)});
test('repeated reset R is ignored and game cleanly starts universe 2',()=>{run('startUniverseReset()');const a=run('universeReset.started');run('startUniverseReset()');assert.equal(run('universeReset.started'),a);finishUniverse();assert.equal(run('universeReset.active'),false);assert.equal(run('universeNumber'),2);assert.equal(run('score'),0);assert.equal(run('lives'),3);assert.equal(run('standEnergy'),0);assert.equal(run('timeStop.phase'),'idle');assert.equal(run('gameOver'),false)});
test('game over then reset works',()=>{run('gameOver=true; lives=0');tick();run('startUniverseReset()');finishUniverse();assert.equal(run('gameOver'),false);assert.equal(run('universeNumber'),3)});
test('fatal catch lets ORA and punches finish without post-game scoring',()=>{
 run('resetGame();gameStarted=true;standEnergy=100;balls[0].x=width/2;balls[0].y=height/2;startStandRush();punchDangerousBall()');tick(1);
 const before=run('score');run('beginGameOver()');
 assert.equal(run('gameOver'),true);
 assert(run('gameOverRevealAt')>=run('standRush.start')+run('ORA_RUSH_DURATION_MS')+420);
 assert(run('gameOverRevealAt')>=run('standPunches[0].start')+run('standPunches[0].duration')+470);
 run('gameClock=Math.max(gameOverRevealAt+1,standRush.start+oraDuration()+1800);updateJoJoAttacks()');
 assert.equal(run('score'),before);assert.equal(run('standRush.active'),false);
 assert.equal(run('standPunches.some(p=>p.target.targeted)'),false);
});
test('Game Over panel and TBC banner stay inside responsive layouts',()=>{
 for(const [w,h] of [[640,480],[1280,720],[2556,1396],[3840,2160]]){
  context.width=w;context.height=h;const l=run('gameOverLayout()');
  assert(l.y-l.panelH/2>0&&l.y+l.panelH/2<h,`${w}x${h}: panel`);
  assert(l.bannerY-l.bannerH/2>l.sublineY+12*l.u,`${w}x${h}: subtitle/banner overlap`);
  assert(l.bannerY+l.bannerH/2<l.y+l.panelH/2,`${w}x${h}: banner outside card`);
 }
 context.width=1280;context.height=720;
});
test('options pause clock and persist setting',()=>{run('openOptions(true)');const before=run('gameMillis()');tick(10);assert.equal(run('gameMillis()'),before);run('applySetting("flashes",false)');assert.equal(storage.jojoCatcherSettings.includes('"flashes":false'),true);run('openOptions(false)');tick();assert(run('gameMillis()')>before)});
console.log('TESTS_PASS=',checks,'ASSETS=',Object.keys(run('soundEffects')).length,'SOUND_STARTS=',soundPlay);
test('two concurrent power-ups survive cinematic freeze',()=>{
 run('resetGame();gameStarted=true;widePowerUpEnd=gameMillis()+5000;doublePowerUpEnd=gameMillis()+5000;catcherWidth=WIDE_CATCHER_WIDTH; startTimeStop(width/2,height/2)');
 const oldWidth=run('catcherWidth');tick(310);
 assert.equal(run('catcherWidth'),oldWidth);
 assert(run('widePowerUpEnd')>run('gameMillis()'));
 assert(run('doublePowerUpEnd')>run('gameMillis()'));
});
test('multiple special key requests cannot overlap',()=>{
 run('resetGame();gameStarted=true;standEnergy=100;timeStop.phase="freeze";timeStop.phaseStart=gameMillis(); startRoadRoller(); startStandRush(); startKingCrimson()');
 assert.equal(run('roadRoller.active'),true);
 assert.equal(run('standRush.active'),false);
 assert.equal(run('kingCrimson.active'),false);
 assert.equal(run('standEnergy'),0);
});
test('global caps and single definitions',()=>{
 const hits=[...code.matchAll(/^function (\w+)\s*\(/gm)].map(m=>m[1]);
 assert.equal(new Set(hits).size,hits.length);
 run('burstJoJoParticles(220,220,"#ffffff",900);');
 assert(run('jojoParticles.length')<=run('MAX_PARTICLES'));
});
test('highscore unaffected by universe reset',()=>{
 run('bestScore=130; bestCombo=25; standRush.active=false;roadRoller.active=false;timeStop.phase="idle";queuedReset=false;startUniverseReset()');finishUniverse();assert.equal(run('universeReset.active'),false);
 assert.equal(run('bestScore'),130);assert.equal(run('bestCombo'),25);
});
console.log('FINAL_TESTS_PASS=',checks);
// Extra regressietests van de polish-pass. Deze context simuleert p5 canvas primitives;
// geen bewijs van browser-FPS of daadwerkelijke visuele kwaliteit.
test('arena boundaries reduce impossible ultrawide catches',()=>{
 context.width=2556; context.height=1390;
 run('resetGame()');
 const a=run('getArenaBounds()');
 assert(a.width<=1180&&a.left>500,JSON.stringify(a));
 run('for(const b of balls){respawnBall(b);}')
 assert(run('balls.every(b=>b.x>getArenaBounds().left && b.x<getArenaBounds().right)'));
 context.width=1280;context.height=720;
});
test('life and score feedback update on actual catches and misses',()=>{
 run('resetGame();gameStarted=true;catcherX=width/2-catcherWidth/2;');
 run('balls[0].x=catcherX+catcherWidth/2;balls[0].y=catcherY-BALL_SIZE/2+2');
 tick(1);
 assert(run('catchFeedback.length')>0);
 assert(run('scorePulseEnd>gameMillis()'));
 tick(4); run('balls[0].gold=false;balls[0].y=height+20');tick(1);
 assert(run('lifePulseEnd>gameMillis()'));
});
test('large deltaTime swept catch never misses a crossing',()=>{
 run('resetGame();gameStarted=true;timeStop.phase="idle";');
 context.deltaTime=33.33;
 run('balls[0].speed=14;balls[0].gold=false; balls[0].x=catcherX+catcherWidth/2;balls[0].y=catcherY-37;');
 const before=run('score');tick(1);assert(run('score')>before);
 context.deltaTime=16.6667;
});
test('space skips time stop intro without leaving broken phase',()=>{
 run('resetGame();gameStarted=true;startTimeStop(width/2,height/2)');
 assert.equal(run('timeStop.phase'),'intro');
 context.key=' ';context.keyCode=32;run('keyPressed()');
 assert.equal(run('timeStop.phase'),'freeze');
 tick(75);assert(['freeze','slow'].includes(run('timeStop.phase')));
});
test('space skips Pucci reset while committing new universe exactly once',()=>{
 run('resetGame();gameStarted=true;startUniverseReset()');
 const previous=run('universeNumber');
 context.key=' ';context.keyCode=32;run('keyPressed()');tick(110);
 assert.equal(run('universeReset.active'),false);
 assert.equal(run('universeNumber'),previous+1);
 assert.equal(run('lives'),3);
 context.key='r';context.keyCode=82;
});
test('settings and arena retain responsiveness after resize and replay',()=>{
 context.width=640;context.height=480;
 assert(run('hudScale()')>=.77);
 run('catcherX=99999;drawCatcherMovement()');
 assert(run('catcherX')<=run('getArenaBounds().right-catcherWidth'));
 context.width=1280;context.height=720;
 run('resetGame();gameStarted=true');tick(10);
 assert(!run('universeReset.active'));
});
test('audio missing never stops gameplay',()=>{
 run('audioUnlocked=true; soundEffects.catch.ready=false;');
 assert.doesNotThrow(()=>run('playCue("catch");'));
 assert.equal(run('balls.length'),6);
});
test('debug energy refill is disabled in the normal game',()=>{
 run('resetGame();gameStarted=true;standEnergy=0;key="g";keyCode=71;keyPressed();');
 assert.equal(run('DEBUG_TEST_MODE'),false);assert.equal(run('standEnergy'),0);
 assert(code.includes("new URLSearchParams(window.location.search).get('test') === '1'"));
});
test('QA life-loss suppression works only for local automation',()=>{
 context.location={hostname:'localhost'};context.window={__JOJO_QA_AUTOMATION__:true};
 assert.equal(run('qaSuppressLifeLoss()'),true);
 run('resetGame();gameStarted=true;balls[0].gold=false;balls[0].y=height+30;lives=3;drawBalls(1)');
 assert.equal(run('lives'),3);
 context.location.hostname='ryandb020.github.io';
 assert.equal(run('qaSuppressLifeLoss()'),false);
 context.location.hostname='127.0.0.1';context.window.__JOJO_QA_AUTOMATION__=false;
 assert.equal(run('qaSuppressLifeLoss()'),false);
 delete context.location;context.window={};
});
test('cinematic renderers execute mechanical clock and roller layers',()=>{
 run('visualAtlas.clock={};drawTimeStopClock(1500);drawChronometer(width/2,height/2,100,gameMillis()*.01,1)');
 run('visualAtlas.roller={};roadRoller={active:true,start:gameMillis(),landed:false};roadRollerImpact={active:false,at:0,x:0,y:0};drawRoadRoller()');
 run('roadRoller.active=false;roadRollerImpact={active:true,at:gameMillis(),x:width/2,y:height*.65};drawRoadRoller()');
 assert(code.includes('hydraulic')&&code.includes('echoSnapshot'));
});
test('sustained simulation does not accumulate unbounded histories/particles/popups',()=>{
 run('resetGame();gameStarted=true;');
 // Keep balls away from catcher to avoid game-over; monitor memory caps.
 run('kingCrimson.active=true;kingCrimson.start=gameMillis()+999999;');
 tick(1000);
 assert(run('universeHistory.length')<=run('HISTORY_MAX_FRAMES'));
 assert(run('jojoParticles.length')<=run('MAX_PARTICLES'));
 assert(run('standPunches.length')<15);
});
console.log('POLISH_TESTS_PASS=',checks);

test('Time Stop defaults to playable 55% and clamps quality choices',()=>{
 assert.equal(run('getSlowFactor()'),0.55);
 run('OVERHAUL_AUDIO.slowFactor=0.75');assert.equal(run('getTimeSpeed()'),1);
 run('timeStop.phase="slow"');assert.equal(run('getTimeSpeed()'),0.75);
 run('timeStop.phase="idle";OVERHAUL_AUDIO.slowFactor=0.55');
});
test('Time Stop slow phase advances balls while keeping the large overlay clear',()=>{
 run('resetGame();gameStarted=true;timeStop.phase="slow";slowPowerUpEnd=gameMillis()+5000;balls[0].y=100;balls[0].speed=4;');
 const before=run('balls[0].y');tick(1);assert(run('balls[0].y')>before);
 assert.equal(run('getTimeSpeed()'),0.55);
});
test('Time Stop intro and freeze hide the standard HUD panels',()=>{
 const originalRect=context.rect;let rectangles=0;context.rect=()=>{rectangles++};
 run('timeStop.phase="intro";gameOver=false;drawHUD()');assert.equal(rectangles,0);
 run('timeStop.phase="freeze";drawHUD()');assert.equal(rectangles,0);
 run('timeStop.phase="slow";drawHUD()');assert(rectangles>0);
 context.rect=originalRect;run('timeStop.phase="idle"');
});
test('Rewind camera streaks travel opposite the normal reading direction',()=>{
 assert(run('rewindStreakY(0,.5,720)')<run('rewindStreakY(0,.25,720)'));
});
test('visual quality remains bounded at 4K dimensions',()=>{
 context.width=3840;context.height=2160;
 const d=run('renderDensity()');assert(d<=2.1&&d>=0.5);
 context.width=1280;context.height=720;
});

console.log('CELESTIAL_TESTS_PASS=',checks);

// A ball deep beside the bucket cannot count as entering its top opening.
test('catch collision matches the bucket rim rather than its full sidewall',()=>{
 run('resetGame();gameStarted=true');
 assert.equal(run('isCaught(catcherX+catcherWidth/2,catcherY+catcherHeight-5)'),false);
 assert.equal(run('isCaught(catcherX+catcherWidth/2,catcherY+1)'),true);
});

test('long local ORA clip is not cut at the old fixed end time',()=>{
 run("resetGame();gameStarted=true;var savedOra=jojoVoiceClips.ora;jojoVoiceClips.ora={duration:14.2,currentTime:0,paused:true,play(){this.paused=false;return Promise.resolve()},pause(){this.paused=true}};standEnergy=100;startStandRush();gameClock=standRush.start+9700;jojoVoiceClips.ora.currentTime=9.7;updateJoJoAttacks()");
 assert(run('standRush.active'));assert(run('oraDuration()')>=14200);
 run('gameClock=standRush.start+14210;finishDirectorVoice(directorVoice.token);updateJoJoAttacks()');assert(!run('standRush.active'));
 run('jojoVoiceClips.ora=savedOra');
});
test('reset cancels a retained director and missing clips never strand Rewind',()=>{
 run('resetGame();gameStarted=true;var savedClips=jojoVoiceClips;jojoVoiceClips={};startUniverseReset()');finishUniverse();assert.equal(run('directorVoice'),null);
 run('jojoVoiceClips=savedClips;standEnergy=100;startStandRush();resetGame()');assert.equal(run('directorVoice'),null);assert(!run('standRush.active'));
});
test('all cinematic defaults use substantial local recordings',()=>{
 const root=path.join(__dirname,'..');
 for(const name of ['reveal','rewind','ora-track','time-activate','time-freeze','time-resume','acceleration','collapse','genesis','finisher','defeat','district-bed'])assert(fs.statSync(path.join(root,'assets/cinematic',name+'.mp3')).size>1000,name);
 for(const name of ['giorno-theme','made-in-heaven','ora-ora','time-accelerate','za-warudo-toki-wo-tomare_WJVdsYt'])assert(code.includes('assets/'+name+'.mp3')); 
});
test('The Hand erases only its nearby forward zone and spends energy once',()=>{
 run('resetGame();gameStarted=true;standEnergy=100;balls[0].x=catcherX+catcherWidth/2;balls[0].y=catcherY-90;balls[1].x=catcherX-240;balls[1].y=catcherY-90;startPackMove("hand")');
 assert.equal(run('standEnergy'),65);assert.equal(run('startPackMove("tusk")'),false);
 const far=run('balls[1].y');run('gameClock=packMove.start+400;updatePackMove()');assert(run('balls[0].y')<0);assert.equal(run('balls[1].y'),far);
 run('updatePackMove()');assert.equal(run('standEnergy'),65);
});
test('Tusk follows a target and resolves its catch exactly once',()=>{
 run('resetGame();gameStarted=true;standEnergy=100;balls.forEach(b=>b.y=-300);balls[0].x=catcherX+catcherWidth/2;balls[0].y=catcherY-50;startPackMove("tusk");updatePackMove()');
 assert.equal(run('standEnergy'),75);assert(run('balls[0].targeted'));const before=run('score');for(let i=0;i<20;i++)run('updatePackMove()');assert(run('score')>before);assert(!run('balls[0].targeted'));
 const after=run('score');run('updatePackMove()');assert.equal(run('score'),after);
});
test('C-Moon reverses balls but full time freeze remains motionless',()=>{
 run('resetGame();gameStarted=true;standEnergy=100;balls[0].y=200;startPackMove("cmoon")');const y=run('balls[0].y');run('drawBalls(1)');assert(run('balls[0].y')<y);const frozen=run('balls[0].y');run('drawBalls(0)');assert.equal(run('balls[0].y'),frozen);
 run('gameClock=packMove.end+1;updatePackMove()');assert.equal(run('packMove.kind'),null);const normal=run('balls[0].y');run('drawBalls(1)');assert(run('balls[0].y')>normal);
});
test('Giorno barrage continues for long audio and reset clears every added move',()=>{
 run('resetGame();gameStarted=true;standEnergy=100;jojoVoiceClips.giorno.duration=14.3;startPackMove("giorno");gameClock=packMove.start+9000;updatePackMove()');assert.equal(run('packMove.kind'),'giorno');assert.equal(run('standEnergy'),25);
 run('resetGame()');assert.equal(run('packMove.kind'),null);assert.equal(run('Object.keys(packCooldowns).length'),0);
});
test('new moves cannot activate in pause, game over or a cinematic',()=>{
 run('resetGame();gameStarted=true;standEnergy=100;optionsVisible=true');assert.equal(run('startPackMove("hand")'),false);run('optionsVisible=false;gameOver=true');assert.equal(run('startPackMove("hand")'),false);run('gameOver=false;timeStop.phase="freeze"');assert.equal(run('startPackMove("cmoon")'),false);run('resetGame()');
});
test('all 17 personal pack assets decode-sized and local',()=>{const records=JSON.parse(fs.readFileSync(path.join(__dirname,'../JOJO_AUDIO_PACK.json')));assert.equal(records.length,17);for(const item of records){assert(fs.statSync(path.join(__dirname,'..',item.path)).size>1000,item.key);assert(item.duration>0);assert(code.includes("assets/jojo/"+item.key+".mp3"),item.key);}});
test('Space cancels added attacks and releases target claims without refund',()=>{
 run('resetGame();gameStarted=true;standEnergy=100;balls[0].y=200;startPackMove("tusk");updatePackMove();keyCode=32;key=" ";keyPressed()');assert.equal(run('packMove.kind'),null);assert.equal(run('standEnergy'),75);assert(!run('balls.some(b=>b.targeted)'));run('keyCode=0;key="";resetGame()');
});
test('blue Time Stop pickup is retained during extra moves and fires after recovery',()=>{
 run('resetGame();gameStarted=true;standEnergy=100;startPackMove("cmoon");startTimeStop(120,130)');assert.equal(run('timeStop.phase'),'idle');assert.equal(run('queuedTimeStop.x'),120);
 run('gameClock=packMove.end+1;draw()');assert.equal(run('timeStop.phase'),'intro');assert.equal(run('queuedTimeStop'),null);
 run('resetGame()');assert.equal(run('queuedTimeStop'),null);assert.equal(run('queuedReset'),false);
});
test('bindings swap duplicates, persist and reject movement/control keys',()=>{
 run('arcadeBindings={...DEFAULT_ARCADE_BINDINGS};assignArcadeBinding("ora","1")');assert.equal(run('arcadeBindings.ora'),'1');assert.equal(run('arcadeBindings.stop'),'2');assert.equal(run('assignArcadeBinding("ora","a")'),false);
 assert.equal(JSON.parse(storage['jojo.arcade.bindings.v1']).ora,'1');run('arcadeBindings={...DEFAULT_ARCADE_BINDINGS};initializeKeyBindings()');assert.equal(run('arcadeBindings.stop'),'2');
 run('arcadeBindings={...DEFAULT_ARCADE_BINDINGS};saveArcadeBindings();resetGame();gameStarted=true;key="1";keyCode=49;keyPressed()');assert.equal(run('timeStop.phase'),'intro');run('resetGame();key="";keyCode=0');
});
test('held keys cannot repeatedly extend a Time Stop',()=>{
 run('resetGame();gameStarted=true;timeStop.phase="slow";slowPowerUpEnd=12345;key="1";keyCode=49;keyPressed({repeat:true})');assert.equal(run('slowPowerUpEnd'),12345);run('resetGame();key="";keyCode=0');
});
test('long DIO uses its full clip and snapshot despite selection changes',()=>{
 run('resetGame();gameStarted=true;var originalDio=jojoVoiceClips.dio;jojoVoiceClips.dio={duration:12.3,currentTime:0,paused:true,ended:false,pause(){this.paused=true},play(){this.paused=false;return Promise.resolve()}};packTimeVoice="dio";startTimeStop(10,10);packTimeVoice="starstop";jojoVoiceClips.dio.currentTime=6;gameClock=timeStop.phaseStart+13000;updateTimeStop()');
 assert.equal(run('timeStop.voiceName'),'dio');assert.equal(run('timeStop.phase'),'intro');assert.equal(run('stopIntroDuration()'),12300);assert(Math.abs(run('timeStopSceneProgress()')-6/12.3)<.001);
 run('jojoVoiceClips.dio.currentTime=12.3;jojoVoiceClips.dio.ended=true;updateTimeStop()');assert.equal(run('timeStop.phase'),'freeze');run('jojoVoiceClips.dio=originalDio;packTimeVoice="classic";resetGame()');
});
test('late clip metadata extends every move and a single Hand strike stays single',()=>{
 run('resetGame();gameStarted=true;standEnergy=100;var originalHand=jojoVoiceClips.hand;jojoVoiceClips.hand={duration:NaN,currentTime:0,paused:true,ended:false,pause(){this.paused=true},play(){this.paused=false;return Promise.resolve()}};startPackMove("hand");jojoVoiceClips.hand.duration=6;jojoVoiceClips.hand.currentTime=.8;gameClock=packMove.start+1000;updatePackMove()');assert.equal(run('packMove.end-packMove.start'),6000);assert.equal(run('packMove.hit'),true);
 run('gameClock=packMove.start+7000;jojoVoiceClips.hand.currentTime=5;updatePackMove()');assert.equal(run('packMove.kind'),'hand');run('jojoVoiceClips.hand.ended=true;updatePackMove()');assert.equal(run('packMove.kind'),null);run('jojoVoiceClips.hand=originalHand;resetGame()');
});
test('long C-Moon keeps its recovery animation but gravity returns after four seconds',()=>{
 run('resetGame();gameStarted=true;standEnergy=100;var originalMoon=jojoVoiceClips.cmoon;jojoVoiceClips.cmoon={duration:14,currentTime:0,paused:true,pause(){this.paused=true},play(){this.paused=false;return Promise.resolve()}};startPackMove("cmoon");gameClock=packMove.start+4500;jojoVoiceClips.cmoon.currentTime=4.5;updatePackMove();balls[0].y=200');const y=run('balls[0].y');run('drawBalls(1)');assert(run('balls[0].y')>y);assert.equal(run('packMove.kind'),'cmoon');run('jojoVoiceClips.cmoon=originalMoon;resetGame()');
});
test('clips longer than a minute are not truncated and stalled audio is bounded',()=>{
 run('var oldClip=jojoVoiceClips.hand;jojoVoiceClips.hand={duration:125}');assert.equal(run('cinematicDuration("hand",1000)'),125000);run('jojoVoiceClips.hand=oldClip;var stale={};var stalled={paused:false,ended:false,currentTime:0};sceneMediaAlive(stale,stalled);gameClock+=8500');assert.equal(run('sceneMediaAlive(stale,stalled)'),false);run('resetGame()');
});
test('pooled particles reuse retired objects and stay bounded through repeated bursts',()=>{
 run('resetGame();jojoParticlePool=[];OVERHAUL_AUDIO.particles=true;burstJoJoParticles(1,2,"#fff",90);var originals=new Set(jojoParticles);jojoParticles.forEach(p=>p.life=0);updateJoJoParticles();burstJoJoParticles(3,4,"#fff",90)');assert(run('jojoParticles.every(p=>originals.has(p))'));
 for(let i=0;i<8;i++)run('burstJoJoParticles(3,4,"#fff",90)');assert(run('jojoParticles.length+jojoParticlePool.length')<=run('MAX_PARTICLES'));run('resetGame()');
});
