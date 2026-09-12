// 无头蒙特卡洛模拟：验证游戏可完整跑通 + 输出平衡数据
// 用法：node tools/simulate.mjs [每格局数=120]
// 3 策略（随机/卷王/摆烂）× 3 难度 × N 局：毕业率、结局分布、学期长度、事件频率、成就达成率
import { Game, SESSION } from "../src/engine/flow.js";
import { DIFFICULTIES, ALLOC_STATS, MAX_ALLOC_PER_STAT } from "../src/data/config.js";
import { createRng } from "../src/engine/random.js";
import { ACHIEVEMENTS, EGG_ACHIEVEMENTS } from "../src/data/achievements.js";

const N = Number(process.argv[2] || 120);

// 策略：给选项打分（明面 effects + 期望 outcomes），取最高分，平分随机
const STRATEGIES = {
  rand: { label: "随机", weights: {} },
  study: { label: "卷王", weights: { score: 3, int: 2, physique: 0.3 } },
  chill: { label: "摆烂", weights: { mood: 2, wealth: 0.01, health: 1 } },
  social: { label: "社交", weights: { charm: 2, wealth: 0.01, mood: 1, affection: 3, score: 0.7, int: 0.6 } },
};

function choiceScore(choice, weights) {
  let s = 0;
  const add = (stats, mul) => {
    if (!stats) return;
    for (const [k, w] of Object.entries(weights)) s += (stats[k] || 0) * w * mul;
  };
  add(choice.effects?.stats, 1);
  for (const o of choice.outcomes || []) add(o.effects?.stats, o.p || 0);
  // 恋爱线启发式打分（任务 I：社交策略 affection>0 主动追爱；其余策略为 0 不受影响）
  const affW = weights.affection || 0;
  if (affW) {
    s += (choice.effects?.crush?.affection || 0) * affW;
    s += (choice.effects?.crush?.dates || 0) * affW * 2;
    for (const eff of Object.values(choice.effects?.characters || {})) s += (eff.affection || 0) * affW;
    if ((choice.setFlags || []).includes("dated")) s += affW * 4;
    for (const o of choice.outcomes || []) {
      s += (o.effects?.crush?.affection || 0) * (o.p || 0) * affW;
      if ((o.setFlags || []).includes("dating")) s += affW * 10;
    }
  }
  return s;
}

// 按策略偏向生成加点（reproducible：派生种子）
const ALLOC_BIAS = {
  rand: { int: 1, health: 1, wealth: 1, charm: 1, physique: 1 },
  study: { int: 4, health: 2, wealth: 2, charm: 1, physique: 2 },
  chill: { int: 1, health: 2, wealth: 4, charm: 2, physique: 1 },
  social: { int: 1, health: 1, wealth: 2, charm: 4, physique: 1 },
};
function rollAllocation(strategy, points, rng) {
  const allocation = Object.fromEntries(ALLOC_STATS.map((k) => [k, 0]));
  const bias = ALLOC_BIAS[strategy];
  for (let i = 0; i < points; i++) {
    const k = rng.weighted(ALLOC_STATS, (s) => (allocation[s] < MAX_ALLOC_PER_STAT ? bias[s] : 0));
    if (!k) break;
    allocation[k] += 1;
  }
  return allocation;
}

