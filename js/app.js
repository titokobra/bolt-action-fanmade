const $ = s => document.querySelector(s);
const view = $('#view');
const initialState = () => ({screen:'home',p1:'',p2:'',d1:8,d2:8,round:1,remaining1:8,remaining2:8,bag:[],drawn:[],last:null,mode:'',winner:null,active:false,removeDieOpen:false,flankingEnabled:false,flankChoices:{p1:null,p2:null},flankRevealed:{p1:false,p2:false},flankStep:1,flankModal:false,flankSelected:null,flankPendingChoice:null,timerStartedAt:null,timerStoppedAt:null,roundStart1:8,roundStart2:8,countLimitNotice:''});
let state = JSON.parse(localStorage.getItem('ba_state') || 'null') || initialState();
// Historial de navegación de la aplicación
let lastRenderedScreen = state.screen;
let appHistoryDepth = 0;

history.replaceState({
  boltAction: true,
  screen: state.screen
}, '');
// Compatibilidad con partidas guardadas en versiones anteriores.
if (state.round == null) state.round = state.turn || 1;
delete state.turn;
// Restaurar exactamente la pantalla y la posición guardadas, también en reglas y escenarios.
if (state.scrollY == null) state.scrollY = 0;
if (state.timerStartedAt === undefined) state.timerStartedAt = null;
if (state.timerStoppedAt === undefined) state.timerStoppedAt = null;
if (state.roundStart1 === undefined) state.roundStart1 = state.d1 || 8;
if (state.roundStart2 === undefined) state.roundStart2 = state.d2 || 8;
if (state.countLimitNotice === undefined) state.countLimitNotice = '';
function save(){try{localStorage.setItem('ba_state',JSON.stringify(state))}catch(e){console.warn('No se pudo guardar el estado de la partida',e)}}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function btn(label,fn,cls=''){return `<button class="${cls}" data-action="${fn}">${label}</button>`}
function backButton(){return `<nav class="nav-stack" aria-label="Navegación"><button class="nav-button" data-action="back" aria-label="Volver"><span class="nav-icon">←</span><span>VOLVER</span></button><button class="nav-button" data-action="go-home" aria-label="Inicio"><span class="nav-icon">⌂</span><span>INICIO</span></button></nav>`}
function formatClock(ms){
 const total=Math.max(0,Math.floor(ms/1000));
 const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),sec=total%60;
 return [h,m,sec].map(v=>String(v).padStart(2,'0')).join(':');
}
function updateGlobalClock(){
 const box=$('#globalClock'),value=$('#clockValue');
 if(!box||!value)return;

 const endTime = state.timerStoppedAt
  ? Number(state.timerStoppedAt)
  : Date.now();

 const elapsed = state.timerStartedAt
  ? endTime - Number(state.timerStartedAt)
  : 0;

 value.textContent=formatClock(elapsed);

 box.classList.toggle('warning',elapsed>=105*60*1000&&elapsed<135*60*1000);
 box.classList.toggle('danger',elapsed>=135*60*1000);
}
function render(){

  if(state.screen !== lastRenderedScreen){
    history.pushState({
      boltAction: true,
      screen: state.screen
    }, '');

    appHistoryDepth++;
    lastRenderedScreen = state.screen;
  }

  updateGlobalClock();
  save();
  document.body.dataset.screen = state.screen;
  if(state.screen==='home') return home();
  if(state.screen==='rules-menu') return rulesMenu();
  if(state.screen==='factions') return factions();
  if(state.screen==='faction-detail') return factionDetail();
  if(state.screen==='rules-list') return rulesList();
  if(state.screen==='rules-detail') return rulesDetail();
  if(state.screen==='deployment-menu') return deploymentMenu();
  if(state.screen==='deployment-detail') return deploymentDetail();
  if(state.screen==='scenario-groups') return groups();
  if(state.screen==='base-scenario-list') return baseScenarioList();
  if(state.screen==='base-scenario-detail') return baseScenarioDetail();
  if(state.screen==='scenario-list') return scenarioList();
  if(state.screen==='scenario-detail') return scenarioDetail();
  if(state.screen==='setup') return setup();

  if(state.screen==='generating') return generating();
  if(state.screen==='round-title') return roundTitle();
  if(state.screen==='draw') return draw();
  if(state.screen==='round-finished') return roundFinished();
  if(state.screen==='count') return countScreen();
  if(state.screen==='finish-choice') return finishChoice();
  if(state.screen==='winner') return winner();
}
function home(){
 view.innerHTML=`<section class="panel home-panel"><div class="menu-grid">
 <button class="menu-button" data-action="start">COMENZAR PARTIDA</button>
 <button class="menu-button" data-action="reset">REINICIAR PARTIDA</button>
 <button class="menu-button" data-action="scenario-groups">ELECCIÓN DE ESCENARIOS</button>
 <button class="menu-button" data-action="deployment-menu">TIPO DE DESPLIEGUE</button>
 <button class="menu-button" data-action="rules-menu">REGLAS</button>
 </div>${state.active?`<div class="home-actions">${btn('CONTINUAR PARTIDA','resume')}</div>`:''}</section>`;
}
function factions(){
 const names=Object.keys(factionRules);
 view.innerHTML=`<section class="panel faction-index"><h2>REGLAS DE FACCIONES</h2><div class="scenario-list">${names.map(name=>`<button data-faction="${esc(name)}">${esc(name)}</button>`).join('')}</div></section>${backButton()}`;
}
function factionDetail(){
 const name=state.factionName, rules=factionRules[name]||[];
 const cards=rules.map(rule=>{
   if(rule.national){
     const opts=rule.options.map(option=>`<article class="faction-card"><div class="faction-card-title"><strong>${esc(option.title)}</strong><em>(solamente se puede elegir una para toda la partida)</em></div><div class="faction-card-text">${esc(option.text)}</div></article>`).join('');
     return `<section class="faction-national"><h3>${esc(rule.title)}</h3><p>${esc(rule.text)}</p></section>${opts}`;
   }
   return `<article class="faction-card"><div class="faction-card-title"><strong>${esc(rule.title)}</strong></div><div class="faction-card-text">${esc(rule.text)}</div></article>`;
 }).join('');
 view.innerHTML=`<section class="panel faction-page"><div class="faction-page-heading"><span>REGLAS DE FACCIONES</span><h2>${esc(name)}</h2><small>REGLAS ESPECIALES DEL EJÉRCITO</small></div><div class="faction-rules">${cards}</div></section>${backButton()}`;
}
function rulesMenu(){view.innerHTML=`<section class="panel"><h2>REGLAS</h2><div class="menu-grid">
 <button class="menu-button rule-menu-button" data-action="factions"><span class="rule-menu-label">REGLAS DE FACCIONES</span></button>
 <button class="menu-button rule-menu-button" data-rule-category="REGLAS DE ARMAS"><span class="rule-menu-label">REGLAS DE ARMAS</span></button>
 <button class="menu-button rule-menu-button" data-rule-category="REGLAS DE UNIDADES"><span class="rule-menu-label">REGLAS DE UNIDADES</span></button>
 <button class="menu-button rule-menu-button" data-rule-category="REGLAS DE VEHÍCULOS"><span class="rule-menu-label">REGLAS DE VEHÍCULOS</span></button>
 </div></section>${backButton()}`}
