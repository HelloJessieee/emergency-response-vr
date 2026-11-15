const cards = {
  overview: { title: 'AI / FIRST ACTIONS', art: 'check', lines: ['Call 911. Get an AED.', 'Start chest compressions.', 'Follow the dispatcher.'] },
  rate: { title: 'AI / CPR RHYTHM', art: 'compress', lines: ['Aim for 100-120 per min.', 'Let the chest rise fully.', 'Beat here is practice only.'] },
  depth: { title: 'AI / CPR DEPTH', art: 'compress', lines: ['Adult: at least 2 in.', 'Avoid more than 2.4 in.', 'Depth is not measured.'] },
  hands: { title: 'AI / HAND POSITION', art: 'hands', lines: ['Heel in chest center.', 'Other hand on top.', 'Shoulders over hands.'] },
  aed: { title: 'AI / AED TRAINER', art: 'aed', lines: ['Turn the AED on.', 'Follow its voice prompts.', 'Stand clear when told.'] },
  breathing: { title: 'AI / BREATHING', art: 'check', lines: ['Gasping is not normal.', 'Call 911 and get an AED.', 'Follow the dispatcher.'] },
  call: { title: 'AI / GET HELP', art: 'call', lines: ['Call 911 on your phone.', 'Ask someone for an AED.', 'This Lens makes no call.'] },
  breaths: { title: 'AI / HANDS ONLY', art: 'compress', lines: ['For sudden adult collapse,', 'Hands-Only CPR uses no', 'rescue breaths.'] },
  team: { title: 'AI / TEAM ROLES', art: 'callAed', lines: ['You: start compressions.', 'Person 2: call 911.', 'Person 3: bring an AED.'] },
  scope: { title: 'AI / TRAINING GUIDE', art: 'check', lines: ['Ask about CPR, AED,', 'breathing, team roles,', 'or the next drill step.'] }
};
const patterns = [
  ['breaths', /mouth|rescue breath|ventilat|人工呼吸|吹气/i],
  ['rate', /rate|speed|how fast|rhythm|per minute|bpm|频率|速度|多快/i],
  ['depth', /deep|depth|inches|centimeter|\bcm\b|多深|深度|厘米/i],
  ['hands', /hands?|hand placement|where.*press|where.*put|position|手放|双手|手掌|按哪里/i],
  ['aed', /aed|defibrillat|除颤|电击器/i],
  ['breathing', /breath|gasp|unresponsive|responsive|呼吸|喘气|反应/i],
  ['call', /911|ambulance|emergency call|call for help|救护车|求救|报警/i],
  ['team', /team|role|assign|队友|分工|负责/i],
  ['overview', /cpr|next|step|what.*do|心肺复苏|胸外按压|心脏按压|下一步/i]
];

export function fallbackTopic(question) {
  return patterns.find(([, pattern]) => pattern.test(question))?.[0] || 'scope';
}

export function lensCard(topic) {
  return cards[topic] || cards.scope;
}

export async function classifyLensQuestion(question, { apiKey = process.env.OPENAI_API_KEY, fetchImpl = fetch } = {}) {
  const fallback = fallbackTopic(question);
  if (!apiKey) return { topic: fallback, mode: 'offline' };
  try {
    const response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: AbortSignal.timeout(6500),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-6-luna',
        instructions: 'Classify an adult CPR training question. Return exactly one token from: overview, rate, depth, hands, aed, breathing, call, breaths, team, scope. Never generate advice. Use scope for unrelated or unclear text.',
        input: question,
        max_output_tokens: 30,
        store: false
      })
    });
    if (!response.ok) return { topic: fallback, mode: 'fallback' };
    const result = await response.json();
    const token = (result.output || []).flatMap(item => item.content || [])
      .filter(item => item.type === 'output_text').map(item => item.text || '').join('').trim().toLowerCase();
    return { topic: Object.hasOwn(cards, token) ? token : fallback, mode: Object.hasOwn(cards, token) ? 'model' : 'fallback' };
  } catch {
    return { topic: fallback, mode: 'fallback' };
  }
}
