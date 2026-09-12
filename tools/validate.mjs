// 数据校验（Node 零依赖运行）：ID 唯一 / 引用完整 / 门槛合法 / 概率 / 强制挂点 / CG 尺寸等
// 用法：node tools/validate.mjs
import {
  VISIBLE_STATS, HIDDEN_STATS, DIFFICULTIES, ALLOC_STATS, MAX_ALLOC_PER_STAT,
  ALLOC_GUIDE, ALLOC_PRESETS, HEALTH_SAFE, WEALTH_TIERS, wealthConcept, PASS_SCORE,
  GENDERS,
} from "../src/data/config.js";
import { CHARACTERS, CHAR_BY_ID } from "../src/data/characters.js";
import { DORMS, DORM_BY_ID } from "../src/data/dorms.js";
import {
  EVENTS, EVENTS_BY_ID, ENCOUNTER_EVENTS, SOCIAL_EVENTS,
  HOBBY_TEMPLATES, DORM_EVENT_IDS,
} from "../src/data/events/index.js";
import { SPECIAL_EVENTS } from "../src/data/events/special.js";
import { ACHIEVEMENTS } from "../src/data/achievements.js";
import { CGS } from "../src/data/cg/index.js";
import { ICONS } from "../src/data/icons/index.js";
import { EARLY_ENDINGS, GRAD_VARIANTS, POSTGRAD_OUTCOMES } from "../src/data/endings.js";
import {
  SPRITE_W, SPRITE_H, HOST_BASE, HOST_BASE_M, HOST_BASE_F,
  HOST_FACES, HOST_SICK, HOST_PROPS,
  CHAR_SPRITES, EXTRA_SPRITES, composeHostSprite, spriteFor, animFrameGrid,
  HOST_LOOP, CHAR_LOOP, CAT_LOOP,
  HOST_THEMES, DEFAULT_HOST_THEME,
} from "../src/data/sprites.js";

const errors = [];
const warn = [];
const err = (msg) => errors.push(msg);

const ALL_STATS = [...VISIBLE_STATS, ...HIDDEN_STATS];
const HOBBY_IDS = new Set(HOBBY_TEMPLATES.map((h) => h.id));
const EVENT_TYPES = new Set(["normal", "special", "inherent", "prerequisite", "hobby", "break"]);

// 1. ID 唯一性
function checkUnique(label, items, getKey) {
  const seen = new Set();
  for (const it of items) {
    const k = getKey(it);
    if (seen.has(k)) err(`[唯一性] ${label} ID 重复：${k}`);
    seen.add(k);
  }
}
checkUnique("事件", EVENTS, (e) => e.id);
checkUnique("事件(全)", [...EVENTS_BY_ID.values()], (e) => e.id);
checkUnique("人物", CHARACTERS, (c) => c.id);
checkUnique("寝室", DORMS, (d) => d.id);
checkUnique("成就", ACHIEVEMENTS, (a) => a.id);
checkUnique("CG", [...CGS.values()], (c) => c.id);
checkUnique("图标", [...ICONS.values()], (i) => i.id);

// 2. 引用完整性
for (const a of ACHIEVEMENTS) {
  if (a.cg && !CGS.has(a.cg)) err(`[引用] 成就 ${a.id} 的 CG 不存在：${a.cg}`);
  if (a.icon && !ICONS.has(a.icon)) err(`[引用] 成就 ${a.id} 的图标不存在：${a.icon}`);
}
for (const e of [...Object.values(EARLY_ENDINGS), ...GRAD_VARIANTS, ...POSTGRAD_OUTCOMES]) {
  if (e.cg && !CGS.has(e.cg)) err(`[引用] 结局 ${e.id} 的 CG 不存在：${e.cg}`);
  if (e.icon && !ICONS.has(e.icon)) err(`[引用] 结局 ${e.id} 的图标不存在：${e.icon}`);
}
for (const c of CHARACTERS) {
  for (const rid of c.relatedEvents || []) {
    if (!EVENTS_BY_ID.has(rid)) err(`[引用] 人物 ${c.id} 关联事件不存在：${rid}`);
  }
}
for (const d of DORMS) {
  for (const eid of d.events || []) {
    if (!DORM_EVENT_IDS.includes(eid)) err(`[引用] 寝室 ${d.id} 事件不在寝室事件池：${eid}`);
  }
}

