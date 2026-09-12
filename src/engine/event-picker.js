// 事件选择器：强制事件挂点（周次阈值）+ 常规池加权随机 + 固有类注入
// 固有类判定顺序：宿主事件选定 → 邂逅（可取代宿主）→ 社交 → 无视 → 兴趣

import { EVENTS, ENCOUNTER_EVENTS, SOCIAL_EVENTS, IGNORE_CHOICE } from "../data/events/index.js";
import { PROB, POOL } from "../data/config.js";
import { passesGates, choiceVisible, maxCrushAffection, maxCrushDates, bestCrush } from "./resolver.js";
import { luckFactor, clampProb } from "./random.js";

// ---- 事件资格 ----

export function eventEligible(e, state) {
  if (e.type === "break" || e.forced) return false;
  if (!e.weight) return false;

  // 学期限定
  if (e.stage) {
    const [min, max] = e.stage.semesters;
    if (state.semester < min || state.semester > max) return false;
  }

  // 前置条件
  const req = e.requires;
  if (req) {
    if (req.flags && !req.flags.every((f) => state.flags.has(f))) return false;
    if (req.notFlags && req.notFlags.some((f) => state.flags.has(f))) return false;
    if (req.stats) {
      for (const [k, r] of Object.entries(req.stats)) {
        const v = state.stats[k];
        if (v === undefined) return false;
        if (r.min != null && v < r.min) return false;
        if (r.max != null && v > r.max) return false;
      }
    }
    if (req.hidden) {
      for (const [k, r] of Object.entries(req.hidden)) {
        const v = state.hidden[k];
        if (v === undefined) return false;
        if (r.min != null && v < r.min) return false;
        if (r.max != null && v > r.max) return false;
      }
    }
    if (req.hobbies && !req.hobbies.every((h) => state.hobbies.has(h))) return false;
    if (req.characters) {
      for (const [id, r] of Object.entries(req.characters)) {
        const c = state.characters.get(id);
        if (!c || !c.met) return false;
        if (r.affectionMin != null && c.affection < r.affectionMin) return false;
        if (r.datesMin != null && (c.dates || 0) < r.datesMin) return false;
      }
    }
    if (req.anyCrushAffectionMin != null) {
      if (maxCrushAffection(state) < req.anyCrushAffectionMin) return false;
    }
    if (req.anyCrushDatesMin != null) {
      if (maxCrushDates(state) < req.anyCrushDatesMin) return false;
    }
  }

  // 事件级可见门槛
  if (!passesGates(e.gates, state)) return false;

  // 寝室事件仅限 roll 到的事件
  if (e.id.startsWith("dorm_") && !state.unlockedEvents.has(e.id)) return false;

  // 冷却：gap 至少 cooldown+1 回合
  const last = state.cooldowns.get(e.id);
  if (last != null && state.turn - last < e.cooldown + 1) return false;

  // 单学期上限
  if (e.singleTermLimit != null && (state.termCounts.get(e.id) || 0) >= e.singleTermLimit) return false;

  return true;
}

export function poolCandidates(state) {
  return EVENTS.filter((e) => eventEligible(e, state));
}

// ---- 强制事件 ----

// 周次阈值语义：week >= 挂点即触发（"last" = 学期长度），跳周不会错过
export function pickForcedEvent(state) {
  const due = EVENTS.filter((e) => {
    if (!e.forced) return false;
    if (e.forced.semester !== state.semester) return false;
    if (state.playedThisSemester.has(e.id)) return false;
    const anchor = e.forced.week === "last" ? state.semesterLength : e.forced.week;
    return state.week >= anchor;
  });
  if (!due.length) return null;
  due.sort((a, b) => {
    const wa = a.forced.week === "last" ? 99 : a.forced.week;
    const wb = b.forced.week === "last" ? 99 : b.forced.week;
    return wa - wb;
  });
  return due[0];
}

// ---- 固有类注入 ----

// 邂逅判定：可取代宿主事件（返回邂逅事件或 null）
export function rollEncounter(state, host) {
  const scene = host.scene;
  if (!scene || !scene.canEncounter || !scene.tags?.length) return null;
  const factor = luckFactor(state.hidden.luck);
  for (const enc of ENCOUNTER_EVENTS) {
    if (!enc.tags.some((t) => scene.tags.includes(t))) continue;
    let p = enc.baseChance * factor;
    if (state.turn - state.lastEncounterTurn <= PROB.encounterRecentTurns) {
      p *= PROB.encounterRecentPenalty;
    }
    if (state.rng.chance(clampProb(p))) return enc;
  }
  return null;
}

// 社交/兴趣注入为附加选项；无视恒注入
export function buildInjectedChoices(state, host) {
  const out = [];
  const scene = host.scene;
  const factor = luckFactor(state.hidden.luck);

  if (scene?.canSocial && scene.tags?.length) {
    for (const soc of SOCIAL_EVENTS) {
      if (!soc.tags.some((t) => scene.tags.includes(t))) continue;
      if (state.rng.chance(clampProb(PROB.social * factor))) {
        for (const c of soc.choices) {
          out.push({ choice: c, inject: "social", sourceEvent: soc });
        }
      }
    }
  }

  for (const hobbyId of state.hobbies) {
    if (state.rng.chance(clampProb(PROB.hobby * factor))) {
      const tpl = state.hobbyTemplates.get(hobbyId);
      if (!tpl) continue;
      out.push({ choice: tpl.injectChoice, inject: "hobby", sourceHobby: tpl.id });
    }
  }

  out.push({ choice: IGNORE_CHOICE, inject: "ignore", sourceEvent: null });
  return out;
}

