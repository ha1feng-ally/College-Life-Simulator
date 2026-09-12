// 六屏渲染：标题 / 创建 / 游戏（回合+结算） / 学期结算 / 结局 + 历史与成就模态面板
import {
  DIFFICULTIES, ALLOC_STATS, STAT_NAMES, VISIBLE_STATS,
  START_MOOD, PASS_SCORE, MAX_ALLOC_PER_STAT,
  HEALTH_SAFE, ALLOC_GUIDE, ALLOC_PRESETS, wealthConcept,
  HISTORY_TEXT, GENDERS,
} from "../data/config.js";
import { CHAR_BY_ID } from "../data/characters.js";
import { VISIBLE_ACHIEVEMENTS, EGG_ACHIEVEMENTS } from "../data/achievements.js";
import { getIcon } from "../data/icons/index.js";
import { drawPixelGrid, renderToCanvas } from "../data/cg/pixel.js";
import {
  composeHostSprite, spriteFor, animFrameGrid,
  SPRITE_W, SPRITE_H, CHAR_LOOP,
  HOST_THEMES, DEFAULT_HOST_THEME,
} from "../data/sprites.js";
import { getCG } from "../data/cg/index.js";
import { createRng } from "../engine/random.js";
import { rollRoommatesAndDorm } from "../engine/flow.js";
import { el, button, clear } from "./dom.js";

const app = document.getElementById("app");

const EVENT_KIND_TAG = {
  normal: "日常", special: "重要", prerequisite: "剧情", hobby: "兴趣",
  break: "假期", inherent: "日常",
};
const INJECT_TAG = { encounter: "邂逅", social: "社交", hobby: "兴趣", ignore: "无视" };

// 历史选择文案：默认模板 + 每选项可自定义动词/整句（{verb}/{text}/{times}）
// text 为同位词解析后的文案（与当回合按钮一致）
function historyLabel(item, times) {
  const choice = item.choice;
  const text = item.text ?? choice.text;
  const tpl = choice.historyText || HISTORY_TEXT;
  const verb = choice.historyVerb || "选择";
  return tpl.replaceAll("{verb}", verb).replaceAll("{text}", text).replaceAll("{times}", String(times));
}

// ---------- 通用 ----------

function iconCanvas(iconId, scale = 3) {
  const icon = getIcon(iconId);
  if (!icon) return null;
  return renderToCanvas(icon.frames[0], icon.palette, scale);
}

function animatedCGCanvas(cg, scale = 13) {
  const canvas = document.createElement("canvas");
  canvas.width = cg.width * scale;
  canvas.height = cg.height * scale;
  const ctx = canvas.getContext("2d");
  let fi = 0;
  const draw = () => drawPixelGrid(ctx, cg.frames[fi % cg.frames.length], cg.palette, scale);
  draw();
  if (cg.frames.length > 1) setInterval(() => { fi += 1; draw(); }, cg.frameDelay || 400);
  return canvas;
}

// ---------- 像素小人（回合/结算两侧立绘 + 待机动画循环） ----------

const SPRITE_SCALE = 7; // 16×24 → 112×168px 基底（移动端用 CSS 缩放）
const SPRITE_PAD = 3;   // 画布上下各留 3 格余量，容纳 dy ∈ [-3, +3] 的动作位移（跳/叹气）
const TICK_MS = 250;    // 动画节拍：所有动作 hold 均为其整数倍

let stageTimer = null;  // 舞台动画定时器（每次重建舞台先清旧，卸载后自停）
let drivers = [];       // 本舞台的活动立绘驱动器

// 立绘画布：带余量底（静止位画在 SPRITE_PAD 处），返回 { canvas, ctx }
function stageSpriteCanvas(char) {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_W * SPRITE_SCALE;
  canvas.height = (SPRITE_H + SPRITE_PAD * 2) * SPRITE_SCALE;
  const ctx = canvas.getContext("2d");
  drawPixelGrid(ctx, char.grid, char.palette, SPRITE_SCALE, 0, SPRITE_PAD * SPRITE_SCALE);
  return { canvas, ctx };
}

// 左侧：事件出场人物（无则返回 null → 空白占位保持卡片居中）
function leftCharacter(pres) {
  const cid = pres?.character;
  if (!cid) return null;
  const spr = spriteFor(cid);
  if (!spr) return null;
  const meta = CHAR_BY_ID.get(cid); // "cat" 等非人物 id 用 EXTRA_SPRITES 兜底
  return {
    grid: spr.grid, palette: spr.palette,
    name: meta?.name ?? spr.name ?? "???",
    traits: meta?.traits ?? spr.traits ?? [],
    anims: spr.anims, loop: spr.loop ?? CHAR_LOOP,
  };
}

