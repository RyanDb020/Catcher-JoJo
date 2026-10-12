// Local Kenney CC0 foley + existing cinematic/ambient cues. See ASSET_CREDITS.md.
const PREF_KEY='jojo.shattered.audio.v1';
const FILES={
  'dash-whoosh':'dash-whoosh.ogg','punch-light':'punch-light.ogg','punch-heavy':'punch-heavy.ogg',
  'stone-steps':'stone-steps.ogg','enemy-telegraph':'enemy-telegraph.ogg','enemy-hit':'enemy-hit.ogg',
  'time-stop':'time-stop.ogg','time-resume':'time-resume.ogg','stand-summon':'stand-summon.ogg',
  'chrono-echo':'chrono-echo.ogg','district-ambience':'district-ambience.ogg','combat-music':'combat-music.ogg'
};
Object.assign(FILES,{
  'stone-steps':['footstep_concrete_000','footstep_concrete_001','footstep_concrete_002'],
  'punch-light':['impactPunch_medium_000','impactPunch_medium_001','impactPunch_medium_002'],
  'punch-heavy':['impactSoft_heavy_000'],
  'dash-whoosh':['cloth1','cloth2'],
  'enemy-hit':['impactPunch_medium_002','impactSoft_heavy_000'],
  'attack-whoosh':['knifeSlice','knifeSlice2'],
  'guard':['impactMetal_medium_000'],
  'enemy-telegraph':['metalLatch']
});
Object.assign(FILES,{'time-stop':'jojo/starstop.mp3','time-resume':'jojo/resume.mp3','chrono-echo':'jojo/teleport.mp3'});
const defaults={master:.75,music:.24,ambience:.35,effects:.68,muted:false};
export function createCombatAudio(){
  let context=null,buffers=new Map(),ready=null,active=false,musicSource=null,ambienceSource=null;
  let master=null,music=null,ambience=null,effects=null;
  let session=0;
  const voices=new Map(),lastPlayed=new Map();
  const variants=new Map();
  function stopEffects(){
    for(const source of voices.keys()){try{source.stop()}catch{}source.disconnect();}
    voices.clear();lastPlayed.clear();
  }
  let prefs={...defaults};
  try{prefs={...prefs,...JSON.parse(localStorage.getItem(PREF_KEY)||'{}')}}catch{}
  const clamp=n=>Math.max(0,Math.min(1,Number(n)||0));
  function apply(){
    if(!context)return;
    const audible=active&&!prefs.muted?prefs.master:0;
    master.gain.setTargetAtTime(audible,context.currentTime,.06);
    music.gain.setTargetAtTime(prefs.music,context.currentTime,.12);
    ambience.gain.setTargetAtTime(prefs.ambience,context.currentTime,.12);
    effects.gain.setTargetAtTime(prefs.effects,context.currentTime,.025);
  }
  function ensure(){
    if(context)return true;
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext)return false;
    context=new AudioContext();
    master=context.createGain();music=context.createGain();ambience=context.createGain();effects=context.createGain();
    music.connect(master);ambience.connect(master);effects.connect(master);master.connect(context.destination);
    apply();
    return true;
  }
  async function load(){
    if(ready)return ready;
    ready=(async()=>{
      const entries=Object.entries(FILES);
      await Promise.all(entries.map(async([name,file])=>{
        const paths=Array.isArray(file)?file.map(stem=>'../../assets/foley/'+stem+'.ogg'):[file.startsWith('jojo/')?'../../assets/'+file:'../../assets/combat-audio/'+file];
        const decoded=await Promise.all(paths.map(async path=>{
          try{
            const response=await fetch(new URL(path+'?v=foley-1.5.1',import.meta.url));
            if(!response.ok)throw Error('Audio asset '+path+' returned '+response.status);
            return await context.decodeAudioData(await response.arrayBuffer());
          }catch(error){console.warn('Combat audio asset unavailable:',path,error);return null;}
        }));
        const available=decoded.filter(Boolean);if(available.length)buffers.set(name,available);
      }));
      return buffers.size;
    })();
    return ready;
  }
  function startLoop(name,target){
    if(!context||!buffers.has(name))return null;
    const source=context.createBufferSource();source.buffer=buffers.get(name)[0];source.loop=true;
    source.connect(target);source.start();return source;
  }
  async function start(){
    if(!ensure())return false;
    const ticket=++session;
    active=true;apply();
    await context.resume();await load();
    if(ticket!==session||!active)return false;
    if(!musicSource)musicSource=startLoop('combat-music',music);
    if(!ambienceSource)ambienceSource=startLoop('district-ambience',ambience);
    return buffers.size>0;
  }
  function setActive(value){active=Boolean(value);if(!active){session++;stopEffects();}apply();}
  function play(name,volume=1,pan=0){
    if(!active||prefs.muted||!ensure())return false;
    const emit=()=>{
      if(name==='time-resume')for(const [source,event] of voices){if(event==='time-stop'){try{source.stop()}catch{}}}
      const bank=buffers.get(name);if(!bank||!active||prefs.muted)return false;
      const variant=variants.get(name)||0,buffer=bank[variant%bank.length];
      const now=context.currentTime;
      if(now-(lastPlayed.get(name)??-Infinity)<.045)return false;
      if(voices.size>=24||[...voices.values()].filter(event=>event===name).length>=3)return false;
      const source=context.createBufferSource();source.buffer=buffer;
      const gain=context.createGain();gain.gain.value=clamp(volume);
      source.connect(gain);
      let panner=null;
      if(context.createStereoPanner){panner=context.createStereoPanner();panner.pan.value=Math.max(-1,Math.min(1,pan));gain.connect(panner);panner.connect(effects)}else gain.connect(effects);
      voices.set(source,name);lastPlayed.set(name,now);
      variants.set(name,variant+1);
      source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();panner?.disconnect();};
      source.start();return true;
    };
    if(buffers.has(name))return emit();
    // Loading an effect late must never replay an old hit or warning in a new game.
    load();return false;
  }
  function persist(){if(prefs.muted)stopEffects();try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}catch{}apply()}
  function bind(){
    for(const input of document.querySelectorAll('[data-audio]')){
      const key=input.dataset.audio;input.value=String(Math.round(prefs[key]*100));
      input.addEventListener('input',()=>{prefs[key]=clamp(input.value/100);persist()});
    }
    const mute=document.getElementById('audio-mute');
    if(mute){mute.checked=prefs.muted;mute.addEventListener('change',()=>{prefs.muted=mute.checked;persist()})}
    document.getElementById('audio-settings')?.addEventListener('toggle',event=>{if(event.target.open)play('stand-summon',.16)});
  }
  bind();
  return {start,play,setActive,preferences:()=>({...prefs}),snapshot:()=>({ready:buffers.size,muted:prefs.muted,active,voices:voices.size})};
}