function checkChoiceRefs(event, choice) {
  for (const id of choice.unlockCharacters || []) {
    if (!CHAR_BY_ID.has(id)) err(`[引用] ${event.id}.${choice.id} 解锁人物不存在：${id}`);
  }
  if (choice.unlockHobby && !HOBBY_IDS.has(choice.unlockHobby)) {
    err(`[引用] ${event.id}.${choice.id} 解锁兴趣不存在：${choice.unlockHobby}`);
  }
  if (choice.trigger?.id && !EVENTS_BY_ID.has(choice.trigger.id)) {
    err(`[引用] ${event.id}.${choice.id} trigger 事件不存在：${choice.trigger.id}`);
  }
  if (choice.effects?.characters) {
    for (const [id, eff] of Object.entries(choice.effects.characters)) {
      if (!CHAR_BY_ID.has(id)) err(`[引用] ${event.id}.${choice.id} 好感目标不存在：${id}`);
      for (const k of Object.keys(eff)) {
        if (!["affection", "dates"].includes(k)) err(`[字段] ${event.id}.${choice.id} effects.characters.${id} 非法键 ${k}`);
        else if (typeof eff[k] !== "number") err(`[字段] ${event.id}.${choice.id} effects.characters.${id}.${k} 非数字`);
      }
    }
  }
  if (choice.effects?.crush) {
    for (const [k, v] of Object.entries(choice.effects.crush)) {
      if (!["affection", "dates"].includes(k)) err(`[字段] ${event.id}.${choice.id} effects.crush 非法键 ${k}`);
      else if (typeof v !== "number") err(`[字段] ${event.id}.${choice.id} effects.crush.${k} 非数字`);
    }
  }
  const reqChars = event.requires?.characters;
  if (reqChars) {
    for (const id of Object.keys(reqChars)) {
      if (!CHAR_BY_ID.has(id)) err(`[引用] ${event.id} requires.characters 不存在：${id}`);
    }
  }
  for (const o of choice.outcomes || []) {
    if (o.trigger?.id && !EVENTS_BY_ID.has(o.trigger.id)) {
      err(`[引用] ${event.id}.${choice.id} outcome.trigger 不存在：${o.trigger.id}`);
    }
  }
}

// 3~5. 事件字段合法性
const STAT_KEYS = new Set(ALL_STATS);
function checkRange(event, tag, g, where) {
  if (g.min != null && g.max != null && g.min > g.max) {
    err(`[门槛] ${event.id} ${where} min>max：${tag}`);
  }
  if (g.stat !== undefined && !STAT_KEYS.has(g.stat)) {
    err(`[门槛] ${event.id} ${where} 属性名非法：${g.stat}`);
  }
}

for (const e of [...EVENTS_BY_ID.values()]) {
  if (!EVENT_TYPES.has(e.type)) err(`[类型] ${e.id} 类型非法：${e.type}`);
  if (!e.name) err(`[字段] ${e.id} 缺 name`);
  if (!e.choices?.length) err(`[字段] ${e.id} 无选项`);

  // 事件级门槛
  for (const g of e.gates || []) checkRange(e, "gates", g, "事件门槛");
  for (const g of e.hiddenGates || []) checkRange(e, "hiddenGates", g, "事件隐藏门槛");

  // requires
  const req = e.requires;
  if (req) {
    if (req.stats) for (const [k, r] of Object.entries(req.stats)) {
      if (!VISIBLE_STATS.includes(k)) err(`[门槛] ${e.id} requires.stats 属性非法：${k}`);
      if (r.min != null && r.max != null && r.min > r.max) err(`[门槛] ${e.id} requires.stats.${k} min>max`);
    }
    if (req.hidden) for (const [k, r] of Object.entries(req.hidden)) {
      if (!HIDDEN_STATS.includes(k)) err(`[门槛] ${e.id} requires.hidden 属性非法：${k}`);
      if (r.min != null && r.max != null && r.min > r.max) err(`[门槛] ${e.id} requires.hidden.${k} min>max`);
    }
    if (req.hobbies) for (const h of req.hobbies) {
      if (!HOBBY_IDS.has(h)) err(`[引用] ${e.id} requires.hobbies 不存在：${h}`);
    }
    if (req.characters) for (const [id, r] of Object.entries(req.characters)) {
      for (const k of Object.keys(r)) {
        if (!["affectionMin", "datesMin"].includes(k)) err(`[门槛] ${e.id} requires.characters.${id} 非法键 ${k}`);
        else if (typeof r[k] !== "number" || r[k] < 0) err(`[门槛] ${e.id} requires.characters.${id}.${k} 非法值`);
      }
    }
    for (const k of ["anyCrushAffectionMin", "anyCrushDatesMin"]) {
      if (req[k] != null && (typeof req[k] !== "number" || req[k] < 0)) err(`[门槛] ${e.id} requires.${k} 非法值`);
    }
  }

  // stage
  if (e.stage) {
    const [min, max] = e.stage.semesters;
    if (min < 1 || max > 8 || min > max) err(`[阶段] ${e.id} stage 非法：[${min},${max}]`);
  }

  // 固有类字段
  if (e.kind === "encounter" && !e.tags?.length) err(`[字段] ${e.id} 邂逅事件缺 tags`);
  if (e.kind === "encounter" && !(e.baseChance > 0)) err(`[字段] ${e.id} 邂逅事件缺 baseChance`);
  if (e.forced) {
    if (e.weight !== 0) warn.push(`[警告] ${e.id} 强制事件 weight 应为 0`);
    if (e.forced.semester < 1 || e.forced.semester > 8) err(`[挂点] ${e.id} 强制学期非法`);
    const w = e.forced.week;
    if (w !== "last" && (typeof w !== "number" || w < 1)) err(`[挂点] ${e.id} 强制周次非法`);
  }
  if (e.type === "break" && e.weight !== 0) warn.push(`[警告] ${e.id} 假期事件 weight 应为 0`);
  if (e.cooldown < 0) err(`[字段] ${e.id} cooldown 为负`);
  if (e.singleTermLimit != null && e.singleTermLimit < 1) err(`[字段] ${e.id} singleTermLimit 非法`);

  // 选项
  const choiceIds = new Set();
  for (const c of e.choices) {
    if (!c.id || !c.text) err(`[字段] ${e.id} 存在缺 id/text 的选项`);
    if (choiceIds.has(c.id)) err(`[唯一性] ${e.id} 选项 id 重复：${c.id}`);
    choiceIds.add(c.id);
    for (const g of c.gates || []) checkRange(e, g.stat, g, `选项 ${c.id} gates`);
    for (const g of c.hiddenGates || []) {
      if (g.flag === undefined) checkRange(e, g.stat, g, `选项 ${c.id} hiddenGates`);
    }
    const sum = (c.outcomes || []).reduce((a, o) => a + (o.p || 0), 0);
    if (sum > 1.001) err(`[概率] ${e.id}.${c.id} outcome 概率和 ${sum.toFixed(3)} > 1`);
    checkChoiceRefs(e, c);
  }
}