// 右侧：宿主（按当前属性实时合成：表情/生病/性格道具 + 性别基底 + 动画）
function hostCharacter(state) {
  const { grid, palette, persona, anims, loop } = composeHostSprite(state.stats, state.gender, state.theme, state.themeColors);
  return { grid, palette, name: state.name ?? "我", persona, traits: [], anims, loop };
}

// 帧驱动：acc 累加节拍，达到 hold 前进帧；帧播完 → 循环表步进
function tickDriver(d) {
  d.acc += TICK_MS;
  const loop = d.sprite.loop ?? [];
  const anim = d.sprite.anims?.[loop[d.step]];
  if (!anim) { d.step = (d.step + 1) % loop.length; d.frame = 0; d.acc = 0; return; }
  if (d.acc >= anim.hold) {
    d.acc = 0;
    d.frame += 1;
    if (d.frame >= anim.frames.length) { d.frame = 0; d.step = (d.step + 1) % loop.length; }
  }
  const { grid, dy } = animFrameGrid(d.sprite, loop[d.step], d.frame);
  d.ctx.clearRect(0, 0, d.canvas.width, d.canvas.height);
  drawPixelGrid(d.ctx, grid, d.sprite.palette, SPRITE_SCALE, 0, (SPRITE_PAD + dy) * SPRITE_SCALE);
}

function tickStage() {
  // 舞台已卸载（学期结算/结局屏等重建 screen）→ 自停
  if (drivers.length && drivers.every((d) => d.canvas.isConnected === false)) {
    clearInterval(stageTimer); stageTimer = null; drivers = [];
    return;
  }
  for (const d of drivers) tickDriver(d);
}

// 单人立绘盒：canvas + 姓名 + 性格标签/称号
function sideCharBox(char, side) {
  const box = el("div", `side-char ${side}`);
  if (!char) { box.classList.add("empty"); return box; }
  const { canvas, ctx } = stageSpriteCanvas(char);
  box.appendChild(canvas);
  box.appendChild(el("div", "side-name", char.name));
  if (char.persona) box.appendChild(el("span", "side-persona", char.persona));
  if (char.traits?.length) {
    const traits = el("div", "side-traits");
    for (const t of char.traits) traits.appendChild(el("span", "", t));
    box.appendChild(traits);
  }
  drivers.push({ canvas, ctx, sprite: char, step: 0, frame: 0, acc: 0 });
  return box;
}

// 两侧立绘 + 中间内容卡：左（事件人物）｜卡片｜右（宿主）
function buildStage(pres, state, card) {
  if (stageTimer !== null) { clearInterval(stageTimer); stageTimer = null; }
  drivers = [];
  const stage = el("div", "turn-stage");
  stage.append(sideCharBox(leftCharacter(pres), "side-left"), card, sideCharBox(hostCharacter(state), "side-right"));
  stageTimer = setInterval(tickStage, TICK_MS);
  return stage;
}

function statChips(state) {
  const grid = el("div", "stats-grid");
  for (const k of VISIBLE_STATS) {
    const chip = el("div", "stat-chip");
    const name = el("div", "sc-name", STAT_NAMES[k]);
    const v = state.stats[k];
    const val = el("div", "sc-val", k === "wealth" ? wealthConcept(v) : String(v));
    if ((k === "health" || k === "mood") && v < 30) val.classList.add("low");
    if ((k === "int" || k === "health" || k === "charm" || k === "physique" || k === "mood") && v >= 70) val.classList.add("high");
    if (k === "mood") chip.classList.add("mood-chip");
    chip.append(name, val);
    grid.appendChild(chip);
  }
  return grid;
}

function dormLine(state) {
  const passive = state.dorm.passive?.weekly?.stats || {};
  const eff = Object.entries(passive)
    .map(([k, v]) => `${STAT_NAMES[k] || k}${v > 0 ? "+" : ""}${v}`)
    .join(" ");
  const mates = state.roommates.map((id) => CHAR_BY_ID.get(id)?.name).filter(Boolean).join("、");
  return el("div", "gh-info", `${state.dorm.name} · ${state.dorm.type}（每周 ${eff}）｜舍友：${mates}`);
}

function unlockText(unlocks) {
  const out = [];
  for (const u of unlocks || []) {
    if (u.startsWith("char:")) {
      const c = CHAR_BY_ID.get(u.slice(5));
      if (c) out.push(`结识了 ${c.name}`);
    } else if (u.startsWith("hobby:")) {
      out.push(`解锁兴趣：${u.slice(6)}`);
    }
  }
  return out;
}