// ---- 选择当前回合的宿主事件 ----

// 选项计数键：事件id:选项id（ignore 选项归宿主）
function countKey(sourceEvent, choice, host) {
  return `${sourceEvent?.id || host.id}:${choice.id}`;
}

// ---- 变体表达（同位词）----

// 按 PROB.alias 概率抽取替代表达；解析后的 text/feedback 写入 item，
// 回合内呈现、结果屏与历史记录统一消费解析文案（choiceCounts 键仍用 choice.id，变体不分裂计数）
function pickAlias(aliases, rng) {
  if (!aliases?.length || !rng.chance(PROB.alias)) return null;
  return rng.pick(aliases);
}

// 呈现层事件：替换为变体名/描述（浅拷贝保留其余字段，id 不变）
function presentEvent(event, rng) {
  const a = pickAlias(event.aliases, rng);
  if (!a) return event;
  return { ...event, name: a.name, description: a.description };
}

// 呈现层选项：变体文案 + 变体 feedback（缺省沿用原 feedback）
function presentChoice(choice, rng) {
  const a = pickAlias(choice.aliases, rng);
  return {
    text: a?.text ?? choice.text,
    feedback: a?.feedback ?? choice.feedback ?? null,
  };
}

// 回合出场人物解析（左立绘用）：
// "@crush" → 当前好感最高的可攻略人物；"@roommate" → 首位舍友；其余 id 透传（如 "cat"）
export function resolveTurnCharacter(state, host) {
  const ch = host.character;
  if (!ch) return null;
  if (ch === "@crush") return bestCrush(state)?.id ?? null;
  if (ch === "@roommate") return state.roommates[0] ?? null;
  return ch;
}

// 环境事件汇聚：env(state, ctx) 通过的事件，其全部可见选项进入本回合选择列表
function poolEnvChoices(state, host, ctx) {
  const envPassers = [];
  for (const e of EVENTS) {
    if (e === host || !e.env) continue; // 无 env 的事件只当宿主，不贡献选项
    if (!eventEligible(e, state)) continue;
    let ok = false;
    try { ok = !!e.env(state, ctx); } catch { ok = false; }
    if (!ok) continue;
    envPassers.push(e);
  }
  // 名额有限：紧急事件（envPriority）优先，其次权重；防止选项泛滥
  envPassers.sort((a, b) => (b.envPriority || 0) - (a.envPriority || 0) || b.weight - a.weight);
  return envPassers.slice(0, POOL.maxEnvEvents);
}

// 返回 { event, injected, choices }
// choices: 宿主可见选项 + 环境事件贡献选项（历史次数降序）+ 注入选项（恒追加末尾）
export function buildTurn(state, forced = null) {
  let host = forced;
  if (!host) {
    const cands = poolCandidates(state);
    host = state.rng.weighted(cands, (e) => e.weight) || EVENTS.find((e) => e.id === "normal_wander");
  }

  const encountered = rollEncounter(state, host);
  if (encountered) host = encountered;

  // 同位词抽取：宿主事件先解析（sourceEvent 与 pres.event 必须同一对象，保证"非来源"判断成立）
  host = presentEvent(host, state.rng);

  // 出场人物：邂逅替换/变体呈现之后解析，保证用最终宿主事件
  const character = resolveTurnCharacter(state, host);

  const injected = buildInjectedChoices(state, host);
  const ctx = { sceneTags: host.scene?.tags || host.tags || [], hostEvent: host };

  const items = [];
  for (const c of host.choices || []) {
    if (!choiceVisible(c, state)) continue;
    items.push({ ...presentChoice(c, state.rng), choice: c, inject: null, sourceEvent: host });
  }

  // 强制事件 / 假期回合不汇聚：考试与假期保持专属选项列表
  if (!forced && !host.forced && host.type !== "break") {
    let used = 0;
    for (const e of poolEnvChoices(state, host, ctx)) {
      const vis = (e.choices || []).filter((c) => choiceVisible(c, state));
      if (!vis.length) continue;
      // 环境选项总数上限：按事件粒度截断（不拆散单个事件的选项），首个事件恒保留
      if (used > 0 && used + vis.length > POOL.maxEnvChoices) continue;
      used += vis.length;
      const pe = presentEvent(e, state.rng); // 来源标签用解析后名称
      for (const c of vis) items.push({ ...presentChoice(c, state.rng), choice: c, inject: null, sourceEvent: pe });
    }
  }

  // 历史选择次数降序（sort 稳定：宿主选项先插入，同次数保持宿主在前）
  const counts = state.choiceCounts;
  items.sort((a, b) => (counts.get(countKey(b.sourceEvent, b.choice, host)) || 0) - (counts.get(countKey(a.sourceEvent, a.choice, host)) || 0));

  for (const inj of injected) {
    items.push({
      choice: inj.choice,
      inject: inj.inject,
      sourceEvent: inj.sourceEvent || host,
      sourceHobby: inj.sourceHobby || null,
    });
  }
  for (const it of items) it.times = counts.get(countKey(it.sourceEvent, it.choice, host)) || 0;

  return { event: host, injected, choices: items, character };
}
