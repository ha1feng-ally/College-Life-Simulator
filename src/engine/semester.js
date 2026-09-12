// 学期管理：长度 roll、周次推进、学期结算（成绩/心情/挂科）、毕业结算

import {
  SEMESTER_WEEKS, PASS_SCORE, HAPPY_SEMESTER_MOOD,
  PASS_MOOD_BONUS, FAIL_MOOD_PENALTY,
} from "../data/config.js";

// 每学期基础周数 8~10（事件可缩短/延长）
export function rollSemesterLength(rng) {
  return SEMESTER_WEEKS.min + rng.int(0, SEMESTER_WEEKS.max - SEMESTER_WEEKS.min);
}

// 学期开始：score 重置，周次从 1 开始，清理学期域状态
export function startSemester(state) {
  state.stats.score = state.baseScore;
  state.week = 1;
  state.semesterLength = rollSemesterLength(state.rng);
  state.playedThisSemester = new Set();
  state.termCounts = new Map();
  state.pendingSkip = 0;
  state.pendingTrigger = null;
  state.finalDone = false;
  state.semMinMood = state.stats.mood;
  state.semEncounterCount = 0;
  state.semStudyCount = 0;
  state.semSleepCount = 0;
}

// 推进周次（含 skipTurns 缩短）
export function advanceWeek(state) {
  state.week += 1 + state.pendingSkip;
  state.pendingSkip = 0;
}

// 学期结算：返回 summary
export function settleSemester(state) {
  const score = state.stats.score;
  const passed = score >= PASS_SCORE;
  if (passed) {
    state.stats.mood += PASS_MOOD_BONUS;
  } else {
    state.stats.mood += FAIL_MOOD_PENALTY;
    state.failCount += 1;
  }
  state.semesterScores.push(score);
  state.bestScore = Math.max(state.bestScore, score);
  if (state.semMinMood >= HAPPY_SEMESTER_MOOD) state.happySemesters += 1;

  return {
    semester: state.semester,
    score,
    passed,
    failCount: state.failCount,
    happySemester: state.semMinMood >= HAPPY_SEMESTER_MOOD,
  };
}

// 假期事件选择：奇数学期后为寒假，偶数学期后为暑假；s7 用"最后一个寒假"
export function breakEventIdFor(state) {
  if (state.semester % 2 === 1) {
    return state.semester === 7 ? "break_winter_s7" : "break_winter";
  }
  return "break_summer";
}

// 毕业：按八学期均分选变体，按 flag 定毕业后去向（纯展示）
export function graduate(state, gradVariantByAvg, postgradByFlag) {
  const avg = state.semesterScores.reduce((a, b) => a + b, 0) / Math.max(1, state.semesterScores.length);
  const variant = gradVariantByAvg(avg);
  const postgrad = postgradByFlag(state);
  return { avg, variant, postgrad };
}