function rulesList(){const cat=state.ruleCategory;const entries=Object.entries(specialRules[cat]||{}).sort((a,b)=>a[0].localeCompare(b[0],'es'));view.innerHTML=`<section class="panel"><h2>${esc(cat)}</h2><div class="scenario-list">${entries.map(([name])=>`<button data-rule-name="${esc(name)}">${esc(name)}</button>`).join('')}</div></section>${backButton()}`}
function rulesDetail(){const cat=state.ruleCategory,name=state.ruleName,body=specialRules[cat]?.[name]||'';view.innerHTML=`<section class="panel"><h2>${esc(name)}</h2><div class="scenario-content">${esc(body)}</div></section>${backButton()}`}

function deploymentMenu(){
 view.innerHTML=`<section class="panel"><h2>TIPO DE DESPLIEGUE</h2><p class="deployment-roll-prompt">TIRAR UN DADO D6</p><div class="deployment-options">
 <button class="menu-button" data-deployment="1-3"><strong>1-3: ENCUENTRO COMPROMETIDO</strong></button>
 <button class="menu-button" data-deployment="4-5"><strong>4-5: POSICIONES PREPARADAS</strong></button>
 <button class="menu-button" data-deployment="6"><strong>6: NIEBLA DE GUERRA</strong></button>
 </div></section>${backButton()}`;
}
function deploymentDetail(){
 const key=state.deploymentType;
 const titles={'1-3':'1-3: ENCUENTRO COMPROMETIDO','4-5':'4-5: POSICIONES PREPARADAS','6':'6: NIEBLA DE GUERRA'};
 view.innerHTML=`<section class="panel"><article class="deployment-rule-card"><h2>${titles[key]||'TIPO DE DESPLIEGUE'}</h2><div class="scenario-content">${esc(deploymentRules[key]||'')}</div></article></section>${backButton()}`;
}

