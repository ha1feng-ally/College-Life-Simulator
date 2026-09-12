// 固有类事件：不进入常规候选池，由引擎在宿主事件内按环境判定概率注入
// 邂逅（需 scene.canEncounter + tags 匹配，baseChance × luckFactor，近期有邂逅则折半）
// 社交（需 scene.canSocial + tags 匹配，概率 = PROB.social × luckFactor）
// 无视（无条件注入一个选项）

export const ENCOUNTER_EVENTS = [
  {
    id: "enc_library", type: "inherent", kind: "encounter",
    name: "图书馆的邂逅",
    description: "书架之间，你和一个人同时伸手去拿同一本书。",
    tags: ["library"], baseChance: 0.19, character: "char_linwan",
    weight: 0, cooldown: 0, singleTermLimit: null,
    choices: [
      {
        id: "talk", text: "上前搭话",
        gates: [{ stat: "charm", min: 25 }],
        effects: { stats: { mood: 5 }, hidden: { network: 2 } },
        characters: { char_linwan: { affection: 10 } },
        setFlags: ["met_linwan", "met_any_crush"],
        unlockCharacters: ["char_linwan"],
        log: "\"你也喜欢这本书吗？\"她抬起头，笑了笑。你们聊了很久。",
      },
      {
        id: "glance", text: "远远看一眼",
        effects: { stats: { mood: 3 } },
        log: "阳光落在她的发梢，你记住了这个画面。",
      },
      {
        id: "none", text: "假装没看见，继续自习",
        effects: { stats: { mood: 1 } },
        log: "你低下了头，把注意力拉回书本。",
      },
    ],
  },

  {
    id: "enc_playground", type: "inherent", kind: "encounter",
    name: "操场上的呐喊",
    description: "操场边，一个高个子学长正在练球，动作干净利落。",
    tags: ["playground", "sports"], baseChance: 0.18, character: "char_ahao",
    weight: 0, cooldown: 0, singleTermLimit: null,
    choices: [
      {
        id: "join", text: "一起打球",
        gates: [{ stat: "physique", min: 15 }],
        effects: { stats: { physique: 2, mood: 4, health: 1 } },
        characters: { char_ahao: { affection: 8 } },
        setFlags: ["met_ahao"],
        unlockCharacters: ["char_ahao"],
        log: "\"学弟/学妹，打得不错啊！\"他拍了拍你的肩膀，从此球场上多了个伙伴。",
      },
      {
        id: "cheer", text: "在场边加油",
        effects: { stats: { mood: 3, charm: 1 } },
        log: "你的欢呼声淹没在人群里，但那天操场上的风很舒服。",
      },
    ],
  },

  {
    id: "enc_canteen", type: "inherent", kind: "encounter",
    name: "食堂的糖醋排骨",
    description: "打饭队伍里，前排的女生回头朝你笑了一下。",
    tags: ["canteen"], baseChance: 0.18, character: "char_susu",
    weight: 0, cooldown: 0, singleTermLimit: null,
    choices: [
      {
        id: "chat", text: "拼桌聊天",
        gates: [{ stat: "charm", min: 20 }],
        effects: { stats: { mood: 4 }, hidden: { network: 1 } },
        characters: { char_susu: { affection: 10 } },
        setFlags: ["met_susu", "met_any_crush"],
        unlockCharacters: ["char_susu"],
        log: "她叫苏苏，聊起美食来眼睛会发光。",
      },
      {
        id: "recommend", text: "问她哪道菜好吃",
        effects: { stats: { mood: 2 }, hidden: { network: 1 } },
        setFlags: ["met_susu", "met_any_crush"],
        unlockCharacters: ["char_susu"],
        log: "\"糖醋排骨，信我！\"她的推荐果然没错。",
      },
    ],
  },

  {
    id: "enc_club", type: "inherent", kind: "encounter",
    name: "社团招新摊位",
    description: "招新摊位前围满了人，中间那位学长正侃侃而谈。",
    tags: ["club"], baseChance: 0.14, character: "char_lu",
    weight: 0, cooldown: 0, singleTermLimit: null,
    choices: [
      {
        id: "join", text: "加入他的社团",
        gates: [{ stat: "charm", min: 25 }],
        effects: { stats: { charm: 3, mood: 2 }, hidden: { network: 3 } },
        setFlags: ["met_lu", "joined_club"],
        unlockCharacters: ["char_lu"],
        log: "陆沉学长亲自面试了你：\"欢迎入社，好好干。\"",
      },
      {
        id: "listen", text: "听他讲社团故事",
        effects: { stats: { mood: 2 }, hidden: { network: 1 } },
        setFlags: ["met_lu"],
        unlockCharacters: ["char_lu"],
        log: "他讲的社团故事里，有篝火、奖杯和一群有趣的人。",
      },
    ],
  },

  {
    id: "enc_classroom", type: "inherent", kind: "encounter",
    name: "教室里的纸条",
    description: "自习课上，一张折好的纸条滑到了你的桌角。",
    tags: ["classroom"], baseChance: 0.16, character: "char_chenmo",
    weight: 0, cooldown: 0, singleTermLimit: null,
    choices: [
      {
        id: "reply", text: "回一张纸条",
        gates: [{ stat: "int", min: 25 }],
        effects: { stats: { int: 2, mood: 3 }, hidden: { network: 1 } },
        characters: { char_chenmo: { affection: 10 } },
        setFlags: ["met_chenmo", "met_any_crush"],
        unlockCharacters: ["char_chenmo"],
        log: "\"你第三题的解法错了。\"他叫陈默，字很好看。",
      },
      {
        id: "ignore", text: "假装没看到",
        effects: { stats: { int: 1 } },
        log: "你把纸条夹进了书里。",
      },
    ],
  },

  {
    id: "enc_street", type: "inherent", kind: "encounter",
    name: "路上的猫",
    description: "回宿舍的路上，一只橘猫拦住了你的去路。",
    tags: ["street"], baseChance: 0.13, character: "cat",
    weight: 0, cooldown: 0, singleTermLimit: null,
    choices: [
      {
        id: "pet", text: "蹲下来撸猫",
        effects: { stats: { mood: 6 } },
        outcomes: [
          { p: 0.5, effects: { stats: { charm: 1 } }, log: "猫蹭了蹭你的手，呼噜呼噜地睡着了。" },
          { p: 0.5, log: "猫伸了个懒腰，优雅地走开了。" },
        ],
      },
      {
        id: "photo", text: "给它拍张照",
        effects: { stats: { mood: 2 } },
        log: "这张照片后来成了你的头像。",
      },
    ],
  },
];