// 随机分配加点：健康恒 = HEALTH_SAFE（任何难度都不会开局生病），其余按权重随机（智力略高）
function randomAlloc(total) {
  const a = { int: 0, health: HEALTH_SAFE, wealth: 0, charm: 0, physique: 0 };
  let rest = total - HEALTH_SAFE;
  const pool = [["int", 3], ["wealth", 2], ["charm", 2], ["physique", 2]];
  while (rest > 0) {
    let r = Math.random() * 9, acc = 0, pick = "int";
    for (const [k, w] of pool) { acc += w; if (r <= acc) { pick = k; break; } }
    if (a[pick] < MAX_ALLOC_PER_STAT) { a[pick] += 1; rest -= 1; }
  }
  return a;
}

// 属性增减标签：财富为概念档位，只显示 ↑↓（不暴露具体数值）
function statDeltaLabel(k, v) {
  if (k === "wealth") return v > 0 ? "财富 ↑" : v < 0 ? "财富 ↓" : "财富 —";
  return `${STAT_NAMES[k]} ${v > 0 ? "+" : ""}${v}`;
}

// ---------- 成就横幅 ----------

export function showAchToast(ach) {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = el("div", "toast-stack");
    document.body.appendChild(stack);
  }
  const toast = el("div", "toast" + (ach.hidden ? " egg-banner" : ""));
  const icon = iconCanvas(ach.icon, 2);
  const name = el("span", "ach-name", `${ach.hidden ? "彩蛋解锁" : "成就解锁"}：${ach.name}`);
  toast.append(icon, name);
  stack.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

// ---------- 标题屏 ----------

export function renderTitle({ onStart }) {
  const s = el("div", "screen title-screen");
  s.append(
    el("div", "logo", "大学生活模拟器"),
    el("div", "subtitle", "COLLEGE LIFE SIMULATOR"),
    button("btn btn-primary start-btn", "开始游戏", onStart),
    el("div", "tip", "大学四年，转瞬即逝。\n你的每一个选择，都会让故事走向不同的方向。\n提示：本游戏无存档，刷新页面即重开。")
  );
  clear(app).appendChild(s);
}

// ---------- 创建屏 ----------