// 单局：跑完整个流程，返回统计（gender 交替传入：男/女宿主各半，恋爱线双性别覆盖）
function playGame(strategy, difficulty, seed, gender) {
  const game = new Game();
  const rng = createRng((seed ^ 0x9e3779b9) >>> 0);
  const aiRng = createRng((seed ^ 0x51ab) >>> 0);
  const allocation = rollAllocation(strategy, DIFFICULTIES[difficulty].points, rng);
  game.start({ name: "AI", difficulty, seed, allocation, gender });

  const eventCounts = new Map();
  const semWeeks = new Map(); // 学期 → 观测到的最晚周次
  const choiceCounts = []; // 每回合选项数（防选项泛滥监控）
  let guard = 0;
  let stuck = false;

  while (guard++ < 500) {
    const st = game.state;
    if (st.ended) break;

    if (game.phase === "turn") {
      const pres = game.presentation;
      if (!pres || !pres.choices.length) { stuck = true; break; }
      eventCounts.set(pres.event.id, (eventCounts.get(pres.event.id) || 0) + 1);
      choiceCounts.push(pres.choices.length);
      const sem = pres.meta.semester;
      semWeeks.set(sem, Math.max(semWeeks.get(sem) || 0, pres.meta.week));

      // 卷王 AI 带生存意识：健康过低优先恢复；心情不影响成绩，只有濒临崩溃才管
      const weights = { ...STRATEGIES[strategy].weights };
      if (strategy === "study") {
        if (st.stats.health < 50) weights.health = 4;
        if (st.stats.mood < 10) weights.mood = 4;
      }
      // 社交 AI 带生存意识：挂过一个学期后优先保学业，否则恋爱线还没跑完就被劝退
      if (strategy === "social") {
        if (st.failCount > 0) {
          weights.score = 6;
          weights.int = 3;
          weights.affection = 0.5;
        }
        // 健康只在真正危险时干预（UI 安全线 31 / 休学线 -30），平时不打断约会
        if (st.stats.health < 25) weights.health = 5;
      }
      let best = pres.choices[0];
      let bestScore = -Infinity;
      let ties = 1;
      for (const c of pres.choices) {
        // 卷王不碰高风险/作死选项：作弊可能 -20，退学直接出局
        if (strategy === "study" && ["cheat", "dropout"].includes(c.choice.id)) continue;
        const sc = choiceScore(c.choice, weights);
        if (sc > bestScore) { best = c; bestScore = sc; ties = 1; }
        else if (sc === bestScore) { ties += 1; if (aiRng.chance(1 / ties)) best = c; }
      }
      const r = game.choose(best.choice.id);
      if (!r) { stuck = true; break; }
    } else if (game.phase === "chain") {
      // 长链（任务 B）：按策略给子选项打分（无 outcomes，直接明面 effects），选最优走完链
      const node = game.chain.nodes[game.chain.idx];
      const weights = { ...STRATEGIES[strategy].weights };
      if (strategy === "study") {
        if (st.stats.health < 50) weights.health = 4;
        if (st.stats.mood < 10) weights.mood = 4;
      }
      // 社交 AI 带生存意识：挂过一个学期后优先保学业，否则恋爱线还没跑完就被劝退
      if (strategy === "social") {
        if (st.failCount > 0) {
          weights.score = 6;
          weights.int = 3;
          weights.affection = 0.5;
        }
        // 健康只在真正危险时干预（UI 安全线 31 / 休学线 -30），平时不打断约会
        if (st.stats.health < 25) weights.health = 5;
      }
      let bestSub = node.choices[0];
      let bestSubScore = -Infinity;
      let subTies = 1;
      for (const c of node.choices) {
        const sc = choiceScore(c, weights);
        if (sc > bestSubScore) { bestSub = c; bestSubScore = sc; subTies = 1; }
        else if (sc === bestSubScore) { subTies += 1; if (aiRng.chance(1 / subTies)) bestSub = c; }
      }
      const cr = game.pickChain(bestSub.id);
      if (!cr) { stuck = true; break; }
    } else if (game.phase === "result" || game.phase === "semester_end") {
      game.next();
    } else {
      stuck = true;
      break;
    }
  }

  const st = game.state;
  const ended = st.ended;
  let endedKey = ended ? ended.id : "none";
  let postgradKey = null;
  if (ended?.kind === "graduation") {
    endedKey = `graduation:${ended.grad.variant.id}`;
    postgradKey = ended.grad.postgrad.id;
  }

  return {
    stuck,
    gender,
    endedKey,
    postgradKey,
    turns: st.turn,
    semester: st.semester,
    semWeeks,
    failCount: st.failCount,
    scores: st.semesterScores,
    achieved: [...st.achieved],
    eventCounts,
    choiceCounts,
    dated: st.flags.has("dated"),
    dating: st.flags.has("dating"),
  };
}

// ---- 主流程 ----

const results = [];      // 每格 { strategy, difficulty, games: [...] }
const achFreq = new Map();   // 成就 id → 次数
const eventFreq = new Map(); // 事件 id → 次数（按呈现回合计）
let stuckTotal = 0;

for (const [sKey, sVal] of Object.entries(STRATEGIES)) {
  for (const dKey of Object.keys(DIFFICULTIES)) {
    const games = [];
    for (let i = 0; i < N; i++) {
      const seed = (0x100000 + i * 7919 + sKey.length * 131 + dKey.length * 17) >>> 0;
      const gender = i % 2 ? "female" : "male"; // 男/女宿主各半
      const g = playGame(sKey, dKey, seed, gender);
      games.push(g);
      if (g.stuck) stuckTotal += 1;
      for (const a of g.achieved) achFreq.set(a, (achFreq.get(a) || 0) + 1);
      for (const [e, c] of g.eventCounts) eventFreq.set(e, (eventFreq.get(e) || 0) + c);
    }
    results.push({ strategy: sKey, label: sVal.label, difficulty: dKey, games });
  }
}

// ---- 汇总输出 ----

const totalGames = results.reduce((a, r) => a + r.games.length, 0);
console.log(`\n=== 大学生活模拟器 · 蒙特卡洛模拟（${totalGames} 局 / ${totalGames ? `卡死 ${stuckTotal} 局` : ""}）===\n`);

