// 前置类事件：requires 前置条件解锁后才进入候选池
// 社团类（joined_club）/ 导师类（has_advisor）/ 恋爱类（met_any_crush + anyCrushAffectionMin）
// 生病类（健康低）/ 工作类（parttime）/ 旅游类 / 寝室事件（met_roommate，随寝室 roll 解锁）
// env(state, ctx): 环境判断函数——通过时本事件的全部可见选项汇入其他事件回合（无 env 只当宿主）
//   ctx = { sceneTags, hostEvent }；envPriority 越大越优先占每回合的汇聚名额（生病类=10）

export const PREREQUISITE_EVENTS = [
  // ---- 社团类 ----
  {
    id: "club_activity", type: "prerequisite",
    name: "社团活动",
    description: "社团群里通知：本周活动，不见不散。",
    scene: { canEncounter: true, canSocial: true, tags: ["club"] },
    requires: { flags: ["joined_club"] },
    weight: 7, cooldown: 2, singleTermLimit: null,
    env: (s) => s.stats.mood >= 40, // 有心情参加社团活动
    choices: [
      {
        id: "all_in", text: "全情投入",
        effects: { stats: { mood: 4, charm: 1 }, hidden: { network: 1 } },
        log: "和大家一起干活、一起笑，归属感油然而生。",
      },
      {
        id: "moyu", text: "划水签到",
        effects: { stats: { mood: 2 } },
        log: "人到场了，心在别处。",
      },
      {
        id: "leave", text: "请假不去",
        effects: { stats: { mood: 1 } },
        log: "你发了个\"临时有事\"的消息。",
      },
    ],
  },
  {
    id: "club_dinner", type: "prerequisite",
    name: "社团聚餐",
    description: "活动结束后，大家嚷嚷着要去吃一顿好的。",
    scene: { canEncounter: false, canSocial: true, tags: ["canteen"] },
    requires: { flags: ["joined_club"] },
    weight: 6, cooldown: 3, singleTermLimit: null,
    env: (s, ctx) => ctx.sceneTags.includes("canteen"), // 聚餐在食堂
    choices: [
      {
        id: "go", text: "一起去聚餐",
        gates: [{ stat: "wealth", min: 50 }],
        effects: { stats: { wealth: -50, mood: 5 }, hidden: { network: 2 } },
        log: "饭桌上的笑话比菜还多。",
      },
      {
        id: "skip", text: "以还有事为由推掉",
        effects: { stats: { mood: 1 } },
        log: "你错过了那晚的经典场面。",
      },
    ],
  },
  {
    id: "club_election", type: "prerequisite",
    name: "社团换届竞选",
    description: "换届大会临近，部长问你有没有兴趣竞选。",
    scene: { canEncounter: false, canSocial: true, tags: ["club"] },
    character: "char_lu",
    requires: { flags: ["joined_club"] },
    gates: [{ stat: "charm", min: 35 }],
    weight: 5, cooldown: 0, singleTermLimit: 1,
    env: () => true, // 竞选每学期仅一次机会，随时可参与
    choices: [
      {
        id: "run", text: "参加竞选",
        outcomes: [
          { p: 0.5, effects: { stats: { charm: 3 }, hidden: { network: 2 } }, setFlags: ["club_leader"], log: "你当选了！新的责任落在了肩上。" },
          { p: 0.5, effects: { stats: { mood: -3 } }, log: "落选了。但站在台上演讲的那几分钟，你已经赢了过去的自己。" },
        ],
      },
      {
        id: "no", text: "让贤",
        effects: { stats: { mood: 1 } },
        log: "你把机会让给了更合适的人。",
      },
    ],
  },
  {
    id: "club_contest", type: "prerequisite",
    name: "社团比赛",
    description: "校际社团大赛在即，社团决定代表学校出战。",
    scene: { canEncounter: true, canSocial: true, tags: ["club"] },
    requires: { flags: ["joined_club"] },
    gates: [{ stat: "charm", min: 30 }],
    weight: 6, cooldown: 2, singleTermLimit: null,
    env: (s) => s.stats.mood >= 50, // 心情尚可才报名大赛
    choices: [
      {
        id: "play", text: "报名参赛",
        effects: { stats: { charm: 2, mood: 2, score: -1 } },
        outcomes: [
          { p: 0.4, effects: { stats: { charm: 2 }, hidden: { network: 1 } }, log: "拿到了不错的名次！" },
          { p: 0.6, effects: { stats: { mood: 2 } }, log: "重在参与，经验无价。" },
        ],
      },
    ],
  },

  // ---- 导师类 ----
  {
    id: "adv_competition", type: "prerequisite",
    name: "参加竞赛",
    description: "导师发来一条消息：\"有个比赛，敢不敢去？\"",
    scene: { canEncounter: false, canSocial: true, tags: ["classroom"] },
    requires: { flags: ["has_advisor"] },
    gates: [{ stat: "int", min: 45 }],
    weight: 6, cooldown: 2, singleTermLimit: null,
    env: (s, ctx) => ctx.sceneTags.includes("classroom"), // 教室/导师场景
    choices: [
      {
        id: "join", text: "组队参赛",
        effects: { stats: { int: 4, score: 4, mood: -3, health: -2 } },
        outcomes: [
          { p: 0.4, luckSensitive: true, setFlags: ["won_competition"], effects: { stats: { mood: 6 }, hidden: { network: 2 } }, log: "省赛获奖！证书和奖金一起到了！" },
          { p: 0.6, effects: { stats: { mood: -3 } }, log: "陪跑了，但积累了不少经验。" },
        ],
      },
      {
        id: "no", text: "学业繁忙，婉拒",
        effects: { stats: { mood: 1 } },
        log: "导师回了一个\"哦\"。",
      },
    ],
  },
  {
    id: "adv_project", type: "prerequisite",
    name: "参加项目",
    description: "导师的课题组最近很缺人手。",
    scene: { canEncounter: false, canSocial: true, tags: ["classroom"] },
    requires: { flags: ["has_advisor"] },
    gates: [{ stat: "int", min: 40 }],
    weight: 6, cooldown: 2, singleTermLimit: null,
    env: (s, ctx) => ctx.sceneTags.includes("classroom") || s.stats.wealth < 300, // 缺钱时导师项目来钱
    choices: [
      {
        id: "join", text: "加入课题组",
        effects: { stats: { int: 3, wealth: 200, mood: -2 } },
        log: "项目经费到账，你也成了\"打工人\"。",
      },
      {
        id: "no", text: "再想想",
        effects: { stats: { mood: 1 } },
        log: "你婉拒了。",
      },
    ],
  },
  {
    id: "adv_lab", type: "prerequisite",
    name: "进实验室",
    description: "实验室的仪器闪着冷光，师兄师姐们行色匆匆。",
    scene: { canEncounter: false, canSocial: true, tags: ["classroom"] },
    requires: { flags: ["has_advisor"] },
    gates: [{ stat: "int", min: 35 }],
    weight: 6, cooldown: 2, singleTermLimit: null,
    env: (s, ctx) => ctx.sceneTags.includes("classroom"), // 实验室场景
    choices: [
      {
        id: "research", text: "泡在实验室做课题",
        effects: { stats: { int: 3, health: -2, mood: -2 } },
        outcomes: [
          { p: 0.5, effects: { stats: { int: 2 }, hidden: { network: 1 } }, log: "论文挂上了二作！" },
          { p: 0.5, effects: { stats: { mood: -1 } }, log: "实验又失败了，再来一次。" },
        ],
      },
    ],
  },
  {
    id: "adv_seminar", type: "prerequisite",
    name: "组会汇报",
    description: "又到了每周一次的组会时间。你的 PPT 还没做完。",
    scene: { canEncounter: false, canSocial: true, tags: ["classroom"] },
    requires: { flags: ["has_advisor"] },
    gates: [{ stat: "int", min: 30 }],
    weight: 6, cooldown: 3, singleTermLimit: null,
    env: () => true, // 组会每周都有
    choices: [
      {
        id: "report", text: "认真准备汇报",
        effects: { stats: { int: 2, mood: -3 } },
        outcomes: [
          { p: 0.5, effects: { stats: { mood: 2 } }, log: "导师难得地表扬了你。" },
          { p: 0.5, effects: { stats: { mood: -3 } }, log: "\"这个进度，你自己满意吗？\"导师的批评一针见血。" },
        ],
      },
      {
        id: "hide", text: "借口生病躲过去",
        effects: { stats: { mood: 2, int: -1 } },
        log: "躲得过初一，躲不过十五。",
      },
    ],
  },

  // ---- 恋爱类 ----
  {
    id: "love_walk", type: "prerequisite",
    name: "一起散步",
    description: "晚风正好。要不要约TA出来走走？",
    scene: { canEncounter: true, canSocial: true, tags: ["street"] },
    character: "@crush",
    requires: { flags: ["met_any_crush"], anyCrushAffectionMin: 40 },
    weight: 9, cooldown: 1, singleTermLimit: null,
    env: (s) => s.stats.mood >= 50, // 心情好想见TA
    choices: [
      {
        id: "ask", text: "约TA散步",
        effects: { stats: { mood: 8 }, crush: { affection: 10 } },
        log: "路灯把影子拉得很长，你们聊了一路。",
      },
      {
        id: "alone", text: "一个人走走",
        effects: { stats: { mood: 4 } },
        log: "独处的夜晚，也别有滋味。",
      },
    ],
  },
  {
    id: "love_gift", type: "prerequisite",
    name: "送礼物",
    description: "商场橱窗里，有样东西你第一眼就觉得适合TA。",
    scene: { canEncounter: false, canSocial: false, tags: [] },
    character: "@crush",
    requires: { flags: ["met_any_crush"], anyCrushAffectionMin: 50 },
    gates: [{ stat: "wealth", min: 100 }],
    weight: 9, cooldown: 1, singleTermLimit: null,
    env: (s) => s.stats.wealth >= 500, // 有余钱才想起送礼
    choices: [
      {
        id: "buy", text: "买下来送给TA",
        effects: { stats: { wealth: -100, mood: 3 }, crush: { affection: 15 } },
        log: "TA收到礼物时的笑容，值回票价。",
      },
      {
        id: "not_yet", text: "下次吧",
        effects: { stats: { mood: 1 } },
        log: "你把礼物的事记在了备忘录里。",
      },
    ],
  },
  {
    id: "love_movie", type: "prerequisite",
    name: "看电影",
    description: "最近有部新片上映，朋友圈都在晒票根。",
    scene: { canEncounter: true, canSocial: true, tags: ["street"] },
    character: "@crush",
    requires: { flags: ["met_any_crush"], anyCrushAffectionMin: 60 },
    gates: [{ stat: "wealth", min: 60 }],
    weight: 9, cooldown: 1, singleTermLimit: null,
    env: (s, ctx) => ctx.sceneTags.includes("street") || s.stats.mood >= 60, // 逛街/心情好想看电影
    choices: [
      {
        id: "invite", text: "约TA看电影",
        effects: { stats: { wealth: -60, mood: 8 }, crush: { affection: 10 } },
        log: "黑暗的放映厅里，你们分享着同一桶爆米花。",
      },
      {
        id: "alone", text: "自己去看",
        effects: { stats: { wealth: -30, mood: 4 } },
        log: "一个人看电影，也有一个人的自由。",
      },
    ],
  },
  {
    id: "love_travel", type: "prerequisite",
    name: "情侣旅行",
    description: "恋爱中的第一个长假，去哪看看呢？",
    scene: { canEncounter: true, canSocial: true, tags: ["street"] },
    character: "@crush",
    requires: { flags: ["dating"], notFlags: ["broke_up"] },
    gates: [{ stat: "wealth", min: 400 }],
    weight: 6, cooldown: 3, singleTermLimit: null,
    env: (s) => s.stats.wealth >= 1000, // 钱够多才想旅行
    choices: [
      {
        id: "go", text: "出发！",
        effects: { stats: { wealth: -400, mood: 25 }, crush: { affection: 10 } },
        log: "火车、海风、日出。旅行是最能看清一个人的方式——TA通过了考验。",
      },
      {
        id: "save", text: "攒钱要紧，下次吧",
        effects: { stats: { mood: 1 } },
        log: "TA有点失望，但表示理解。",
      },
    ],
  },
  {
    id: "love_breakup", type: "prerequisite",
    name: "感情出现裂痕",
    description: "最近的争吵越来越多，你们之间出现了一道看不见的裂痕。",
    scene: { canEncounter: false, canSocial: false, tags: [] },
    character: "@crush",
    requires: { flags: ["dating"], notFlags: ["broke_up"] },
    weight: 3, cooldown: 0, singleTermLimit: 1,
    env: () => true, // 裂痕随时可能出现（每学期仅一次）
    choices: [
      {
        id: "breakup", text: "和平分手",
        effects: { stats: { mood: -25 } },
        crush: { affection: -50 },
        setFlags: ["broke_up"],
        log: "你们在熟悉的街角道别。有些路，注定只能陪彼此走到这里。",
      },
      {
        id: "fix", text: "再努力挽回一下",
        effects: { stats: { mood: -5 }, crush: { affection: 5 } },
        log: "你们坐下来聊了很久，裂痕暂时被修补了。",
      },
    ],
  },

  // ---- 生病类 ----
  {
    id: "sick_caught", type: "prerequisite",
    name: "生病了",
    description: "头昏沉沉的，嗓子像吞了砂纸。你摸了摸额头——发烧了。",
    scene: { canEncounter: false, canSocial: false, tags: ["dorm"] },
    requires: { stats: { health: { max: 30 } } },
    weight: 5, cooldown: 3, singleTermLimit: null,
    env: () => true, // 生病时买药/硬扛/去医院常驻（健康≤30 已由 requires 把关）
    envPriority: 10, // 紧急：不被常规事件挤出
    choices: [
      {
        id: "med", text: "买药吃",
        gates: [{ stat: "wealth", min: 50 }],
        effects: { stats: { wealth: -50, health: 10, mood: 1 } },
        log: "退烧药下肚，你裹着被子睡了一觉。",
      },
      {
        id: "endure", text: "硬扛过去",
        effects: { stats: { health: -6, mood: -8 } },
        outcomes: [
          { p: 0.6, log: "你扛住了，但整个人像被抽空了一样。" },
          { p: 0.4, trigger: { id: "sick_hospital" }, log: "病情加重了，看来必须去医院……" },
        ],
      },
      {
        id: "hospital", text: "去医院",
        gates: [{ stat: "wealth", min: 200 }],
        effects: { stats: { wealth: -200, health: 18, mood: -2 } },
        log: "挂号、排队、抽血。医生开的药很有效。",
      },
    ],
  },
  {
    id: "sick_hospital", type: "prerequisite",
    name: "住院",
    description: "医生看着化验单，推了推眼镜：\"建议住院治疗。\"",
    scene: { canEncounter: false, canSocial: true, tags: ["hospital"] },
    requires: { stats: { health: { max: 15 } } },
    weight: 8, cooldown: 0, singleTermLimit: null,
    env: () => true, // 住院选项常驻（健康≤15 已由 requires 把关）
    envPriority: 10, // 紧急：优先于一切常规事件
    choices: [
      {
        id: "admit", text: "办理住院（医药费不便宜）",
        effects: { stats: { wealth: -500, health: 25, mood: -3 } },
        skipTurns: 1,
        setFlags: ["hospitalized"],
        log: "白色的病房很安静。你在病床上度过了一周，错过了不少事。出院时，账单让你倒吸一口凉气。",
      },
      {
        id: "refuse", text: "拒绝住院，回去躺着",
        effects: { stats: { health: -8, mood: -5 } },
        outcomes: [
          { p: 0.5, effects: { stats: { health: -10 } }, log: "情况更糟了，你连床都下不了。" },
          { p: 0.5, log: "奇迹般地慢慢好转了。" },
        ],
      },
    ],
  },

  // ---- 工作类 ----
  {
    id: "work_quit", type: "prerequisite",
    name: "辞职",
    description: "兼职的疲惫越积越多，你开始认真考虑辞职。",
    scene: { canEncounter: false, canSocial: false, tags: [] },
    requires: { flags: ["parttime"], notFlags: ["quit_job"] },
    weight: 4, cooldown: 0, singleTermLimit: null,
    env: (s) => s.stats.mood <= 50, // 疲惫时辞职选项常驻
    choices: [
      {
        id: "quit", text: "辞掉兼职",
        effects: { stats: { mood: 8 } },
        setFlags: ["quit_job"],
        log: "无工一身轻，你把时间还给了校园。",
      },
      {
        id: "keep", text: "再坚持一阵",
        effects: { stats: { wealth: 150, mood: -5 } },
        log: "看在钱的份上，又撑了一个月。",
      },
    ],
  },

  // ---- 旅游类 ----
  {
    id: "travel_plan", type: "prerequisite",
    name: "规划旅行",
    description: "你打开地图，开始规划一条路线。",
    scene: { canEncounter: false, canSocial: false, tags: [] },
    requires: { notFlags: ["travel_planned"] },
    gates: [{ stat: "wealth", min: 800 }],
    weight: 5, cooldown: 0, singleTermLimit: null,
    env: (s) => s.stats.wealth >= 1200, // 钱多才想规划旅行
    choices: [
      {
        id: "plan", text: "认真规划路线",
        effects: { stats: { int: 1, mood: 3 } },
        setFlags: ["travel_planned"],
        log: "攻略写了三页纸，你仿佛已经出发了。",
      },
    ],
  },
  {
    id: "travel_go", type: "prerequisite",
    name: "出门旅行",
    description: "计划已经就绪，只差出发。",
    scene: { canEncounter: true, canSocial: true, tags: ["street"] },
    requires: { flags: ["travel_planned"], notFlags: ["traveled_once"] },
    gates: [{ stat: "wealth", min: 500 }],
    weight: 6, cooldown: 0, singleTermLimit: null,
    env: (s) => s.stats.wealth >= 800 && s.stats.mood >= 50, // 规划好了且有钱有心情
    choices: [
      {
        id: "go", text: "出发！",
        effects: { stats: { wealth: -500, mood: 22, health: 2, charm: 2 }, hidden: { luck: 5 } },
        setFlags: ["traveled_once"],
        log: "路上的风景，成为了你大学记忆里最亮的一页。",
      },
      {
        id: "not_yet", text: "还是先忙学业吧",
        effects: { stats: { mood: -2 } },
        log: "计划躺在抽屉里，等待着下一次冲动。",
      },
    ],
  },

  // ---- 寝室事件（随寝室 roll 解锁，requires met_roommate 恒真作保护） ----
  {
    id: "dorm_gamenight", type: "prerequisite",
    name: "宿舍开黑",
    description: "\"五缺一！就等你了！\"舍友们的呐喊穿透了耳机。",
    scene: { canEncounter: false, canSocial: true, tags: ["dorm"] },
    character: "@roommate",
    requires: { flags: ["met_roommate"] },
    weight: 7, cooldown: 3, singleTermLimit: null,
    env: (s, ctx) => ctx.sceneTags.includes("dorm") && s.stats.mood >= 40, // 宿舍场景开黑
    choices: [
      {
        id: "join", text: "参战！",
        effects: { stats: { mood: 8, health: -2, int: -1, score: -1 } },
        log: "五黑连坐，今晚的宿舍充满了快活的空气。",
      },
      {
        id: "watch", text: "观战",
        effects: { stats: { mood: 3 } },
        log: "看别人打游戏，比自己打还紧张。",
      },
      {
        id: "sleep", text: "戴耳塞睡觉",
        effects: { stats: { health: 2, mood: 1 } },
        log: "耳塞一戴，世界清净。",
      },
    ],
  },
  {
    id: "dorm_meal", type: "prerequisite",
    name: "帮带饭",
    description: "舍友发来消息：\"回来帮我带份饭，求求了！\"",
    scene: { canEncounter: false, canSocial: true, tags: ["canteen"] },
    character: "@roommate",
    requires: { flags: ["met_roommate"] },
    weight: 6, cooldown: 2, singleTermLimit: null,
    env: (s, ctx) => ctx.sceneTags.includes("canteen"), // 食堂场景带饭
    choices: [
      {
        id: "treat", text: "帮带，还顺便请客",
        gates: [{ stat: "wealth", min: 40 }],
        effects: { stats: { wealth: -40, mood: 5 } },
        log: "\"下次我请！\"舍友感动得眼泪汪汪。",
      },
      {
        id: "help", text: "帮忙跑个腿",
        effects: { stats: { mood: 3, health: -1 } },
        log: "你拎着五份饭爬上了六楼。",
      },
    ],
  },
  {
    id: "dorm_nighttalk", type: "prerequisite",
    name: "深夜卧谈会",
    description: "灯熄了，不知道谁起了个头，话题就停不下来了。",
    scene: { canEncounter: false, canSocial: true, tags: ["dorm"] },
    character: "@roommate",
    requires: { flags: ["met_roommate"] },
    weight: 8, cooldown: 2, singleTermLimit: null,
    env: (s, ctx) => ctx.sceneTags.includes("dorm") && s.stats.mood >= 50, // 宿舍夜晚卧谈
    choices: [
      {
        id: "join", text: "加入卧谈",
        effects: { stats: { mood: 6, health: -2 }, hidden: { network: 1 } },
        outcomes: [
          { p: 0.4, effects: { stats: { mood: 2 } }, log: "从八卦聊到人生，聊到了天亮。" },
          { p: 0.6, log: "有些话，只在熄灯之后才说得出口。" },
        ],
      },
    ],
  },
  {
    id: "dorm_conflict", type: "prerequisite",
    name: "宿舍闹矛盾",
    description: "因为一些生活琐事，宿舍里的气氛降到了冰点。",
    scene: { canEncounter: false, canSocial: true, tags: ["dorm"] },
    character: "@roommate",
    requires: { flags: ["met_roommate"] },
    weight: 5, cooldown: 4, singleTermLimit: null,
    env: (s, ctx) => ctx.sceneTags.includes("dorm") && s.stats.mood <= 40, // 宿舍气氛降温
    choices: [
      {
        id: "fix", text: "主动化解矛盾",
        gates: [{ stat: "charm", min: 20 }],
        effects: { stats: { mood: 4 }, hidden: { network: 1 } },
        log: "你把大家拉到一起聊开了，误会解除。",
      },
      {
        id: "cold", text: "冷战到底",
        effects: { stats: { mood: -4 } },
        log: "宿舍里连呼吸声都显得尴尬。",
      },
    ],
  },
  {
    id: "dorm_birthday", type: "prerequisite",
    name: "舍友生日",
    description: "今天是舍友的生日，群聊里在密谋惊喜。",
    scene: { canEncounter: false, canSocial: true, tags: ["dorm"] },
    character: "@roommate",
    requires: { flags: ["met_roommate"] },
    weight: 6, cooldown: 8, singleTermLimit: null,
    env: (s, ctx) => ctx.sceneTags.includes("dorm"), // 宿舍生日（冷却 8，天然罕见）
    choices: [
      {
        id: "cake", text: "凑钱买蛋糕",
        gates: [{ stat: "wealth", min: 50 }],
        effects: { stats: { wealth: -50, mood: 8 } },
        log: "烛光亮起的那一刻，寿星红了眼眶。",
      },
      {
        id: "bless", text: "送上口头祝福",
        effects: { stats: { mood: 3 } },
        log: "心意到了，就是最好的礼物。",
      },
    ],
  },
  {
    id: "dorm_cleanup", type: "prerequisite",
    name: "宿舍大扫除",
    description: "宿管阿姨下了最后通牒：今天必须大扫除！",
    scene: { canEncounter: false, canSocial: true, tags: ["dorm"] },
    character: "@roommate",
    requires: { flags: ["met_roommate"] },
    weight: 6, cooldown: 3, singleTermLimit: null,
    env: (s, ctx) => ctx.sceneTags.includes("dorm"), // 宿舍大扫除
    choices: [
      {
        id: "join", text: "认真参与打扫",
        effects: { stats: { health: 2, mood: -2 } },
        log: "两小时后，宿舍焕然一新，像住了新房。",
      },
      {
        id: "moyu", text: "象征性摸鱼",
        effects: { stats: { mood: 2 } },
        log: "你负责的部分，只有床帘。",
      },
    ],
  },
];