// 6. 强制事件挂点齐备
const REQUIRED_FORCED = [
  ["special_military", 1, 1],
  ["special_select_course", 1, 2],
  ["special_autumn", 7, 3],
  ["special_spring", 8, 3],
];
for (let n = 1; n <= 8; n++) {
  REQUIRED_FORCED.push([`special_midterm_s${n}`, n, 4 + (n % 2)]);
  REQUIRED_FORCED.push([`special_final_s${n}`, n, "last"]);
}
for (const [id, sem, week] of REQUIRED_FORCED) {
  const e = EVENTS_BY_ID.get(id);
  if (!e) { err(`[挂点] 缺少强制事件：${id}`); continue; }
  if (!e.forced || e.forced.semester !== sem || e.forced.week !== week) {
    err(`[挂点] ${id} 挂点应为 s${sem} w${week}`);
  }
}

// 7. 成就 check 函数对新初始 state 不抛异常
function mockState() {
  return {
    stats: Object.fromEntries(VISIBLE_STATS.map((k) => [k, 50])),
    hidden: Object.fromEntries(HIDDEN_STATS.map((k) => [k, 50])),
    flags: new Set(),
    ended: null,
    week: 5, semesterLength: 9, semester: 1, turn: 10,
    hobbies: new Set(),
    cooldowns: new Map(),
    termCounts: new Map(),
    choiceCounts: new Map(),
    happySemesters: 0, semStudyCount: 0, semSleepCount: 0,
    semEncounterCount: 0, bestScore: 0, studyStreak: 0, sleepStreak: 0,
  };
}
for (const a of ACHIEVEMENTS) {
  try {
    a.check({ state: mockState(), session: { restarts: 0 }, event: null, choice: null });
  } catch (ex) {
    err(`[成就] ${a.id} check 抛异常：${ex.message}`);
  }
}

// 8. CG / 图标帧尺寸一致
for (const cg of [...CGS.values()]) {
  for (const [fi, frame] of cg.frames.entries()) {
    if (frame.length !== cg.height) err(`[CG] ${cg.id} 第 ${fi + 1} 帧行数 ${frame.length} ≠ ${cg.height}`);
    for (const [ri, row] of frame.entries()) {
      if (row.length !== cg.width) err(`[CG] ${cg.id} 第 ${fi + 1} 帧第 ${ri + 1} 行长度 ${row.length} ≠ ${cg.width}`);
    }
  }
  for (const frame of cg.frames) {
    for (const row of frame) {
      for (const ch of row) {
        if (ch !== "." && !(ch in cg.palette)) err(`[CG] ${cg.id} 字符 ${ch} 不在调色板`);
      }
    }
  }
}
for (const icon of [...ICONS.values()]) {
  for (const [ri, row] of icon.frames[0].entries()) {
    if (row.length !== icon.width) err(`[图标] ${icon.id} 第 ${ri + 1} 行长度 ${row.length} ≠ ${icon.width}`);
    for (const ch of row) {
      if (ch !== "." && !(ch in icon.palette)) err(`[图标] ${icon.id} 字符 ${ch} 不在调色板`);
    }
  }
  if (icon.frames[0].length !== icon.height) err(`[图标] ${icon.id} 行数与 height 不符`);
}

// 9. 兴趣解锁链：无自指死锁（兴趣事件 requires 自身兴趣属正常解锁后行为，检查 unlock 来源存在）
const unlockableHobbies = new Set();
for (const e of [...EVENTS_BY_ID.values()]) {
  for (const c of e.choices) {
    if (c.unlockHobby) unlockableHobbies.add(c.unlockHobby);
  }
}
for (const h of HOBBY_IDS) {
  if (!unlockableHobbies.has(h)) err(`[兴趣] 兴趣 ${h} 无任何解锁来源`);
}

// 10. 邂逅/社交事件不入池
const poolIds = new Set(EVENTS.map((e) => e.id));
for (const e of [...ENCOUNTER_EVENTS, ...SOCIAL_EVENTS]) {
  if (poolIds.has(e.id)) err(`[池] 固有事件 ${e.id} 不应进入常规候选池`);
}