export function renderCreate({ onBack, onStart }) {
  const s = el("div", "screen create-screen");
  const cfg = {
    name: "", difficulty: "normal", gender: "male",
    theme: DEFAULT_HOST_THEME, colors: null,
    allocation: Object.fromEntries(ALLOC_STATS.map((k) => [k, 0])),
    seed: Math.floor(Math.random() * 0x7fffffff),
  };

  // 姓名
  s.appendChild(el("div", "step-title", "① 你的名字"));
  const nameInput = el("input", "name-input");
  nameInput.placeholder = "输入你的名字（不填就叫“无名氏”）";
  nameInput.maxLength = 12;
  nameInput.addEventListener("input", () => { cfg.name = nameInput.value.trim(); });
  const nameCard = el("div", "card");
  nameCard.append(el("div", "desc", "即将度过四年大学生活的人，叫什么？"), nameInput);
  s.appendChild(nameCard);

  // 性别（选择文案随性别切换人称；立绘实时预览男女基底）
  s.appendChild(el("div", "step-title", "② 选择性别"));
  const genderCard = el("div", "card");
  const genderGrid = el("div", "diff-cards cols-2");
  const genderEls = new Map();
  const genderDesc = el("div", "gender-desc");
  const genderPreview = el("div", "gender-preview");
  // 共享预览：性别 + 主题 + 取色器微调联动（mood 80 开朗基底，无道具）
  const renderPreview = () => composeHostSprite({ mood: 80 }, cfg.gender, cfg.theme, cfg.colors);
  const refreshGender = () => {
    const g = GENDERS[cfg.gender];
    for (const [gid, ce] of genderEls) ce.classList.toggle("selected", gid === cfg.gender);
    genderDesc.textContent = `${g.pronoun}将以「${g.label}」的身份开始大学生活——四年的冒险由你决定。`;
    const prev = renderPreview();
    genderPreview.replaceChildren(renderToCanvas(prev.grid, prev.palette, 4));
  };
  for (const [gid, g] of Object.entries(GENDERS)) {
    const c = el("div", "diff-card" + (gid === "male" ? " selected" : ""));
    c.append(el("div", "d-name", g.label), el("div", "d-points", `人称「${g.pronoun}」`));
    c.addEventListener("click", () => { cfg.gender = gid; refreshGender(); });
    genderEls.set(gid, c);
    genderGrid.appendChild(c);
  }
  genderCard.append(
    el("div", "desc", "选择你的性别——创建文案会随选择变化。"),
    genderGrid, genderDesc, genderPreview
  );
  s.appendChild(genderCard);
  refreshGender();

  // 装扮（任务 H）：8 主题卡 + 头发/上衣/裤子取色器微调
  s.appendChild(el("div", "step-title", "③ 选择装扮"));
  const themeCard = el("div", "card");
  const themeGrid = el("div", "diff-cards cols-4");
  const themeEls = new Map();
  const themePreview = el("div", "gender-preview");
  const COLOR_LABELS = { H: "头发", C: "上衣", P: "裤子" };
  const pickerInputs = {}; // H/C/P → input[type=color]
  const refreshTheme = () => {
    const t = HOST_THEMES.find((x) => x.id === cfg.theme) ?? HOST_THEMES[0];
    for (const [tid, ce] of themeEls) ce.classList.toggle("selected", tid === cfg.theme);
    for (const [k, inp] of Object.entries(pickerInputs)) inp.value = t.colors[k];
    const prev = renderPreview();
    themePreview.replaceChildren(renderToCanvas(prev.grid, prev.palette, 5));
  };
  for (const t of HOST_THEMES) {
    const c = el("div", "diff-card" + (t.id === DEFAULT_HOST_THEME ? " selected" : ""));
    const swatch = el("div", "theme-swatch");
    for (const k of ["H", "C", "P"]) {
      const dot = el("span", "swatch-dot");
      dot.style.background = t.colors[k];
      swatch.appendChild(dot);
    }
    c.append(swatch, el("div", "d-name", t.name));
    c.addEventListener("click", () => { cfg.theme = t.id; cfg.colors = null; refreshTheme(); });
    themeEls.set(t.id, c);
    themeGrid.appendChild(c);
  }
  const colorRow = el("div", "color-row");
  for (const [k, label] of Object.entries(COLOR_LABELS)) {
    const item = el("label", "color-item");
    item.appendChild(el("span", "", label));
    const inp = el("input");
    inp.type = "color";
    inp.value = "#000000"; // refreshTheme 会重置为主题色
    inp.addEventListener("input", () => {
      cfg.colors ??= {};
      cfg.colors[k] = inp.value;
      const prev = renderPreview();
      themePreview.replaceChildren(renderToCanvas(prev.grid, prev.palette, 5));
    });
    pickerInputs[k] = inp;
    item.appendChild(inp);
    colorRow.appendChild(item);
  }
  themeCard.append(
    el("div", "desc", "选一套主题，或点开取色器微调头发 / 上衣 / 裤子颜色。"),
    themeGrid, colorRow, themePreview
  );
  s.appendChild(themeCard);
  refreshTheme();

  // 难度
  s.appendChild(el("div", "step-title", "④ 选择难度"));
  const diffCard = el("div", "card");
  const diffGrid = el("div", "diff-cards");
  const diffEls = new Map();
  for (const [id, d] of Object.entries(DIFFICULTIES)) {
    const c = el("div", "diff-card" + (id === "normal" ? " selected" : ""));
    c.append(el("div", "d-name", d.name), el("div", "d-points", `${d.points} 点`));
    c.addEventListener("click", () => {
      cfg.difficulty = id;
      for (const [did, ce] of diffEls) ce.classList.toggle("selected", did === id);
      refreshPoints();
    });
    diffEls.set(id, c);
    diffGrid.appendChild(c);
  }
  diffCard.appendChild(diffGrid);
  s.appendChild(diffCard);

  // 加点
  s.appendChild(el("div", "step-title", "⑤ 分配属性点"));
  const allocCard = el("div", "card");
  const pointsBar = el("div", "points-bar");
  const remainEl = el("span", "remain");
  const warnEl = el("div", "alloc-warn hidden"); // 健康偏低实时警告
  const refreshPoints = () => {
    const total = DIFFICULTIES[cfg.difficulty].points;
    const used = ALLOC_STATS.reduce((a, k) => a + cfg.allocation[k], 0);
    remainEl.textContent = String(total - used);
    pointsBar.replaceChildren("剩余点数：", remainEl);
    for (const [k, row] of allocRows) {
      row.plus.disabled = cfg.allocation[k] >= MAX_ALLOC_PER_STAT || total - used <= 0;
      row.minus.disabled = cfg.allocation[k] <= 0;
    }
    // 健康安全线警告：低于 31 开局会触发生病事件
    warnEl.textContent = `⚠ 健康 ${cfg.allocation.health} 低于 ${HEALTH_SAFE}：开学后很容易生病（吃药/住院）`;
    warnEl.classList.toggle("hidden", cfg.allocation.health >= HEALTH_SAFE);
  };
  const allocRows = new Map();
  for (const k of ALLOC_STATS) {
    const row = el("div", "stat-alloc-row");
    const minus = button("alloc-btn", "−", () => {
      cfg.allocation[k] -= 1; valEl.textContent = String(cfg.allocation[k]); refreshPoints();
    });
    const valEl = el("span", "s-val", "0");
    const plus = button("alloc-btn", "＋", () => {
      cfg.allocation[k] += 1; valEl.textContent = String(cfg.allocation[k]); refreshPoints();
    });
    const note = el("span", "s-fixed", ALLOC_GUIDE[k] || ""); // 属性说明（财富只作概念，无 ¥ 换算）
    row.append(el("span", "s-name", STAT_NAMES[k]), minus, valEl, plus, note);
    allocRows.set(k, { plus, minus, val: valEl });
    allocCard.appendChild(row);
  }
  allocCard.append(
    el("div", "stat-alloc-row mood-fixed-row", `心情（固定） ${START_MOOD} · 成绩由学习决定`),
    warnEl
  );
  allocCard.appendChild(pointsBar);
  // 一键分配：四种风格预设 + 随机（随机恒保健康 ≥ 31，任何难度不会开局生病）
  const applyAlloc = (alloc) => {
    for (const k of ALLOC_STATS) {
      cfg.allocation[k] = alloc[k];
      allocRows.get(k).val.textContent = String(alloc[k]);
    }
    refreshPoints();
  };
  const presetRow = el("div", "btn-row preset-row");
  for (const p of ALLOC_PRESETS) {
    presetRow.appendChild(button("btn btn-sm", p.name, () => applyAlloc({ ...p.alloc[cfg.difficulty] })));
  }
  presetRow.appendChild(button("btn btn-sm", "🎲 随机", () => applyAlloc(randomAlloc(DIFFICULTIES[cfg.difficulty].points))));
  allocCard.appendChild(presetRow);
  s.appendChild(allocCard);
  refreshPoints();

  // roll 舍友 + 寝室
  s.appendChild(el("div", "step-title", "⑥ 掷骰：舍友与寝室"));
  const rollCard = el("div", "card");
  const rollBox = el("div", "roll-box");
  const rollBtn = button("btn btn-block", "🎲 重新掷骰", null);
  const doRoll = () => {
    cfg.seed = Math.floor(Math.random() * 0x7fffffff);
    rollBox.replaceChildren(el("div", "roll-anim", "掷骰中……"));
    rollBtn.disabled = true;
    setTimeout(() => {
      const rng = createRng(cfg.seed);
      const { roommates, dorm } = rollRoommatesAndDorm(rng);
      const names = roommates.map((id) => CHAR_BY_ID.get(id)?.name).filter(Boolean).join("、");
      const traits = roommates
        .map((id) => CHAR_BY_ID.get(id)?.traits.join("/"))
        .filter(Boolean)
        .join(" ｜ ");
      rollBox.replaceChildren(
        el("div", "roll-result", `${dorm.name} · ${dorm.type}：${dorm.desc}`),
        el("div", "roll-result", `舍友：${names}`),
        el("div", "roll-result", `性格：${traits}`)
      );
      rollBtn.disabled = false;
    }, 350);
  };
  rollBtn.addEventListener("click", doRoll);
  rollCard.append(rollBox, rollBtn);
  s.appendChild(rollCard);

  // 开始
  const startBtn = button("btn btn-primary btn-block", "开始大学生活 ▸", () => {
    const total = DIFFICULTIES[cfg.difficulty].points;
    const used = ALLOC_STATS.reduce((a, k) => a + cfg.allocation[k], 0);
    if (used > total) return;
    onStart({ ...cfg, name: cfg.name || "无名氏" });
  });
  const backBtn = button("btn", "← 返回标题", onBack);
  const startRow = el("div", "btn-row");
  startRow.append(startBtn, backBtn);
  s.appendChild(startRow);

  clear(app).appendChild(s);
  doRoll();
}

