// 正常类事件：常驻候选池（权重 + 冷却 + 单学期上限）
// scene: 环境判定（固有类注入用）canEncounter 能否邂逅 / canSocial 能否社交 / tags 匹配场景池
// env(state, ctx): 环境判断函数——通过时本事件的全部可见选项汇入其他事件回合（无 env 的事件只当宿主）
//   ctx = { sceneTags, hostEvent }（宿主事件场景标签 + 宿主对象）
// 选项可选 historyVerb（历史文案动词，缺省"选择"）/ historyText（整句模板 {verb}/{text}/{times}）
// feedback：每个选项必填——以该事件的"主人格"第一人称视角写作（对事件的看法 + 场景细节 + 情绪后味）
//   10 人格：卷王学霸 / 咸鱼躺平 / 社牛交际花 / 健身狂魔 / 热血体育生 / 财迷精算师 / 打工魂 / 深夜emo文青 / 剁手党 / 早八战士
// aliases（同位词）：事件 { name, description } / 选项 { text, feedback? }——变体表达，呈现时按 PROB.alias 随机抽取

export const NORMAL_EVENTS = [
  {
    id: "normal_study_library", type: "normal",
    name: "去图书馆自习",
    description: "图书馆里安静得能听见翻书声。期中将近，是时候给绩点添砖加瓦了。",
    aliases: [
      { name: "期末冲刺", description: "倒计时日历上的红圈又少了一个。去自习室抢座吗？" },
    ],
    scene: { canEncounter: true, canSocial: true, tags: ["library"] },
    weight: 13, cooldown: 1, singleTermLimit: null,
    env: (s) => s.week >= s.semesterLength - 2, // 临近考试周：自习选项常驻
    choices: [
      {
        id: "focus", text: "专注刷题，一坐就是一天", historyVerb: "专注",
        aliases: [{ text: "早八抢座，一坐一天" }],
        effects: { stats: { int: 3, score: 5, health: -1, mood: -2 } },
        outcomes: [
          { p: 0.7, luckSensitive: true, effects: { stats: { score: 2 } }, log: "心流状态，效率翻倍！" },
          { p: 0.3, effects: { stats: { mood: -2 } }, log: "知识它不进脑子……" },
        ],
        feedback: "图书馆的老位置像有魔力，一坐下来，世界就只剩下笔尖和纸页的摩擦声。\n\n刷完一套卷子抬头，天已经黑了。脖子有点酸，心里却出奇地踏实——绩点不会辜负每一个泡在自习室的人，你一直这么相信。",
      },
      {
        id: "balanced", text: "劳逸结合，学两小时休息一次",
        effects: { stats: { int: 1, score: 1, mood: 1 } },
        log: "不慌不忙，细水长流。",
        feedback: "有人觉得学霸就该往死里学，其实恰恰相反：会休息的人才能学得久。\n\n两小时一章，站起来接杯水，看看窗外的树。不慌不忙的节奏里，知识反而记得更牢。",
      },
      {
        id: "join_literature", text: "加入图书馆的文学社",
        effects: { stats: { mood: 3 } },
        unlockHobby: "writing",
        log: "你成了文学社的新成员。",
        feedback: "刷题之外，总得给灵魂留点地方。文学社的活动室里，大家围着一本书聊到熄灯。\n\n走出门时你忽然觉得，大学不止绩点，还有一群和你一样较真的人。",
      },
      {
        id: "help_notes", text: "帮学霸整理资料",
        hiddenGates: [{ stat: "network", min: 30 }],
        effects: { stats: { int: 2, score: 1 }, hidden: { network: 2 } },
        log: "顺便认识了几个大佬，圈子又广了一点。",
        feedback: "帮学霸整理资料这活儿，外人看着像打杂，其实是最赚的——大佬的笔记逻辑，看一遍顶自己啃三天。\n\n临走时他们拉你进了学习小组的群。群里安静，但每个人发的都是干货。",
      },
    ],
  },

  {
    id: "normal_study_dorm", type: "normal",
    name: "在宿舍复习",
    description: "宿舍的学习氛围，取决于你的定力。",
    aliases: [
      { name: "宿舍自习", description: "床在身后，书在眼前，全看定力。" },
    ],
    scene: { canEncounter: false, canSocial: true, tags: ["dorm"] },
    weight: 10, cooldown: 1, singleTermLimit: null,
    env: (s, ctx) => ctx.sceneTags.includes("dorm"), // 宿舍场景可复习
    choices: [
      {
        id: "focus", text: "戴上耳机，认真复习",
        effects: { stats: { int: 2, score: 4, mood: -1 } },
        outcomes: [
          { p: 0.5, effects: { stats: { mood: 1 }, hidden: { network: 1 } }, log: "舍友被你感染，一起学了起来。" },
          { p: 0.5, log: "安静的两个小时，收获不少。" },
        ],
        feedback: "戴上降噪耳机，宿舍的喧闹瞬间被推到很远的背景里。\n\n舍友开黑的笑骂声、走廊里拖鞋的啪嗒声，都成了白噪音。你在自己的节奏里，一节一节地把高数啃下来。",
      },
      {
        id: "night", text: "熬夜学到凌晨",
        aliases: [{ text: "肝到凌晨两点" }],
        effects: { stats: { int: 3, score: 2, health: -3, mood: -2 } },
        log: "台灯下的你，像极了高中的样子。",
        feedback: "凌晨一点，台灯把书页照得发白，你还在和最后一道大题较劲。\n\n困是真困，但「再学十分钟就睡」的念头一旦开始，就停不下来。第二天顶着黑眼圈坐在早八的教室里，你想起一句话：出来混，迟早要还的——觉也是。",
      },
      {
        id: "give_up", text: "学不进去，刷会儿手机",
        effects: { stats: { mood: 3, score: -1 } },
        log: "短视频真好刷，两个小时一晃而过。",
        feedback: "翻开书十分钟，手机亮了一次、两次、三次。\n\n算了，今天状态不对。你躺在椅子上刷短视频，笑得很开心，笑完又有点空。下次吧，下次一定认真学。",
      },
    ],
  },

  {
    id: "normal_wander", type: "normal",
    name: "校园闲逛",
    description: "秋天的校园，梧桐叶落了一地。去哪走走？",
    aliases: [
      { name: "校园溜达", description: "下午没课，在校园里晃荡晃荡。" },
    ],
    scene: { canEncounter: true, canSocial: true, tags: ["street"] },
    weight: 10, cooldown: 1, singleTermLimit: null,
    env: (s, ctx) => ctx.sceneTags.includes("street") || s.stats.mood < 40, // 闷了出去走走
    choices: [
      {
        id: "explore", text: "漫无目的地探索校园", historyVerb: "去逛",
        aliases: [{ text: "随便走走，走到哪算哪" }],
        effects: { stats: { mood: 2 } },
        outcomes: [
          { p: 0.5, luckSensitive: true, effects: { stats: { charm: 1 }, hidden: { luck: 2 } }, log: "在湖边遇到了有意思的人。" },
          { p: 0.5, effects: { stats: { mood: 1 } }, log: "校园的晚霞真美。" },
        ],
        feedback: "校园的地图早就烂熟于心，可每次乱走，还是能发现新东西：拐角的猫、新开的面包店、墙上不知谁画的涂鸦。\n\n路上和好几个人点头微笑，你不认识他们，但感觉已经认识了。",
      },
      {
        id: "guitar_club", text: "报名吉他社",
        effects: { stats: { mood: 3 } },
        unlockHobby: "music",
        log: "你摸到了人生第一把吉他。",
        feedback: "吉他社招新摊位前人挤人，学长现场弹了一段，你当场走不动路。\n\n报名表递上去的那一刻，你已经在想象自己抱着吉他在操场边唱歌的样子。青春嘛，就该有点声响。",
      },
      {
        id: "photo_club", text: "加入摄影社",
        effects: { stats: { mood: 3 } },
        unlockHobby: "photo",
        log: "从此你的镜头里多了整个校园。",
        feedback: "摄影社的群里天天有人约拍，你扛着借来的相机就去了。\n\n取景框里的校园特别好看，而且——你发现了社交密码：夸别人上镜，比夸什么都管用。",
      },
      {
        id: "snack", text: "买点小吃解解馋",
        gates: [{ stat: "wealth", min: 30 }],
        effects: { stats: { wealth: -30, mood: 3, health: 1 } },
        log: "烤肠加奶茶，快乐加倍。",
        feedback: "烤肠在炉子上滋滋冒油，你站在摊前，老板已经把竹签递了过来。\n\n一口咬下去，油香混着孜然在嘴里炸开。路过的人看见你边走边吃，你也大大方方地笑回去：吃，也是一种社交。",
      },
    ],
  },

  {
    id: "normal_game", type: "normal",
    name: "打游戏",
    description: "舍友喊你：\"来一把？就一把！\"",
    aliases: [
      { name: "开黑", description: "舍友把鼠标递了过来：来一把？" },
    ],
    scene: { canEncounter: false, canSocial: true, tags: ["dorm"] },
    weight: 9, cooldown: 1, singleTermLimit: null,
    env: (s, ctx) => ctx.sceneTags.includes("dorm"), // 舍友喊开黑
    choices: [
      {
        id: "play", text: "开黑！", historyVerb: "去开黑",
        aliases: [{ text: "来！上号！" }],
        effects: { stats: { mood: 5, health: -2, int: -1, score: -1 } },
        outcomes: [
          { p: 0.4, luckSensitive: true, effects: { stats: { mood: 3 }, hidden: { luck: 2 } }, log: "十连胜，今晚手感火热！" },
          { p: 0.6, effects: { stats: { mood: -4 } }, log: "连跪三把，队友一个比一个离谱。" },
        ],
        feedback: "键盘一响，什么烦恼都抛到九霄云外。\n\n一局又一局，天从亮到黑，快乐是真的快乐，就是出门吃饭时腿有点软。有人说「时间都去哪了」——时间在排位里，你亲眼看着的。",
      },
      {
        id: "esports_club", text: "加入电竞社",
        effects: { stats: { mood: 2 } },
        unlockHobby: "gaming",
        log: "你找到了组织。",
        feedback: "原来打游戏还能有组织？电竞社的活动室简直像天堂：满墙的战队海报，免费的快乐水。\n\n第一次活动你就拿了把 MVP，社长拍着你肩膀说「有潜力」。你嘿嘿一笑，没告诉他这是你唯一高光。",
      },
      {
        id: "quit", text: "卸载游戏，好好学习",
        aliases: [{ text: "点下卸载，闭关学习" }],
        effects: { stats: { int: 2, score: 2, mood: -3 } },
        log: "删除的那一刻，心如止水。",
        feedback: "卸载界面弹出确认框的时候，你的手指悬了三秒。\n\n三秒后，图标从桌面消失。心里空落落的，又莫名轻松。从此江湖再见——等考完试，我们再战。当然，这话也很熟。",
      },
    ],
  },

  {
    id: "normal_fitness", type: "normal",
    name: "去健身",
    description: "操场边的健身房，铁片碰撞声此起彼伏。",
    aliases: [
      { name: "撸铁", description: "健身房的铁味，闻着就精神。" },
    ],
    scene: { canEncounter: true, canSocial: true, tags: ["sports"] },
    weight: 8, cooldown: 1, singleTermLimit: null,
    env: (s) => s.stats.mood >= 60, // 心情好去锻炼
    choices: [
      {
        id: "train", text: "认真练一组", historyVerb: "去练",
        aliases: [{ text: "今天推胸日，认真练" }],
        effects: { stats: { physique: 3, health: 2, mood: 1 } },
        log: "汗水是青春的注脚。",
        feedback: "热身、加片、调整呼吸，第一组下去，泵感如期而至。\n\n肌肉在燃烧，汗水顺着下巴滴在垫子上。你盯着镜子里充血的手臂，什么绩点、什么烦恼，都暂时失联了。",
      },
      {
        id: "hardcore", text: "上大重量，挑战极限",
        gates: [{ stat: "physique", min: 40 }],
        outcomes: [
          { p: 0.6, effects: { stats: { physique: 3, health: 1 } }, log: "成功突破个人纪录！" },
          { p: 0.4, effects: { stats: { health: -8 } }, log: "逞强了，肌肉拉伤，疼得龇牙咧嘴。" },
        ],
        feedback: "深蹲架前你深吸一口气，杠铃杆微微弯了一下。\n\n起来的瞬间，世界安静了半秒——新纪录。旁边的大哥冲你点点头，那一眼胜过千言万语：练过的人才懂。",
      },
      {
        id: "keep_hobby", text: "养成规律健身的习惯",
        effects: { stats: { physique: 1, mood: 1 } },
        unlockHobby: "fitness",
        log: "从今天起，健身成为一种生活方式。",
        feedback: "办了卡容易，坚持下来才是真本事。你把训练计划贴在了床头，一周四练，雷打不动。\n\n一个月后，你开始期待走进健身房的那条路。习惯这东西，一旦长出来，就比决心靠谱。",
      },
      {
        id: "skip", text: "在垫子上偷懒玩手机",
        aliases: [{ text: "垫子上躺平刷手机" }],
        effects: { stats: { mood: 2, physique: -1 } },
        log: "办卡一时爽，一直办卡一直……爽？",
        feedback: "躺在垫子上刷手机的你，和门口海报上挥汗如雨的模特，形成了鲜明对比。\n\n教练路过，欲言又止地看了你一眼。你装作在拉伸，心里想：明天，明天一定认真练。",
      },
    ],
  },

  {
    id: "normal_sleep", type: "normal",
    name: "睡觉",
    description: "困意像潮水一样涌来。",
    aliases: [
      { name: "补觉", description: "眼皮打架，床在召唤。" },
    ],
    scene: { canEncounter: false, canSocial: false, tags: ["dorm"] },
    weight: 7, cooldown: 2, singleTermLimit: null,
    env: (s) => s.stats.health < 50 || s.stats.mood < 30, // 累了/emo 想睡
    choices: [
      {
        id: "sleep_in", text: "睡到自然醒", historyVerb: "去睡",
        aliases: [{ text: "睡到天荒地老" }],
        effects: { stats: { health: 3, mood: 3, score: -1 } },
        log: "梦里什么都有。",
        feedback: "闹钟响了，你伸手按掉，翻个身又睡了回去。\n\n被窝是青春的坟墓，但说真的，谁能拒绝一个软绵绵的坟墓呢？醒来时阳光已经爬到了床尾，窗外有鸟叫——原来自然醒是这个味道。",
      },
      {
        id: "early", text: "早睡早起",
        effects: { stats: { health: 2, int: 1, mood: 1 } },
        log: "清晨六点的宿舍，安静得像另一个世界。",
        feedback: "破天荒十一点就熄了手机，舍友都愣了：「你被盗号了？」\n\n清晨六点，宿舍安静得像另一个世界。你蹑手蹑脚地洗漱，突然觉得，偶尔做一次早鸟，也挺有意思的。",
      },
      {
        id: "insomnia", text: "失眠了，起来刷手机",
        outcomes: [
          { p: 0.5, effects: { stats: { health: -2, mood: -2 } }, log: "越刷越精神，越精神越焦虑。" },
          { p: 0.5, effects: { stats: { mood: 1 } }, log: "刷到了好笑的视频，心情好转。" },
        ],
        feedback: "凌晨两点，数到第几只羊的时候，你放弃了。\n\n手机屏幕的光映在脸上，一条接一条刷下去。困意没来，天倒是先亮了。你暗下决心：今晚一定早睡——虽然这话说了三百遍。",
      },
    ],
  },

  {
    id: "normal_competition", type: "normal",
    name: "打比赛",
    description: "学院篮球联赛开打，场边的加油声震耳欲聋。",
    aliases: [
      { name: "上场比赛", description: "裁判哨响，场边呐喊震天。" },
    ],
    scene: { canEncounter: true, canSocial: true, tags: ["sports"] },
    character: "char_ahao",
    gates: [{ stat: "physique", min: 20 }],
    weight: 6, cooldown: 2, singleTermLimit: null,
    env: (s, ctx) => ctx.sceneTags.includes("sports"), // 球场边的比赛
    choices: [
      {
        id: "play", text: "上场拼一把",
        aliases: [{ text: "首发上场，拼了" }],
        effects: { stats: { physique: 2, mood: 2, health: -2 } },
        outcomes: [
          { p: 0.5, luckSensitive: true, effects: { stats: { physique: 3, charm: 2 }, hidden: { network: 1 } }, log: "决赛绝杀！全场都在喊你的名字！" },
          { p: 0.5, effects: { stats: { physique: 1 } }, log: "惜败，但打出了风采。" },
        ],
        feedback: "哨响的那一刻，什么学业压力、人际烦恼，全都被甩在身后。\n\n你追着球满场飞奔，汗水糊住眼睛也不肯下场。有人说比赛就是游戏，可对场上的每个人来说，那就是全部。",
      },
      {
        id: "cheer", text: "在场边当气氛组",
        effects: { stats: { charm: 2, mood: 2 }, hidden: { network: 1 } },
        log: "你认识了不少一起呐喊的朋友。",
        feedback: "有人觉得不上场就没意思，你偏不——气氛组才是球队的第六人。\n\n喊到嗓子哑了，赢球时第一个冲上去拥抱。赛后大家一起撸串，你发现自己多了好几个兄弟。",
      },
      {
        id: "practice", text: "赛后独自加练",
        effects: { stats: { physique: 3, mood: -2 } },
        log: "球场的灯熄了，你还没走。",
        feedback: "人群散尽，球场的灯还亮着，你一个人投了五十个球。\n\n空荡荡的球场里，只有篮球砸地的回声陪你。进步这件事，别人只看得到比分，你自己知道每一滴汗。",
      },
    ],
  },

  {
    id: "normal_invest_stock", type: "normal",
    name: "投资：股票",
    description: "舍友神神秘秘地说：\"这个票，稳！\"你打开账户看了看。",
    aliases: [
      { name: "炒股", description: "K线图红红绿绿，像极了人生。" },
    ],
    scene: { canEncounter: false, canSocial: true, tags: ["dorm"] },
    gates: [{ stat: "wealth", min: 500 }],
    weight: 5, cooldown: 3, singleTermLimit: null,
    env: (s) => s.stats.wealth >= 800, // 闲钱想炒股
    choices: [
      {
        id: "hot", text: "追热点，重仓买入",
        aliases: [{ text: "梭哈！重仓一把" }],
        effects: { stats: { wealth: -300 } },
        outcomes: [
          { p: 0.45, luckSensitive: true, effects: { stats: { wealth: 600, mood: 3 }, hidden: { luck: 5 } }, setFlags: ["invest_win"], log: "涨停了！资产翻倍！" },
          { p: 0.55, effects: { stats: { wealth: -300, mood: -5 } }, log: "山顶站岗，被套得死死的。" },
        ],
        feedback: "龙虎榜一出来你就心跳加速，手指在确认键上悬了两秒。\n\n追热点就是刀口舔血，你知道的。但年轻人不搏一把，难道等六十岁再搏？买入的那一刻，你就是整条街最靓的仔。",
      },
      {
        id: "steady", text: "长期持有，价值投资",
        effects: { stats: { wealth: -200, int: 1 } },
        outcomes: [
          { p: 0.6, effects: { stats: { wealth: 250 } }, log: "时间的朋友，小赚一笔。" },
          { p: 0.4, log: "还在震荡，继续持有。" },
        ],
        feedback: "别人追涨杀跌，你只信一句话：好公司，拿住就完了。\n\nK线图上那点波澜，在十年的尺度里连个水花都算不上。把APP通知关掉，眼不见心不烦——这才是价值投资的正确姿势。",
      },
      {
        id: "watch", text: "看不懂，先观望",
        effects: { stats: { mood: 1 }, hidden: { luck: 2 } },
        log: "观望也是一种策略。",
        feedback: "看不懂的钱，坚决不赚。你合上手机，给自己倒了杯水。\n\n观望不是胆小，是等一个看得懂的时机。市场永远在，机会永远有，怕的是乱动手。这是你的投资第一课。",
      },
    ],
  },

  {
    id: "normal_invest_fund", type: "normal",
    name: "投资：基金定投",
    description: "理财课老师说，定投能穿越牛熊。你有点心动。",
    aliases: [
      { name: "定投", description: "每个月生活费到账，先扣一笔定投。" },
    ],
    scene: { canEncounter: false, canSocial: false, tags: [] },
    gates: [{ stat: "wealth", min: 1000 }],
    weight: 5, cooldown: 3, singleTermLimit: null,
    env: (s) => s.stats.wealth >= 1500, // 大额闲钱定投
    choices: [
      {
        id: "buy", text: "开启每月定投",
        aliases: [{ text: "设置自动扣款" }],
        effects: { stats: { wealth: -500, int: 1 } },
        outcomes: [
          { p: 0.7, effects: { stats: { wealth: 600 }, hidden: { luck: 3 } }, log: "定投曲线向上，稳稳的幸福。" },
          { p: 0.3, effects: { stats: { wealth: -200 } }, log: "大盘回调，账面浮亏。" },
        ],
        feedback: "定投是给未来的自己寄钱。每个月生活费到账那天，系统自动扣款，眼都不眨一下。\n\n你算过账：每月五百，四年就是两万四，加上复利……算到这儿，你笑了。时间站在你这边。",
      },
      {
        id: "no", text: "把钱留在手里",
        effects: { stats: { int: 1 } },
        log: "现金为王，你安慰自己。",
        feedback: "定投虽好，可钱攥在手里才踏实。你把这笔钱重新盘了一遍：吃饭、水电、应急……\n\n现金不是收益，但现金是底气。等手头宽裕了，再让钱出去打工也不迟。",
      },
    ],
  },

  {
    id: "normal_work_tutor", type: "normal",
    name: "兼职：家教",
    description: "家长群发来消息：\"诚招大学生家教，辅导初中数学。\"",
    aliases: [
      { name: "当家教", description: "家长说孩子数学基础有点薄弱。" },
    ],
    scene: { canEncounter: false, canSocial: true, tags: ["street"] },
    gates: [{ stat: "int", min: 30 }],
    weight: 8, cooldown: 1, singleTermLimit: null,
    env: (s) => s.stats.wealth <= 100, // 缺钱找家教
    choices: [
      {
        id: "do", text: "接单上课", historyVerb: "去做做看",
        aliases: [{ text: "这周去上第一节课" }],
        effects: { stats: { wealth: 300, int: 1, mood: -2, score: -1 } },
        setFlags: ["parttime"],
        log: "两个小时讲下来，嗓子冒烟，钱包鼓了一点。",
        feedback: "第一次站在讲台前（其实是别人家的书房），你紧张得声音发飘。\n\n两小时下来嗓子冒烟，可孩子说「听懂啦」的时候，你突然觉得这钱挣得踏实。走出小区，晚风一吹，钱包里那张崭新的钞票特别有分量。",
      },
      {
        id: "hard", text: "接下熊孩子的单",
        effects: { stats: { wealth: 300, mood: -6, score: -1 } },
        setFlags: ["parttime"],
        log: "他连九九乘法表都背不全……这钱挣得不容易。",
        feedback: "这孩子的作业本上，九九乘法表都能背出诗意来。\n\n你深呼吸了八次，把火气压了又压。结课时家长多给了五十块，说是「辛苦费」。你捏着钱，百感交集：这哪是辛苦费，这是精神损失费。",
      },
      {
        id: "quit_now", text: "算了，学业为重",
        effects: { stats: { mood: 2 } },
        log: "你把时间还给了自己。",
        feedback: "你把手机里那条「诚聘家教」的消息划走了。\n\n时间就那么多，给学习还是给打工，得算总账。想通了这一点，你反而轻松了——不是所有钱都该现在挣。",
      },
    ],
  },

  {
    id: "normal_work_delivery", type: "normal",
    name: "兼职：送外卖",
    description: "校园里的外卖骑手风驰电掣。你也想试试。",
    aliases: [
      { name: "跑外卖", description: "电动车钥匙在手，导航已经打开。" },
    ],
    scene: { canEncounter: true, canSocial: true, tags: ["street"] },
    gates: [{ stat: "physique", min: 30 }],
    weight: 8, cooldown: 1, singleTermLimit: null,
    env: (s) => s.stats.wealth <= 0, // 身无分文跑外卖
    choices: [
      {
        id: "do", text: "接单开跑",
        effects: { stats: { wealth: 400, physique: 1, health: -2, mood: -2, score: -1 } },
        setFlags: ["parttime"],
        log: "爬了八栋楼，你开始理解骑手的不易。",
        feedback: "戴上头盔，手机夹上车把，你成了校园里的一道黄色闪电。\n\n爬八栋楼送一份麻辣烫，顾客一句「谢谢」就能抵消一半疲惫。汗流浃背的时候你想起一句话：劳动最光荣——以前不懂，现在懂了。",
      },
      {
        id: "night", text: "专跑夜宵单",
        gates: [{ stat: "physique", min: 40 }],
        effects: { stats: { wealth: 550, health: -4, mood: -3, score: -1 } },
        setFlags: ["parttime"],
        log: "深夜的校园很安静，夜宵单的单价很高。",
        feedback: "深夜的单单价高，校园安静，只有你的车灯划破夜色。\n\n送完最后一单，你在便利店买了瓶冰可乐，坐在台阶上看星星。凌晨的城市，有它不为人知的温柔。",
      },
      {
        id: "quit_now", text: "太累了，不干了",
        effects: { stats: { mood: 2 } },
        log: "你决定把体力留给球场。",
        feedback: "第三天，你的腿已经不属于自己了。\n\n把工牌交回去的时候，站长摆摆手说「随时回来」。你走出站点，忽然觉得能坐着上课也是一种幸福。这大概就是打工最值钱的地方——让你重新爱上生活。",
      },
    ],
  },

  {
    id: "normal_work_milktea", type: "normal",
    name: "兼职：奶茶店",
    description: "校门口的奶茶店在招兼职，店员围裙看起来还挺好看。",
    aliases: [
      { name: "奶茶店打工", description: "点单机嗡嗡响，排队的人排到了门口。" },
    ],
    scene: { canEncounter: true, canSocial: true, tags: ["street"] },
    gates: [{ stat: "charm", min: 30 }],
    weight: 8, cooldown: 1, singleTermLimit: null,
    env: (s) => s.stats.wealth <= 200 && s.stats.mood >= 40, // 缺钱但心态还行
    choices: [
      {
        id: "do", text: "去摇奶茶",
        aliases: [{ text: "系上围裙，开始摇奶茶" }],
        effects: { stats: { wealth: 280, charm: 1, mood: -1, score: -1 } },
        setFlags: ["parttime"],
        log: "你学会了三十种小料的配比。",
        feedback: "围裙一系，摇壶一晃，珍珠在杯底打转。\n\n手忙脚乱的第一天过去，你记住了三十种小料的配比。打烊时店长送你一杯新品，甜味一直从嘴里漫到心里：自己摇的奶茶，格外好喝。",
      },
      {
        id: "social", text: "在吧台和顾客聊天",
        effects: { stats: { wealth: 280, charm: 2, mood: 1, score: -1 }, hidden: { network: 1 } },
        setFlags: ["parttime"],
        log: "熟客越来越多，你的招牌笑容功不可没。",
        feedback: "你发现吧台是个神奇的地方：排队的人愿意跟你闲聊两句。\n\n「老样子？」——熟客越来越多，你的招牌笑容功不可没。有顾客说，冲着你的态度才来的。你笑着又加了半勺芋泥。",
      },
      {
        id: "quit_now", text: "站一天太累了，不去了",
        effects: { stats: { mood: 2 } },
        log: "你婉拒了店长的挽留。",
        feedback: "第八个小时，你的脚后跟像踩在钉板上。\n\n辞掉兼职那天，你心疼的是工资，解脱的是身体。后来路过那家店，闻着奶茶香，你挥挥手：不了不了，这回只当顾客。",
      },
    ],
  },

  {
    id: "normal_reflect", type: "normal",
    name: "深夜思考人生",
    description: "情绪低落的夜晚，一些念头在脑海里打转。",
    aliases: [
      { name: "深夜emo", description: "凌晨两点，宿舍鼾声四起，只有你还醒着。" },
    ],
    scene: { canEncounter: false, canSocial: true, tags: ["dorm"] },
    requires: { stats: { mood: { max: 30 } } },
    weight: 5, cooldown: 4, singleTermLimit: null,
    env: () => true, // 情绪低谷思考人生常驻（requires mood≤30 已把关）
    choices: [
      {
        id: "ponder", text: "独自消化情绪",
        aliases: [{ text: "戴上耳机，和自己聊聊" }],
        effects: { stats: { mood: 3, int: 1 } },
        log: "想通了一些事，情绪慢慢平复。",
        feedback: "耳机里循环着一首老歌，你在备忘录里写写删删。\n\n有些情绪说不出口，写下来却慢慢有了形状。天快亮时你合上手机，呼出一口长气——像给心口的一团乱麻，找到了线头。",
      },
      {
        id: "talk", text: "找人倾诉",
        hiddenGates: [{ stat: "network", min: 20 }],
        effects: { stats: { mood: 8 }, hidden: { network: 1 } },
        log: "有人听你说话，真好。",
        feedback: "电话拨出去的那一刻你就后悔了，可对方秒接。\n\n说到一半，声音哽住。那头没有安慰，只是安静地听。挂断后你盯着天花板，忽然觉得心里那块石头，被人帮忙抬了一半。",
      },
      {
        id: "dropout", text: "办理退学手续",
        effects: { stats: { mood: 5 } },
        setFlags: ["dropout"],
        log: "你递交了退学申请。大学这条路，你决定换一种走法。",
        feedback: "退学申请交上去，辅导员叹了口气，没再劝。\n\n走出行政楼，你回头看了一眼校门。不是所有路都要走到黑，大学只是众多路里的一条。你背着包，走进了完全不同的未来。",
      },
    ],
  },

  {
    id: "normal_shopping", type: "normal",
    name: "购物",
    description: "深夜的购物车又满了；校门口的快递站堆成了山。",
    aliases: [
      { name: "剁手", description: "购物节红包雨又来了，满减凑单正当时。" },
    ],
    scene: { canEncounter: true, canSocial: true, tags: ["street"] },
    weight: 8, cooldown: 1, singleTermLimit: null,
    choices: [
      {
        id: "online", text: "网购下单",
        aliases: [{ text: "下单！今晚就买" }],
        gates: [{ stat: "wealth", min: 100 }],
        effects: { stats: { wealth: -100, mood: 4 } },
        outcomes: [
          { p: 0.8, effects: { stats: { charm: 1 } }, log: "快递到货，惊喜满满。" },
          { p: 0.2, effects: { stats: { mood: -3 } }, log: "卖家秀 vs 买家秀，惨不忍睹……" },
        ],
        feedback: "结算页面弹出「跨店满300减40」，你以迅雷不及掩耳之势又凑了一单。\n\n付款成功的那一刻，多巴胺直接拉满。接下来几天，你刷物流的次数比刷高数题多得多——拆快递的快乐，不输开奖。",
      },
      {
        id: "offline", text: "线下逛街",
        aliases: [{ text: "出门逛街血拼" }],
        gates: [{ stat: "wealth", min: 80 }],
        effects: { stats: { wealth: -80, mood: 3, charm: 1 } },
        log: "拎着大包小包回宿舍，回头率都高了。",
        feedback: "试衣间里你转了个圈，导购小姐一句「很衬你」，你当场投降。\n\n拎着购物袋走出商场，阳光正好，袋子勒手也开心。线下购物的妙处就在这：钱花出去了，快乐立刻到账，还能顺便锻炼身体。",
      },
      {
        id: "window", text: "只逛不买",
        aliases: [{ text: "加进购物车，先不付款" }],
        effects: { stats: { mood: 2 } },
        log: "逛了一圈，钱包毫发无伤。",
        feedback: "你把心动的统统加进购物车，然后……退出了APP。\n\n「先放着，等它降价」——这是剁手党最后的倔强。虽然多半最后还是会买，但此刻，你省下了钱，也保住了钱包的尊严。",
      },
    ],
  },

  {
    id: "normal_class", type: "normal",
    name: "早八上课",
    description: "早八的课，座位总是不够用——床也是。",
    aliases: [
      { name: "早八", description: "早八的课，闹钟响到第三遍。" },
    ],
    scene: { canEncounter: true, canSocial: true, tags: ["classroom"] },
    weight: 9, cooldown: 1, singleTermLimit: null,
    choices: [
      {
        id: "listen", text: "认真听讲",
        aliases: [{ text: "第一排，认真听" }],
        effects: { stats: { int: 2, score: 3, mood: -1 } },
        outcomes: [
          { p: 0.6, effects: { stats: { score: 2 } }, log: "老师提问，你居然答上来了！" },
          { p: 0.4, log: "记了两页笔记，收获满满。" },
        ],
        feedback: "第一排永远有几个空位，你抱着课本坐过去，开始和瞌睡虫正面交锋。\n\n笔记越记越多，脑子越来越清醒。下课铃响，你突然发现——原来早八的课，也没那么难熬。",
      },
      {
        id: "fish", text: "后排摸鱼",
        aliases: [{ text: "后排摸鱼，刷会儿手机" }],
        effects: { stats: { mood: 2, score: -1 } },
        outcomes: [
          { p: 0.3, effects: { stats: { score: -2, mood: -2 } }, log: "被老师点名了，全场注目……" },
          { p: 0.7, log: "一节课的时间，说长也长，说短也短。" },
        ],
        feedback: "后排是早八最后的温柔乡。你把手机藏在课本后面，开始今天的「第二节课」。\n\n老师讲得激情澎湃，你的小游戏也打得风生水起。偶尔抬头假装记笔记，和老师的目光完美错过。",
      },
      {
        id: "skip", text: "逃课补觉",
        aliases: [{ text: "关掉闹钟，继续睡" }],
        effects: { stats: { health: 3, mood: 3, score: -3 } },
        log: "睡了个整觉，神清气爽（除了没签到）。",
        feedback: "闹钟响了，你眼都没睁，直接划掉。\n\n再醒来时，第一节课已经下课了。你躺在被窝里，罪恶感和满足感各占一半。算了，起都起不来了，睡个整的吧——这就是逃课最危险的地方。",
      },
    ],
  },
];