// 11. env 环境判断函数 / 历史文案模板
const ENV_CTXS = [
  { sceneTags: [], hostEvent: null },
  { sceneTags: ["dorm", "library", "street", "canteen", "classroom", "sports", "club", "hospital"], hostEvent: null },
];
for (const e of [...EVENTS_BY_ID.values()]) {
  if (e.env !== undefined) {
    if (typeof e.env !== "function") { err(`[env] ${e.id} env 必须是函数`); continue; }
    for (const ctx of ENV_CTXS) {
      try { e.env(mockState(), ctx); } catch (ex) {
        err(`[env] ${e.id} env 抛异常（sceneTags=${JSON.stringify(ctx.sceneTags)}）：${ex.message}`);
      }
    }
  }
  if (e.envPriority !== undefined && typeof e.envPriority !== "number") {
    err(`[env] ${e.id} envPriority 必须是数字`);
  }
  for (const c of e.choices || []) {
    if (c.historyVerb !== undefined && typeof c.historyVerb !== "string") {
      err(`[env] ${e.id}.${c.id} historyVerb 必须是字符串`);
    }
    if (c.historyText !== undefined) {
      if (typeof c.historyText !== "string") {
        err(`[env] ${e.id}.${c.id} historyText 必须是字符串`);
      } else {
        const placeholders = [...c.historyText.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
        for (const p of placeholders) {
          if (!["verb", "text", "times"].includes(p)) err(`[env] ${e.id}.${c.id} historyText 占位符非法：{${p}}`);
        }
      }
    }
  }
}

// 12. 考试突击保底：困难基础分 + 期中熬夜突击 + 期末临阵磨枪 ≥ 及格线（突击两场不挂科）
{
  const midCram = EVENTS_BY_ID.get("special_midterm_s1")?.choices?.find((c) => c.id === "cram");
  const finCram = EVENTS_BY_ID.get("special_final_s1")?.choices?.find((c) => c.id === "cram");
  const cramTotal = (midCram?.effects?.stats?.score || 0) + (finCram?.effects?.stats?.score || 0);
  if (cramTotal + DIFFICULTIES.hard.startScore < PASS_SCORE) {
    err(`[突击保底] 两场突击 ${cramTotal} + 困难基础分 ${DIFFICULTIES.hard.startScore} < 及格线 ${PASS_SCORE}`);
  }
}

// 13. 正常类 feedback 必填 / 变体表达（同位词）结构
function checkAliasItem(where, a, fields) {
  for (const f of fields) {
    if (typeof a[f] !== "string" || !a[f]) err(`[同位词] ${where} 变体缺 ${f}`);
  }
  if (a.feedback !== undefined && typeof a.feedback !== "string") {
    err(`[同位词] ${where} 变体 feedback 必须是字符串`);
  }
}
for (const e of [...EVENTS_BY_ID.values()]) {
  if (e.aliases !== undefined) {
    if (!Array.isArray(e.aliases)) err(`[同位词] ${e.id} aliases 必须是数组`);
    else for (const a of e.aliases) checkAliasItem(e.id, a, ["name", "description"]);
  }
  for (const c of e.choices || []) {
    if (e.type === "normal" && (typeof c.feedback !== "string" || !c.feedback.trim())) {
      err(`[feedback] ${e.id}.${c.id} 正常类选项必须有 feedback`);
    }
    if (c.aliases !== undefined) {
      if (!Array.isArray(c.aliases)) err(`[同位词] ${e.id}.${c.id} aliases 必须是数组`);
      else for (const a of c.aliases) checkAliasItem(`${e.id}.${c.id}`, a, ["text"]);
    }
  }
}

// 14. 开局加点指引 / 财富概念档位
for (const k of ALLOC_STATS) {
  if (typeof ALLOC_GUIDE[k] !== "string" || !ALLOC_GUIDE[k]) err(`[加点] ALLOC_GUIDE 缺 ${k} 说明`);
}
if (typeof HEALTH_SAFE !== "number" || HEALTH_SAFE < 0 || HEALTH_SAFE > 100) {
  err(`[加点] HEALTH_SAFE 非法：${HEALTH_SAFE}`);
}
for (const p of ALLOC_PRESETS) {
  if (!p.id || !p.name) { err("[加点] 预设缺 id/name"); continue; }
  for (const [diff, d] of Object.entries(DIFFICULTIES)) {
    const a = p.alloc?.[diff];
    if (!a) { err(`[加点] 预设 ${p.id} 缺 ${diff} 难度`); continue; }
    let sum = 0;
    for (const k of ALLOC_STATS) {
      const v = a[k];
      if (typeof v !== "number" || v < 0 || v > MAX_ALLOC_PER_STAT) {
        err(`[加点] 预设 ${p.id}.${diff}.${k} 非法：${v}`);
      } else sum += v;
    }
    if (sum !== d.points) err(`[加点] 预设 ${p.id}.${diff} 总和 ${sum} ≠ ${d.points}`);
    if (a.health < HEALTH_SAFE) err(`[加点] 预设 ${p.id}.${diff} 健康 ${a.health} < 安全线 ${HEALTH_SAFE}`);
  }
}
let prevMax = -Infinity;
for (const t of WEALTH_TIERS) {
  if (typeof t.max !== "number" || typeof t.label !== "string" || !t.label) {
    err("[财富档位] 档位项非法");
  }
  if (t.max <= prevMax) err("[财富档位] 阈值未升序");
  prevMax = t.max;
}
if (wealthConcept(2000) !== "财大气粗" || wealthConcept(0) !== "捉襟见肘" || wealthConcept(-100) !== "负债累累") {
  err("[财富档位] wealthConcept 抽样不正确");
}

// 15. 像素小人：事件 character 字段 / 素材网格 / 覆盖层边界 / 宿主合成
const CHAR_IDS = new Set(CHARACTERS.map((c) => c.id));
const SPRITE_IDS = new Set(CHAR_SPRITES.keys());
const LEGAL_CHAR = new Set([...CHAR_IDS, "@crush", "@roommate", "cat"]);
for (const e of [...EVENTS_BY_ID.values()]) {
  if (e.character === undefined) continue;
  if (typeof e.character !== "string" || !LEGAL_CHAR.has(e.character)) {
    err(`[立绘] ${e.id} character 非法：${e.character}`);
  }
}
for (const c of CHARACTERS) {
  if (!SPRITE_IDS.has(c.id)) err(`[立绘] 人物 ${c.id} 缺立绘`);
}
for (const id of SPRITE_IDS) {
  if (!CHAR_IDS.has(id)) err(`[立绘] CHAR_SPRITES 存在未知 id：${id}`);
}

function checkGrid(where, grid, palette, w, h) {
  if (!Array.isArray(grid) || grid.length !== h) { err(`[立绘] ${where} 网格行数 ${grid?.length} ≠ ${h}`); return; }
  for (const [ri, row] of grid.entries()) {
    if (row.length !== w) err(`[立绘] ${where} 第 ${ri + 1} 行长度 ${row.length} ≠ ${w}`);
    for (const ch of row) {
      if (ch !== "." && !(ch in palette)) err(`[立绘] ${where} 字符 ${ch} 不在调色板`);
    }
  }
}
function checkOverlay(where, o) {
  if (!o?.grid || !o.offset) { err(`[立绘] ${where} 缺 grid/offset`); return; }
  const { x, y } = o.offset;
  if (x < 0 || y < 0 || x + o.grid[0].length > SPRITE_W || y + o.grid.length > SPRITE_H) {
    err(`[立绘] ${where} 越界：offset (${x},${y}) + ${o.grid[0].length}×${o.grid.length}`);
  }
  checkGrid(where, o.grid, HOST_BASE.palette, o.grid[0].length, o.grid.length);
}
checkGrid("宿主基底", HOST_BASE.grid, HOST_BASE.palette, SPRITE_W, SPRITE_H);
for (const [k, f] of Object.entries(HOST_FACES)) checkOverlay(`表情 ${k}`, f);
for (const [k, s] of Object.entries(HOST_SICK)) checkOverlay(`生病 ${k}`, s);
for (const [k, p] of Object.entries(HOST_PROPS)) {
  checkOverlay(`道具 ${k}`, p);
  if (typeof p.label !== "string" || !p.label) err(`[立绘] 道具 ${k} 缺性格称号 label`);
}
for (const [id, s] of CHAR_SPRITES) checkGrid(`人物 ${id}`, s.grid, s.palette, SPRITE_W, SPRITE_H);
for (const [id, s] of EXTRA_SPRITES) checkGrid(`额外 ${id}`, s.grid, s.palette, SPRITE_W, SPRITE_H);

function checkComposed(stats, expects, notExpects = [], gender = "male") {
  const out = composeHostSprite(stats, gender);
  checkGrid("合成宿主", out.grid, out.palette, SPRITE_W, SPRITE_H);
  for (const ex of expects) {
    if (!out.overlays.includes(ex)) err(`[立绘] 合成缺覆盖层 ${ex}（stats=${JSON.stringify(stats)}）`);
  }
  for (const ex of notExpects) {
    if (out.overlays.includes(ex)) err(`[立绘] 合成多出覆盖层 ${ex}（stats=${JSON.stringify(stats)}）`);
  }
  return out;
}
checkComposed({ int: 50, health: 10, wealth: 0, charm: 0, physique: 0, mood: 20 }, ["sad", "bandaid", "sweat", "prop:int"]);
checkComposed({ int: 1, health: 80, wealth: 0, charm: 0, physique: 0, mood: 80 }, ["happy", "prop:health"], ["sad", "bandaid", "sweat"]);
checkComposed({ int: 50, health: 50, wealth: 50, charm: 50, physique: 50, mood: 50 }, ["prop:int"], ["happy", "sad", "bandaid", "sweat"]); // 全并列 → int 优先
checkComposed({ int: 3 }, ["prop:int"], ["happy", "sad", "bandaid", "sweat"]); // 缺 mood/health 不抛异常
if (!spriteFor("char_wang") || !spriteFor("cat") || spriteFor("nope")) {
  err("[立绘] spriteFor 查找行为异常");
}

// 16. 性别基底 + 待机动画（Task G）
checkGrid("女基底", HOST_BASE_F.grid, HOST_BASE_F.palette, SPRITE_W, SPRITE_H);
if (HOST_BASE_M !== HOST_BASE) err("[立绘] HOST_BASE_M 必须是 HOST_BASE 本身");
if (Object.keys(HOST_BASE_F.palette).some((k) => !(k in HOST_BASE.palette))) {
  err("[立绘] 女基底调色板引入了新字母");
}
// 脸区（第 0-12、16-23 行）必须与男基底逐行相同，保证表情/生病覆盖层对齐；仅第 13-15 行为长发
for (const row of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 17, 18, 19, 20, 21, 22, 23]) {
  if (HOST_BASE_F.grid[row] !== HOST_BASE.grid[row]) err(`[立绘] 女基底第 ${row + 1} 行应与男基底相同`);
}
for (const row of [13, 14, 15]) {
  if (HOST_BASE_F.grid[row] !== "HHSSSSSSSSSSSSHH") err(`[立绘] 女基底第 ${row + 1} 行应为长发行`);
}
for (const [k, o] of [...Object.entries(HOST_FACES), ...Object.entries(HOST_SICK), ...Object.entries(HOST_PROPS)]) {
  for (const row of o.grid) for (const ch of row) {
    if (ch !== "." && !(ch in HOST_BASE_F.palette)) err(`[立绘] 覆盖层 ${k} 字符 ${ch} 不在女基底调色板`);
  }
}
for (const k of ["male", "female"]) {
  const g = GENDERS[k];
  if (!g || typeof g.label !== "string" || !g.label || typeof g.pronoun !== "string" || !g.pronoun) {
    err(`[性别] GENDERS.${k} 缺 label/pronoun`);
  }
}
for (const [name, loop] of [["HOST_LOOP", HOST_LOOP], ["CHAR_LOOP", CHAR_LOOP], ["CAT_LOOP", CAT_LOOP]]) {
  if (!Array.isArray(loop) || !loop.length || loop.some((a) => typeof a !== "string")) {
    err(`[动画] ${name} 必须是非空字符串数组`);
  }
}