// ---------- 游戏屏：回合 ----------

export function renderTurn(game, { onChoose, onHistory, onAchievements, onRestart }) {
  const state = game.state;
  const pres = game.presentation;
  const { event, meta } = pres;

  const s = el("div", "screen game-screen");

  // 头部
  const header = el("div", "game-header");
  const info = el("div", "gh-info");
  info.innerHTML = meta.isBreak
    ? `<b>第 ${meta.semester} 学期</b> · 假期`
    : `<b>第 ${meta.semester} 学期</b> · 第 <b>${meta.week}</b>/${meta.semesterLength} 周`;
  const btns = el("div", "gh-btns");
  btns.append(
    button("btn btn-sm", "📜 历史", onHistory),
    button("btn btn-sm", "🏆 成就", onAchievements),
    button("btn btn-sm btn-danger", "重开", onRestart)
  );
  header.append(info, btns);
  s.append(header, statChips(state), dormLine(state));

  // 事件卡
  const card = el("div", "card event-card");
  const tags = el("div", "ev-tags");
  const kindTag = el("span", "ev-tag", EVENT_KIND_TAG[event.type] || "日常");
  if (event.kind === "encounter") kindTag.textContent = "邂逅";
  if (event.kind === "social") kindTag.textContent = "社交";
  tags.appendChild(kindTag);
  if (meta.forced || meta.isBreak) {
    const ft = el("span", "ev-tag forced", "剧情");
    tags.appendChild(ft);
  }
  card.append(tags, el("div", "ev-name", event.name), el("div", "ev-desc", event.description));
  s.appendChild(buildStage(pres, state, card));

  // 选项
  const choices = el("div", "choices");
  for (const item of pres.choices) {
    const { choice, inject, sourceEvent, times } = item;
    const b = el("button", "choice-btn");
    if (inject) {
      const t = el("span", "c-tag " + inject, INJECT_TAG[inject] || inject);
      b.appendChild(t);
    } else if (sourceEvent && sourceEvent !== pres.event) {
      // 环境事件贡献的选项：标注来源事件
      const t = el("span", "c-tag src", sourceEvent.name);
      b.appendChild(t);
    }
    if (times > 0) {
      b.append(document.createTextNode(historyLabel(item, times)));
      b.appendChild(el("span", "c-times", `×${times}`));
    } else {
      b.append(document.createTextNode(item.text ?? choice.text));
    }
    b.addEventListener("click", () => onChoose(choice.id));
    choices.appendChild(b);
  }
  const choiceCard = el("div", "card");
  choiceCard.appendChild(choices);
  s.appendChild(choiceCard);

  clear(app).appendChild(s);
  window.scrollTo(0, 0);
}

