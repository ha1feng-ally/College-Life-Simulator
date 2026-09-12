// 成就 + 彩蛋：check 为代码校验函数（数据里没有可被"读穿"的条件字段）
// 明面成就（hidden:false）：面板展示完整名字 + 像素图标 + 氛围文案，绝不写明达成条件
// 彩蛋（hidden:true）：未解锁完全不显示；解锁后彩色名字 + 像素图展示

export const ACHIEVEMENTS = [
  // ---- 数值型（8） ----
  { id: "ach_int_80", name: "大智若愚", desc: "脑子是个好东西，而你有两个。", icon: "icon_book", hidden: false, cg: null, check: (c) => c.state.stats.int >= 80 },
  { id: "ach_wealth_10000", name: "人生赢家", desc: "钱包比室友厚一倍。", icon: "icon_coin", hidden: false, cg: "cg_rich", check: (c) => c.state.stats.wealth >= 10000 },
  { id: "ach_physique_80", name: "钢铁之躯", desc: "健身房年卡没有白办。", icon: "icon_dumbbell", hidden: false, cg: null, check: (c) => c.state.stats.physique >= 80 },
  { id: "ach_charm_80", name: "万人迷", desc: "走到哪里都自带光环。", icon: "icon_star", hidden: false, cg: null, check: (c) => c.state.stats.charm >= 80 },
  { id: "ach_health_100", name: "元气满满", desc: "体检报告全绿，医生都夸你。", icon: "icon_heart", hidden: false, cg: null, check: (c) => c.state.stats.health >= 100 },
  { id: "ach_mood_100", name: "快乐星球", desc: "快乐，就是这么简单。", icon: "icon_moon", hidden: false, cg: null, check: (c) => c.state.stats.mood >= 100 },
  { id: "ach_network_80", name: "社交达人", desc: "校园里到处是你的朋友。", icon: "icon_badge", hidden: false, cg: null, check: (c) => c.state.hidden.network >= 80 },
  { id: "ach_luck_90", name: "天选之人", desc: "运气也是实力的一部分。", icon: "icon_dice", hidden: false, cg: null, check: (c) => c.state.hidden.luck >= 90 },

  // ---- 事件型（8） ----
  { id: "ach_first_encounter", name: "初遇", desc: "有些相遇，值得铭记。", icon: "icon_flower", hidden: false, cg: null, check: (c) => c.state.flags.has("met_any_crush") },
  { id: "ach_first_date", name: "第一次约会", desc: "手心冒汗的夜晚。", icon: "icon_heart", hidden: false, cg: null, check: (c) => c.state.flags.has("dated") },
  { id: "ach_confess", name: "告白成功", desc: "\"我也是。\"", icon: "icon_heart", hidden: false, cg: "cg_first_love", check: (c) => c.state.flags.has("dating") },
  { id: "ach_hospital", name: "医院常客", desc: "白色的病房也有温暖。", icon: "icon_syringe", hidden: false, cg: "cg_sick", check: (c) => c.state.flags.has("hospitalized") },
  { id: "ach_invest_win", name: "投资翻倍", desc: "股市有风险，但这次你赢了。", icon: "icon_coin", hidden: false, cg: null, check: (c) => c.state.flags.has("invest_win") },
  { id: "ach_offer", name: "拿到 Offer", desc: "通向职场的第一张门票。", icon: "icon_briefcase", hidden: false, cg: "cg_job", check: (c) => c.state.flags.has("job_offer") },
  { id: "ach_kaoyan", name: "考研上岸", desc: "图书馆的灯没有白亮。", icon: "icon_book", hidden: false, cg: "cg_kaoyan", check: (c) => c.state.flags.has("kaoyan_pass") },
  { id: "ach_join_club", name: "社团成员", desc: "找到了组织。", icon: "icon_badge", hidden: false, cg: null, check: (c) => c.state.flags.has("joined_club") },

  // ---- 组合型（4） ----
  { id: "ach_semester_happy", name: "心态大师", desc: "整个学期心情都保持在线。", icon: "icon_moon", hidden: false, cg: null, check: (c) => c.state.happySemesters >= 1 },
  { id: "ach_study_streak", name: "卷王", desc: "图书馆的灯，见证过你的决心。", icon: "icon_book", hidden: false, cg: null, check: (c) => c.state.semStudyCount >= 5 },
  { id: "ach_encounter_x3", name: "缘分不断", desc: "一个学期里邂逅了三次。", icon: "icon_flower", hidden: false, cg: null, check: (c) => c.state.semEncounterCount >= 3 },
  { id: "ach_top_score", name: "满绩学霸", desc: "单学期成绩冲上了 90。", icon: "icon_medal", hidden: false, cg: null, check: (c) => c.state.bestScore >= 90 },

  // ---- 结局型（4） ----
  { id: "ach_bankrupt", name: "破产", desc: "人生的大起大落，太刺激了。", icon: "icon_skull", hidden: false, cg: null, check: (c) => c.state.ended?.id === "end_bankrupt" },
  { id: "ach_expelled", name: "劝退", desc: "大学这条路，提前到站。", icon: "icon_door", hidden: false, cg: null, check: (c) => c.state.ended?.id === "end_expelled" },
  { id: "ach_suspended", name: "休学", desc: "健康才是最大的本钱。", icon: "icon_syringe", hidden: false, cg: null, check: (c) => c.state.ended?.id === "end_suspended" },
  { id: "ach_dropout", name: "另一种人生", desc: "退学，也是一种选择。", icon: "icon_door", hidden: false, cg: "cg_dropout", check: (c) => c.state.ended?.id === "end_dropout" },

  // ---- 彩蛋（6，隐藏成就） ----
  { id: "egg_restart3", name: "人生重来枪", desc: "你死机了吗？没有？那再来一次。", icon: "icon_glitch", hidden: true, cg: "cg_fake_crash", special: "fake_crash", check: (c) => c.session.restarts >= 3 },
  { id: "egg_luck_100", name: "锦鲤本鲤", desc: "转发这条锦鲤，好运自然来。", icon: "icon_rainbow", hidden: true, cg: "cg_rainbow", special: "rainbow", check: (c) => c.state.hidden.luck >= 100 },
  { id: "egg_mood_0", name: "致郁系", desc: "情绪跌到谷底时，抬头看看，谷底也有风景。", icon: "icon_moon", hidden: true, cg: null, special: "invert", check: (c) => c.state.stats.mood <= 0 },
  { id: "egg_cheat_caught", name: "侥幸心理", desc: "侥幸，是运气最大的敌人。", icon: "icon_dice", hidden: true, cg: null, special: "glitch", check: (c) => c.state.flags.has("cheated") },
  { id: "egg_sleep_5", name: "睡神", desc: "被窝，是宇宙的尽头。", icon: "icon_bed", hidden: true, cg: null, special: "confetti", check: (c) => c.state.semSleepCount >= 3 },
  { id: "egg_dropout_end", name: "重启人生", desc: "退学不是终点，是另一条路的起点。", icon: "icon_door", hidden: true, cg: null, special: "glitch", check: (c) => c.state.ended?.id === "end_dropout" },
];

export const ACH_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export const VISIBLE_ACHIEVEMENTS = ACHIEVEMENTS.filter((a) => !a.hidden);
export const EGG_ACHIEVEMENTS = ACHIEVEMENTS.filter((a) => a.hidden);
