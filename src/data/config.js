// 数值常量与平衡参数唯一入口：调参只改这里
export const DIFFICULTIES = {
  easy:   { name: "简单", points: 70, startScore: 25, desc: "轻松开局，适合体验故事" },
  normal: { name: "普通", points: 55, startScore: 20, desc: "标准大学生活（推荐）" },
  hard:   { name: "困难", points: 40, startScore: 17, desc: "每一步都要精打细算" },
};

// 性别选择：创建屏卡片 label + 选择文案人称（选择的性别会修改创建屏文案）
export const GENDERS = {
  male: { label: "男生", pronoun: "他" },
  female: { label: "女生", pronoun: "她" },
};

// 明面属性（score 为学期成绩，不可加点）
export const VISIBLE_STATS = ["int", "health", "wealth", "charm", "physique", "mood", "score"];
// 开局可加点的五项
export const ALLOC_STATS = ["int", "health", "wealth", "charm", "physique"];
// 隐藏属性（不显示数值）
export const HIDDEN_STATS = ["network", "luck"];

export const STAT_NAMES = {
  int: "智力", health: "健康", wealth: "财富",
  charm: "魅力", physique: "体魄", mood: "心情", score: "成绩",
};

export const WEALTH_PER_POINT = 200;   // 内部经济换算（1 点 = 200 单位）；界面不显示具体数值，只显示概念档位 WEALTH_TIERS

// 财富概念档位：界面不显示财富具体数值，按内部值显示概念词
export const WEALTH_TIERS = [
  { max: -1, label: "负债累累" },
  { max: 49, label: "捉襟见肘" },
  { max: 199, label: "精打细算" },
  { max: 599, label: "小有积蓄" },
  { max: 1499, label: "手头宽裕" },
  { max: 2999, label: "财大气粗" },
  { max: Infinity, label: "富可敌国" },
];
export function wealthConcept(v) {
  return WEALTH_TIERS.find((t) => v <= t.max)?.label ?? "捉襟见肘";
}
export const START_MOOD = 80;          // 心情固定 80
export const PASS_SCORE = 60;          // 学期成绩及格线
export const MAX_ALLOC_PER_STAT = 40;  // 单项加点上限

// ---- 开局加点指引 ----
// 健康安全线：≤30 会触发生病事件（吃药/住院），开局健康低于此值会频繁生病
export const HEALTH_SAFE = 31;

// 每项属性的创建屏说明文字
export const ALLOC_GUIDE = {
  int: "决定学习效率与成绩，学霸必点",
  health: "健康是本钱：低于 31 会经常生病（吃药住院）",
  wealth: "影响消费、投资、旅游类选项",
  charm: "影响社交与邂逅，奶茶店兼职也看它",
  physique: "影响健身与体育比赛",
};

// 四种风格预设 × 三难度：健康全部 ≥ HEALTH_SAFE，总和 = 各难度点数
export const ALLOC_PRESETS = [
  {
    id: "balanced", name: "⚖️ 均衡",
    alloc: {
      easy: { int: 16, health: 31, wealth: 8, charm: 8, physique: 7 },
      normal: { int: 12, health: 31, wealth: 5, charm: 4, physique: 3 },
      hard: { int: 5, health: 31, wealth: 1, charm: 2, physique: 1 },
    },
  },
  {
    id: "scholar", name: "📚 卷王",
    alloc: {
      easy: { int: 25, health: 31, wealth: 4, charm: 5, physique: 5 },
      normal: { int: 18, health: 31, wealth: 2, charm: 2, physique: 2 },
      hard: { int: 7, health: 31, wealth: 0, charm: 1, physique: 1 },
    },
  },
  {
    id: "healthy", name: "🌿 养生",
    alloc: {
      easy: { int: 8, health: 40, wealth: 8, charm: 7, physique: 7 },
      normal: { int: 6, health: 36, wealth: 5, charm: 4, physique: 4 },
      hard: { int: 2, health: 35, wealth: 1, charm: 1, physique: 1 },
    },
  },
  {
    id: "social", name: "🎭 社交",
    alloc: {
      easy: { int: 10, health: 31, wealth: 9, charm: 15, physique: 5 },
      normal: { int: 7, health: 31, wealth: 4, charm: 10, physique: 3 },
      hard: { int: 3, health: 31, wealth: 1, charm: 4, physique: 1 },
    },
  },
];

// 学期结算相关（开学基础分按难度：见 DIFFICULTIES.startScore）
export const HAPPY_SEMESTER_MOOD = 60;  // 学期全程心情不低于此 → 计入 happySemesters
export const PASS_MOOD_BONUS = 5;       // 及格心情奖励
export const FAIL_MOOD_PENALTY = -10;   // 挂科心情惩罚
export const MAX_FAIL_SEMESTERS = 2;    // 累计挂科学期数达到后劝退

// 学期：每回合 = 1 周，基础中位数 8~10 周（事件可缩短/延长）
export const SEMESTER_WEEKS = { min: 8, max: 10 };

export const LUCK = { init: 50, min: 0, max: 100 };

// 人脉结识阈值分档（达标后按概率触发结识事件）
export const NETWORK_TIERS = [0, 20, 40, 50, 60, 80];

// 各类概率常量
export const PROB = {
  social: 0.18,                 // 社交注入基础概率
  hobby: 0.2,                   // 单个已解锁兴趣的注入概率
  encounterRecentPenalty: 0.5,  // 近期有邂逅时概率折半
  encounterRecentTurns: 3,      // "近期" = 3 回合内
  alias: 0.5,                   // 变体表达（同位词）抽取概率：五成原名、五成随机一个变体
};

// 环境事件汇聚：每回合最多从"环境符合"的事件里取几个贡献选项（紧急事件 envPriority 优先）
// maxEnvChoices 按事件粒度截断（不拆散单个事件的选项），防选项泛滥
export const POOL = { maxEnvEvents: 3, maxEnvChoices: 5 };

// 历史选择文案模板：{verb}=选项自定义动词（缺省"选择"）{text}=选项文案 {times}=已选次数
export const HISTORY_TEXT = "之前几次都{verb}了「{text}」，这次要不就继续？";

// 破产 / 重病 提前结局阈值
export const BANKRUPT_LINE = -300;
export const SICK_LINE = -30;