// 动画结构校验：frames/hold/dy/rows/stamp/loop 全部合法，且每帧合成结果 16×24 字符均在调色板
function checkAnims(where, sprite) {
  for (const [an, anim] of Object.entries(sprite.anims || {})) {
    if (!Array.isArray(anim.frames) || !anim.frames.length) { err(`[动画] ${where}.${an} frames 非空数组`); continue; }
    if (typeof anim.hold !== "number" || anim.hold <= 0) err(`[动画] ${where}.${an} hold 非法：${anim.hold}`);
    for (const [fi, f] of anim.frames.entries()) {
      if (f.dy !== undefined && (!Number.isInteger(f.dy) || Math.abs(f.dy) > 3)) {
        err(`[动画] ${where}.${an}[${fi}] dy 非法：${f.dy}`);
      }
      for (const [ri, row] of Object.entries(f.rows || {})) {
        const n = Number(ri);
        if (!Number.isInteger(n) || n < 0 || n >= SPRITE_H) { err(`[动画] ${where}.${an}[${fi}] rows 键越界：${ri}`); continue; }
        if (typeof row !== "string" || row.length !== SPRITE_W) { err(`[动画] ${where}.${an}[${fi}] rows[${ri}] 长度非法`); continue; }
        for (const ch of row) {
          if (ch !== "." && !(ch in sprite.palette)) err(`[动画] ${where}.${an}[${fi}] rows[${ri}] 字符 ${ch} 不在调色板`);
        }
      }
      if (f.stamp) {
        const st = f.stamp;
        if (!st.grid || !st.offset) { err(`[动画] ${where}.${an}[${fi}] stamp 缺 grid/offset`); continue; }
        const { x, y } = st.offset;
        if (x < 0 || y < 0 || x + st.grid[0].length > SPRITE_W || y + st.grid.length > SPRITE_H) {
          err(`[动画] ${where}.${an}[${fi}] stamp 越界`);
        }
        for (const row of st.grid) for (const ch of row) {
          if (ch !== "." && !(ch in sprite.palette)) err(`[动画] ${where}.${an}[${fi}] stamp 字符 ${ch} 不在调色板`);
        }
      }
    }
    // 防静止规则（任务 H）：每个动作必须至少一帧有位移或网格变化，杜绝“看不见的动作”回归
    let moving = false;
    for (let fi = 0; fi < anim.frames.length; fi++) {
      if ((anim.frames[fi].dy ?? 0) !== 0) { moving = true; break; }
      const { grid } = animFrameGrid(sprite, an, fi);
      if (grid.some((r, i) => r !== sprite.grid[i])) { moving = true; break; }
    }
    if (!moving) err(`[动画] ${where}.${an} 与基底完全静止（无 dy 位移也无网格变化）`);
  }
  if (!Array.isArray(sprite.loop) || !sprite.loop.length) { err(`[动画] ${where} 缺 loop`); return; }
  for (const an of sprite.loop) {
    if (!sprite.anims?.[an]) err(`[动画] ${where} loop 引用不存在的动作：${an}`);
  }
  for (const [an, anim] of Object.entries(sprite.anims || {})) {
    for (const fi of anim.frames.keys()) {
      const { grid } = animFrameGrid(sprite, an, fi);
      checkGrid(`${where} 动作 ${an} 第 ${fi} 帧`, grid, sprite.palette, SPRITE_W, SPRITE_H);
    }
  }
}
for (const [id, s] of CHAR_SPRITES) checkAnims(`人物 ${id}`, s);
for (const [id, s] of EXTRA_SPRITES) checkAnims(`额外 ${id}`, s);
checkAnims("合成宿主(男)", composeHostSprite({ int: 50, health: 10, wealth: 0, charm: 0, physique: 0, mood: 20 }));
checkAnims("合成宿主(女)", composeHostSprite({ int: 50, health: 10, wealth: 0, charm: 0, physique: 0, mood: 20 }, "female"));

