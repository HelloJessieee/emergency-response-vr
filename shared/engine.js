export const AED_LOCATIONS = Object.freeze([
  { id: "lobby", name: "Lobby desk", floor: "L1", distance: "42 m", route: "East corridor · turn left at reception", access: "Training device at demo desk", x: 73, y: 34 },
  { id: "gym", name: "Training gym", floor: "L1", distance: "68 m", route: "West corridor · through double doors", access: "Training device in marked cabinet", x: 21, y: 69 },
  { id: "atrium", name: "Atrium station", floor: "L2", distance: "96 m", route: "Take the stairs · right of atrium", access: "Training device beside elevator", x: 76, y: 75 }
]);

export const AED_STEPS = Object.freeze([
  { title: "Trainer powered on", detail: "Open the AED trainer and follow its spoken prompts." },
  { title: "Training pads placed", detail: "Place training pads as shown on the trainer pads and mannequin." },
  { title: "Clear for analysis", detail: "Make sure nobody touches the mannequin while the trainer analyzes." },
  { title: "Trainer prompt followed", detail: "Follow the trainer's instruction. This app makes no shock decision." },
  { title: "Resume CPR", detail: "Resume compressions when the trainer instructs you to do so." }
]);

export const TASKS = Object.freeze([
  { id: "call", title: "Contact emergency services", role: "Caller" },
  { id: "cpr", title: "Perform CPR", role: "CPR lead" },
  { id: "aed", title: "Retrieve AED trainer", role: "AED runner" }
]);

// Fixed training fixtures. These are not people, live locations, or a dispatch service.
export const SIMULATED_RESPONDERS = Object.freeze([
  { id: "morgan", name: "Morgan Lee", role: "CPR-trained volunteer", distance: "120 m", etaMinutes: 2, x: 26, y: 31, skills: ["cpr", "call"] },
  { id: "sam", name: "Sam Rivera", role: "AED runner", distance: "240 m", etaMinutes: 4, x: 78, y: 25, skills: ["aed", "call"] },
  { id: "alex", name: "Alex Chen", role: "First-aid volunteer", distance: "390 m", etaMinutes: 6, x: 76, y: 77, skills: ["cpr", "aed", "call"] }
]);

export function createInitialState(sessionId = "demo") {
  return {
    sessionId,
    revision: 0,
    activated: false,
    assessment: { responsive: null, breathingNormally: null },
    call: "idle",
    selectedAed: null,
    cpr: { active: false, started: false, taps: [], sensor: "simulated" },
    aed: { arrived: false, step: -1, complete: false },
    participants: [],
    assignments: { call: null, cpr: null, aed: null },
    responders: Object.fromEntries(SIMULATED_RESPONDERS.map(responder => [responder.id, { status: "available", taskId: null, requestedAt: null, arrivedAt: null }])),
    events: []
  };
}

function record(state, type, text, actor) {
  state.revision += 1;
  state.events = [...state.events, { id: state.revision, type, text, actor, at: new Date().toISOString() }].slice(-80);
  return state;
}

function assignOpenTasks(state) {
  const active = state.participants.filter(p => p.active);
  for (const task of TASKS) {
    if (state.assignments[task.id] && active.some(p => p.id === state.assignments[task.id])) continue;
    const candidates = active.filter(p => !Object.values(state.assignments).includes(p.id));
    state.assignments[task.id] = candidates[0]?.id ?? null;
  }
}

function clone(state) { return structuredClone(state); }
function requireActive(state) { if (!state.activated) throw new Error("Activate emergency mode first."); }

