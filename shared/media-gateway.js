const API = 'https://api.openai.com/v1';

export function outputText(result) {
  return (result.output || []).filter(item => item.type === 'message')
    .flatMap(item => item.content || []).filter(item => item.type === 'output_text')
    .map(item => item.text || '').join(' ').trim();
}

async function openaiFetch(path, options, { apiKey = process.env.OPENAI_API_KEY, fetchImpl = fetch, timeoutMs = 12000 } = {}) {
  if (!apiKey) throw new Error('AI_NOT_CONFIGURED');
  const response = await fetchImpl(API + path, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error('AI_UPSTREAM_ERROR');
  return response;
}

const visionAnswers = {
  mannequin: 'A training mannequin appears in this photo. Use the simulator controls to record observations yourself.',
  aed_trainer: 'An AED trainer appears in this photo. Follow the physical trainer’s prompts during the exercise.',
  both: 'A training mannequin and AED trainer appear in this photo. This image is for equipment orientation only.',
  unclear: 'The training equipment is not clear enough to identify. Try a brighter, closer photo.',
  other: 'This does not clearly show a training mannequin or AED trainer. No medical assessment was made.'
};

export function validateTrainingImage(dataUrl) {
  if (typeof dataUrl !== 'string' || dataUrl.length > 2_800_000) throw new Error('INVALID_IMAGE');
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match || Buffer.from(match[2], 'base64').length > 2_000_000) throw new Error('INVALID_IMAGE');
  return dataUrl;
}

export async function inspectTrainingImage(dataUrl, options = {}) {
  validateTrainingImage(dataUrl);
  const response = await openaiFetch('/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.model || process.env.OPENAI_VISION_MODEL || 'gpt-5-mini',
      reasoning: { effort: 'minimal' },
      instructions: 'Classify only training equipment visible in the image. Return exactly one token: mannequin, aed_trainer, both, unclear, or other. Never infer patient condition, CPR quality, AED readiness, or real emergency actions.',
      input: [{ role: 'user', content: [
        { type: 'input_text', text: 'Which training props are clearly visible?' },
        { type: 'input_image', image_url: dataUrl, detail: 'low' }
      ] }],
      max_output_tokens: 80,
      store: false
    })
  }, options);
  const kind = outputText(await response.json()).toLowerCase();
  return { kind: Object.hasOwn(visionAnswers, kind) ? kind : 'unclear', answer: visionAnswers[kind] || visionAnswers.unclear };
}

export async function transcribeTrainingAudio(bytes, mime, options = {}) {
  const types = { 'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/wav': 'wav', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg' };
  const type = String(mime || '').split(';')[0].toLowerCase();
  if (!types[type] || !bytes?.length || bytes.length > 2_000_000) throw new Error('INVALID_AUDIO');
  const form = new FormData();
  form.set('model', options.model || process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe');
  form.set('file', new Blob([bytes], { type }), `question.${types[type]}`);
  const response = await openaiFetch('/audio/transcriptions', { method: 'POST', body: form }, options);
  const text = String((await response.json()).text || '').trim().slice(0, 240);
  if (!text) throw new Error('EMPTY_TRANSCRIPT');
  return text;
}

export async function speakApprovedAnswer(answer, options = {}) {
  if (typeof answer !== 'string' || !answer || answer.length > 500) throw new Error('INVALID_SPEECH');
  const response = await openaiFetch('/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.model || process.env.OPENAI_SPEECH_MODEL || 'gpt-4o-mini-tts',
      voice: 'coral',
      input: answer,
      instructions: 'Read this approved training-demo text clearly and calmly. Add nothing.'
    })
  }, options);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 2_000_000) throw new Error('INVALID_SPEECH');
  return bytes;
}