// 合成后男女同状态对比：脸区逐行相同（覆盖层对齐），女版第 14 行长发
{
  const m = composeHostSprite({ int: 50, health: 10, wealth: 0, charm: 0, physique: 0, mood: 20 }, "male");
  const f = composeHostSprite({ int: 50, health: 10, wealth: 0, charm: 0, physique: 0, mood: 20 }, "female");
  for (const row of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 17, 18, 19, 20, 21, 22, 23]) {
    if (m.grid[row] !== f.grid[row]) err(`[立绘] 合成后第 ${row + 1} 行男女不一致（覆盖层应同对齐）`);
  }
  if (f.grid[13] !== "HHSSSSSSSSSSSSHH") err(`[立绘] 女版合成第 14 行应为长发：${f.grid[13]}`);
}
checkComposed({ int: 50, health: 10, wealth: 0, charm: 0, physique: 0, mood: 20 }, ["sad", "bandaid", "sweat", "prop:int"], [], "female");
checkComposed({ int: 3 }, ["prop:int"], ["happy", "sad", "bandaid", "sweat"], "female");

// 动画帧抽样：眨眼闭眼行（普通/镜片）/ 猫甩尾 / 未知动作回落
{
  const wang = spriteFor("char_wang");
  if (animFrameGrid(wang, "blink", 0).grid[7] !== "HSSSSSSSSSSSSSSH") {
    err(`[动画] char_wang 眨眼第 0 帧未闭眼：${animFrameGrid(wang, "blink", 0).grid[7]}`);
  }
  const li = spriteFor("char_li");
  if (animFrameGrid(li, "blink", 0).grid[7] !== "HSSGGGGGGGGGGSSH") {
    err("[动画] char_li 镜片闭眼应为 E→G");
  }
  const cat = spriteFor("cat");
  const tail0 = animFrameGrid(cat, "tail", 0);
  if (tail0.grid[11] !== "OOOOOOOOOOOOOOO.") err(`[动画] cat 甩尾第 0 帧不符：${tail0.grid[11]}`);
  const unknown = animFrameGrid(cat, "不存在的动作", 0);
  if (unknown.grid !== cat.grid || unknown.dy !== 0) err("[动画] 未知动作应回落基底静止帧");
  const hostHappy = composeHostSprite({ int: 50, health: 80, wealth: 0, charm: 0, physique: 0, mood: 80 });
  const blink0 = animFrameGrid(hostHappy, "blink", 0);
  if (blink0.dy !== 0) err("[动画] 宿主笑脸眨眼应走点头而非闭眼行");
}

