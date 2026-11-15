import { AED_LOCATIONS, AED_STEPS, TASKS, SIMULATED_RESPONDERS, getPracticeRate } from '/shared/engine.js';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const params = new URLSearchParams(location.search);
const sessionId = (params.get('session') || crypto.randomUUID().slice(0, 8)).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 48);
if (!params.has('session')) history.replaceState(null, '', '?session=' + sessionId);
const participantId = sessionStorage.getItem('secondChanceId') || crypto.randomUUID().slice(0, 12);
sessionStorage.setItem('secondChanceId', participantId);
const participantName = sessionStorage.getItem('secondChanceName') || 'Rescuer ' + participantId.slice(0, 4).toUpperCase();
sessionStorage.setItem('secondChanceName', participantName);
let state = null, socket = null, view = 'overview', toastTimer = null, lastAssistantRevision = null, assistantBusy = false;
let lastAssistantQuestion = '', mediaReady = false, recording = null;
const tabs = [['overview','01 OVERVIEW'],['responders','02 RESPONDERS'],['aed','03 AED MAP'],['cpr','04 CPR COACH'],['trainer','05 AED TRAINER'],['team','06 TEAM']];
const responderState = (s, id) => s.responders?.[id] || { status: 'available', taskId: null };
const responderStatus = status => ({ available: 'AVAILABLE', enroute: 'EN ROUTE', onscene: 'ON SCENE' })[status] || 'AVAILABLE';

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3500);
}
function send(type, payload = {}) {
  if (socket?.readyState !== WebSocket.OPEN) return toast('Session offline. Reconnecting…');
  socket.send(JSON.stringify({type:'EVENT', event:{type,payload}}));
}
function connect() {
  socket = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/session?id=' + encodeURIComponent(sessionId));
  socket.onopen = () => {
    $('connection').textContent = 'LIVE SESSION';
    socket.send(JSON.stringify({type:'HELLO', id:participantId, name:participantName}));
  };
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.type === 'SNAPSHOT') { state = message.state; render(); }
    else if (message.type === 'ERROR') toast(message.message);
  };
  socket.onclose = () => { $('connection').textContent = 'OFFLINE · RECONNECTING'; setTimeout(connect, 1500); };
}
function frame(label, right, body, note) {
  return '<span class="hud-corner tl"></span><span class="hud-corner tr"></span><span class="hud-corner bl"></span><span class="hud-corner br"></span>' +
    '<span class="scene-label">' + esc(label) + '</span><span class="scene-right">' + esc(right) + '</span>' + body +
    '<div class="scene-note"><span>TRAINING / SIMULATION</span><span>' + esc(note) + '</span></div>';
}
function mannequin(pads) {
  return '<div class="mannequin" aria-label="Training mannequin illustration"><span class="head"></span><span class="torso"></span><span class="arm left"></span><span class="arm right"></span>' +
    (pads ? '<span class="pad one"></span><span class="pad two"></span><span class="pad-label one">TRAINING PAD</span><span class="pad-label two">TRAINING PAD</span>' : '<span class="target"></span>') + '</div>';
}
function card(kicker, title, description, content, extra = '') {
  return '<section class="panel-card ' + extra + '"><div class="card-kicker">' + kicker + '</div><h2>' + title + '</h2><p>' + description + '</p>' + content + '</section>';
}
function renderWorkflow(s) {
  const steps = [
    ['Activate','Start training response',s.activated],
    ['Assess','Record observations',s.assessment.responsive !== null],
    ['Call','Mock dispatcher',s.call === 'connected'],
    ['Find help','Simulated nearby responders',Object.values(s.responders || {}).some(r => r.status !== 'available')],
    ['Locate AED','Fictional training map',!!s.selectedAed],
    ['Coach CPR','Practice rhythm',s.cpr.started || s.aed.arrived],
    ['AED trainer','Follow device prompts',s.aed.complete]
  ];
  const next = steps.findIndex(step => !step[2]);
  $('workflow').innerHTML = steps.map((step, index) => '<div class="workflow-step ' + (step[2] ? 'done' : index === next ? 'current' : '') + '"><span class="step-index">' + (step[2] ? '✓' : String(index + 1).padStart(2,'0')) + '</span><span><strong>' + step[0] + '</strong><small>' + step[1] + '</small></span></div>').join('');
  $('activity').innerHTML = [...s.events].reverse().slice(0,8).map(event => '<div class="activity-item"><b>' + new Date(event.at).toLocaleTimeString() + ' · ' + esc(event.actor) + '</b>' + esc(event.text) + '</div>').join('') || '<div class="activity-item">Waiting for first action.</div>';
  $('event-count').textContent = String(s.events.length).padStart(2,'0');
}
function renderViewport(s) {
  const selected = AED_LOCATIONS.find(a => a.id === s.selectedAed);
  let title, subtitle, context, content, footer = 'Browser AR simulation · no camera tracking or spatial anchor';
  if (view === 'overview') {
    title = s.activated ? 'Response in motion.' : 'Ready when you are.';
    subtitle = s.activated ? 'Confirm observations, contact the mock dispatcher, and assign the next action.' : 'Activate emergency training mode to begin.';
    context = s.activated ? 'RESPONSE' : 'STANDBY';
    content = frame('SITUATION / DEMO CENTER','VIEW 01','<div class="scene-center"><div class="reticle ' + (s.activated ? '' : 'idle') + '"><strong>+</strong></div><h2>' + (s.activated ? 'Emergency mode active' : 'Ready to practice a response?') + '</h2><p>' + (s.activated ? 'Check responsiveness and normal breathing. The software does not diagnose.' : 'Work through a guided mannequin scenario with simulated equipment.') + '</p>' + (s.activated ? '<span class="scene-pill">RESPONSE STARTED</span>' : '<button class="scene-start" data-action="activate">Start training response <span aria-hidden="true">↗</span></button>') + '</div>' + (s.call === 'connected' ? '<div class="scene-call">● MOCK DISPATCHER CONNECTED<small>No emergency number dialed</small></div>' : ''),'NO LIVE EMERGENCY CALL');
  } else if (view === 'responders') {
    const enroute = SIMULATED_RESPONDERS.filter(r => responderState(s, r.id).status === 'enroute');
    const onscene = SIMULATED_RESPONDERS.filter(r => responderState(s, r.id).status === 'onscene');
    title = onscene.length ? 'Help is on scene.' : enroute.length ? 'Responders are on the way.' : 'Nearby help, in simulation.';
    subtitle = 'Explore a fictional local network, choose a training task, and simulate arrival.';
    context = 'RESPONDERS';
    const routes = enroute.map(r => '<line x1="50" y1="53" x2="' + r.x + '" y2="' + r.y + '"></line>').join('');
    const markers = SIMULATED_RESPONDERS.map((r, index) => {
      const status = responderState(s, r.id).status;
      const x = status === 'onscene' ? 38 + index * 12 : r.x;
      const y = status === 'onscene' ? 41 : r.y;
      return '<button class="responder-pin ' + status + '" style="left:' + x + '%;top:' + y + '%" data-action="focus-responder" data-id="' + r.id + '" aria-label="' + esc(r.name + ', ' + responderStatus(status) + (status === 'available' ? ', ' + r.distance : '')) + '"><span class="pin-icon">' + esc(r.name.split(' ').map(part => part[0]).join('')) + '</span><span class="pin-label"><strong>' + esc(r.name) + '</strong><small>' + esc(status === 'available' ? r.distance + ' · ' + r.etaMinutes + ' min' : responderStatus(status)) + '</small></span></button>';
    }).join('');
    content = frame('RESPONDERS / FICTIONAL NETWORK','3 TRAINING PROFILES',
      '<div class="responder-map"><div class="responder-map-grid" aria-hidden="true"></div><span class="responder-map-caption">DEMO DISTANCES · NO GPS OR LIVE DISPATCH</span><svg class="responder-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + routes + '</svg><div class="responder-origin"><span>+</span><small>SCENE</small></div>' + markers + '<div class="responder-legend"><span><i class="legend-dot available"></i> Available</span><span><i class="legend-dot enroute"></i> En route</span><span><i class="legend-dot onscene"></i> On scene</span></div></div>',
      'ALL PEOPLE, DISTANCES AND ETAS ARE SIMULATED');
  } else if (view === 'aed') {
    title = selected ? 'Guide the AED runner.' : 'Locate a training AED.';
    subtitle = selected ? selected.route : 'Choose one fictional AED trainer location on the demo map.';
    context = 'NAVIGATION';
    const markers = AED_LOCATIONS.map(a => '<button class="map-marker ' + (a.id === s.selectedAed ? 'selected' : '') + '" style="left:' + a.x + '%;top:' + a.y + '%" data-action="select-aed" data-id="' + a.id + '">' + esc(a.name) + '</button>').join('');
    content = frame('AED / FICTIONAL FLOOR PLAN','L1 + L2','<div class="map-scene"><span class="map-caption">DEMO CENTER · NOT A REAL AED REGISTRY</span><span class="map-origin" title="Mannequin"></span>' + markers + '<div class="map-meta"><span>● MANNEQUIN</span><span>' + (selected ? esc(selected.distance + ' · ' + selected.floor) : 'SELECT A LOCATION') + '</span></div></div>','LOCATION AND ACCESS ARE SIMULATED');
  } else if (view === 'cpr') {
    title = s.cpr.active ? 'Keep the rhythm.' : 'CPR training rhythm.';
    subtitle = 'A visual 110 BPM metronome. Practice taps estimate input tempo only.';
    context = 'RHYTHM';
    const rate = getPracticeRate(s.cpr.taps);
    content = frame('CPR / PRACTICE MODE','110 BPM TARGET','<div class="training-scene">' + mannequin(false) + '<div class="training-info"><small>VISUAL RHYTHM</small><strong>110</strong><small>BEATS / MIN</small><div id="beat-indicator" class="beat-indicator">BEAT</div><p>Practice tap rate: ' + (rate ?? '—') + ' BPM<br>No depth or recoil measurement.</p></div></div>','MANNEQUIN ONLY');
  } else if (view === 'trainer') {
    title = s.aed.arrived ? 'Follow the trainer prompts.' : 'Waiting for AED trainer.';
    subtitle = s.aed.arrived && !s.aed.complete ? AED_STEPS[s.aed.step].detail : 'The trainer makes all analysis and shock decisions.';
    context = 'AED TRAINER';
    content = frame('AED / TRAINING DEVICE',s.aed.arrived ? 'STEP ' + (s.aed.step + 1) + ' / ' + AED_STEPS.length : 'AWAITING DEVICE','<div class="training-scene">' + mannequin(true) + '<div class="training-info"><small>TRAINING SEQUENCE</small><strong>' + (s.aed.arrived ? String(s.aed.step + 1).padStart(2,'0') : '—') + '</strong><p>' + esc(s.aed.arrived ? (s.aed.complete ? 'Sequence complete' : AED_STEPS[s.aed.step].title) : 'Select a demo AED and mark the trainer arrived.') + '</p><span class="scene-pill orange">FOLLOW DEVICE PROMPTS</span></div></div>','NO AUTOMATED SHOCK DECISION');
  } else {
    title = 'One coordinated response.';
    subtitle = 'Participants share assignments in real time; departures release unfinished tasks.';
    context = 'TEAM';
    const active = s.participants.filter(p => p.active);
    content = frame('TEAM / SHARED SESSION',active.length + ' CONNECTED','<div class="team-network">' + active.slice(0,4).map(p => '<div class="team-node"><strong>' + esc(p.name) + '</strong><small>' + esc(TASKS.filter(t => s.assignments[t.id] === p.id).map(t => t.role).join(' + ') || 'AVAILABLE') + '</small></div>').join('') + '</div>','LOCAL WEBSOCKET SESSION');
  }
  $('stage-title').textContent = title;
  $('stage-subtitle').textContent = subtitle;
  $('panel-context').textContent = context;
  $('viewport').innerHTML = content;
  $('viewport-footer').innerHTML = '<span><strong>● LIVE TRAINING VIEW</strong> · ' + esc(footer) + '</span><span>RESCUE SPECS / 01</span>';
}
function panelOverview(s) {
  const observed = s.assessment.responsive !== null;
  return card('01 / ACTIVATE','Start a response','Training mode guides a mannequin scenario. It does not diagnose or place calls.',
    s.activated ? '<span class="status-chip good">● Emergency mode active</span>' : '<button class="primary" data-action="activate">Activate emergency mode →</button>','highlight') +
    card('02 / ASSESS','Check and confirm','Record what you observe. The app cannot determine responsiveness or breathing.',
      '<div class="choice-grid"><button class="choice ' + (observed && s.assessment.responsive === false ? 'selected' : '') + '" data-action="assess-critical" ' + (!s.activated ? 'disabled' : '') + '>Unresponsive<br>Not breathing normally</button><button class="choice ' + (observed && s.assessment.responsive === true ? 'selected' : '') + '" data-action="assess-other" ' + (!s.activated ? 'disabled' : '') + '>Responsive or<br>breathing normally</button></div>') +
    card('03 / MOCK CALL','Contact dispatcher','This connects to a fictional dispatcher. It never dials 911.',
      s.call === 'connected' ? '<span class="status-chip good">● Mock dispatcher connected</span>' : '<button class="secondary" data-action="call-request" ' + (!s.activated ? 'disabled' : '') + '>Connect mock dispatcher ↗</button>') +
    card('NEXT / ACTIONS','Keep moving','Calling, AED retrieval, and CPR training can be coordinated in parallel.',
      '<div class="button-row"><button class="secondary" data-view="responders">Nearby responders</button><button class="secondary" data-view="aed">Find AED</button></div>');
}
function panelAed(s) {
  const selected = AED_LOCATIONS.find(a => a.id === s.selectedAed);
  return card('TRAINING MAP','Choose an AED trainer','Fictional Demo Center locations. No real availability or access is verified.',
    AED_LOCATIONS.map(a => '<button class="aed-card ' + (a.id === s.selectedAed ? 'selected' : '') + '" data-action="select-aed" data-id="' + a.id + '" ' + (!s.activated ? 'disabled' : '') + '><span><strong>' + esc(a.name) + '</strong><small>' + esc(a.floor + ' · ' + a.access) + '</small></span><b>' + esc(a.distance) + '</b></button>').join('') +
    (selected ? '<div class="tiny-note">ROUTE · ' + esc(selected.route) + '</div>' : '')) +
    card('DEVICE ARRIVAL','Trainer on scene?','Confirm when a physical AED training device is brought to the mannequin.',
      s.aed.arrived ? '<span class="status-chip good">● Trainer arrived</span>' : '<button class="primary" data-action="trainer-arrived" ' + (!selected ? 'disabled' : '') + '>Mark trainer arrived →</button>');
}
function panelResponders(s) {
  const requested = SIMULATED_RESPONDERS.filter(r => responderState(s, r.id).status !== 'available').length;
  return card('NEARBY / SIMULATED', 'Responder network', 'Three fictional profiles near the demo scene. Requests and arrivals change this training session only.',
    '<div class="responder-summary"><strong>' + SIMULATED_RESPONDERS.length + '</strong><span>shown nearby</span><strong>' + requested + '</strong><span>requested or arrived</span></div>' +
    SIMULATED_RESPONDERS.map(r => {
      const current = responderState(s, r.id);
      const task = TASKS.find(item => item.id === current.taskId);
      return '<div class="responder-card" id="responder-' + r.id + '"><div class="responder-card-head"><span class="responder-avatar">' + esc(r.name.split(' ').map(part => part[0]).join('')) + '</span><span class="responder-name"><strong>' + esc(r.name) + '</strong><small>' + esc(r.role) + '</small></span><span class="responder-status ' + current.status + '">' + responderStatus(current.status) + '</span></div><div class="responder-facts"><span>' + esc(current.status === 'onscene' ? 'At demo scene' : r.distance + ' away') + '</span><span>' + esc(current.status === 'onscene' ? 'Arrival confirmed in simulation' : '~' + r.etaMinutes + ' min demo ETA') + '</span></div>' +
        (current.status === 'available' ? '<label class="field-label" for="task-' + r.id + '">Training task</label><select class="field-select" id="task-' + r.id + '" data-responder-task="' + r.id + '">' + r.skills.map(skill => '<option value="' + skill + '">' + esc(TASKS.find(item => item.id === skill).title) + '</option>').join('') + '</select><button class="primary responder-action" data-action="request-responder" data-id="' + r.id + '" ' + (!s.activated ? 'disabled' : '') + '>Simulate request →</button>' :
          '<div class="responder-task">' + esc(task?.title || 'Training task') + '</div>' + (current.status === 'enroute' ? '<button class="secondary responder-action" data-action="responder-arrive" data-id="' + r.id + '">Simulate arrival →</button>' : '<span class="status-chip good">● On scene in demo</span>')) + '</div>';
    }).join('') + '<div class="tiny-note">This map cannot find, contact, or dispatch real responders. Arrival is manually simulated.</div>');
}
function panelCpr(s) {
  const ready = s.assessment.responsive === false && s.assessment.breathingNormally === false;
  const rate = getPracticeRate(s.cpr.taps);
  return card('CPR / PRACTICE','Hold the rhythm','Visual metronome targets 110 compressions per minute for this adult mannequin scenario.',
    '<div class="stat-row"><div class="stat-box"><strong>110</strong><small>TARGET BPM</small></div><div class="stat-box"><strong>' + (rate ?? '—') + '</strong><small>PRACTICE TAP BPM</small></div></div>' +
    (s.cpr.active ? '<div class="button-row"><button class="primary" data-action="tap">Tap / Space</button><button class="secondary" data-action="stop-cpr">Pause</button></div>' : '<button class="primary" data-action="start-cpr" ' + (!ready ? 'disabled' : '') + '>Start visual rhythm →</button>') +
    '<div class="tiny-note">Practice tap rate measures button timing only. There is no compression sensor, depth, recoil, or clinical feedback.</div>') +
    card('OBSERVATION GATE','Manual confirmation',ready ? 'Unresponsive and not breathing normally was recorded by a person.' : 'Confirm observations in Overview before starting the CPR practice rhythm.',
      '<button class="secondary" data-view="overview">Open assessment</button>');
}
function panelTrainer(s) {
  return card('AED / TRAINING','Follow the trainer','The physical training device gives the operative prompts. This app never decides whether a shock is needed.',
    s.aed.complete ? '<span class="status-chip good">● Training sequence complete</span>' :
      !s.aed.arrived ? '<button class="secondary" data-view="aed">Locate trainer first →</button>' :
      '<div class="card-kicker orange">STEP ' + (s.aed.step + 1) + ' / ' + AED_STEPS.length + '</div><h2>' + esc(AED_STEPS[s.aed.step].title) + '</h2><p>' + esc(AED_STEPS[s.aed.step].detail) + '</p><button class="primary" data-action="aed-next">Confirm step →</button>' +
    '<div class="tiny-note">Only use a mannequin and AED trainer for this demo.</div>','alert');
}
function panelTeam(s) {
  const active = s.participants.filter(p => p.active);
  return card('LIVE COORDINATION','Assign roles','Open the copied session link on another browser or phone to join the same response.',
    TASKS.map(task => '<label class="field-label">' + esc(task.role + ' · ' + task.title) + '</label><select class="field-select" data-task="' + task.id + '" ' + (!s.activated ? 'disabled' : '') + '><option value="">Unassigned</option>' +
      active.map(p => '<option value="' + esc(p.id) + '" ' + (s.assignments[task.id] === p.id ? 'selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select>').join('') +
    '<div class="tiny-note">' + active.length + ' participant(s) connected. Unfinished assignments are released when a participant leaves.</div>') +
    card('DEMO EVENT','Unexpected departure','Close a second participant tab to show its role being released in real time.',
      '<div class="tiny-note">Open the same session link on another browser or phone, then close that participant view.</div>');
}
function render() {
  if (!state) return;
  if (lastAssistantRevision !== null && state.revision !== lastAssistantRevision) {
    $('assistant-mode').textContent = 'STATE UPDATED';
    $('assistant-answer').textContent = 'The response changed. Ask again for an up-to-date answer.';
    lastAssistantRevision = null;
  }
  $('session-code').textContent = state.sessionId.toUpperCase();
  $('view-tabs').innerHTML = tabs.map(item => '<button class="view-tab ' + (view === item[0] ? 'active' : '') + '" data-view="' + item[0] + '">' + item[1] + '</button>').join('');
  renderWorkflow(state);
  renderViewport(state);
  $('panel').innerHTML = view === 'overview' ? panelOverview(state) : view === 'responders' ? panelResponders(state) : view === 'aed' ? panelAed(state) : view === 'cpr' ? panelCpr(state) : view === 'trainer' ? panelTrainer(state) : panelTeam(state);
  $('modal-root').innerHTML = state.call === 'confirming' ? '<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="card-kicker orange">SIMULATION ONLY</div><h2 id="modal-title">Connect mock dispatcher?</h2><p>This connects a fictional training dispatcher in this browser session.</p><div class="modal-warning">No real emergency number will be dialed.</div><div class="button-row"><button class="primary" data-action="call-confirm">Connect simulation</button><button class="secondary" data-action="call-cancel">Cancel</button></div></div></div>' : '';
}
document.addEventListener('click', event => {
  const tab = event.target.closest('[data-view]');
  if (tab) { view = tab.dataset.view; render(); return; }
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === 'activate') send('ACTIVATE');
  if (action === 'assess-critical') send('ASSESS',{responsive:false,breathingNormally:false});
  if (action === 'assess-other') send('ASSESS',{responsive:true,breathingNormally:true});
  if (action === 'call-request') send('CALL_REQUEST');
  if (action === 'call-confirm') send('CALL_CONFIRM');
  if (action === 'call-cancel') send('CALL_CANCEL');
  if (action === 'select-aed') send('AED_SELECT',{id:button.dataset.id});
  if (action === 'focus-responder') document.getElementById('responder-' + button.dataset.id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (action === 'request-responder') send('RESPONDER_REQUEST',{id:button.dataset.id,taskId:document.getElementById('task-' + button.dataset.id)?.value});
  if (action === 'responder-arrive') send('RESPONDER_ARRIVE',{id:button.dataset.id});
  if (action === 'start-cpr') send('CPR_START');
  if (action === 'stop-cpr') send('CPR_STOP');
  if (action === 'tap') send('CPR_TAP',{at:Date.now()});
  if (action === 'trainer-arrived') { send('AED_ARRIVED'); view = 'trainer'; }
  if (action === 'aed-next') send('AED_NEXT');
});
document.addEventListener('change', event => {
  if (event.target.matches('select[data-task]')) send('TASK_ASSIGN',{taskId:event.target.dataset.task,participantId:event.target.value || null});
});
document.addEventListener('keydown', event => {
  if (event.code === 'Space' && state?.cpr.active && !['BUTTON','SELECT','INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
    event.preventDefault(); send('CPR_TAP',{at:Date.now()});
  }
});
$('share-button').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); toast('Session link copied. Open it on another device.'); }
  catch { toast('Copy this URL: ' + location.href); }
};
$('reset-button').onclick = () => { if (confirm('Reset the shared training demo for all participants?')) { view = 'overview'; send('RESET'); } };

