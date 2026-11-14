import test from "node:test";
import assert from "node:assert/strict";
import { AED_STEPS, createInitialState, getPracticeRate, reduceEvent } from "../shared/engine.js";

const apply = (state, type, payload) => reduceEvent(state, { type, payload, actor: "Test" });

test("complete training response is deterministic and never creates a real call", () => {
  let state = createInitialState("test");
  state = apply(state, "PARTICIPANT_JOIN", { id: "lead", name: "Lead" });
  state = apply(state, "ACTIVATE");
  state = apply(state, "ASSESS", { responsive: false, breathingNormally: false });
  state = apply(state, "CALL_REQUEST");
  assert.equal(state.call, "confirming");
  state = apply(state, "CALL_CONFIRM");
  assert.equal(state.call, "connected");
  state = apply(state, "AED_SELECT", { id: "lobby" });
  state = apply(state, "CPR_START");
  assert.equal(state.cpr.active, true);
  state = apply(state, "AED_ARRIVED");
  for (let i = 0; i < AED_STEPS.length; i++) state = apply(state, "AED_NEXT");
  assert.equal(state.aed.complete, true);
  assert.equal(state.selectedAed, "lobby");
  assert.ok(state.events.some(event => event.text === "Connected to simulated dispatcher"));
});

test("CPR stays locked until explicit observations support the training path", () => {
  let state = apply(createInitialState(), "ACTIVATE");
  assert.throws(() => apply(state, "CPR_START"), /Confirm unresponsive/);
  state = apply(state, "ASSESS", { responsive: true, breathingNormally: true });
  assert.throws(() => apply(state, "CPR_START"), /Confirm unresponsive/);
  state = apply(state, "ASSESS", { responsive: false, breathingNormally: false });
  assert.equal(apply(state, "CPR_START").cpr.active, true);
});

test("an invalid AED location is rejected", () => {
  const state = apply(createInitialState(), "ACTIVATE");
  assert.throws(() => apply(state, "AED_SELECT", { id: "invented-location" }), /Unknown AED/);
});

test("tasks are reassigned when a participant leaves", () => {
  let state = apply(createInitialState(), "PARTICIPANT_JOIN", { id: "a", name: "A" });
  state = apply(state, "PARTICIPANT_JOIN", { id: "b", name: "B" });
  state = apply(state, "PARTICIPANT_JOIN", { id: "c", name: "C" });
  assert.equal(state.assignments.cpr, "b");
  state = apply(state, "PARTICIPANT_LEAVE", { id: "b" });
  assert.notEqual(state.assignments.cpr, "b");
  assert.equal(state.participants.find(p => p.id === "b").active, false);
});

test("practice tap rate is based on input timing, never compression depth", () => {
  assert.equal(getPracticeRate([0, 545, 1090]), 110);
  assert.equal(getPracticeRate([0, 545]), null);
});

test("practice taps do not flood the response log, and CPR progress survives pause", () => {
  let state = apply(createInitialState(), "ACTIVATE");
  state = apply(state, "ASSESS", { responsive: false, breathingNormally: false });
  state = apply(state, "CPR_START");
  const logLength = state.events.length;
  state = apply(state, "CPR_TAP", { at: 1000 });
  state = apply(state, "CPR_STOP");
  assert.equal(state.cpr.started, true);
  assert.equal(state.events.length, logLength + 1);
});

test("rejoining a session refreshes the participant name", () => {
  let state = apply(createInitialState(), "PARTICIPANT_JOIN", { id: "a", name: "Rescuer A" });
  state = apply(state, "PARTICIPANT_JOIN", { id: "a", name: "Lead rescuer" });
  assert.equal(state.participants.length, 1);
  assert.equal(state.participants[0].name, "Lead rescuer");
});