// ---------- 长链剧情屏（任务 B：小说式多段选择） ----------

export function renderChain(game, { onPick, onHistory, onAchievements, onRestart }) {
  const state = game.state;
  const ch = game.chain;
  const pres = game.presentation;
  const { event, meta } = pres;
  const node = ch.nodes[ch.idx];

  const s = el("div", "screen game-screen");

  // 头部（与回合屏一致）
  const header = el("div", "game-header");
  const info = el("div", "gh-info");
  info.innerHTML = meta.isBreak
    ? `<b>第 ${meta.semester} 学期</b> · 假期`
    : `<b>第 ${meta.semester} 学期</b> · 第 <b>${meta.week}</b>/${meta.semesterLength} 周`;
  const btns = el("div", "gh-btns");
  btns.append(
    button("btn btn-sm", "📜 历史", onHistory),
    button("btn btn-sm", "🏆 成就", onAchievements),
    button("btn btn-sm btn-danger", "重开", onRestart)
  );
  header.append(info, btns);
  s.append(header, statChips(state), dormLine(state));

  const card = el("div", "card chain-card");
  card.appendChild(el("div", "chain-title", `— ${ch.event?.name || event.name} · 故事延续 —`));

  // 开头段：主选项 feedback
  const fb = game.lastChosen?.feedback;
  if (fb) card.appendChild(el("div", "chain-feedback", fb));

  // 已选段（承）：每段 = 选择 + 该段反馈
  for (const p of ch.picks) {
    card.appendChild(el("div", "chain-pick", `▸ 你选择了：${p.text}`));
    if (p.feedback) card.appendChild(el("div", "chain-feedback", p.feedback));
  }

  // 当前场景（转）：节点描写
  card.appendChild(el("div", "chain-scene", node.text));

  // 子选项
  const choices = el("div", "choices");
  for (const sub of node.choices) {
    const b = el("button", "choice-btn", sub.text);
    b.addEventListener("click", () => onPick(sub.id));
    choices.appendChild(b);
  }
  card.appendChild(choices);

  // 两侧立绘动画在链中保持
  s.appendChild(buildStage(pres, state, card));
  clear(app).appendChild(s);
  window.scrollTo(0, 0);
}

// ---------- 结算面板 ----------

export function renderResult(game, { onNext }) {
  const state = game.state;
  const r = game.lastResult;
  const s = el("div", "screen");

  // 属性
  s.appendChild(statChips(state));

  const card = el("div", "card result-panel");
  card.appendChild(el("div", "rp-title", "— 本回合结算 —"));
  // 选择反馈（10 人格视角内心独白；同位词解析后文案）——先故事后加点
  const feedback = game.lastChosen?.feedback;
  if (feedback) card.appendChild(el("div", "rp-feedback", feedback));
  if (r.log) card.appendChild(el("div", "rp-log", r.log));

  const deltas = el("div", "deltas");
  let hasDelta = false;
  for (const k of VISIBLE_STATS) {
    const v = r.deltas?.[k];
    if (!v) continue;
    hasDelta = true;
    const cls = v > 0 ? "up" : v < 0 ? "down" : "neutral";
    deltas.appendChild(el("span", `delta ${cls}`, statDeltaLabel(k, v)));
  }
  if (hasDelta) card.appendChild(deltas);

  const unlocks = unlockText(r.unlocks);
  if (unlocks.length) card.appendChild(el("div", "rp-log", unlocks.map((u) => `✦ ${u}`).join("\n")));

  const foot = el("div", "footer-row");
  foot.appendChild(button("btn btn-primary", "继续 ▸", onNext));
  card.appendChild(foot);
  // 结算屏同样展示两侧立绘：宿主 stats 已结算，表情/生病随结果变化
  s.appendChild(buildStage(game.presentation, state, card));
  clear(app).appendChild(s);
  window.scrollTo(0, 0);
}