export const SOCIAL_EVENTS = [
  {
    id: "soc_dorm_night", type: "inherent", kind: "social",
    name: "宿舍夜谈",
    description: "灯熄了，卧谈会开始了。",
    tags: ["dorm"],
    weight: 0, cooldown: 0, singleTermLimit: null,
    choices: [
      {
        id: "join", text: "加入卧谈会",
        effects: { stats: { mood: 3, health: -1 }, hidden: { network: 1 } },
        log: "从八卦聊到人生，宿舍的友谊在深夜悄悄生长。",
      },
    ],
  },
  {
    id: "soc_club_chat", type: "inherent", kind: "social",
    name: "社团搭话",
    description: "社团活动间隙，有人凑过来聊天。",
    tags: ["club"],
    weight: 0, cooldown: 0, singleTermLimit: null,
    choices: [
      {
        id: "chat", text: "和社团伙伴聊聊天",
        effects: { stats: { mood: 1 }, hidden: { network: 2 } },
        log: "你认识了几个志同道合的新朋友。",
      },
    ],
  },
  {
    id: "soc_class_dinner", type: "inherent", kind: "social",
    name: "班级聚餐",
    description: "班群里发起了聚餐接龙。",
    tags: ["classroom", "canteen"],
    weight: 0, cooldown: 0, singleTermLimit: null,
    choices: [
      {
        id: "join", text: "参加聚餐",
        gates: [{ stat: "wealth", min: 30 }],
        effects: { stats: { wealth: -30, mood: 3 }, hidden: { network: 2 } },
        log: "饭桌上的班级，比课堂上热闹一百倍。",
      },
    ],
  },
];

// 无视：无条件注入，保底选项
export const IGNORE_CHOICE = {
  id: "ignore_choice",
  text: "无视这一切，发会儿呆",
  inject: "ignore",
  effects: { stats: { mood: 2, score: -1 } },
  log: "你放空了一个下午，世界安静了下来。",
};
