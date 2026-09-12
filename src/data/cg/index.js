// CG 注册表
import cg_graduation from "./cg_graduation.js";
import cg_first_love from "./cg_first_love.js";
import cg_rich from "./cg_rich.js";
import cg_sick from "./cg_sick.js";
import cg_dropout from "./cg_dropout.js";
import cg_bankrupt from "./cg_bankrupt.js";
import cg_fake_crash from "./cg_fake_crash.js";
import cg_rainbow from "./cg_rainbow.js";
import cg_kaoyan from "./cg_kaoyan.js";
import cg_job from "./cg_job.js";

export const CGS = new Map(
  [
    cg_graduation,
    cg_first_love,
    cg_rich,
    cg_sick,
    cg_dropout,
    cg_bankrupt,
    cg_fake_crash,
    cg_rainbow,
    cg_kaoyan,
    cg_job,
  ].map((cg) => [cg.id, cg])
);

export function getCG(id) {
  return id ? CGS.get(id) || null : null;
}