// 17. 个性化主题配色（任务 H）
{
  const HEX6_RE = /^#[0-9a-fA-F]{6}$/;
  if (!Array.isArray(HOST_THEMES) || !HOST_THEMES.length) { err("[主题] HOST_THEMES 必须是非空数组"); }
  const ids = new Set();
  for (const t of HOST_THEMES) {
    if (!t.id || !t.name) { err("[主题] 主题缺 id/name"); continue; }
    if (ids.has(t.id)) err(`[主题] 主题 id 重复：${t.id}`);
    ids.add(t.id);
    for (const k of ["H", "C", "P"]) {
      const v = t.colors?.[k];
      if (typeof v !== "string" || !HEX6_RE.test(v)) err(`[主题] ${t.id}.colors.${k} 不是合法 hex：${v}`);
    }
  }
  if (!ids.has(DEFAULT_HOST_THEME)) err(`[主题] DEFAULT_HOST_THEME ${DEFAULT_HOST_THEME} 不在 HOST_THEMES`);
}
{
  const pink = composeHostSprite({ mood: 50 }, "male", "pink");
  if (pink.palette.C !== "#f78fb3" || pink.palette.H !== "#6b4a3a" || pink.palette.P !== "#4a3650") {
    err("[主题] pink 主题配色未生效");
  }
  if (pink.palette.S !== HOST_BASE.palette.S) err("[主题] 主题不应改动皮肤色 S");
  const fallback = composeHostSprite({ mood: 50 }, "male", "不存在的主题");
  if (fallback.palette.C !== HOST_THEMES[0].colors.C) err("[主题] 未知主题应回落默认");
  const custom = composeHostSprite({ mood: 50 }, "male", "blue", { H: "#111111", C: "#222222", P: "#333333" });
  if (custom.palette.H !== "#111111" || custom.palette.C !== "#222222" || custom.palette.P !== "#333333") {
    err("[主题] customColors 合法值未覆盖");
  }
  const bad = composeHostSprite({ mood: 50 }, "male", "blue", { H: "red", C: "#22222", P: "#3333333", S: "#abcdef" });
  if (bad.palette.H !== HOST_THEMES[0].colors.H || bad.palette.S !== HOST_BASE.palette.S) {
    err("[主题] customColors 非法值应被忽略");
  }
  const femaleTheme = composeHostSprite({ mood: 50 }, "female", "red", { C: "#abcdef" });
  if (femaleTheme.palette.C !== "#abcdef" || femaleTheme.grid[13] !== "HHSSSSSSSSSSSSHH") {
    err("[主题] 女基底 + 主题 + 微调组合失败");
  }
}

// 18. 特殊/假期事件长链（任务 B）：主 feedback 必填、链结构、子选项约束
const MIN_CHAIN_FB = 120;  // feedback 下限（样本 ≈140~215，允许相近）
const MIN_NODE_TEXT = 40;  // 节点场景描写下限

