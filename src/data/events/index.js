// 事件汇总：常规候选池 = 正常 + 特殊 + 前置 + 兴趣（固有类仅用于注入，不进池）
import { NORMAL_EVENTS } from "./normal.js";
import { SPECIAL_EVENTS } from "./special.js";
import { ENCOUNTER_EVENTS, SOCIAL_EVENTS, IGNORE_CHOICE } from "./inherent.js";
import { PREREQUISITE_EVENTS } from "./prerequisite.js";
import { HOBBY_TEMPLATES } from "./hobbies.js";

export { ENCOUNTER_EVENTS, SOCIAL_EVENTS, IGNORE_CHOICE, HOBBY_TEMPLATES };

const HOBBY_EVENTS = HOBBY_TEMPLATES.map((h) => h.event);

export const EVENTS = [
  ...NORMAL_EVENTS,
  ...SPECIAL_EVENTS,
  ...PREREQUISITE_EVENTS,
  ...HOBBY_EVENTS,
];

export const ALL_EVENTS = [...EVENTS, ...ENCOUNTER_EVENTS, ...SOCIAL_EVENTS];

export const EVENTS_BY_ID = new Map(ALL_EVENTS.map((e) => [e.id, e]));

// 寝室事件 id 列表（roll 寝室后解锁）
export const DORM_EVENT_IDS = PREREQUISITE_EVENTS.filter((e) => e.id.startsWith("dorm_")).map((e) => e.id);
