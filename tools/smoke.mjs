// DOM 桩冒烟测试：无需浏览器，验证 UI 层六屏渲染 + 完整一局流程不抛异常
// 用法：node tools/smoke.mjs
// 桩对象只实现 renderer/main 用到的最小 API，不校验像素，只保证"跑得通"

function makeEl(tag) {
  return {
    tagName: tag, children: [], className: "", textContent: "",
    innerHTML: "", disabled: false, maxLength: 0, placeholder: "",
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    append(...cs) {
      for (const c of cs) {
        if (c == null) continue;
        if (typeof c === "string" || typeof c === "number") { this.textContent += String(c); continue; }
        c.parentNode = this; this.children.push(c);
      }
      return this;
    },
    appendChild(c) {
      if (typeof c === "string" || typeof c === "number") { this.textContent += String(c); return c; }
      c.parentNode = this; this.children.push(c); return c;
    },
    replaceChildren(...cs) { this.children = []; this.append(...cs); },
    remove() {
      if (this.parentNode) {
        this.parentNode.children = this.parentNode.children.filter((x) => x !== this);
      }
    },
    addEventListener() {},
    querySelector() { return null; },
    getContext() {
      if (!this._ctx) { // 缓存同一 ctx：像素动作断言需要记录 fillRect 调用
        this._ctx = {
          calls: [],
          fillRect(x, y, w, h) { this.calls.push({ x, y, w, h }); },
          clearRect() {}, save() {}, restore() {},
          translate() {}, rotate() {}, fillText() {},
          beginPath() {}, arc() {}, fill() {}, set fillStyle(v) {},
        };
      }
      return this._ctx;
    },
    focus() {},
  };
}

const app = makeEl("div");
globalThis.document = {
  getElementById: (id) => (id === "app" ? app : null),
  createElement: (tag) => makeEl(tag),
  createTextNode: (t) => ({ nodeType: 3, textContent: t }),
  body: makeEl("body"),
  querySelector: () => null,
};
globalThis.window = {
  confirm: () => false,
  scrollTo: () => {},
  innerWidth: 800,
  innerHeight: 600,
  addEventListener() {},
  removeEventListener() {},
};
globalThis.setTimeout = () => 0;         // 不执行回调（掷骰动画/CG 计时跳过）
let stageTick = null;                    // 捕获舞台动画回调（动作可见性断言手动推进用）
globalThis.setInterval = (fn) => { stageTick = fn; return 0; };
globalThis.clearInterval = () => 0;      // 舞台动画定时器重建/自停时清旧（必须桩，否则 ReferenceError）
globalThis.requestAnimationFrame = () => 0;
globalThis.performance = { now: () => 0 };

const { Game } = await import("../src/engine/flow.js");
const R = await import("../src/ui/renderer.js");
const main = await import("../src/main.js");
const SPRITES = await import("../src/data/sprites.js");
const SPECIAL = (await import("../src/data/events/special.js")).SPECIAL_EVENTS;

const steps = [];
const assert = (cond, msg) => {
  steps.push((cond ? "✓ " : "✗ ") + msg);
  if (!cond) process.exitCode = 1;
};

// 递归提取 DOM 桩中的全部文本（textContent + innerHTML + 子节点）
function textOf(node) {
  let out = `${node.textContent || ""} ${node.innerHTML || ""}`;
  for (const c of node.children || []) out += " " + textOf(c);
  return out;
}

// 树遍历计数（像素小人 canvas 数量断言用）
function countNodes(node, pred) {
  let n = pred(node) ? 1 : 0;
  for (const c of node.children || []) n += countNodes(c, pred);
  return n;
}
const canvasCount = () => countNodes(app, (n) => n.tagName === "canvas");