// 1. 每格核心指标
console.log("【每格指标】");
console.log("策略\t难度\t局数\t毕业率\t平均回合\t学期中位长\t平均成绩\t挂科局%\t平均成就\t约过会%\t确定关系%");
for (const r of results) {
  const gs = r.games;
  const grad = gs.filter((g) => g.endedKey.startsWith("graduation")).length;
  const turns = gs.reduce((a, g) => a + g.turns, 0) / gs.length;
  const allWeeks = gs.flatMap((g) => [...g.semWeeks.values()]);
  allWeeks.sort((a, b) => a - b);
  const medWeek = allWeeks[Math.floor(allWeeks.length / 2)] ?? 0;
  const scores = gs.flatMap((g) => g.scores);
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const failPct = (gs.filter((g) => g.failCount > 0).length / gs.length) * 100;
  const achAvg = gs.reduce((a, g) => a + g.achieved.length, 0) / gs.length;
  const datedPct = (gs.filter((g) => g.dated).length / gs.length) * 100;
  const datingPct = (gs.filter((g) => g.dating).length / gs.length) * 100;
  console.log(
    `${r.label}\t${DIFFICULTIES[r.difficulty].name}\t${gs.length}\t${((grad / gs.length) * 100).toFixed(1)}%\t` +
    `${turns.toFixed(1)}\t${medWeek}\t${avgScore.toFixed(1)}\t${failPct.toFixed(0)}%\t${achAvg.toFixed(1)}\t` +
    `${datedPct.toFixed(1)}%\t${datingPct.toFixed(1)}%`
  );
}
{
  const all = results.flatMap((r) => r.games);
  const datedPct = (all.filter((g) => g.dated).length / all.length) * 100;
  const datingPct = (all.filter((g) => g.dating).length / all.length) * 100;
  console.log(`全策略合计：约过会 ${datedPct.toFixed(1)}% / 确定关系 ${datingPct.toFixed(1)}%（基线 0.3% / 0.0%，目标 ≥10% / ≥5%）`);
  const males = all.filter((g) => g.gender === "male");
  const females = all.filter((g) => g.gender === "female");
  const pct = (gs) => `${((gs.filter((g) => g.dated).length / gs.length) * 100).toFixed(1)}% / ${((gs.filter((g) => g.dating).length / gs.length) * 100).toFixed(1)}%`;
  console.log(`按宿主性别：男 ${pct(males)} / 女 ${pct(females)}（女宿主恋爱线同等可用）`);
}

// 2. 结局分布（全难度合并）
console.log("\n【结局分布】");
const endCounts = new Map();
const pgCounts = new Map();
for (const r of results) {
  for (const g of r.games) {
    endCounts.set(g.endedKey, (endCounts.get(g.endedKey) || 0) + 1);
    if (g.postgradKey) pgCounts.set(g.postgradKey, (pgCounts.get(g.postgradKey) || 0) + 1);
  }
}
for (const [k, v] of [...endCounts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}\t${v}\t${((v / totalGames) * 100).toFixed(1)}%`);
}
if (pgCounts.size) {
  console.log("  毕业后去向：" + [...pgCounts.entries()].map(([k, v]) => `${k} ${v}`).join(" / "));
}

// 3. 学期长度分布（观测值，应为 8~10）
console.log("\n【学期长度分布（观测最晚周次）】");
const weekDist = new Map();
for (const r of results) {
  for (const g of r.games) {
    for (const w of g.semWeeks.values()) weekDist.set(w, (weekDist.get(w) || 0) + 1);
  }
}
for (const [w, v] of [...weekDist.entries()].sort((a, b) => a[0] - b[0])) {
  const bar = "#".repeat(Math.round((v / Math.max(...weekDist.values())) * 30));
  console.log(`  ${w} 周\t${v}\t${bar}`);
}

// 4. 每回合选项数分布（防选项泛滥，目标中位数 ≤9）
const allChoices = results.flatMap((r) => r.games.flatMap((g) => g.choiceCounts)).sort((a, b) => a - b);
if (allChoices.length) {
  const q = (p) => allChoices[Math.min(allChoices.length - 1, Math.floor(allChoices.length * p))];
  console.log("\n【每回合选项数】");
  console.log(`  平均 ${(allChoices.reduce((a, b) => a + b, 0) / allChoices.length).toFixed(2)} / 中位 ${q(0.5)} / P90 ${q(0.9)} / 最大 ${allChoices[allChoices.length - 1]}（目标中位 ≤9）`);
}

// 5. 事件频率 top 25
console.log("\n【事件出现频率 Top 25（按回合呈现次数）】");
const evSorted = [...eventFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
const maxEv = evSorted[0]?.[1] || 1;
for (const [id, v] of evSorted) {
  console.log(`  ${id.padEnd(28)} ${String(v).padStart(6)}  ${"#".repeat(Math.round((v / maxEv) * 40))}`);
}

// 6. 成就达成率
console.log("\n【成就达成率（全难度）】");
for (const a of [...ACHIEVEMENTS].sort((x, y) => (achFreq.get(y.id) || 0) - (achFreq.get(x.id) || 0))) {
  const v = achFreq.get(a.id) || 0;
  const pct = ((v / totalGames) * 100).toFixed(1);
  const tag = a.hidden ? "彩蛋" : "成就";
  console.log(`  [${tag}] ${a.id.padEnd(22)} ${String(v).padStart(5)} 局  ${pct.padStart(5)}%  ${a.name}`);
}

// 7. 卡死诊断
if (stuckTotal) {
  console.log(`\n⚠ 共 ${stuckTotal} 局未正常结束（卡死），需排查流程死锁。`);
}
console.log(`\n会话重启计数（彩蛋依赖）：${SESSION.restarts}`);
