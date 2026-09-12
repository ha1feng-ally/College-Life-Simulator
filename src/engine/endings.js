// 结局判定：提前结局 4 种 + 毕业判定（变体/去向在 semester.graduate 计算）

import { EARLY_ENDINGS } from "../data/endings.js";
import { BANKRUPT_LINE, SICK_LINE, MAX_FAIL_SEMESTERS } from "../data/config.js";

// 每回合结算后检查提前结局（顺序即优先级）
export function checkEarlyEnding(state) {
  if (state.stats.wealth <= BANKRUPT_LINE) return EARLY_ENDINGS.end_bankrupt;
  if (state.stats.health <= SICK_LINE) return EARLY_ENDINGS.end_suspended;
  if (state.flags.has("dropout")) return EARLY_ENDINGS.end_dropout;
  if (state.failCount >= MAX_FAIL_SEMESTERS) return EARLY_ENDINGS.end_expelled;
  return null;
}

// 构建结局对象（early 或 graduation）
export function buildEnding(state, ending) {
  return { id: ending.id, kind: ending.kind || "early", title: ending.title, ending };
}