async function askAssistant(question) {
  const value = String(question || '').trim();
  if (!value || assistantBusy) return;
  const requestRevision = state?.revision ?? null;
  assistantBusy = true;
  $('assistant-submit').disabled = true;
  $('assistant-mode').textContent = 'CHECKING DEMO STATE';
  $('assistant-answer').textContent = 'Preparing a training-only answer…';
  try {
    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, question: value })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Assistant unavailable.');
    if (requestRevision !== (state?.revision ?? null)) {
      $('assistant-mode').textContent = 'STATE UPDATED';
      $('assistant-answer').textContent = 'The response changed. Ask again for an up-to-date answer.';
      lastAssistantRevision = null;
    } else {
      $('assistant-mode').textContent = result.mode === 'model' ? 'AI PHRASING · DEMO FACTS' : 'LOCAL TRAINING GUIDANCE';
      $('assistant-answer').textContent = result.answer;
      lastAssistantRevision = requestRevision;
      lastAssistantQuestion = value;
      $('assistant-speak').disabled = !mediaReady;
    }
  } catch {
    $('assistant-mode').textContent = 'UNAVAILABLE';
    $('assistant-answer').textContent = 'Use the visible training controls and instructor guidance.';
  } finally {
    assistantBusy = false;
    $('assistant-submit').disabled = false;
  }
}

