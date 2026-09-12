// 兴趣爱好模板：初始锁定，通过事件中的"兴趣萌芽"选项解锁（unlockHobby）
// 解锁后：事件进入候选池（requires.hobbies），并且按固有类机制概率注入选项（injectChoice）

export const HOBBY_TEMPLATES = [
  {
    id: "music", name: "音乐（吉他）",
    injectChoice: {
      id: "inj_music", text: "摸两把吉他放松一下",
      inject: "hobby",
      effects: { stats: { mood: 3 } },
      log: "几个和弦一弹，烦恼都散了。",
    },
    event: {
      id: "hobby_music", type: "hobby",
      name: "练琴",
      description: "琴弦在指尖振动，宿舍楼下飘出断断续续的旋律。",
      scene: { canEncounter: false, canSocial: true, tags: ["dorm"] },
      requires: { hobbies: ["music"] },
      weight: 6, cooldown: 1, singleTermLimit: null,
      choices: [
        {
          id: "practice", text: "练一首新曲子",
          effects: { stats: { charm: 2, mood: 4 } },
          log: "指尖磨出了茧，旋律越来越顺。",
        },
        {
          id: "street", text: "去操场边卖唱",
          gates: [{ stat: "charm", min: 30 }],
          effects: { stats: { wealth: 100, charm: 2, mood: 2 } },
          outcomes: [
            { p: 0.3, effects: { stats: { wealth: 150 } }, log: "有人往琴盒里放了张大钞！" },
            { p: 0.7, log: "观众不多，但你唱得很尽兴。" },
          ],
        },
      ],
    },
  },
  {
    id: "photo", name: "摄影",
    injectChoice: {
      id: "inj_photo", text: "抓拍一张校园风景",
      inject: "hobby",
      effects: { stats: { mood: 2 } },
      log: "今天的晚霞，被你永远留住了。",
    },
    event: {
      id: "hobby_photo", type: "hobby",
      name: "扫街摄影",
      description: "背着相机出门，校园在取景框里变得不一样了。",
      scene: { canEncounter: true, canSocial: true, tags: ["street"] },
      requires: { hobbies: ["photo"] },
      weight: 6, cooldown: 1, singleTermLimit: null,
      choices: [
        {
          id: "shoot", text: "出门扫街出片",
          effects: { stats: { charm: 2, mood: 3, wealth: -20 } },
          log: "胶卷钱没白花，出了三张好片。",
        },
        {
          id: "contest", text: "投稿摄影大赛",
          gates: [{ stat: "charm", min: 30 }],
          outcomes: [
            { p: 0.3, effects: { stats: { charm: 3 }, hidden: { network: 1 } }, log: "你的作品入选了校摄影展！" },
            { p: 0.7, effects: { stats: { mood: 1 } }, log: "没有入选，但你认识了几个同好。" },
          ],
        },
      ],
    },
  },
  {
    id: "fitness", name: "健身",
    injectChoice: {
      id: "inj_fitness", text: "来一组俯卧撑",
      inject: "hobby",
      effects: { stats: { physique: 1 } },
      log: "一组做完，神清气爽。",
    },
    event: {
      id: "hobby_fitness", type: "hobby",
      name: "健身房打卡",
      description: "今日份的训练计划已经排好，动起来！",
      scene: { canEncounter: true, canSocial: true, tags: ["sports"] },
      requires: { hobbies: ["fitness"] },
      weight: 6, cooldown: 1, singleTermLimit: null,
      choices: [
        {
          id: "train", text: "按计划训练",
          effects: { stats: { physique: 3, health: 2, mood: 1 } },
          log: "自律给你自由。",
        },
        {
          id: "team", text: "组队训练",
          gates: [{ stat: "physique", min: 30 }],
          effects: { stats: { physique: 3 }, hidden: { network: 1 } },
          log: "和肌友互相辅助，又突破了一个重量。",
        },
      ],
    },
  },
  {
    id: "writing", name: "写作",
    injectChoice: {
      id: "inj_writing", text: "写点东西",
      inject: "hobby",
      effects: { stats: { mood: 2, int: 1 } },
      log: "文字是最好的出口。",
    },
    event: {
      id: "hobby_writing", type: "hobby",
      name: "写作投稿",
      description: "文档打开，光标闪烁，故事在等你落笔。",
      scene: { canEncounter: false, canSocial: false, tags: [] },
      requires: { hobbies: ["writing"] },
      weight: 6, cooldown: 1, singleTermLimit: null,
      choices: [
        {
          id: "submit", text: "写一篇投稿",
          effects: { stats: { int: 2, charm: 1 } },
          outcomes: [
            { p: 0.3, effects: { stats: { wealth: 100 } }, log: "稿费到账！虽然不多，但意义重大。" },
            { p: 0.7, effects: { stats: { mood: 2 } }, log: "写完的那一刻，你已经赢了。" },
          ],
        },
      ],
    },
  },
  {
    id: "gaming", name: "游戏",
    injectChoice: {
      id: "inj_gaming", text: "来一局游戏",
      inject: "hobby",
      effects: { stats: { mood: 3, health: -1 } },
      log: "一局终了，神清气爽。",
    },
    event: {
      id: "hobby_gaming", type: "hobby",
      name: "开黑上分",
      description: "队伍语音里，队友们已经就位。",
      scene: { canEncounter: false, canSocial: true, tags: ["dorm"] },
      requires: { hobbies: ["gaming"] },
      weight: 6, cooldown: 1, singleTermLimit: null,
      choices: [
        {
          id: "rank", text: "开黑上分",
          effects: { stats: { mood: 6, health: -1, int: -1 } },
          log: "连胜的快乐，只有队友懂。",
        },
        {
          id: "tournament", text: "参加校内电竞比赛",
          outcomes: [
            { p: 0.3, effects: { stats: { charm: 2 }, hidden: { network: 2 } }, log: "你们队打进了校赛四强！" },
            { p: 0.7, effects: { stats: { mood: 2 } }, log: "一轮游，但比赛现场的氛围真不错。" },
          ],
        },
      ],
    },
  },
  {
    id: "volunteer", name: "志愿服务",
    injectChoice: {
      id: "inj_volunteer", text: "去志愿者协会帮帮忙",
      inject: "hobby",
      effects: { stats: { mood: 2 }, hidden: { network: 1 } },
      log: "被需要的感觉，很好。",
    },
    event: {
      id: "hobby_volunteer", type: "hobby",
      name: "周末支教",
      description: "大巴驶向城郊的小学，车窗外风景一路后退。",
      scene: { canEncounter: true, canSocial: true, tags: ["street"] },
      requires: { hobbies: ["volunteer"] },
      weight: 6, cooldown: 2, singleTermLimit: null,
      choices: [
        {
          id: "teach", text: "去支教",
          effects: { stats: { mood: 5, charm: 2, wealth: -30 }, hidden: { network: 1 } },
          log: "孩子们的眼睛很亮，亮得让人想留下来。",
        },
      ],
    },
  },
];

export const HOBBY_BY_ID = new Map(HOBBY_TEMPLATES.map((h) => [h.id, h]));
