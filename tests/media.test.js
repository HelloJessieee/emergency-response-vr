import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectTrainingImage, transcribeTrainingAudio, speakApprovedAnswer, validateTrainingImage } from '../shared/media-gateway.js';

test('vision accepts a small image and maps model output to fixed training copy', async () => {
  const image = 'data:image/png;base64,' + Buffer.from('test image').toString('base64');
  let sent;
  const result = await inspectTrainingImage(image, { apiKey: 'test-key', fetchImpl: async (_url, options) => {
    sent = JSON.parse(options.body);
    return { ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'aed_trainer' }] }] }) };
  } });
  assert.equal(result.kind, 'aed_trainer');
  assert.match(result.answer, /physical trainer/);
  assert.equal(sent.store, false);
  assert.equal(sent.input[0].content[1].image_url, image);
  assert.throws(() => validateTrainingImage('https://example.com/secret.jpg'), /INVALID_IMAGE/);
});

test('transcription sends only a bounded audio file and speech reads approved text', async () => {
  let form;
  const text = await transcribeTrainingAudio(Buffer.from('audio'), 'audio/webm;codecs=opus', {
    apiKey: 'test-key', fetchImpl: async (_url, options) => {
      form = options.body;
      return { ok: true, json: async () => ({ text: 'Who is doing what?' }) };
    }
  });
  assert.equal(text, 'Who is doing what?');
  assert.equal(form.get('model'), 'gpt-4o-mini-transcribe');
  assert.equal(form.get('file').type, 'audio/webm');
  await assert.rejects(transcribeTrainingAudio(Buffer.from('a'), 'text/plain', { apiKey: 'test-key' }), /INVALID_AUDIO/);
  let spoken;
  const audio = await speakApprovedAnswer('Training response only.', { apiKey: 'test-key', fetchImpl: async (_url, options) => {
    spoken = JSON.parse(options.body);
    return { ok: true, arrayBuffer: async () => Buffer.from('mp3') };
  } });
  assert.equal(spoken.input, 'Training response only.');
  assert.equal(audio.toString(), 'mp3');
});
