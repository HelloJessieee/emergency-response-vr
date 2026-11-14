function extractText(result) {
  return (result.output || []).filter(item => item.type === 'message')
    .flatMap(item => item.content || []).filter(item => item.type === 'output_text')
    .map(item => item.text || '').join(' ').trim();
}

export async function rephraseApproved(reply, language, {
  apiKey = process.env.OPENAI_API_KEY,
  model = process.env.OPENAI_MODEL || 'gpt-6-luna',
  fetchImpl = fetch
} = {}) {
  if (!apiKey || !reply.modelAllowed) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const result = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        instructions: 'You are a copy editor for a fictional emergency-response training demo. Rephrase the approved message naturally in the requested language. Add no new facts, medical advice, phone numbers, locations, actions, or claims. Keep it under 180 characters. Return plain text only. If unsure, repeat the approved message exactly.',
        input: JSON.stringify({ language, approved_message: reply.answer }),
        max_output_tokens: 120,
        store: false
      })
    });
    if (!result.ok) return null;
    const text = extractText(await result.json());
    if (!text || text.length > 180 || /[\r\n<>]|https?:\/\//i.test(text)) return null;
    if (reply.topic === 'team') {
      const names = [...reply.answer.matchAll(/(?:CPR lead|Caller|AED runner|模拟呼叫|CPR 训练|取 AED 训练机): ([^；;.]+)/g)].map(match => match[1].trim());
      if (names.some(name => name !== 'unassigned' && name !== '待分配' && !text.includes(name))) return null;
    }
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
