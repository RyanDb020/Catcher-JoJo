const fs=require('fs'),vm=require('vm'),assert=require('assert');
const path=require('path');
const code=fs.readFileSync(path.join(__dirname,'..','src','sketch.js'),'utf8');
let now=0, soundPlay=0; const storage={};
const context={
 console,Math,JSON,String,Number,Array,Object,windowWidth:1280,windowHeight:720,width:1280,height:720,
 deltaTime:16.6667,frameCount:0, key:'',keyCode:0, RIGHT_ARROW:39,LEFT_ARROW:37,ENTER:13,ESCAPE:27,
 PI:Math.PI,TWO_PI:2*Math.PI,HALF_PI:Math.PI/2,CLOSE:'close',CENTER:'center',LEFT:'left',RIGHT:'right',BOLD:'bold',NORMAL:'normal',
 drawingContext:{createRadialGradient(){return {addColorStop(){}}},fillStyle:'',fillRect(){},shadowBlur:0,shadowColor:''},
 localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=String(v)},
 document:{getElementById(){return {hidden:true,addEventListener(){}}},querySelectorAll(){return []}},
 Audio: class{pause(){}play(){soundPlay++;return Promise.resolve()}set currentTime(v){}set volume(v){}},
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
let checks=0;function test(label,fn){fn();console.log('PASS:',label);checks++}
test('setup, preload and render start screen',()=>{run('preload(); setup()');tick(8);assert.equal(run('balls.length'),6);assert.equal(run('stars.length'),100)});
test('start game and spawn world',()=>{run('gameStarted=true; audioUnlocked=true');tick(12);assert.equal(run('gameStarted'),true)});
test('perfect catch awards points and energy',()=>{run('balls[0].y=catcherY - BALL_SIZE/2+2; balls[0].x=catcherX+catcherWidth/2;');tick();assert(run('score')>=3);assert(run('perfectCatches')>=1);assert(run('standEnergy')>0)});
test('freeze completely stops catch scoring and power-up collection',()=>{run('startTimeStop(width/2,height/2)');const score=run('score');run('balls[0].y=catcherY+1;balls[0].x=catcherX+20;powerUps=[{x:catcherX+20,y:catcherY+2,type:"stand"}]');tick(8);assert.equal(run('score'),score);assert.equal(run('powerUps.length'),1)});
test('time stop transitions to freeze -> slow -> release -> idle',()=>{tick(275);assert.equal(run('timeStop.phase'),'freeze');const score=run('score');tick(10);assert.equal(run('score'),score);tick(75);assert.equal(run('timeStop.phase'),'slow');tick(460);assert(['release','idle'].includes(run('timeStop.phase')));tick(90);assert.equal(run('timeStop.phase'),'idle')});
test('ORA delayed score until punch arrival',()=>{run('standEnergy=100;balls[0].x=width/2;balls[0].y=height/2;startStandRush()');const pre=run('score');tick(1);assert.equal(run('score'),pre);tick(12);assert(run('score')>pre)});
test('Road Roller requires time stop, lands once and spends energy',()=>{run('standRush.active=false;standPunches=[];standEnergy=100; startRoadRoller()');assert.equal(run('roadRoller.active'),false);run('timeStop.phase="freeze";timeStop.phaseStart=gameMillis(); startRoadRoller()');assert.equal(run('roadRoller.active'),true);assert.equal(run('standEnergy'),0);tick(82);assert.equal(run('roadRoller.landed'),true);tick(105);assert.equal(run('roadRoller.active'),false)});
test('King Crimson protects lives for a timed interval',()=>{run('timeStop.phase="idle";standEnergy=100;gameOver=false;startKingCrimson()');assert.equal(run('kingCrimson.active'),true);const lives=run('lives');run('balls[0].y=height + 10;balls[0].gold=false');tick();assert.equal(run('lives'),lives);tick(100);assert.equal(run('kingCrimson.active'),false)});
test('bomb catch awards bonus and chain effects',()=>{run('balls[0].kind="bomb"; balls[0].gold=false; balls[0].x=catcherX+10; balls[0].y=catcherY+1;balls[1].x=catcherX+25;balls[1].y=catcherY-25;');const old=run('score');tick();assert(run('score')>old)});
test('repeated reset R is ignored and game cleanly starts universe 2',()=>{run('startUniverseReset()');const a=run('universeReset.started');run('startUniverseReset()');assert.equal(run('universeReset.started'),a);tick(510);assert.equal(run('universeReset.active'),false);assert.equal(run('universeNumber'),2);assert.equal(run('score'),0);assert.equal(run('lives'),3);assert.equal(run('standEnergy'),0);assert.equal(run('timeStop.phase'),'idle');assert.equal(run('gameOver'),false)});
test('game over then reset works',()=>{run('gameOver=true; lives=0');tick();run('startUniverseReset()');tick(510);assert.equal(run('gameOver'),false);assert.equal(run('universeNumber'),3)});
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
 run('bestScore=130; bestCombo=25; startUniverseReset()');tick(510);
 assert.equal(run('bestScore'),130);assert.equal(run('bestCombo'),25);
});
console.log('FINAL_TESTS_PASS=',checks);
