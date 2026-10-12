import {UPGRADES,applyUpgrade} from './rules.mjs?v=1.6.2';
// One choice per defeated wave. All simulation and one-shots stop during selection.
export function createUpgradeMenu(state,{clearInput,onOpen,onChoose}) {
  const overlay=document.getElementById('upgrade');
  const choices=document.getElementById('upgrade-choices');
  const title=document.getElementById('upgrade-wave');
  function choose(id){
    if(!state.upgradePending || !applyUpgrade(state,id))return;
    state.upgradePending=false;overlay.hidden=true;clearInput();onChoose(id);
  }
  choices.replaceChildren(...UPGRADES.map((item,index)=>{
    const button=document.createElement('button');button.type='button';button.dataset.upgrade=item.id;
    const name=document.createElement('strong');name.textContent=(index+1)+' · '+item.title;
    const description=document.createElement('span');description.textContent=item.description;
    button.append(name,description);button.addEventListener('click',()=>choose(item.id));return button;
  }));
  window.addEventListener('keydown',event=>{
    if(!state.upgradePending)return;
    if(/^Digit[123]$/.test(event.code)&&!event.repeat){event.preventDefault();choose(UPGRADES[Number(event.code.slice(-1))-1].id);}
  });
  return {
    open(){state.upgradePending=true;state.running=false;clearInput();title.textContent='WAVE '+(state.wave-1)+' COMPLETE';overlay.hidden=false;onOpen();choices.firstElementChild.focus();},
    reset(){state.upgradePending=false;overlay.hidden=true;}
  };
}
