// Game 流程状态机：创建 → 回合循环（含固有注入）→ 学期结算 → 假期 → 毕业/提前结局
// 状态只存内存：刷新即重开（无存档）

import { createRng } from "./random.js";
import {
  DIFFICULTIES, ALLOC_STATS, START_MOOD,
  MAX_ALLOC_PER_STAT, WEALTH_PER_POINT, GENDERS,
} from "../data/config.js";
import { CHARACTERS } from "../data/characters.js";
import { DORMS, rollDormName } from "../data/dorms.js";
import { EVENTS_BY_ID, HOBBY_TEMPLATES } from "../data/events/index.js";
import { pickForcedEvent, buildTurn } from "./event-picker.js";
import { resolveChoice, applyEffects } from "./resolver.js";
import { startSemester, advanceWeek, settleSemester, breakEventIdFor, graduate } from "./semester.js";
import { checkAchievements, drainQueue } from "./achievements.js";
import { checkEarlyEnding } from "./endings.js";
import { gradVariantByAvg, postgradByFlag } from "../data/endings.js";

// 会话级对象（跨局统计，供彩蛋 check 使用）
export const SESSION = { restarts: 0 };

// roll 舍友 ×2 + 寝室（必须作为 rng 的首次消费，保证创建屏预览与实际开局一致）
export function rollRoommatesAndDorm(rng) {
  const roommatePool = rng.shuffle(CHARACTERS.filter((c) => c.dormEligible));
  const roommates = roommatePool.slice(0, 2).map((c) => c.id);
  const dorm = rng.weighted(DORMS, (d) => d.weight);
  const dormName = rollDormName(rng);
  return { roommates, dorm: { ...dorm, name: dormName } };
}

// 学业类事件（卷王计数：期中/期末也算"泡在书里"）
function isStudyEvent(e) {
  return (
    e.id.startsWith("normal_study") ||
    e.id.startsWith("special_midterm") ||
    e.id.startsWith("special_final")
  );
}

export function createState(config) {
  const rng = createRng(config.seed);
  const diff = DIFFICULTIES[config.difficulty] || DIFFICULTIES.normal;

  const stats = {
    int: 0, health: 0, wealth: 0, charm: 0, physique: 0,
    mood: START_MOOD, score: diff.startScore,
  };
  for (const k of ALLOC_STATS) {
    let v = Math.floor(config.allocation?.[k] || 0);
    v = Math.max(0, Math.min(MAX_ALLOC_PER_STAT, v));
    stats[k] = k === "wealth" ? v * WEALTH_PER_POINT : v;
  }

  // roll 舍友 ×2 + 寝室（rng 首次消费，与创建屏预览一致）
  const { roommates, dorm } = rollRoommatesAndDorm(rng);

  // 人物好感：全体初始化，舍友开局结识
  const characters = new Map(
    CHARACTERS.map((c) => [c.id, { id: c.id, met: false, affection: c.affectionBase, dates: 0 }])
  );
  for (const id of roommates) characters.get(id).met = true;

  const state = {
    name: config.name || "无名氏",
    gender: config.gender in GENDERS ? config.gender : "male", // 纯配置读取，不消费 rng（舍友/寝室仍是 rng 首消费）
    theme: config.theme,
    themeColors: config.colors ?? null,
    difficulty: config.difficulty,
    seed: config.seed,
    rng,
    stats,
    hidden: { network: 0, luck: 50 },
    flags: new Set(["met_roommate"]),
    characters,
    roommates,
    dorm,
    hobbies: new Set(),
    hobbyTemplates: new Map(HOBBY_TEMPLATES.map((h) => [h.id, h])),
    unlockedEvents: new Set(dorm.events || []),
    baseScore: diff.startScore,
    semester: 1,
    week: 1,
    semesterLength: 8,
    turn: 0,
    pendingSkip: 0,
    pendingTrigger: null,
    playedThisSemester: new Set(),
    cooldowns: new Map(),
    termCounts: new Map(),
    choiceCounts: new Map(),
    lastEncounterTurn: -999,
    failCount: 0,
    semesterScores: [],
    happySemesters: 0,
    bestScore: 0,
    semMinMood: START_MOOD,
    semEncounterCount: 0,
    semStudyCount: 0,
    semSleepCount: 0,
    finalDone: false,
    achieved: new Set(),
    achQueue: [],
    history: [],
    ended: null,
    lastDormPassive: null,
  };

  startSemester(state);
  return state;
}

// 寝室环境每周被动漂移
export function applyDormPassive(state) {
  const weekly = state.dorm?.passive?.weekly;
  if (!weekly?.stats) return null;
  const deltas = {};
  applyEffects(state, { stats: weekly.stats }, deltas);
  state.lastDormPassive = deltas;
  return deltas;
}

