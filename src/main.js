// 入口：屏幕编排 + 成就庆祝管线（横幅 → 特效 → CG）
import { Game } from "./engine/flow.js";
import { runEffect } from "./ui/effects.js";
import { playCg } from "./ui/cg-player.js";
import {
  renderTitle, renderCreate, renderTurn, renderResult, renderChain,
  renderSemesterEnd, renderEnding, openHistory, openAchievements, showAchToast,
} from "./ui/renderer.js";

const game = new Game();

// 成就庆祝：先横幅，再彩蛋特效，最后 CG（fake_crash 的 CG 与特效二选一，保留特效）
async function celebrate(achList) {
  for (const a of achList) {
    showAchToast(a);
    if (a.special) await runEffect(a.special);
    if (a.cg && a.special !== "fake_crash") await playCg(a.cg);
  }
}

function confirmRestart() {
  if (window.confirm("确定要重新开始吗？当前进度将丢失（本游戏无存档）。")) {
    renderCreate({
      onBack: () => renderTitle({ onStart: showCreate }),
      onStart: startGame,
    });
  }
}

function showCreate() {
  renderCreate({ onBack: () => renderTitle({ onStart: showCreate }), onStart: startGame });
}

async function startGame(cfg) {
  const { queue } = game.start(cfg);
  await celebrate(queue);
  renderTurn(game, handlers);
}

function onChoose(choiceId) {
  const result = game.choose(choiceId);
  if (!result) return;
  if (result.phase === "chain") {
    renderChain(game, chainHandlers);
    return;
  }
  renderResult(game, { onNext: onNext });
  // 庆祝不阻塞结算面板展示
  celebrate(result.newly);
}

// 长链子选项：链未走完继续渲染链屏，走完进入结算
function onPick(subId) {
  const result = game.pickChain(subId);
  if (!result) return;
  if (result.phase === "chain") {
    renderChain(game, chainHandlers);
    return;
  }
  renderResult(game, { onNext: onNext });
  celebrate(result.newly);
}

async function onNext() {
  const step = game.next();
  switch (step.phase) {
    case "turn":
      renderTurn(game, handlers);
      break;
    case "semester_end":
      renderSemesterEnd(game, step.summary, { onNext: onNext });
      celebrate(step.newly);
      break;
    case "ending":
      showEnding(step);
      break;
    default:
      renderTurn(game, handlers);
  }
}

async function showEnding(step) {
  const ended = game.state.ended;
  const cgId = ended.kind === "early" ? ended.ending.cg : ended.grad.variant.cg;
  if (cgId) await playCg(cgId);
  celebrate(step.newly || []);
  renderEnding(game, {
    onTitle: () => renderTitle({ onStart: showCreate }),
    onAgain: showCreate,
  });
}

const handlers = {
  onChoose,
  onHistory: () => openHistory(game),
  onAchievements: () => openAchievements(game),
  onRestart: confirmRestart,
};

// 长链屏复用同一组面板按钮，只是把 onChoose 换成 onPick
const chainHandlers = {
  onPick,
  onHistory: handlers.onHistory,
  onAchievements: handlers.onAchievements,
  onRestart: handlers.onRestart,
};

renderTitle({ onStart: showCreate });
