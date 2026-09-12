// 结局数据：提前结局 + 毕业结局变体 + 毕业后结果（纯展示）
// desc 可为函数 (state) => string，用于动态文案

export const EARLY_ENDINGS = {
  end_bankrupt: {
    id: "end_bankrupt", kind: "early", title: "破产离场",
    cg: "cg_bankrupt", icon: "icon_skull",
    desc: (s) =>
      `账户余额见了底。债主们的电话像闹钟一样准时响起。\n` +
      `你拖着行李箱走出校门，回头看了一眼。\n` +
      `大学四年（虽然没念完）教给你的第一课：钱不是万能的，但没钱是万万不能的。`,
  },
  end_expelled: {
    id: "end_expelled", kind: "early", title: "挂科劝退",
    cg: null, icon: "icon_door",
    desc: (s) =>
      `连续两个学期挂科，教务处的通知比想象中来得更快。\n` +
      `你把课本塞进纸箱，纸箱比入学时重了很多——都是没翻开过的书。\n` +
      `人生不会因为一次退场而结束。你只是需要换个舞台。`,
  },
  end_suspended: {
    id: "end_suspended", kind: "early", title: "重病休学",
    cg: "cg_sick", icon: "icon_syringe",
    desc: (s) =>
      `健康值跌到了 ¥${Math.max(0, s.stats.health)} 分——如果你把健康比作存款的话。\n` +
      `休学手续办下来的那天，你反而松了一口气。\n` +
      `先养好身体吧。校园会等你，考试也会等你，只有健康不等任何人。`,
  },
  end_dropout: {
    id: "end_dropout", kind: "early", title: "自主退学",
    cg: "cg_dropout", icon: "icon_door",
    desc: (s) =>
      `退学申请上的签名，你写得很用力。\n` +
      `别人问为什么，你说：\"我找到了更想走的路。\"\n` +
      `也许几年后你会庆幸今天的决定，也许不会。但至少，这是你自己的选择。`,
  },
};

export const GRAD_VARIANTS = [
  {
    id: "grad_summa", minAvg: 80, title: "学霸毕业",
    cg: "cg_graduation", icon: "icon_medal",
    desc: (s) =>
      `毕业典礼上，你的名字出现在优秀毕业生名单里。\n` +
      `校长握手时说了句：\"后生可畏。\"\n` +
      `大学四年，你用一张漂亮的成绩单，为青春画上了句号。`,
  },
  {
    id: "grad_normal", minAvg: 60, title: "顺利毕业",
    cg: "cg_graduation", icon: "icon_medal",
    desc: (s) =>
      `学士服有点大，帽子总往下滑，但你笑得很开心。\n` +
      `成绩不算拔尖，故事却足够精彩。\n` +
      `四年里认识的人、经历的事，才是大学真正的毕业证书。`,
  },
  {
    id: "grad_barely", minAvg: 0, title: "勉强毕业",
    cg: "cg_graduation", icon: "icon_medal",
    desc: (s) =>
      `最后一门补考通过的那天，你如释重负。\n` +
      `毕业证到手了，过程惊险了点。\n` +
      `不管怎样——你，毕业了。恭喜。`,
  },
];

export const POSTGRAD_OUTCOMES = [
  {
    id: "pg_kaoyan", flag: "kaoyan_pass", title: "考研上岸",
    icon: "icon_book",
    desc: "录取通知书寄到的那天，你在图书馆的座位上坐了很久。新的故事，即将开始。",
  },
  {
    id: "pg_job", flag: "job_offer", title: "职场精英",
    icon: "icon_briefcase",
    desc: "西装、工牌、地铁早高峰。你带着大学攒下的底气，走进了写字楼。",
  },
  {
    id: "pg_rest", flag: null, title: "躺平人生",
    icon: "icon_moon",
    desc: "先不急着赶路。你在出租屋里躺了一个月，然后决定——按自己的节奏生活。",
  },
];

export const ENDING_BY_ID = new Map([
  ...Object.values(EARLY_ENDINGS).map((e) => [e.id, e]),
  ...GRAD_VARIANTS.map((e) => [e.id, e]),
]);

export function gradVariantByAvg(avg) {
  return GRAD_VARIANTS.find((g) => avg >= g.minAvg) || GRAD_VARIANTS[GRAD_VARIANTS.length - 1];
}

export function postgradByFlag(state) {
  return POSTGRAD_OUTCOMES.find((p) => (p.flag ? state.flags.has(p.flag) : false)) || POSTGRAD_OUTCOMES[POSTGRAD_OUTCOMES.length - 1];
}