function groups(){view.innerHTML=`<section class="panel"><h2>ELECCIÓN DE ESCENARIOS</h2><div class="menu-grid">${Object.keys(scenarioGroups).map(g=>`<button class="menu-button" data-group="${esc(g)}">${g}</button>`).join('')}</div></section>${backButton()}`}

function baseScenarioList(){view.innerHTML=`<section class="panel"><h2>ESCENARIOS JUEGO BASE</h2><p class="deployment-roll-prompt">TIRAR UN DADO D6</p><div class="scenario-list">${baseScenarioNames.map((name,i)=>`<button data-base-scenario="${i+1}">${i+1}. ${name}</button>`).join('')}</div></section>${backButton()}`}
function baseScenarioDetail(){
 const n = Number(state.baseScenario);
 const name = baseScenarioNames[n-1] || 'ESCENARIO';
 const text = baseScenarioTexts[n-1] || 'Texto pendiente de incorporar.';

 view.innerHTML = `
 <section class="panel">
   <article class="deployment-rule-card">
     <h2>${n}. ${esc(name)}</h2>
     <div class="scenario-content">${esc(text)}</div>
   </article>
 </section>
 ${backButton()}`;
}
function scenarioList(){let g=state.group;view.innerHTML=`<section class="panel"><h2>${esc(g)}</h2><div class="scenario-list">${scenarioGroups[g].map(s=>`<button data-scenario="${s[0]}">${s[0].padStart(2,'0')}. ${esc(s[1])}</button>`).join('')}</div></section>${backButton()}`}
function scenarioDetail(){let s=scenarioGroups[state.group].find(x=>x[0]===state.scenario);view.innerHTML=`<section class="panel"><h2>${esc(s[0])}. ${esc(s[1])}</h2><div class="scenario-content">${esc(s[2])}</div></section>${backButton()}`}
function setup(){
 const name1=state.p1==='Jugador 1'?'':state.p1;
 const name2=state.p2==='Jugador 2'?'':state.p2;

 view.innerHTML=`
 <section class="panel setup-panel">
   <h2>CONFIGURAR PARTIDA</h2>

   <div class="field">
     <label>Nombre del jugador 1</label>
     <input
       class="setup-name-input"
       id="p1"
       type="text"
       placeholder="Escribe tu nombre"
       value="${esc(name1)}"
     >
   </div>

   <div class="field">
     <label>Nombre del jugador 2</label>
     <input
       class="setup-name-input"
       id="p2"
       type="text"
       placeholder="Escribe tu nombre"
       value="${esc(name2)}"
     >
   </div>

   <div class="field dice-setup-field">
     <label>Dados iniciales de jugador 1</label>
     <div class="initial-dice-control">
       <button type="button" data-dice-adjust="d1" data-delta="-1">−</button>
       <strong>${state.d1}</strong>
       <button type="button" data-dice-adjust="d1" data-delta="1">+</button>
     </div>
   </div>

   <div class="field dice-setup-field">
     <label>Dados iniciales de jugador 2</label>
     <div class="initial-dice-control">
       <button type="button" data-dice-adjust="d2" data-delta="-1">−</button>
       <strong>${state.d2}</strong>
       <button type="button" data-dice-adjust="d2" data-delta="1">+</button>
     </div>
   </div>

   <div class="choice-row">
     ${btn('CONTINUAR','begin')}
   </div>
 </section>
 ${backButton()}`;
}
function flankingAsk(){view.innerHTML=`<section class="panel"><h2>REGLAS DE FLANQUEO</h2><p>¿Se utilizarán las reglas de flanqueo en esta partida?</p><div class="choice-row">${btn('SÍ, UTILIZAR FLANQUEO','flanking-yes')}${btn('NO, SIN FLANQUEO','flanking-no')}</div></section>${backButton()}`}
function flankingChoose(){const who=state.flankStep===1?'p1':'p2',name=who==='p1'?state.p1:state.p2,chosenText=state.flankPendingChoice?`<div class="flank-choice-confirmation">${esc(name)} eligió el flanqueo por la ${state.flankPendingChoice==='left'?'izquierda':'derecha'}.</div>`:'';view.innerHTML=`<section class="panel"><h2>ELECCIÓN DE FLANQUEO</h2><p><strong>${esc(name)}</strong></p><p>¿Por qué lado quieres realizar el flanqueo?</p><div class="flank-choice-grid"><button class="flank-choice ${state.flankPendingChoice==='left'?'selected':''}" data-action="choose-left"><span class="flank-arrow">←</span><span>Por tu izquierda</span></button><button class="flank-choice ${state.flankPendingChoice==='right'?'selected':''}" data-action="choose-right"><span class="flank-arrow">→</span><span>Por tu derecha</span></button></div>${chosenText}<div class="notice">Tu elección será privada y no se mostrará al otro jugador.</div><div class="choice-row">${btn('SIGUIENTE','confirm-flank-choice',state.flankPendingChoice?'':'')} </div></section>`}
function flankingRevealModal(){if(!state.flankModal)return '';if(!state.flankSelected)return `<div class="remove-modal" role="dialog" aria-modal="true"><div class="remove-modal-card"><h2>¿Qué jugador quiere revelar su flanqueo?</h2><div class="remove-modal-choices">${!state.flankRevealed.p1?btn(esc(state.p1),'select-flank-p1'):''}${!state.flankRevealed.p2?btn(esc(state.p2),'select-flank-p2'):''}${btn('CANCELAR','cancel-flank')}</div></div></div>`;const name=state.flankSelected==='p1'?state.p1:state.p2;return `<div class="remove-modal" role="dialog" aria-modal="true"><div class="remove-modal-card"><h2>CONFIRMAR REVELACIÓN</h2><p>¿Estás seguro de que quieres revelar el flanqueo de ${esc(name)}?</p><p class="muted">La elección solo se mostrará si pulsas CONFIRMAR.</p><div class="remove-modal-choices">${btn('CONFIRMAR','confirm-flank-reveal')}${btn('CANCELAR','cancel-flank')}</div></div></div>`}
function generating(){view.innerHTML=`<section class="panel" style="text-align:center;padding:60px 20px"><h2>GENERANDO DADOS ALEATORIOS</h2><p class="muted">Preparando la bolsa de dados…</p></section>`;setTimeout(()=>{if(state.screen==='generating'){state.screen='round-title';render()}},900)}
function roundTitle(){view.innerHTML=`<section class="panel"><div class="turn-title">RONDA ${state.round}</div><div style="text-align:center">${btn('COMENZAR RONDA','start-round')}</div></section>${backButton()}`}
function draw(){
 // Estos contadores reflejan los dados que quedan realmente dentro de la bolsa de esta ronda.
 const n1=state.bag.filter(x=>x==='p1').length,n2=state.bag.filter(x=>x==='p2').length;
 view.innerHTML=`<section class="panel"><div class="dice-counters"><div class="counter">${esc(state.p1)}<strong>${n1}</strong><small class="muted">dados en la bolsa</small></div>
 <div class="counter player-2-counter">${esc(state.p2)}<strong>${n2}</strong><small class="muted">dados en la bolsa</small></div></div>
 <div class="draw-area" id="drawArea" style="background:${state.last==='p1'?'var(--green)':state.last==='p2'?'var(--red)':'#272a22'}"><div class="player-name">${state.last?esc(state.last==='p1'?state.p1:state.p2):'¿QUIÉN ACTÚA?'}</div><div class="curtain ${state.reveal?'lift':''}" id="curtain"></div></div>
 <div class="extracted-summary" aria-live="polite">${state.resumeNotice&&state.last?`<div class="resume-notice ${state.last==='p1'?'player-1':'player-2'}"><span>LE TOCABA A</span><strong>${state.last==='p1'?'JUGADOR 1':'JUGADOR 2'}</strong></div>`:''}${state.drawn.length===0?'<strong>Todavía no se ha extraído ningún dado</strong>':`<strong>Dados extraídos: ${state.drawn.length} · Al agotarse la bolsa, termina la ronda.</strong>`}</div>
 <div class="draw-actions">${state.bag.length?btn('SIGUIENTE DADO','next-die'):btn('FIN DE RONDA','end-round')}</div>
 <div class="dice-remove-action">${state.bag.length?btn('ELIMINAR DADO','open-remove-die'):''}</div>
</section>
 ${state.removeDieOpen?`<div class="remove-modal" role="dialog" aria-modal="true" aria-labelledby="removeDieTitle"><div class="remove-modal-card"><h2 id="removeDieTitle">¿A qué jugador quieres eliminar un dado?</h2><div class="remove-modal-choices">${btn(esc(state.p1),'remove-p1','') .replace('<button ','<button '+(state.bag.includes('p1')?'':'disabled '))}${btn(esc(state.p2),'remove-p2','').replace('<button ','<button '+(state.bag.includes('p2')?'':'disabled '))}${btn('CANCELAR','cancel-remove-die','cancel-remove')}</div><p class="remove-help">El dado se resta inmediatamente de la bolsa de esta ronda y del contador visible. No modifica el recuento que se utilizará para preparar la siguiente ronda.</p></div></div>`:''}${flankingRevealModal()}${backButton()}`;
}
function countScreen(){view.innerHTML=`<section class="panel"><h2>DADOS PARA LA SIGUIENTE RONDA</h2><p class="count-instruction">Indica cuántos dados tendrá cada jugador en la próxima ronda. No puedes superar los dados que tenía al comenzar esta ronda.</p>
 ${adjustRow('p1',state.p1,state.remaining1)}<small class="muted">Máximo de ${esc(state.p1)}: ${state.roundStart1}</small>${adjustRow('p2',state.p2,state.remaining2)}<small class="muted">Máximo de ${esc(state.p2)}: ${state.roundStart2}</small>${state.countLimitNotice?`<p class="notice" role="alert">${esc(state.countLimitNotice)}</p>`:''}
 <div class="choice-row">${btn('CONFIRMAR Y CONTINUAR','confirm-count')}</div></section>${backButton()}`}
