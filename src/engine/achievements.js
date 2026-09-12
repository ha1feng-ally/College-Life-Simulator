// 成就检测引擎：每次行动结算后 checkAll；ctx = { state, session, event, choice }
// session 由 flow.js 提供（模块级对象，含 restarts 计数）

import { ACHIEVEMENTS } from "../data/achievements.js";

export function checkAchievements(ctx) {
  const newly = ACHIEVEMENTS.filter((a) => !ctx.state.achieved.has(a.id) && a.check(ctx));
  for (const a of newly) {
    ctx.state.achieved.add(a.id);
    ctx.state.achQueue.push(a);
  }
  return newly;
}

// 取出待播放队列（CG / 横幅 / 彩蛋特效由 UI 消费）
export function drainQueue(state) {
  const q = state.achQueue;
  state.achQueue = [];
  return q;
}
