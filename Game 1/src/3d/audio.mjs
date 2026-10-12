// Original, locally generated combat cues. Audio begins only after the user's start click.
const PREF_KEY='jojo.shattered.audio.v1';
const FILES={
  'dash-whoosh':'dash-whoosh.ogg','punch-light':'punch-light.ogg','punch-heavy':'punch-heavy.ogg',
  'stone-steps':'stone-steps.ogg','enemy-telegraph':'enemy-telegraph.ogg','enemy-hit':'enemy-hit.ogg',
  'time-stop':'time-stop.ogg','time-resume':'time-resume.ogg','stand-summon':'stand-summon.ogg',
  'chrono-echo':'chrono-echo.ogg','district-ambience':'district-ambience.ogg','combat-music':'combat-music.ogg'
};
const defaults={master:.75,music:.24,ambience:.35,effects:.68,muted:false};
export function createCombatAudio(){
  let context=null,buffers=new Map(),ready=null,active=false,musicSource=null,ambienceSource=null;
  let master=null,music=null,ambience=null,effects=null;
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
    if(context.state==='suspended')context.resume();
    apply();
    return true;
  }
  async function load(){
    if(ready)return ready;
    ready=(async()=>{
      const entries=Object.entries(FILES);
      await Promise.all(entries.map(async([name,file])=>{
        try{
          const response=await fetch(new URL('../../assets/combat-audio/'+file,import.meta.url));
          if(!response.ok)throw Error('Audio asset '+file+' returned '+response.status);
          buffers.set(name,await context.decodeAudioData(await response.arrayBuffer()));
        }catch(error){console.warn('Combat audio asset unavailable:',file,error);}
      }));
      return buffers.size;
    })();
    return ready;
  }
  function startLoop(name,target){
    if(!context||!buffers.has(name))return null;
    const source=context.createBufferSource();source.buffer=buffers.get(name);source.loop=true;
    source.connect(target);source.start();return source;
  }
  async function start(){
    if(!ensure())return false;
    active=true;apply();
    await context.resume();await load();
    if(!musicSource)musicSource=startLoop('combat-music',music);
    if(!ambienceSource)ambienceSource=startLoop('district-ambience',ambience);
    return buffers.size>0;
  }
  function setActive(value){active=Boolean(value);apply();}
  function play(name,volume=1,pan=0){
    if(!active||prefs.muted||!ensure())return false;
    const emit=()=>{
      const buffer=buffers.get(name);if(!buffer||!active||prefs.muted)return false;
      const source=context.createBufferSource();source.buffer=buffer;
      const gain=context.createGain();gain.gain.value=clamp(volume);
      source.connect(gain);
      if(context.createStereoPanner){const panner=context.createStereoPanner();panner.pan.value=Math.max(-1,Math.min(1,pan));gain.connect(panner);panner.connect(effects)}else gain.connect(effects);
      source.start();return true;
    };
    if(buffers.has(name))return emit();
    load().then(emit);return true;
  }
  function persist(){try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}catch{}apply()}
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
  return {start,play,setActive,preferences:()=>({...prefs}),snapshot:()=>({ready:buffers.size,muted:prefs.muted,active})};
}