function markPlayed(state, event) {
  if (event.forced) state.playedThisSemester.add(event.id);
  state.cooldowns.set(event.id, state.turn);
  state.termCounts.set(event.id, (state.termCounts.get(event.id) || 0) + 1);
}

export class Game {
  constructor() {
    this.session = SESSION;
    this.state = null;
    this.phase = "none"; // turn | result | semester_end | ending
    this.presentation = null;
    this.isBreak = false;
    this.breakDone = false;
    this.lastResult = null;
    this.lastChosen = null;
    this.chain = null; // 长链上下文（任务 B）：{ event, item, nodes, idx, picks, extraDeltas, base }
  }

  // config: { name, difficulty, seed, allocation: {int,health,wealth,charm,physique} }
  start(config) {
    SESSION.restarts += 1;
    this.state = createState(config);
    this.phase = "turn";
    this.isBreak = false;
    this.breakDone = false;

    // 开局成就检查（人生重来枪：重开 3 次触发假崩溃 CG）
    const ctx = { state: this.state, session: this.session, event: null, choice: null };
    const eggs = checkAchievements(ctx);

    applyDormPassive(this.state);
    this.beginTurn();
    return { queue: drainQueue(this.state), eggs };
  }

  beginTurn() {
    const state = this.state;
    let forced = null;

    // 触发队列（如：病情加重 → 住院）优先于一切
    if (state.pendingTrigger) {
      const ev = EVENTS_BY_ID.get(state.pendingTrigger);
      state.pendingTrigger = null;
      if (ev) forced = ev;
    }
    if (!forced) forced = pickForcedEvent(state);

    const turn = buildTurn(state, forced);
    if (turn.event.kind === "encounter") {
      state.semEncounterCount += 1;
      state.lastEncounterTurn = state.turn;
    }

    this.phase = "turn";
    this.presentation = {
      event: turn.event,
      choices: turn.choices,
      character: turn.character ?? null,
      meta: {
        semester: state.semester,
        week: state.week,
        semesterLength: state.semesterLength,
        turn: state.turn,
        isBreak: this.isBreak,
        forced: !!forced,
      },
    };
    return this.presentation;
  }

  // 玩家选择：返回 { deltas, log, unlocks, newly, ended }；带长链的选项返回 { phase: "chain", node }
  choose(choiceId) {
    const state = this.state;
    const item = this.presentation?.choices.find((c) => c.choice.id === choiceId);
    if (!item) return null;

    const { choice, sourceEvent, inject } = item;
    const src = sourceEvent || this.presentation.event;

    const result = resolveChoice(state, choice);
    this.lastChosen = item; // 结算屏 feedback 用（含同位词解析后的 text/feedback）

    // 长链（任务 B）：choice.chain 为数组或函数 (ctx) => nodes，ctx = { state, result, choice }
    // 结果分支（考研过线/秋招 offer/借钱结果）与人物差异化（真实舍友）都在链函数里读取
    const nodes = typeof choice.chain === "function"
      ? choice.chain({ state, result, choice })
      : choice.chain;
    if (Array.isArray(nodes) && nodes.length) {
      this.chain = {
        event: src, item, nodes, idx: 0,
        picks: [],          // { nodeText, text, feedback, deltas }
        extraDeltas: {},    // 链内子效果累积（并入最终结算）
        base: result,       // resolveChoice 的 { deltas, log, unlocks }
      };
      this.phase = "chain";
      return { phase: "chain", node: nodes[0] };
    }

    return this.finalizeChoice(src, choice, item, inject, result, null);
  }

  // 长链子选项：返回下一节点 { phase:"chain", node, pick }，链末走公共结算
  pickChain(subId) {
    if (this.phase !== "chain" || !this.chain) return null;
    const ch = this.chain;
    const node = ch.nodes[ch.idx];
    const sub = node?.choices.find((c) => c.id === subId);
    if (!sub) return null;

    const state = this.state;
    const deltas = {};
    applyEffects(state, sub.effects, deltas); // 子效果立即生效
    for (const [k, v] of Object.entries(deltas)) {
      ch.extraDeltas[k] = (ch.extraDeltas[k] || 0) + v;
    }
    ch.picks.push({ nodeText: node.text, text: sub.text, feedback: sub.feedback, deltas });

    ch.idx += 1;
    if (ch.idx < ch.nodes.length) {
      return { phase: "chain", node: ch.nodes[ch.idx], pick: ch.picks[ch.picks.length - 1] };
    }

    // 链结束：主效果 + 链内子效果求和合并，走与普通选项相同的公共结算
    const mergedDeltas = { ...ch.base.deltas };
    for (const [k, v] of Object.entries(ch.extraDeltas)) {
      mergedDeltas[k] = (mergedDeltas[k] || 0) + v;
    }
    const merged = { ...ch.base, deltas: mergedDeltas };
    const fin = this.finalizeChoice(ch.event, ch.item.choice, ch.item, ch.item.inject, merged, ch.picks);
    this.chain = null;
    return fin;
  }