// ---------- 学期结算屏 ----------

export function renderSemesterEnd(game, summary, { onNext }) {
  const s = el("div", "screen");
  s.appendChild(statChips(game.state));
  const card = el("div", "card result-panel");
  card.appendChild(el("div", "rp-title", `— 第 ${summary.semester} 学期结算 —`));
  const passed = summary.passed;
  card.appendChild(
    el("div", "rp-log",
      `期末成绩：${summary.score} / 及格线 ${PASS_SCORE}\n` +
      `${passed ? "✅ 顺利通过！" : "❌ 挂科了……"}（累计挂科 ${summary.failCount} 学期）`)
  );
  const foot = el("div", "footer-row");
  foot.appendChild(button("btn btn-primary", "继续 ▸", onNext));
  card.appendChild(foot);
  s.appendChild(card);
  clear(app).appendChild(s);
  window.scrollTo(0, 0);
}

// ---------- 结局屏 ----------

export function renderEnding(game, { onTitle, onAgain }) {
  const state = game.state;
  const ended = state.ended;
  const s = el("div", "screen ending-screen");

  const isEarly = ended.kind === "early";
  const kind = el("div", "end-kind" + (isEarly ? " early" : ""), isEarly ? "提前结局" : "毕业结局");
  s.appendChild(kind);

  let title, desc, cgId;
  if (isEarly) {
    title = ended.ending.title;
    desc = ended.ending.desc ? ended.ending.desc(state) : "";
    cgId = ended.ending.cg;
  } else {
    const { variant } = ended.grad;
    title = variant.title;
    desc = variant.desc ? variant.desc(state) : "";
    cgId = variant.cg;
  }

  s.appendChild(el("div", "end-title", title));
  const descEl = el("div", "end-desc");
  for (const line of desc.split("\n")) descEl.appendChild(el("div", "", line));
  s.appendChild(descEl);

  const cg = getCG(cgId);
  if (cg) {
    const wrap = el("div", "ending-cg");
    wrap.appendChild(animatedCGCanvas(cg, 12));
    s.appendChild(wrap);
  }

  // 毕业后结果（纯展示）
  if (!isEarly) {
    const pg = ended.grad.postgrad;
    const block = el("div", "card");
    block.appendChild(el("div", "end-postgrad", `毕业后：${pg.title}`));
    const row = el("div", "ach-card");
    const ic = iconCanvas(pg.icon, 3);
    if (ic) { ic.className = "ach-icon"; row.appendChild(ic); }
    row.appendChild(el("div", "ach-desc", pg.desc));
    block.appendChild(row);
    s.appendChild(block);
  }

  // 数据回顾
  const recap = el("div", "card recap-table");
  const met = [...state.characters.values()].filter((c) => c.met).length;
  const achCount = state.achieved.size;
  const eggCount = EGG_ACHIEVEMENTS.filter((e) => state.achieved.has(e.id)).length;
  const rows = [
    ["姓名", state.name],
    ["难度", DIFFICULTIES[state.difficulty].name],
    ["总回合", String(state.turn)],
    ["智力 / 体魄 / 魅力", `${state.stats.int} / ${state.stats.physique} / ${state.stats.charm}`],
    ["财富 / 心情", `${wealthConcept(state.stats.wealth)} / ${state.stats.mood}`],
    ["结识人数", String(met)],
    ["解锁成就", `${achCount} / ${VISIBLE_ACHIEVEMENTS.length + EGG_ACHIEVEMENTS.length}`],
  ];
  if (!isEarly && state.semesterScores.length) {
    rows.splice(4, 0, ["平均成绩", (state.semesterScores.reduce((a, b) => a + b, 0) / state.semesterScores.length).toFixed(1)]);
  }
  const table = el("table");
  for (const [k, v] of rows) {
    const tr = el("tr");
    tr.append(el("td", "", k), el("td", "", v));
    table.appendChild(tr);
  }
  recap.appendChild(table);
  s.appendChild(recap);

  if (eggCount) s.appendChild(el("div", "egg-count", `🎉 本局触发彩蛋 ${eggCount} 个`));

  // 告别语
  if (!isEarly) {
    const fw = [...state.characters.values()]
      .filter((c) => c.met)
      .map((c) => CHAR_BY_ID.get(c.id)?.farewell)
      .filter(Boolean)
      .slice(0, 3);
    if (fw.length) {
      const fb = el("div", "card");
      fb.appendChild(el("h3", "", "他们的告别"));
      for (const line of fw) fb.appendChild(el("div", "end-desc", `「${line}」`));
      s.appendChild(fb);
    }
  }

  const foot = el("div", "footer-row");
  foot.append(button("btn btn-primary", "再来一局", onAgain), button("btn", "返回标题", onTitle));
  s.appendChild(foot);
  clear(app).appendChild(s);
  window.scrollTo(0, 0);
}

