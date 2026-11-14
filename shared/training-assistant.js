import { AED_LOCATIONS, AED_STEPS, TASKS } from './engine.js';

const chinese = text => /[\u3400-\u9fff]/.test(text);

function currentAction(state, zh) {
  if (!state.activated) return zh ? '先点击“启动训练响应”。' : 'Activate the training response first.';
  if (state.assessment.responsive === null) return zh ? '在概览页记录你对训练人偶的观察。' : 'Record your observations of the training mannequin in Overview.';
  if (state.call !== 'connected') return zh ? '连接模拟调度员；演示不会拨打真实电话。' : 'Connect the mock dispatcher; no real call is placed.';
  if (!state.selectedAed) return zh ? '在演示地图中选择一个虚构的 AED 训练机位置。' : 'Choose a fictional AED trainer location on the demo map.';
  if (!state.cpr.started && !state.aed.arrived) {
    return state.assessment.responsive === false && state.assessment.breathingNormally === false
      ? (zh ? '在教员指导下启动训练节拍。' : 'Start the practice rhythm with your instructor.')
      : (zh ? '按教员指示继续演练。' : 'Continue the scenario with your instructor.');
  }
  if (!state.aed.arrived) return zh ? '确认 AED 训练机已到达人偶旁。' : 'Confirm that the AED trainer has arrived at the mannequin.';
  if (!state.aed.complete) return zh ? '按照实体 AED 训练机的语音提示确认下一步。' : 'Confirm the next step only after following the physical AED trainer prompts.';
  return zh ? '本轮训练流程已完成，可以复盘或重置。' : 'The training sequence is complete; review it or reset the demo.';
}

function teamSummary(state, zh) {
  const active = state.participants.filter(person => person.active);
  if (!active.length) return zh ? '目前没有已连接的队员。' : 'No participants are connected.';
  const assignments = TASKS.map(task => {
    const person = active.find(item => item.id === state.assignments[task.id]);
    const role = zh ? ({ call: '模拟呼叫', cpr: 'CPR 训练', aed: '取 AED 训练机' })[task.id] : task.role;
    return `${role}: ${person ? person.name : (zh ? '待分配' : 'unassigned')}`;
  });
  return assignments.join(zh ? '；' : '; ') + (zh ? '。' : '.');
}

export function trainingReply(state, rawQuestion) {
  const question = String(rawQuestion ?? '').trim().slice(0, 240);
  const zh = chinese(question);
  const q = question.toLowerCase();

  if (!question) return { topic: 'empty', answer: zh ? '请输入一个关于演练的问题。' : 'Ask a question about the training demo.', modelAllowed: false };
  if (/real emergency|actual emergency|not breathing|unconscious|urgent|真实|真的|现实|昏迷|呼吸困难|救命/.test(q)) {
    return { topic: 'real-emergency', answer: zh ? '如果是真实紧急情况，请立即联系当地急救服务并听从调度员指示；不要依赖本演示。' : 'For a real emergency, contact local emergency services now and follow the dispatcher; do not rely on this demo.', modelAllowed: false };
  }
  if (/who|role|team|teammate|assign|队友|队员|分工|负责|谁/.test(q)) {
    return { topic: 'team', answer: teamSummary(state, zh), modelAllowed: true };
  }
  if (/cpr|compression|按压|心肺复苏|节拍/.test(q)) {
    return { topic: 'cpr', answer: zh ? 'CPR 页提供 110 BPM 模拟视觉节拍；它不测量实际按压速度、深度或回弹，请遵从教员指导。' : 'The CPR view shows a simulated 110 BPM visual rhythm. It does not measure real compression rate, depth, or recoil; follow your instructor.', modelAllowed: false };
  }
  if (/aed|defibrillat|电极|除颤|电击/.test(q)) {
    const selected = AED_LOCATIONS.find(item => item.id === state.selectedAed);
    const location = selected ? (zh ? `当前选择的虚构位置是 ${selected.name}。` : `The selected fictional location is ${selected.name}. `) : '';
    const step = state.aed.arrived && !state.aed.complete ? AED_STEPS[state.aed.step]?.title : null;
    return { topic: 'aed', answer: (zh ? '演示地图中的 AED 位置均为虚构。' : 'AED locations on the demo map are fictional. ') + location + (step ? (zh ? `当前训练步骤：${step}。` : `Current training step: ${step}. `) : '') + (zh ? '只使用训练机并遵从其语音提示。' : 'Use only a trainer and follow its spoken prompts.'), modelAllowed: false };
  }
  if (/911|call|dispatcher|电话|呼叫|调度员/.test(q)) {
    return { topic: 'mock-call', answer: zh ? '这里的调度员连接完全是模拟的，不会拨打 911 或其他真实急救号码。' : 'The dispatcher connection is simulated. It never dials 911 or any real emergency number.', modelAllowed: false };
  }
  if (/next|step|now|progress|status|下一|现在|进度|状态|开始/.test(q)) {
    return { topic: 'next', answer: currentAction(state, zh), modelAllowed: false };
  }
  return { topic: 'scope', answer: zh ? '我可以回答当前演练步骤、队员分工、模拟呼叫、CPR 节拍和 AED 训练机的问题。' : 'I can answer questions about the current demo step, team roles, mock call, CPR rhythm, and AED trainer.', modelAllowed: false };
}