  // 公共结算（普通选项与长链结束共用）：历史/计数/成就/提前结局，链不消耗额外回合
  finalizeChoice(src, choice, item, inject, result, chainPicks) {
    const state = this.state;
    markPlayed(state, src);

    // 历史选择次数（键：事件id:选项id）——选项排序与"之前几次"文案依据
    const countKey = `${src.id}:${choice.id}`;
    state.choiceCounts.set(countKey, (state.choiceCounts.get(countKey) || 0) + 1);

    if (isStudyEvent(src)) state.semStudyCount += 1;
    if (src.id === "normal_sleep" && ["sleep_in", "early"].includes(choice.id)) {
      state.semSleepCount += 1;
    }
    if (src.id.startsWith("special_final_")) state.finalDone = true;
    if (src.type === "break") this.breakDone = true;

    state.history.push({
      turn: state.turn,
      semester: state.semester,
      week: state.week,
      isBreak: this.isBreak,
      eventId: src.id,
      eventName: src.name,
      choiceId: choice.id,
      choiceText: item.text ?? choice.text, // 同位词解析后文案（与当回合呈现一致）
      inject: inject || null,
      deltas: result.deltas,
      log: result.log,
      unlocks: result.unlocks,
      chain: chainPicks ? chainPicks.map((p) => p.text) : null, // 长链路径（历史面板展示）
    });
    state.turn += 1;

    // 成就 + 提前结局（先设 ended 再查结局型成就）
    const ctx = { state, session: this.session, event: src, choice };
    const newly = checkAchievements(ctx);
    let ended = null;
    const early = checkEarlyEnding(state);
    if (early) {
      state.ended = { id: early.id, kind: "early", ending: early };
      newly.push(...checkAchievements(ctx));
      ended = state.ended;
    }

    this.lastResult = { ...result, chain: chainPicks, newly, ended };
    this.phase = "result";
    return this.lastResult;
  }

  // 结算后推进：下一回合 / 学期结算 / 假期 / 毕业
  next() {
    const state = this.state;
    if (state.ended) return { phase: "ending", ended: state.ended };

    if (this.phase === "result") {
      // 假期选择已结算 → 新学期
      if (this.breakDone) {
        this.breakDone = false;
        this.isBreak = false;
        state.semester += 1;
        startSemester(state);
        applyDormPassive(state);
        this.beginTurn();
        return { phase: "turn", presentation: this.presentation };
      }

      // 期末已考完 → 学期结算
      if (state.finalDone) {
        const summary = settleSemester(state);
        const ctx = { state, session: this.session, event: null, choice: null };
        const newly = checkAchievements(ctx);
        const early = checkEarlyEnding(state);
        if (early) {
          state.ended = { id: early.id, kind: "early", ending: early };
          newly.push(...checkAchievements(ctx));
          this.phase = "ending";
          return { phase: "ending", ended: state.ended, newly };
        }
        state.history.push({
          turn: state.turn, semester: state.semester, week: state.week,
          isBreak: false, eventId: null, eventName: `第 ${state.semester} 学期结算`,
          choiceId: null, choiceText: null, inject: null,
          deltas: null, log: null, unlocks: [],
          summary,
        });
        this.phase = "semester_end";
        return { phase: "semester_end", summary, newly };
      }

      advanceWeek(state);
      applyDormPassive(state);
      this.beginTurn();
      return { phase: "turn", presentation: this.presentation };
    }

    if (this.phase === "semester_end") {
      // 毕业
      if (state.semester >= 8) {
        const grad = graduate(state, gradVariantByAvg, postgradByFlag);
        state.ended = { id: "graduation", kind: "graduation", grad };
        this.phase = "ending";
        return { phase: "ending", ended: state.ended };
      }
      // 假期
      const breakEvent = EVENTS_BY_ID.get(breakEventIdFor(state));
      this.isBreak = true;
      const turn = buildTurn(state, breakEvent);
      this.phase = "turn";
      this.presentation = {
        event: turn.event,
        choices: turn.choices,
        character: turn.character ?? null,
        meta: {
          semester: state.semester,
          week: state.week,
          semesterLength: state.semesterLength,
          turn: state.turn,
          isBreak: true,
          forced: true,
        },
      };
      return { phase: "turn", presentation: this.presentation, isBreak: true };
    }

    return { phase: this.phase };
  }
}