$('assistant-form').addEventListener('submit', event => {
  event.preventDefault();
  askAssistant($('assistant-question').value);
});
document.querySelectorAll('[data-question]').forEach(button => button.addEventListener('click', () => {
  $('assistant-question').value = button.dataset.question;
  askAssistant(button.dataset.question);
}));

fetch('/api/ai-status').then(response => response.json()).then(result => {
  mediaReady = Boolean(result.enabled);
  $('assistant-status').textContent = mediaReady ? 'OPENAI CONNECTED / TRAINING' : 'LOCAL TRAINING MODE';
  $('assistant-speak').disabled = !mediaReady || !lastAssistantQuestion;
}).catch(() => { $('assistant-status').textContent = 'LOCAL TRAINING MODE'; });

async function transcribeFile(file) {
  if (!mediaReady) return toast('OpenAI is not configured on the server.');
  if (!file || file.size > 2_000_000) return toast('Choose an audio clip under 2 MB.');
  $('assistant-mode').textContent = 'TRANSCRIBING';
  $('assistant-answer').textContent = 'Turning your training question into text…';
  try {
    const response = await fetch('/api/transcribe', { method: 'POST', headers: { 'Content-Type': file.type || 'audio/webm' }, body: file });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Transcription unavailable.');
    $('assistant-question').value = result.text;
    await askAssistant(result.text);
  } catch (error) { toast(error.message); $('assistant-mode').textContent = 'AUDIO UNAVAILABLE'; }
}