export function reduceEvent(previous, event) {
  const state = clone(previous);
  const actor = event.actor || "System";
  const payload = event.payload || {};
  let description = "";

  switch (event.type) {
    case "ACTIVATE":
      if (state.activated) return previous;
      state.activated = true;
      description = "Emergency training mode activated";
      break;
    case "ASSESS":
      requireActive(state);
      if (typeof payload.responsive !== "boolean" || typeof payload.breathingNormally !== "boolean") throw new Error("Assessment needs both observations.");
      state.assessment = { responsive: payload.responsive, breathingNormally: payload.breathingNormally };
      description = `Assessment recorded: ${payload.responsive ? "responsive" : "unresponsive"}, ${payload.breathingNormally ? "breathing normally" : "not breathing normally"}`;
      break;
    case "CALL_REQUEST":
      requireActive(state);
      if (state.call === "connected" || state.call === "confirming") return previous;
      state.call = "confirming";
      description = "Mock dispatcher call requested";
      break;
    case "CALL_CONFIRM":
      requireActive(state);
      if (state.call !== "confirming") throw new Error("Request the mock call first.");
      state.call = "connected";
      description = "Connected to simulated dispatcher";
      break;
    case "CALL_CANCEL":
      if (state.call !== "confirming") return previous;
      state.call = "idle";
      description = "Mock call cancelled";
      break;
    case "AED_SELECT":
      requireActive(state);
      if (!AED_LOCATIONS.some(a => a.id === payload.id)) throw new Error("Unknown AED trainer location.");
      state.selectedAed = payload.id;
      description = `Selected demo AED: ${AED_LOCATIONS.find(a => a.id === payload.id).name}`;
      break;
    case "CPR_START":
      requireActive(state);
      if (state.assessment.responsive !== false || state.assessment.breathingNormally !== false) throw new Error("Confirm unresponsive and not breathing normally first.");
      state.cpr.active = true;
      state.cpr.started = true;
      description = "CPR training rhythm started";
      break;
    case "CPR_STOP":
      state.cpr.active = false;
      description = "CPR training rhythm paused";
      break;
    case "CPR_TAP":
      if (!state.cpr.active) return previous;
      state.cpr.taps = [...state.cpr.taps, Number(payload.at) || Date.now()].slice(-12);
      state.revision += 1;
      return state;
    case "AED_ARRIVED":
      requireActive(state);
      if (!state.selectedAed) throw new Error("Select a demo AED location first.");
      state.aed.arrived = true;
      state.aed.step = 0;
      description = "AED trainer arrived";
      break;
    case "AED_NEXT":
      if (!state.aed.arrived || state.aed.complete) throw new Error("AED trainer workflow is not active.");
      if (state.aed.step >= AED_STEPS.length - 1) state.aed.complete = true;
      else state.aed.step += 1;
      description = state.aed.complete ? "AED trainer sequence complete" : AED_STEPS[state.aed.step].title;
      break;
    case "PARTICIPANT_JOIN":
      if (!payload.id || !payload.name) throw new Error("Participant identity is required.");
      if (!state.participants.some(p => p.id === payload.id)) state.participants.push({ id: payload.id, name: String(payload.name).slice(0, 30), active: true });
      else {
        const returning = state.participants.find(p => p.id === payload.id);
        returning.active = true;
        returning.name = String(payload.name).slice(0, 30);
      }
      assignOpenTasks(state);
      description = `${String(payload.name).slice(0, 30)} joined`;
      break;
    case "PARTICIPANT_LEAVE": {
      const participant = state.participants.find(p => p.id === payload.id);
      if (!participant || !participant.active) return previous;
      participant.active = false;
      for (const task of TASKS) if (state.assignments[task.id] === payload.id) state.assignments[task.id] = null;
      assignOpenTasks(state);
      description = `${participant.name} left; open tasks reassigned`;
      break;
    }
    case "TASK_ASSIGN":
      requireActive(state);
      if (!TASKS.some(t => t.id === payload.taskId)) throw new Error("Unknown task.");
      if (payload.participantId !== null && !state.participants.some(p => p.id === payload.participantId && p.active)) throw new Error("Participant is not active.");
      state.assignments[payload.taskId] = payload.participantId;
      description = `${TASKS.find(t => t.id === payload.taskId).title} assignment updated`;
      break;
    case "RESPONDER_REQUEST": {
      requireActive(state);
      const responder = SIMULATED_RESPONDERS.find(item => item.id === payload.id);
      if (!responder) throw new Error("Unknown simulated responder.");
      if (!responder.skills.includes(payload.taskId)) throw new Error("This responder is not assigned that training skill.");
      if (state.responders[responder.id].status !== "available") throw new Error("This simulated responder is already requested.");
      state.responders[responder.id] = { status: "enroute", taskId: payload.taskId, requestedAt: Date.now(), arrivedAt: null };
      description = `Simulated request sent to ${responder.name} for ${TASKS.find(task => task.id === payload.taskId).title}`;
      break;
    }
    case "RESPONDER_ARRIVE": {
      requireActive(state);
      const responder = SIMULATED_RESPONDERS.find(item => item.id === payload.id);
      if (!responder) throw new Error("Unknown simulated responder.");
      if (state.responders[responder.id].status !== "enroute") throw new Error("Request this simulated responder first.");
      state.responders[responder.id].status = "onscene";
      state.responders[responder.id].arrivedAt = Date.now();
      description = `${responder.name} marked on scene in simulation`;
      break;
    }
    case "RESET":
      return createInitialState(previous.sessionId);
    default:
      throw new Error(`Unknown event: ${event.type}`);
  }
  return record(state, event.type, description, actor);
}

export function getPracticeRate(taps) {
  if (taps.length < 3) return null;
  const recent = taps.slice(-6);
  const span = recent.at(-1) - recent[0];
  return span > 0 ? Math.round(((recent.length - 1) * 60000) / span) : null;
}
