import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyLensQuestion, fallbackTopic, lensCard } from '../shared/lens-assistant.js';

test('Lens cards fit the wearable display and stay inside the approved topics', () => {
  for (const topic of ['overview','rate','depth','hands','aed','breathing','call','breaths','team','scope']) {
    const card = lensCard(topic);
    assert.equal(card.lines.length, 3);
    assert.ok([card.title, ...card.lines].every(line => line.length <= 28));
  }
  assert.equal(fallbackTopic('How fast should I press?'), 'rate');
  assert.equal(fallbackTopic('Where should my hands go?'), 'hands');
});

test('model classifies the question without generating medical instructions', async () => {
  let sent;
  const result = await classifyLensQuestion('How quickly should I press?', {
    apiKey: 'test-key',
    fetchImpl: async (_url, options) => {
      sent = JSON.parse(options.body);
      return { ok: true, json: async () => ({ output: [{ content: [{ type: 'output_text', text: 'rate' }] }] }) };
    }
  });
  assert.deepEqual(result, { topic: 'rate', mode: 'model' });
  assert.match(sent.instructions, /Return exactly one token/);
  assert.equal(sent.store, false);
  assert.equal(lensCard(result.topic).lines[0], 'Press 100-120 per min.');
});

test('unapproved model output falls back to a fixed card', async () => {
  const result = await classifyLensQuestion('Tell me about AEDs', {
    apiKey: 'test-key',
    fetchImpl: async () => ({ ok: true, json: async () => ({ output: [{ content: [{ type: 'output_text', text: 'Do something else.' }] }] }) })
  });
  assert.deepEqual(result, { topic: 'aed', mode: 'fallback' });
});