$('assistant-audio-upload').onclick = () => $('assistant-audio-input').click();
$('assistant-audio-input').onchange = event => {
  transcribeFile(event.target.files?.[0]);
  event.target.value = '';
};

$('assistant-record').onclick = async () => {
  if (recording) { recording.stop(); return; }
  if (!mediaReady) return toast('OpenAI is not configured on the server.');
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return toast('Microphone recording requires a supported secure browser.');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = ['audio/webm', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks = [];
    recording = recorder;
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => {
      stream.getTracks().forEach(track => track.stop());
      recording = null;
      $('assistant-record').textContent = '● Record question';
      transcribeFile(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
    };
    recorder.start();
    $('assistant-record').textContent = '■ Stop recording';
    setTimeout(() => { if (recording === recorder && recorder.state === 'recording') recorder.stop(); }, 10000);
  } catch { toast('Microphone access unavailable. Use an audio file or type your question.'); }
};

$('assistant-photo').onclick = () => $('assistant-photo-input').click();
$('assistant-photo-input').onchange = async event => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!mediaReady) return toast('OpenAI is not configured on the server.');
  if (!file || file.size > 2_000_000 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return toast('Choose a PNG, JPEG, or WebP under 2 MB.');
  const resultBox = $('assistant-vision-result');
  resultBox.hidden = false;
  resultBox.textContent = 'Checking training equipment…';
  try {
    const image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const response = await fetch('/api/vision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Image analysis unavailable.');
    resultBox.textContent = result.answer;
  } catch (error) { resultBox.textContent = error.message; }
};

