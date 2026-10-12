const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/3d/audio.mjs'),'utf8').replace('export function','function').replace('import.meta.url',JSON.stringify('https://game.example/src/3d/audio.mjs'));
const sources=[];let clock=0;
function node(){return {connect(){},disconnect(){},gain:{value:0,setTargetAtTime(){}},pan:{value:0}}}
class Context{
 get currentTime(){return clock}
 constructor(){this.destination=node()}
 createGain(){return node()}
 createStereoPanner(){return node()}
 createBufferSource(){const n={...node(),start(){this.started=true},stop(){this.stopped=true;this.onended?.()}};sources.push(n);return n}
 resume(){return Promise.resolve()}
 decodeAudioData(){return Promise.resolve({duration:1})}
}
const scope={console,URL,Map,Set,Math,Number,JSON,window:{AudioContext:Context},localStorage:{getItem(){return null},setItem(){}},document:{querySelectorAll(){return []},getElementById(){return null}},fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})};
vm.createContext(scope);vm.runInContext(source+';globalThis.manager=createCombatAudio()',scope);
(async()=>{
 const a=scope.manager;
 await a.start();assert.equal(a.snapshot().ready,14);
 assert.equal(a.play('punch-light'),true);
 assert.equal(a.play('punch-light'),false,'same-frame hit must not double play');
 clock+=.1;assert.equal(a.play('punch-light'),true);
 clock+=.1;assert.equal(a.play('punch-light'),true);
 clock+=.1;assert.equal(a.play('punch-light'),false,'three active voices per event');
 a.setActive(false);assert.equal(a.snapshot().voices,0);
 assert(sources.filter(n=>!n.loop).every(n=>n.stopped),'pause stops every one-shot');
 assert.equal(a.play('enemy-hit'),false);
 await a.start();clock+=.1;assert.equal(a.play('punch-light'),true,'restart accepts new action');
 a.setActive(false);const pending=a.start();a.setActive(false);assert.equal(await pending,false,'pending load cannot reactivate a paused game');
 assert.equal(a.snapshot().active,false);
 console.log('PASS audio decoding, repeated hits, voice caps, pause and async restart cleanup');
})().catch(error=>{console.error(error);process.exitCode=1});
