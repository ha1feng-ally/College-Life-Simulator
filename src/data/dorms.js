// 寝室环境：被动效果每周结算，专属事件池随 roll 解锁
// passive.weekly.stats: 每周开始自动应用的属性漂移

export const DORMS = [
  {
    id: "dorm_scholar", type: "学霸寝",
    desc: "书架上堆满考研资料，晚上十一点准时熄灯。",
    passive: { weekly: { stats: { int: 1, mood: -1 } } },
    events: ["dorm_nighttalk", "dorm_cleanup", "dorm_meal"],
    weight: 1,
  },
  {
    id: "dorm_gaming", type: "电竞寝",
    desc: "灯永远亮到凌晨三点，键盘声就是白噪音。",
    passive: { weekly: { stats: { mood: 1, health: -1 } } },
    events: ["dorm_gamenight", "dorm_nighttalk", "dorm_conflict"],
    weight: 1,
  },
  {
    id: "dorm_clean", type: "整洁寝",
    desc: "地面能反光，床单折成豆腐块，宿管阿姨的梦中情寝。",
    passive: { weekly: { stats: { mood: 1 } } },
    events: ["dorm_cleanup", "dorm_birthday", "dorm_nighttalk"],
    weight: 1,
  },
  {
    id: "dorm_lazy", type: "摆烂寝",
    desc: "外卖盒堆成山，窗帘永远拉着，主打一个松弛感。",
    passive: { weekly: { stats: { mood: 1, int: -1 } } },
    events: ["dorm_conflict", "dorm_gamenight", "dorm_nighttalk"],
    weight: 1,
  },
  {
    id: "dorm_artsy", type: "文艺寝",
    desc: "墙上是电影海报，窗台摆着多肉，偶尔飘出吉他声。",
    passive: { weekly: { stats: { charm: 1 } } },
    events: ["dorm_nighttalk", "dorm_birthday", "dorm_meal"],
    weight: 1,
  },
  {
    id: "dorm_self", type: "自律寝",
    desc: "六点准时亮灯，晨跑打卡，卷王们的天堂。",
    passive: { weekly: { stats: { int: 1, health: 1, mood: -1 } } },
    events: ["dorm_cleanup", "dorm_meal", "dorm_gamenight"],
    weight: 1,
  },
];

export const DORM_BY_ID = new Map(DORMS.map((d) => [d.id, d]));

export const DORM_BUILDINGS = ["梅园", "竹园", "松园", "桂园", "桃园", "兰园"];

// roll 寝室名：楼名 × 楼层(1-6) × 房间号(101-420)
export function rollDormName(rng) {
  const building = rng.pick(DORM_BUILDINGS);
  const floor = rng.int(1, 6);
  const room = rng.int(101, 420);
  return `${building} ${floor}-${room}`;
}