// 0. 像素小人素材与合成单元断言
const hostLow = SPRITES.composeHostSprite({ int: 50, health: 10, wealth: 0, charm: 0, physique: 0, mood: 20 });
assert(
  ["sad", "bandaid", "sweat", "prop:int"].every((o) => hostLow.overlays.includes(o)),
  "宿主低心情+低健康合成覆盖层（哭脸+创可贴+冷汗+卷王道具）"
);
assert(
  !!SPRITES.spriteFor("char_wang") && !!SPRITES.spriteFor("cat") && !SPRITES.spriteFor("不存在"),
  "spriteFor 查找（角色/额外精灵/未知 id）"
);
const hostF = SPRITES.composeHostSprite({ int: 50, health: 10, wealth: 0, charm: 0, physique: 0, mood: 20 }, "female");
assert(
  hostF.overlays.includes("sad") && hostF.grid[13] === "HHSSSSSSSSSSSSHH",
  "女宿主合成：覆盖层与男版一致 + 长发基底"
);
const wangBlink = SPRITES.animFrameGrid(SPRITES.spriteFor("char_wang"), "blink", 0);
assert(wangBlink.grid[7] === "HSSSSSSSSSSSSSSH", "char_wang 眨眼帧闭眼行程序生成");
const pinkSpr = SPRITES.composeHostSprite({ mood: 50 }, "male", "pink");
assert(pinkSpr.palette.C === "#f78fb3", "pink 主题调色板生效");
const unknownSpr = SPRITES.composeHostSprite({ mood: 50 }, "male", "不存在的主题");
assert(unknownSpr.palette.C === SPRITES.HOST_THEMES[0].colors.C, "未知主题回落默认");
const customSpr = SPRITES.composeHostSprite({ mood: 50 }, "male", "blue", { C: "#ff0000" });
assert(customSpr.palette.C === "#ff0000", "customColors 微调覆盖主题色");

// 1. 标题屏（main.js 导入即渲染）
const titleText = textOf(app);
assert(titleText.includes("大学生活模拟器"), "标题屏渲染");

// 2. 创建屏
let createStarted = null;
R.renderCreate({ onBack() {}, onStart: (cfg) => { createStarted = cfg; } });
assert(textOf(app).includes("分配属性点"), "创建屏渲染");
assert(!textOf(app).includes("¥"), "创建屏无 ¥ 财富换算");
assert(textOf(app).includes("⚖️ 均衡") && textOf(app).includes("🎲 随机"), "风格预设与随机按钮渲染");
assert(textOf(app).includes("低于 31"), "健康安全线说明渲染");
assert(textOf(app).includes("男生") && textOf(app).includes("女生"), "创建屏性别选择卡渲染");
assert(textOf(app).includes("他将以") && !textOf(app).includes("她将以"), "默认男生：选择文案用「他」");
assert(canvasCount() >= 1, "创建屏性别立绘预览 canvas 渲染");
assert(textOf(app).includes("③ 选择装扮") && textOf(app).includes("海洋蓝"), "创建屏装扮步骤与主题卡渲染");
assert(countNodes(app, (n) => n.tagName === "input" && n.type === "color") === 3, "创建屏 3 个取色器（头发/上衣/裤子）渲染");
assert(textOf(app).includes("④ 选择难度") && textOf(app).includes("⑥ 掷骰"), "创建屏步骤重编号（装扮插为 ③）");

// 3. 完整一局：turn/result/semester_end/ending 全流程 + 历史/成就面板
const game = new Game();
game.start({ name: "烟测", difficulty: "normal", seed: 20260911, gender: "male", theme: "pink", colors: { C: "#ff0000" }, allocation: { int: 15, health: 10, wealth: 10, charm: 10, physique: 10 } });
assert(game.state.gender === "male", "开局性别 male 写入 state");
assert(game.state.theme === "pink" && game.state.themeColors?.C === "#ff0000", "开局主题/微调配色写入 state");