// ---------- 历史回顾模态 ----------

export function openHistory(game) {
  const state = game.state;
  const overlay = el("div", "modal-overlay");
  const panel = el("div", "modal-panel");
  const head = el("div", "modal-head");
  head.append(el("h2", "", "📜 历史回顾"), button("btn btn-sm", "关闭", () => overlay.remove()));
  const body = el("div", "modal-body");

  const groups = new Map();
  for (const h of state.history) {
    if (!groups.has(h.semester)) groups.set(h.semester, []);
    groups.get(h.semester).push(h);
  }

  const total = state.history.filter((h) => h.choiceId).length;
  body.appendChild(el("div", "hi-head", `共做出 ${total} 次选择`));

  for (const [sem, items] of [...groups.entries()].sort((a, b) => b[0] - a[0])) {
    const group = el("div", "history-group");
    const gh = el("div", "hg-head", `第 ${sem} 学期（${items.length} 条）`);
    const list = el("div");
    gh.addEventListener("click", () => list.classList.toggle("hidden"));
    for (const h of items) {
      const it = el("div", "history-item");
      if (h.summary) {
        it.append(
          el("div", "hi-head", `${h.eventName}：${h.summary.passed ? "✅ 通过" : "❌ 挂科"} · 成绩 ${h.summary.score}`)
        );
      } else {
        const head2 = el("div", "hi-head");
        head2.append(
          el("b", "", `${h.isBreak ? "假期" : `第 ${h.week} 周`} · ${h.eventName}`)
        );
        it.appendChild(head2);
        if (h.choiceText) it.appendChild(el("div", "hi-choice", `→ ${h.choiceText}`));
        if (h.chain?.length) it.appendChild(el("div", "hi-log", `↳ ${h.chain.join(" / ")}`));
        if (h.log) it.appendChild(el("div", "hi-log", h.log));
        if (h.deltas) {
          const ds = VISIBLE_STATS
            .filter((k) => h.deltas[k])
            .map((k) => statDeltaLabel(k, h.deltas[k]))
            .join(" ");
          if (ds) it.appendChild(el("div", "hi-log", ds));
        }
      }
      list.appendChild(it);
    }
    group.append(gh, list);
    body.appendChild(group);
  }
  if (!state.history.length) body.appendChild(el("div", "hi-log", "还没有任何记录。"));

  panel.append(head, body);
  overlay.appendChild(panel);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ---------- 成就面板 ----------

export function openAchievements(game) {
  const state = game.state;
  const overlay = el("div", "modal-overlay");
  const panel = el("div", "modal-panel");
  const head = el("div", "modal-head");
  head.append(el("h2", "", "🏆 成就"), button("btn btn-sm", "关闭", () => overlay.remove()));
  const body = el("div", "modal-body");

  const unlockedEggs = EGG_ACHIEVEMENTS.filter((e) => state.achieved.has(e.id));
  const all = [...VISIBLE_ACHIEVEMENTS, ...unlockedEggs];

  const grid = el("div", "ach-grid");
  for (const a of all) {
    const unlocked = state.achieved.has(a.id);
    const card = el("div", `ach-card ${unlocked ? (a.hidden ? "egg-unlocked egg-banner" : "unlocked") : "locked"}`);
    const ic = iconCanvas(a.icon, 3);
    if (ic) { ic.className = "ach-icon"; card.appendChild(ic); }
    const info = el("div");
    info.append(el("div", "ach-name", a.name), el("div", "ach-desc", a.desc));
    card.appendChild(info);
    grid.appendChild(card);
  }
  body.appendChild(grid);
  body.appendChild(
    el("div", "egg-locked-hint",
      unlockedEggs.length ? `✨ 彩蛋 ${unlockedEggs.length}/${EGG_ACHIEVEMENTS.length}` : "✨ 还有隐藏的彩蛋，等待有缘人……")
  );

  panel.append(head, body);
  overlay.appendChild(panel);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}
