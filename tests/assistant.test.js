import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduceEvent } from '../shared/engine.js';
import { trainingReply } from '../shared/training-assistant.js';
import { rephraseApproved } from '../shared/model-gateway.js';

test('training assistant keeps real emergencies and medical topics on fixed guidance', () => {
  const state = createInitialState();
  for (const question of ['This is a real emergency', 'Can it measure CPR depth?', 'Should the AED shock?']) {
    const reply = trainingReply(state, question);
    assert.equal(reply.modelAllowed, false);
  }
  assert.match(trainingReply(state, 'Can it measure CPR depth?').answer, /does not measure/);
  assert.match(trainingReply(state, 'Does it call 911?').answer, /never dials 911/);
});

test('training assistant answers from current session state without changing it', () => {
  let state = createInitialState();
  assert.match(trainingReply(state, "What's next?").answer, /Activate/);
  state = reduceEvent(state, { type: 'ACTIVATE' });
  assert.match(trainingReply(state, "What's next?").answer, /observations/);
  state = reduceEvent(state, { type: 'PARTICIPANT_JOIN', payload: { id: 'p1', name: 'Alex' } });
  const roleReply = trainingReply(state, 'Who is doing what?');
  assert.equal(roleReply.modelAllowed, true);
  assert.match(roleReply.answer, /Alex/);
  assert.equal(state.activated, true);
});

test('Chinese role question about AED is routed to team assignment', () => {
  let state = createInitialState();
  state = reduceEvent(state, { type: 'PARTICIPANT_JOIN', payload: { id: 'p1', name: '小林' } });
  const reply = trainingReply(state, '谁去拿AED训练机？');
  assert.equal(reply.topic, 'team');
  assert.match(reply.answer, /小林/);
});

test('model gateway sends only approved summary and rejects changed participant facts', async () => {
  const reply = { topic: 'team', answer: 'Caller: Alex; CPR lead: Sam; AED runner: unassigned.', modelAllowed: true };
  let requestBody;
  const fetchImpl = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    requestBody = JSON.parse(options.body);
    return { ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'Alex is the caller, Sam leads CPR; the AED runner is unassigned.' }] }] }) };
  };
  const answer = await rephraseApproved(reply, 'English', { apiKey: 'test-key', fetchImpl });
  assert.match(answer, /Alex/);
  assert.deepEqual(JSON.parse(requestBody.input), { language: 'English', approved_message: reply.answer });
  assert.equal(requestBody.store, false);
  assert.equal(await rephraseApproved(reply, 'English', { apiKey: 'test-key', fetchImpl: async () => ({ ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'Taylor is the caller.' }] }] }) }) }), null);
  assert.equal(await rephraseApproved({ ...reply, modelAllowed: false }, 'English', { apiKey: 'test-key', fetchImpl: () => { throw new Error('Must not call API'); } }), null);
});