function adjustRow(id,name,val){return `<div class="player-adjust"><button data-adjust="${id}" data-delta="-1" aria-label="Restar">−</button><div><div class="pname">${esc(name)}</div><div class="count">${val}</div></div><button data-adjust="${id}" data-delta="1" aria-label="Sumar">+</button></div>`}
function finishChoice(){view.innerHTML=`<section class="panel"><h2>FINAL DE LA RONDA 6</h2><p>¿Quieres terminar la partida o jugar una séptima ronda?</p><div class="choice-row">${btn('FIN DE PARTIDA','end-match')}${btn('RONDA 7','round-seven')}</div></section>${backButton()}`}
function winner(){
 view.innerHTML=`
 <section class="panel" style="text-align:center">
  <h2>PARTIDA FINALIZADA</h2>

  <div id="globalClock" aria-live="off"
   style="position:static;display:flex;flex-direction:column;align-items:center;margin:20px auto;width:max-content;max-width:100%;">
   <span class="clock-label">DURACIÓN TOTAL DE LA PARTIDA</span>
   <span class="clock-value" id="clockValue">00:00:00</span>
  </div>

  <p>Selecciona el resultado:</p>

  <div class="choice-row" style="justify-content:center">
   ${btn(esc(state.p1),'win-p1')}
   ${btn(esc(state.p2),'win-p2')}
   ${btn('EMPATE','win-draw')}
  </div>

  ${state.winner?`<h3>RESULTADO: ${esc(state.winner)}</h3>`:''}

  <div class="choice-row" style="justify-content:center">
   ${btn('VOLVER','home-finished')}
  </div>
 </section>`;

 updateGlobalClock();
}
function roundFinished(){view.innerHTML=`<section class="panel"><div class="round-finish-area"><div class="round-finish-title">RONDA ${state.round} FINALIZADA</div><div class="curtain" id="finishCurtain"></div></div><div class="draw-actions">${btn('CONTINUAR','continue-round')}</div></section>`;requestAnimationFrame(()=>{const c=$('#finishCurtain');if(c)c.classList.add('lift')})}
function newBag(){state.roundStart1=state.remaining1;state.roundStart2=state.remaining2;state.countLimitNotice='';state.bag=[];for(let i=0;i<state.remaining1;i++)state.bag.push('p1');for(let i=0;i<state.remaining2;i++)state.bag.push('p2');state.bag.sort(()=>Math.random()-.5);state.drawn=[];state.last=null;state.reveal=false;state.removeDieOpen=false}
function begin(){state.timerStartedAt=Date.now();
state.timerStoppedAt=null;state.p1=$('#p1').value.trim()||'Jugador 1';state.p2=$('#p2').value.trim()||'Jugador 2';state.d1=clamp(state.d1,1,18);
state.d2=clamp(state.d2,1,18);state.remaining1=state.d1;state.remaining2=state.d2;state.roundStart1=state.d1;state.roundStart2=state.d2;state.countLimitNotice='';state.round=1;state.winner=null;state.active=true;state.bag=[];state.drawn=[];state.removeDieOpen=false;state.flankingEnabled=false;state.flankChoices={p1:null,p2:null};state.flankRevealed={p1:false,p2:false};state.flankStep=1;state.flankModal=false;state.flankSelected=null;state.flankPendingChoice=null;state.screen='generating';render()}
function clamp(v,a,b){return Math.max(a,Math.min(b,Number.isFinite(v)?v:a))}
function startRound(){newBag();state.screen='draw';render()}
function nextDie(){
 if(!state.bag.length)return;
 state.resumeNotice=false;
 const curtain=$('#curtain');if(curtain){curtain.classList.remove('lift');curtain.style.transform='translateY(0)'}
 save();
 setTimeout(()=>{
  if(state.screen!=='draw'||!state.bag.length)return;
  const who=state.bag.shift();state.drawn.push(who);if(who==='p1')state.remaining1--;else state.remaining2--;
  state.last=who;save();render();
  const c=$('#curtain');if(c)requestAnimationFrame(()=>c.classList.add('lift'));
 },120);
}
function endRound(){if(state.bag.length)return;state.screen='round-finished';render()}
function continueRound(){
 if(state.round===7){
  state.timerStoppedAt=Date.now();
  state.screen='winner';
 }else{
  state.remaining1=0;
  state.remaining2=0;
  state.screen='count';
 }
 render();
}
function confirmCount(){if(state.round===6){state.screen='finish-choice'}else{state.round++;state.screen='round-title'}render()}
function resetMatch(){const modal=$('#resetConfirmModal');if(modal)modal.classList.add('open')}
function closeResetModal(){const modal=$('#resetConfirmModal');if(modal)modal.classList.remove('open')}
function confirmResetMatch(){closeResetModal();localStorage.removeItem('ba_state');state=initialState();render();updateGlobalClock() }
function resetFinished(){
 state.screen='home';
 state.screenBeforePause=null;
 state.timerStartedAt=null;
 state.timerStoppedAt=null;
 render();
}
view.addEventListener('input',e=>{
 const el=e.target;
 if(el.id==='p1'){state.p1=el.value;save()}
 else if(el.id==='p2'){state.p2=el.value;save()}
 else if(el.id==='d1'){state.d1=clamp(+el.value,1,18);save()}
 else if(el.id==='d2'){state.d2=clamp(+el.value,1,18);save()}
});
window.addEventListener('popstate',e=>{

  if(!e.state || !e.state.boltAction) return;

  appHistoryDepth = Math.max(0,appHistoryDepth-1);

  state.screen = e.state.screen;
  lastRenderedScreen = state.screen;

  render();

});
window.addEventListener('scroll',()=>{state.scrollY=window.scrollY;save()},{passive:true});
window.addEventListener('pagehide',()=>{state.scrollY=window.scrollY;save()});
window.addEventListener('beforeunload',()=>{state.scrollY=window.scrollY;save()});
document.getElementById('resetConfirmModal').addEventListener('click',e=>{
 const choice=e.target.closest('[data-reset-choice]');
 if(!choice){if(e.target.id==='resetConfirmModal')closeResetModal();return;}
 if(choice.dataset.resetChoice==='yes')confirmResetMatch();else closeResetModal();
});
view.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 const a=b.dataset.action;
 if(a==='start'){state.screen='setup';render()}
 else if(a==='scenario-groups'){state.screen='scenario-groups';render()}
 else if(a==='deployment-menu'){state.screen='deployment-menu';render()}
 else if(a==='rules-menu'){state.screen='rules-menu';render()}
 else if(a==='factions'){state.screen='factions';render()}
 else if(a==='resume'){state.screen=state.screenBeforePause||(state.bag&&state.bag.length?'draw':'round-title');state.resumeNotice=true;render()}
 else if(a==='go-home'){if(['draw','round-title','round-finished','count','finish-choice','winner'].includes(state.screen))state.screenBeforePause=state.screen;state.screen='home';render()}
 else if(a==='reset')resetMatch()
  else if(a==='back'){
  if(appHistoryDepth > 0){
    history.back();
  }else if(state.screen !== 'home'){
    state.screen = 'home';
    render();
  }
}
else if(a==='begin'){
  begin();
}
else if(b.dataset.diceAdjust){
  const key=b.dataset.diceAdjust;
  const delta=Number(b.dataset.delta);
  state[key]=clamp(state[key]+delta,1,18);
  render();
}
 else if(a==='flanking-yes'){state.flankingEnabled=true;state.flankStep=1;state.screen='flanking-choose';render()}
 else if(a==='flanking-no'){state.flankingEnabled=false;state.screen='generating';render()}
 else if(a==='choose-left'||a==='choose-right'){state.flankPendingChoice=a==='choose-left'?'left':'right';render()}
 else if(a==='confirm-flank-choice'){if(!state.flankPendingChoice)return;const who=state.flankStep===1?'p1':'p2';state.flankChoices[who]=state.flankPendingChoice;state.flankPendingChoice=null;if(state.flankStep===1){state.flankStep=2;render()}else{state.screen='generating';render()}}
 else if(a==='open-flank-reveal'){state.flankModal=true;state.flankSelected=null;render()}
 else if(a==='select-flank-p1'||a==='select-flank-p2'){state.flankSelected=a.endsWith('p1')?'p1':'p2';render()}
 else if(a==='confirm-flank-reveal'){if(state.flankSelected&&state.flankChoices[state.flankSelected])state.flankRevealed[state.flankSelected]=true;state.flankModal=false;state.flankSelected=null;render()}
 else if(a==='cancel-flank'){state.flankModal=false;state.flankSelected=null;render()}
 else if(a==='start-round')startRound()
 else if(a==='next-die')nextDie()
 else if(a==='open-remove-die'){state.removeDieOpen=true;render()}
 else if(a==='cancel-remove-die'){state.removeDieOpen=false;render()}
 else if(a==='remove-p1'||a==='remove-p2'){
  const who=a==='remove-p1'?'p1':'p2';
  const index=state.bag.indexOf(who);
  if(index!==-1){state.bag.splice(index,1);state.removeDieOpen=false;save();render()}
 }
 else if(a==='end-round')endRound()
 else if(a==='continue-round')continueRound()
 else if(a==='confirm-count')confirmCount()