$('assistant-speak').onclick = async () => {
  if (!lastAssistantQuestion) return;
  $('assistant-speak').disabled = true;
  try {
    const response = await fetch('/api/speech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, question: lastAssistantQuestion }) });
    if (!response.ok) throw new Error('Voice playback unavailable.');
    const url = URL.createObjectURL(await response.blob());
    const audio = new Audio(url);
    audio.onended = audio.onerror = () => URL.revokeObjectURL(url);
    await audio.play();
  } catch (error) { toast(error.message); }
  finally { $('assistant-speak').disabled = false; }
};
$('voice-button').onclick = () => {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return toast('Voice recognition unavailable. Use manual controls.');
  const recognition = new Recognition();
  recognition.lang = 'en-US';
  recognition.onresult = event => {
    const phrase = event.results[0][0].transcript.toLowerCase();
    if (phrase.includes('emergency mode')) send('ACTIVATE');
    else if (phrase.includes('call 911') || phrase.includes('call emergency')) send('CALL_REQUEST');
    else if (phrase.includes('find') && phrase.includes('aed')) { view = 'aed'; render(); }
    else if (phrase.includes('start cpr')) send('CPR_START');
    else toast('No matching training command: ' + phrase);
  };
  recognition.onerror = () => toast('Voice recognition failed. Use manual controls.');
  recognition.start(); toast('Listening for a training command…');
};
setInterval(() => {
  const start = state?.events.find(e => e.type === 'ACTIVATE');
  const seconds = start ? Math.max(0, Math.floor((Date.now() - new Date(start.at).getTime()) / 1000)) : 0;
  $('elapsed').textContent = String(Math.floor(seconds / 60)).padStart(2,'0') + ':' + String(seconds % 60).padStart(2,'0');
},1000);
setInterval(() => {
  if (!state?.cpr.active || view !== 'cpr') return;
  const indicator = $('beat-indicator');
  if (indicator) { indicator.classList.add('pulse'); setTimeout(() => indicator.classList.remove('pulse'),170); }
},60000/110);
connect();