function checkChainNodes(where, nodes) {
  if (!Array.isArray(nodes) || !nodes.length) {
    err(`[长链] ${where} chain 必须是非空数组`);
    return;
  }
  for (const [ni, node] of nodes.entries()) {
    const nw = `${where}.node${ni + 1}`;
    if (typeof node.text !== "string" || node.text.trim().length < MIN_NODE_TEXT) {
      err(`[长链] ${nw} 场景描写缺失或 < ${MIN_NODE_TEXT} 字`);
    }
    if (!Array.isArray(node.choices) || node.choices.length < 2) {
      err(`[长链] ${nw} 子选项必须 ≥2`);
      continue;
    }
    const ids = new Set();
    for (const sub of node.choices) {
      const sw = `${nw}.${sub.id}`;
      if (!sub.id || ids.has(sub.id)) { err(`[长链] ${sw} 子选项 id 缺失或重复`); continue; }
      ids.add(sub.id);
      if (typeof sub.text !== "string" || !sub.text.trim()) err(`[长链] ${sw} 缺 text`);
      if (typeof sub.feedback !== "string" || sub.feedback.trim().length < MIN_CHAIN_FB) {
        err(`[长链] ${sw} feedback 缺失或 < ${MIN_CHAIN_FB} 字`);
      }
      // 子选项 = 确定性叙事：禁止随机分支/门槛/解锁/跳周
      if (sub.outcomes || sub.gates || sub.hiddenGates || sub.setFlags
        || sub.unlockHobby || sub.unlockCharacters || sub.skipTurns) {
        err(`[长链] ${sw} 子选项禁止 outcomes/gates/解锁类字段`);
      }
      if (sub.effects) {
        for (const k of Object.keys(sub.effects.stats || {})) {
          if (!STAT_KEYS.has(k)) err(`[长链] ${sw} effects.stats 非法键 ${k}`);
          if (k === "score") err(`[长链] ${sw} 子效果禁止直接改成绩（考试保底设计依赖）`);
        }
        for (const k of Object.keys(sub.effects.hidden || {})) {
          if (!["luck", "network"].includes(k)) err(`[长链] ${sw} effects.hidden 非法键 ${k}`);
        }
      }
    }
  }
}

// 链函数 mock 上下文 ×3：分别覆盖 flags 全有/全无/作弊被抓、借钱结果分支与 crush 三套人设（任务 I）
// ctx0 含 dating/dated → 表白成功链分支；ctx1/ctx2 无 dating → 失败链分支
const chainCtxs = [
  { state: { flags: new Set(["kaoyan_pass", "job_offer", "resume_ready", "met_lu", "met_roommate", "met_any_crush", "dating", "dated"]), roommates: ["char_wang", "char_li"], characters: new Map([["char_susu", { id: "char_susu", met: true, affection: 60, dates: 1 }]]) }, result: { deltas: { wealth: 500, mood: -5 } }, choice: null },
  { state: { flags: new Set(), roommates: ["char_wu", "char_zhao"], characters: new Map([["char_chenmo", { id: "char_chenmo", met: true, affection: 55, dates: 0 }]]) }, result: { deltas: { wealth: 0, mood: -2 } }, choice: null },
  { state: { flags: new Set(["cheated"]), roommates: ["char_qian", "char_sun"], characters: new Map([["char_linwan", { id: "char_linwan", met: true, affection: 70, dates: 2 }]]) }, result: { deltas: { wealth: 800, mood: -18 } }, choice: null },
];
let chainTotal = 0, chainNodeTotal = 0, chainSubTotal = 0, fbMin = Infinity, fbMax = 0;
for (const e of SPECIAL_EVENTS) {
  for (const c of e.choices || []) {
    const w = `${e.id}.${c.id}`;
    const fbLen = typeof c.feedback === "string" ? c.feedback.trim().length : 0;
    if (fbLen < MIN_CHAIN_FB) err(`[长链] ${w} 主选项 feedback 缺失或 < ${MIN_CHAIN_FB} 字（当前 ${fbLen}）`);
    fbMin = Math.min(fbMin, fbLen); fbMax = Math.max(fbMax, fbLen);
    chainTotal += 1;
    if (typeof c.chain === "function") {
      for (const [ci, ctx] of chainCtxs.entries()) {
        let nodes;
        try {
          nodes = c.chain({ ...ctx, choice: c });
        } catch (ex) {
          err(`[长链] ${w} 链函数 ctx#${ci} 抛异常：${ex.message}`);
          continue;
        }
        checkChainNodes(`${w}#${ci}`, nodes);
        if (ci === 0 && Array.isArray(nodes)) {
          chainNodeTotal += nodes.length;
          for (const node of nodes) chainSubTotal += node.choices?.length || 0;
        }
      }
    } else {
      checkChainNodes(w, c.chain);
      if (Array.isArray(c.chain)) {
        chainNodeTotal += c.chain.length;
        for (const node of c.chain) chainSubTotal += node.choices?.length || 0;
      }
    }
  }
}
console.log(`[长链] ${chainTotal} 链 / ${chainNodeTotal} 节点 / ${chainSubTotal} 子选项；feedback 长度 ${fbMin}~${fbMax} 字`);

// 输出
if (warn.length) console.log(warn.map((w) => `⚠ ${w}`).join("\n"));
if (errors.length) {
  console.error(`\n❌ 校验失败，共 ${errors.length} 个问题：`);
  for (const e of errors.slice(0, 80)) console.error(`  - ${e}`);
  if (errors.length > 80) console.error(`  …另有 ${errors.length - 80} 个问题`);
  process.exit(1);
}
console.log(`✅ 校验通过：${EVENTS_BY_ID.size} 事件 / ${CHARACTERS.length} 人物 / ${DORMS.length} 寝室 / ${ACHIEVEMENTS.length} 成就 / ${CGS.size} CG / ${ICONS.size} 图标`);