const handlers = { onChoose: () => {}, onHistory() { R.openHistory(game); }, onAchievements() { R.openAchievements(game); }, onRestart() {} };
const chainHandlers = { onPick: () => {}, onHistory() {}, onAchievements() {}, onRestart() {} };
let guard = 0;
let turnCount = 0;
let sawHistoryText = false; // 同选项选过 2 次后应出现"之前几次"历史文案
let sawFeedback = false;    // 正常类选项结算屏应出现 10 人格视角 feedback
let sawChainScreen = false; // 长链屏渲染（任务 B）
let militaryTurn = 0;      // 军训实际所在回合（强制 s1w1，但事件池可能先抽一个普通事件）
while (guard++ < 400) {
  const st = game.state;
  if (st.ended) break;
  if (game.phase === "turn") {
    const pres = game.presentation;
    if (!pres || !pres.choices.length) { assert(false, "回合无选项（死锁）"); break; }
    turnCount += 1;
    if (turnCount === 3) handlers.onHistory();
    if (turnCount === 5) handlers.onAchievements();
    // 第 2 回合注入出场人物，验证左侧立绘（姓名+性格标签）
    if (turnCount === 2) game.presentation = { ...game.presentation, character: "char_wang" };
    R.renderTurn(game, handlers);
    if (textOf(app).includes("之前几次")) sawHistoryText = true;
    // 首回合：财富 10 点（内部 2000）→ 属性栏显示概念档位"财大气粗"，无 ¥；宿主立绘必现
    if (turnCount === 1) {
      assert(textOf(app).includes("财大气粗") && !textOf(app).includes("¥"), "属性栏财富概念档位（无 ¥）");
      assert(canvasCount() >= 1, "回合屏宿主立绘 canvas 渲染");
      // 动作可见性（任务 H）：手动推进 4 拍，宿主画布 fillRect y 坐标应出现 ≥2 种值——像素真的在动
      const canvases = [];
      (function collect(n) {
        if (n.tagName === "canvas" && n._ctx) canvases.push(n);
        for (const c of n.children || []) collect(c);
      })(app);
      assert(canvases.length >= 1, "宿主立绘 canvas 已缓存 ctx（可记录像素调用）");
      for (let i = 0; i < 4; i++) if (stageTick) stageTick();
      const ys = new Set(canvases.flatMap((cv) => cv._ctx.calls.map((c) => c.y)));
      assert(ys.size >= 2, `宿主立绘 4 拍内 fillRect y 出现 ${ys.size} 种值（动画幅度可见）`);
    }
    if (turnCount === 2) {
      assert(canvasCount() >= 2, "回合屏两侧立绘 canvas（事件人物 + 宿主）");
      const t2 = textOf(app);
      assert(t2.includes("王小虎") && t2.includes("游戏宅"), "左立绘显示事件人物姓名与性格标签");
    }
    if (pres.event.id === "special_military") militaryTurn = turnCount;
    const r = game.choose(pres.choices[0].choice.id);
    assert(!!r, `第 ${turnCount} 回合 choose 正常`);
    if (r?.phase === "chain") {
      // 军训回合：长链屏渲染断言（标题/事件名/场景段/子选项/立绘）
      if (turnCount === militaryTurn) {
        R.renderChain(game, chainHandlers);
        const t1 = textOf(app);
        assert(t1.includes("故事延续"), "长链屏「故事延续」标题渲染");
        assert(t1.includes("军训"), "长链屏事件名渲染");
        const node0 = game.chain.nodes[0];
        assert(t1.includes(node0.text.slice(0, 10)), "长链屏场景段渲染");
        assert(t1.includes(node0.choices[0].text), "长链屏子选项渲染");
        assert(t1.includes(game.lastChosen.feedback.slice(0, 10)), "长链屏主选项 feedback 开头段渲染");
        assert(canvasCount() >= 1, "长链屏宿主立绘 canvas 渲染");
        sawChainScreen = true;
      }
      continue;
    }
    if (r) {
      R.renderResult(game, { onNext() {} });
      // 结算屏应显示所选选项的 feedback 文本（rp-feedback 段落）
      const fb = game.lastChosen?.feedback;
      if (fb) sawFeedback = sawFeedback || textOf(app).includes(fb.slice(0, 12));
      if (turnCount === 2) assert(canvasCount() >= 2, "结算屏两侧立绘 canvas（结算后保留）");
    }
  } else if (game.phase === "chain") {
    // 长链推进：逐节点选首个子选项，链末进入结算
    const node = game.chain.nodes[game.chain.idx];
    const rr = game.pickChain(node.choices[0].id);
    assert(!!rr, "长链子选项选择正常");
    if (rr?.phase === "chain" && turnCount === militaryTurn) {
      R.renderChain(game, chainHandlers);
      assert(textOf(app).includes("▸ 你选择了"), "长链屏已选段（▸ 你选择了）渲染");
    }
    if (game.phase === "result") {
      if (turnCount === militaryTurn) {
        // 军训认真训练链：主效果 physique+4 mood-2 health+1 + 链内首子项（physique+2 mood-1）+ 末子项（physique+1 charm+1）
        assert(game.state.turn === militaryTurn, "长链不消耗额外回合（turn 仅 +1）");
        const h0 = game.state.history[game.state.history.length - 1];
        assert(Array.isArray(h0.chain) && h0.chain.length === 2, "历史记录含链路径（2 段）");
        const d = game.lastResult.deltas;
        assert(d.physique === 7 && d.mood === -3 && d.charm === 1, `链内子效果并入结算 deltas（physique ${d.physique}/mood ${d.mood}/charm ${d.charm}）`);
      }
      R.renderResult(game, { onNext() {} });
      if (turnCount === 2) assert(canvasCount() >= 2, "链末结算屏两侧立绘 canvas");
    }
  } else if (game.phase === "result" || game.phase === "semester_end") {
    const step = game.next();
    if (step.phase === "semester_end") {
      R.renderSemesterEnd(game, step.summary, { onNext() {} });
      assert(!!step.summary, "学期结算屏渲染");
    }
  } else {
    assert(false, "未知阶段: " + game.phase);
    break;
  }
}
const ended = game.state.ended;
assert(!!ended, `对局正常结束（${ended?.id ?? "未结束"}，共 ${turnCount} 回合）`);
assert(sawHistoryText, "历史选择文案出现（之前几次都…）");
assert(sawFeedback, "正常类选择反馈出现（rp-feedback 段落）");
assert(sawChainScreen, "长链剧情屏渲染（任务 B）");