else if(a==='end-match'){
 state.timerStoppedAt=Date.now();
 state.screen='winner';
 render();
}
 else if(a==='round-seven'){state.round=7;state.screen='round-title';render()}
 else if(a==='win-p1'){state.winner=state.p1;render()}
 else if(a==='win-p2'){state.winner=state.p2;render()}
 else if(a==='win-draw'){state.winner='EMPATE';render()}
 else if(a==='home-finished')resetFinished()
 else if(b.dataset.faction){state.factionName=b.dataset.faction;state.screen='faction-detail';render()}
 else if(b.dataset.ruleCategory){state.ruleCategory=b.dataset.ruleCategory;state.screen='rules-list';render()}
 else if(b.dataset.ruleName){state.ruleName=b.dataset.ruleName;state.screen='rules-detail';render()}
 else if(b.dataset.deployment){state.deploymentType=b.dataset.deployment;state.screen='deployment-detail';render()}
 else if(b.dataset.group){state.group=b.dataset.group;if(b.dataset.group==='ESCENARIOS JUEGO BASE')state.screen='base-scenario-list';else state.screen='scenario-list';render()}
 else if(b.dataset.baseScenario){state.baseScenario=b.dataset.baseScenario;state.screen='base-scenario-detail';render()}
 else if(b.dataset.scenario){state.scenario=b.dataset.scenario;state.screen='scenario-detail';render()}
 else if(b.dataset.adjust){const player=b.dataset.adjust, key=player==='p1'?'remaining1':'remaining2',limit=player==='p1'?state.roundStart1:state.roundStart2,next=state[key]+Number(b.dataset.delta);if(next>limit){state.countLimitNotice='NO PUEDES ELEGIR MAS DADOS QUE TU ANTERIOR RONDA';}else{state[key]=clamp(next,0,limit);state.countLimitNotice='';}render()}
});
render();
updateGlobalClock();
setInterval(updateGlobalClock,250);
requestAnimationFrame(()=>{if(Number.isFinite(state.scrollY)&&state.scrollY>0)window.scrollTo(0,state.scrollY)});

