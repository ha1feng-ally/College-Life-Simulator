// 效果结算：门槛过滤、效果应用、outcome 分支（纯函数 + 少量状态写入）
// 数据文件不得引用 DOM，本模块同样保持无 DOM 依赖

import { luckFactor, clampProb, clamp } from "./random.js";
import { CHAR_BY_ID } from "../data/characters.js";
import { LUCK } from "../data/config.js";

// ---- 门槛判断 ----

// 可见门槛：不满足则选项/事件不可用
export function passesGates(gates, state) {
  if (!gates || !gates.length) return true;
  for (const g of gates) {
    const v = state.stats[g.stat];
    if (v === undefined) return false;
    if (g.min != null && v < g.min) return false;
    if (g.max != null && v > g.max) return false;
  }
  return true;
}

// 隐藏门槛：满足才显示（stat 可查隐藏属性，也可查明面属性）
export function passesHiddenGates(hiddenGates, state) {
  if (!hiddenGates || !hiddenGates.length) return true;
  for (const g of hiddenGates) {
    if (g.flag !== undefined) {
      if (!state.flags.has(g.flag)) return false;
    } else if (g.stat !== undefined) {
      const v = state.hidden[g.stat] !== undefined ? state.hidden[g.stat] : state.stats[g.stat];
      if (v === undefined) return false;
      if (g.min != null && v < g.min) return false;
      if (g.max != null && v > g.max) return false;
    }
  }
  return true;
}

// 选项可见性 = 可见门槛 + 隐藏门槛同时满足
export function choiceVisible(choice, state) {
  return passesGates(choice.gates, state) && passesHiddenGates(choice.hiddenGates, state);
}

// ---- 效果应用 ----

// 最佳恋人候选：已结识且 loveRoute 的好感最高者（crush 通配符目标）
export function bestCrush(state) {
  let best = null;
  for (const [, c] of state.characters) {
    if (!c.met) continue;
    if (!CHAR_BY_ID.get(c.id)?.loveRoute) continue;
    if (!best || c.affection > best.affection) best = c;
  }
  return best;
}

// 已结识恋爱好感最大值（anyCrushAffectionMin 判定用）
export function maxCrushAffection(state) {
  const best = bestCrush(state);
  return best ? best.affection : -1;
}

// 已结识恋人约会史最大值（anyCrushDatesMin 判定用）
export function maxCrushDates(state) {
  const best = bestCrush(state);
  return best ? best.dates || 0 : -1;
}

// 恋人快照（链函数文案差异化用：一次取齐 id/好感/约会史）
export function crushSnapshot(state) {
  const best = bestCrush(state);
  return best ? { id: best.id, affection: best.affection, dates: best.dates || 0 } : null;
}

// 应用 effects 并累加 delta（供 UI 显示变化）
export function applyEffects(state, effects, deltas) {
  if (!effects) return;
  if (effects.stats) {
    for (const [k, v] of Object.entries(effects.stats)) {
      if (state.stats[k] === undefined) state.stats[k] = 0;
      state.stats[k] += v;
      if (deltas) deltas[k] = (deltas[k] || 0) + v;
    }
  }
  if (effects.hidden) {
    for (const [k, v] of Object.entries(effects.hidden)) {
      if (state.hidden[k] === undefined) state.hidden[k] = 0;
      state.hidden[k] += v;
      if (k === "luck") state.hidden[k] = clamp(state.hidden[k], LUCK.min, LUCK.max);
      if (k === "network") state.hidden[k] = Math.max(0, state.hidden[k]);
    }
  }
  if (effects.characters) {
    for (const [id, eff] of Object.entries(effects.characters)) {
      let c = state.characters.get(id);
      if (!c) {
        const base = CHAR_BY_ID.get(id)?.affectionBase ?? 0;
        c = { id, met: false, affection: base, dates: 0 };
        state.characters.set(id, c);
      }
      c.affection += eff.affection || 0;
      c.dates = (c.dates || 0) + (eff.dates || 0);
    }
  }
  if (effects.crush) {
    const best = bestCrush(state);
    if (best) {
      if (effects.crush.affection) best.affection += effects.crush.affection;
      if (effects.crush.dates) best.dates = (best.dates || 0) + effects.crush.dates;
    }
  }
  // 学期心情下限跟踪（心态大师）
  if (state.stats.mood !== undefined) {
    state.semMinMood = Math.min(state.semMinMood, state.stats.mood);
  }
}

// ---- outcome 分支 ----

// 按 p 加权抽取一个 outcome；luckSensitive 分支概率受运气修正；概率保底 clamp
export function rollOutcome(outcomes, rng, luck) {
  if (!outcomes || !outcomes.length) return null;
  const factor = luckFactor(luck);
  const weights = outcomes.map((o) => {
    let p = o.p ?? 0;
    if (o.luckSensitive) p *= factor;
    return clampProb(p);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  let r = rng.next() * total;
  let acc = 0;
  for (let i = 0; i < outcomes.length; i++) {
    acc += weights[i];
    if (r <= acc) return outcomes[i];
  }
  return outcomes[outcomes.length - 1];
}

// ---- 解锁类效果 ----

export function applyUnlocks(state, choice, unlocks) {
  if (!choice) return;
  if (choice.setFlags) {
    for (const f of choice.setFlags) {
      state.flags.add(f);
      unlocks.push(`flag:${f}`);
    }
  }
  if (choice.unlockCharacters) {
    for (const id of choice.unlockCharacters) {
      const c = state.characters.get(id);
      if (c && c.met) continue;
      const base = CHAR_BY_ID.get(id)?.affectionBase ?? 0;
      // effects 先于解锁应用：保留 choice 上 characters 的好感增量（见面即加好感，任务 I）
      const affection = Math.max(base, c?.affection || 0);
      state.characters.set(id, { id, met: true, affection, dates: 0 });
      unlocks.push(`char:${id}`);
    }
  }
  if (choice.unlockHobby) {
    if (!state.hobbies.has(choice.unlockHobby)) {
      state.hobbies.add(choice.unlockHobby);
      unlocks.push(`hobby:${choice.unlockHobby}`);
    }
  }
}

// 完整结算一个选择：效果 + outcome + 解锁 + 跳过周数
// 返回 { deltas, log, unlocks }
export function resolveChoice(state, choice) {
  const deltas = {};
  const unlocks = [];
  applyEffects(state, choice.effects, deltas);

  let log = choice.log || null;
  const outcome = rollOutcome(choice.outcomes, state.rng, state.hidden.luck);
  if (outcome) {
    applyEffects(state, outcome.effects, deltas);
    if (outcome.setFlags) {
      for (const f of outcome.setFlags) {
        state.flags.add(f);
        unlocks.push(`flag:${f}`);
      }
    }
    if (outcome.log) log = outcome.log;
    if (outcome.trigger?.id) state.pendingTrigger = outcome.trigger.id;
  }

  applyUnlocks(state, choice, unlocks);
  if (choice.skipTurns) state.pendingSkip += choice.skipTurns;

  return { deltas, log, unlocks };
}