// 3.5 链函数模板断言：期中链 s1 与 s7 文案不同（学期阶段风味）
{
  const mid1 = SPECIAL.find((e) => e.id === "special_midterm_s1").choices[0];
  const mid7 = SPECIAL.find((e) => e.id === "special_midterm_s7").choices[0];
  const midCtx = { state: { flags: new Set(), roommates: ["char_wang", "char_li"] }, result: { deltas: { score: 22 } }, choice: mid1 };
  const n1 = mid1.chain(midCtx);
  const n7 = mid7.chain({ ...midCtx, choice: mid7 });
  assert(Array.isArray(n1) && n1.length && n1[0].text !== n7[0].text, "期中链模板按学期阶段换风味（s1 ≠ s7 文案）");
  const cheatMid = SPECIAL.find((e) => e.id === "special_midterm_s1").choices[3];
  const cCaught = cheatMid.chain({ state: { flags: new Set(["cheated"]), roommates: ["char_wang", "char_li"] }, result: { deltas: {} }, choice: cheatMid });
  const cFree = cheatMid.chain({ state: { flags: new Set(), roommates: ["char_wang", "char_li"] }, result: { deltas: {} }, choice: cheatMid });
  assert(cCaught[0].text !== cFree[0].text, "作弊链随结果分支（被抓/侥幸 两套场景）");
}

// 3.6 约会/表白链函数断言（任务 I）：表白成败两分支 + 约会三套人设文案不同
{
  const confess = SPECIAL.find((e) => e.id === "special_confess").choices[0];
  const mkCtx = (flags, crushId) => ({
    state: { flags: new Set(flags), characters: new Map([[crushId, { id: crushId, met: true, affection: 85, dates: 2 }]]) },
    result: { deltas: {} }, choice: confess,
  });
  const cOk = confess.chain(mkCtx(["dating"], "char_susu"));
  const cFail = confess.chain(mkCtx([], "char_susu"));
  assert(Array.isArray(cOk) && Array.isArray(cFail) && cOk[0].text !== cFail[0].text, "表白链按结果分支（成功/失败 两套场景）");
  const rooftop = SPECIAL.find((e) => e.id === "special_date_rooftop").choices[0];
  const mkCrush = (crushId) => ({
    state: { flags: new Set(), characters: new Map([[crushId, { id: crushId, met: true, affection: 60, dates: 0 }]]) },
    result: { deltas: {} }, choice: rooftop,
  });
  const rSu = rooftop.chain(mkCrush("char_susu"));
  const rCm = rooftop.chain(mkCrush("char_chenmo"));
  const rLw = rooftop.chain(mkCrush("char_linwan"));
  assert(rSu[0].text !== rCm[0].text && rCm[0].text !== rLw[0].text, "约会链按 crush 人设换文案（苏苏/陈默/林晚 三套）");
}

// 4. 结局屏（含 CG 画布渲染）+ 彩蛋横幅
R.renderEnding(game, { onTitle() {}, onAgain() {} });
assert(textOf(app).includes("再来一局"), "结局屏渲染");
R.showAchToast({ id: "t", name: "测试彩蛋", desc: "", hidden: true, icon: "icon_rainbow" });
assert(textOf(document.body).includes("彩蛋解锁"), "彩蛋横幅渲染（body 挂载）");

// 5. 再开一局触发彩蛋特效路径（fake_crash 等仅注册不等待）
const g2 = new Game();
g2.start({ name: "烟测2", difficulty: "easy", seed: 777, gender: "female", allocation: { int: 10, health: 10, wealth: 10, charm: 10, physique: 10 } });
assert(g2.state.gender === "female", "第二局性别 female 写入 state");
for (const a of g2.state.achQueue) R.showAchToast(a);
assert(true, "第二局 start + 开局成就横幅");

console.log(steps.join("\n"));
const failed = steps.filter((s) => s.startsWith("✗")).length;
console.log(failed ? `\n冒烟测试失败：${failed} 项` : "\n✅ 冒烟测试通过：六屏 + 全流程 + 面板 + 横幅全部跑通");
