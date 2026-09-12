// 人物池：舍友/同学/学长/导师/恋人候选
// role: roommate | classmate | senior | tutor | crush
// networkMin: 结识所需人脉（0 = 可被开局 roll 为舍友）
// dormEligible: 是否进入舍友候选池
// loveRoute: 是否可攻略（恋爱线）
// relatedEvents: 结识后解锁的关联事件

export const CHARACTERS = [
  // ---- 舍友候选池（8 名，性格组合各不相同） ----
  {
    id: "char_wang", name: "王小虎", role: "roommate",
    traits: ["游戏宅", "豪爽", "夜猫子"],
    networkMin: 0, dormEligible: true, affectionBase: 60, loveRoute: false,
    relatedEvents: ["dorm_gamenight", "dorm_nighttalk"],
    intro: "他主动帮你搬行李，拍着胸脯说：\"兄弟，以后一起上分！\"",
    farewell: "毕业那天，他笑着说：\"再打一把吧，就一把。\"",
  },
  {
    id: "char_li", name: "李思源", role: "roommate",
    traits: ["学霸", "安静", "自律"],
    networkMin: 0, dormEligible: true, affectionBase: 60, loveRoute: false,
    relatedEvents: ["dorm_nighttalk", "dorm_cleanup"],
    intro: "他的书桌上永远摊着一本高数。见到你，他推了推眼镜：\"要一起自习吗？\"",
    farewell: "毕业那天，他把笔记送给了你：\"替我去更大的世界看看。\"",
  },
  {
    id: "char_zhao", name: "赵铁柱", role: "roommate",
    traits: ["健身狂", "热心肠"],
    networkMin: 0, dormEligible: true, affectionBase: 60, loveRoute: false,
    relatedEvents: ["dorm_cleanup", "dorm_meal"],
    intro: "他单手拎起你的行李箱，肱二头肌在发光：\"兄弟，健身房走起？\"",
    farewell: "毕业那天，他给了你一个能把人拍背过气的拥抱。",
  },
  {
    id: "char_qian", name: "钱多多", role: "roommate",
    traits: ["富二代", "大方", "爱组局"],
    networkMin: 0, dormEligible: true, affectionBase: 60, loveRoute: false,
    relatedEvents: ["dorm_meal", "dorm_birthday"],
    intro: "他戴着限量款耳机进门，随手甩给你一包零食：\"我请客，别客气！\"",
    farewell: "毕业那天，他包下了整个大排档：\"今晚全场由钱公子买单！\"",
  },
  {
    id: "char_sun", name: "孙晓晓", role: "roommate",
    traits: ["文艺青年", "敏感"],
    networkMin: 0, dormEligible: true, affectionBase: 60, loveRoute: false,
    relatedEvents: ["dorm_nighttalk", "dorm_birthday"],
    intro: "他正在窗边弹一把旧木吉他。见到你，他停下来说：\"这间屋子，以后会有很多故事。\"",
    farewell: "毕业那天，他弹了一整夜的吉他，谁也没有说话。",
  },
  {
    id: "char_zhou", name: "周大力", role: "roommate",
    traits: ["直性子", "嗓门大"],
    networkMin: 0, dormEligible: true, affectionBase: 55, loveRoute: false,
    relatedEvents: ["dorm_conflict", "dorm_gamenight"],
    intro: "人还没到，声音先到了：\"室友们！我周大力来了！\"",
    farewell: "毕业那天，他喊得最大声，也哭得最凶。",
  },
  {
    id: "char_wu", name: "吴佳佳", role: "roommate",
    traits: ["整洁强迫症", "暖心"],
    networkMin: 0, dormEligible: true, affectionBase: 60, loveRoute: false,
    relatedEvents: ["dorm_cleanup", "dorm_meal"],
    intro: "她进门第一件事是把所有柜子擦了三遍，然后笑着递给你一块抹布。",
    farewell: "毕业那天，她把宿舍打扫得比入住时还干净。",
  },
  {
    id: "char_zheng", name: "郑一鸣", role: "roommate",
    traits: ["音乐才子", "昼伏夜出"],
    networkMin: 0, dormEligible: true, affectionBase: 60, loveRoute: false,
    relatedEvents: ["dorm_nighttalk", "dorm_gamenight"],
    intro: "他的耳机永远挂在脖子上：\"晚上别嫌吵，我练琴声挺好听的，真的。\"",
    farewell: "毕业那天，他写了一首歌，歌里有你们所有人的名字。",
  },

  // ---- 同学（2 名，恋爱可攻略） ----
  {
    id: "char_susu", name: "苏苏", role: "classmate",
    traits: ["吃货", "开朗"],
    networkMin: 20, dormEligible: false, affectionBase: 50, loveRoute: true,
    relatedEvents: ["love_walk", "love_movie", "special_date_food"],
    intro: "食堂排队时她回头朝你笑：\"同学，这个窗口的糖醋排骨超好吃，信我！\"",
    farewell: "毕业那天，她说：\"以后吃到好吃的，我会想起你的。\"",
  },
  {
    id: "char_chenmo", name: "陈默", role: "classmate",
    traits: ["沉默", "心细"],
    networkMin: 20, dormEligible: false, affectionBase: 50, loveRoute: true,
    relatedEvents: ["special_date_library", "love_gift"],
    intro: "自习课上，他默默递来一张纸条：\"你第三题的解法错了。\"",
    farewell: "毕业那天，他什么都没说，只朝你挥了挥手。",
  },

  // ---- 学长（2 名） ----
  {
    id: "char_lu", name: "陆沉", role: "senior",
    traits: ["社团大神", "人脉广"],
    networkMin: 40, dormEligible: false, affectionBase: 50, loveRoute: false,
    relatedEvents: ["club_election"],
    intro: "他是社团招新摊位前被围得水泄不通的那个人。",
    farewell: "毕业那天，他把社团的接力棒郑重地交了出去。",
  },
  {
    id: "char_ahao", name: "阿豪", role: "senior",
    traits: ["体育生", "讲义气"],
    networkMin: 30, dormEligible: false, affectionBase: 50, loveRoute: false,
    relatedEvents: ["normal_competition"],
    intro: "他在操场上冲你喊：\"学弟/学妹，来打一场？输了请喝汽水！\"",
    farewell: "毕业那天，他请你喝了最后一次汽水，还是冰镇的。",
  },

  // ---- 恋人候选（图书馆邂逅） ----
  {
    id: "char_linwan", name: "林晚", role: "crush",
    traits: ["温柔", "图书馆常客"],
    networkMin: 30, dormEligible: false, affectionBase: 50, loveRoute: true,
    relatedEvents: ["special_date_library", "love_walk"],
    intro: "她坐在靠窗的位置，阳光落在她的发梢。你们的目光在书架间相遇。",
    farewell: "毕业那天，她在图书馆门口等你，就像第一次见面那样。",
  },

  // ---- 导师（1 名） ----
  {
    id: "char_profzhou", name: "周教授", role: "tutor",
    traits: ["严苛", "爱才"],
    networkMin: 50, dormEligible: false, affectionBase: 50, loveRoute: false,
    relatedEvents: ["adv_seminar", "adv_project"],
    intro: "\"我的实验室不养闲人。\" 他看着你的成绩单，推了推眼镜，\"但你，可以来试试。\"",
    farewell: "毕业那天，他破天荒地拍了拍你的肩膀：\"出去别给我丢人。\"",
  },
];

export const CHAR_BY_ID = new Map(CHARACTERS.map((c) => [c.id, c]));
