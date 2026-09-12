// 像素小人素材（Q版大头 16×24）：回合/结算屏两侧立绘 + 待机动画循环
// 宿主 = HOST_BASE_M/F + 表情/生病/道具覆盖层，按当前属性实时合成（composeHostSprite）
// 人物 = CHAR_SPRITES 立绘（character 工厂附带动画）；EXTRA_SPRITES 存放非人物出场者（如流浪猫）
// "." = 透明；一个精灵共用一个调色板（基底与覆盖层/动画帧共用，字母同色全局一致）
// 动画帧模型：帧 = { dy?, rows?, stamp? }
//   dy：渲染时整幅垂直位移（呼吸/跳/叹气）；rows：整行替换（眨眼/说话）；stamp：盖章（挥手/道具/专属动作）
// 每个精灵 anims: { 动作名: { frames: 帧[], hold: 毫秒 } }；loop: 循环序列表（轮播各动作）

export const SPRITE_W = 16;
export const SPRITE_H = 24;

// 动画循环序列（动作轮播顺序）
export const HOST_LOOP = ["idle", "idle", "blink", "idle", "wave", "act", "idle", "expr"];
export const CHAR_LOOP = ["idle", "blink", "idle", "talk", "act"];
export const CAT_LOOP = ["idle", "tail", "idle", "blink", "tail"];

// ---------- 宿主：基底（男生版，短发） ----------
export const HOST_BASE = {
  grid: [
    "....HHHHHHHH....",
    "..HHHHHHHHHHHH..",
    ".HHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHH.",
    "HHSSSSSSSSSSSSHH",
    "HSSSSSSSSSSSSSSH",
    "HSSEEEESSEEEESSH",
    "HSSEEEESSEEEESSH",
    "HSSSSSSSSSSSSSSH",
    "HBBSSSSMMSSSSBBH",
    "HSSSSSSSSSSSSSSH",
    ".HSSSSSSSSSSSSH.",
    "..HHHHHHHHHHHH..",
    "....SSSSSSSS....",
    "....SSSSSSSS....",
    "..CCCCCCCCCCCC..",
    ".CCCCCCCCCCCCCC.",
    ".CCSSSSSSSSSSCC.",
    ".CSSSSSSSSSSSSC.",
    ".CCSSSSSSSSSSCC.",
    ".CCCCCCCCCCCCCC.",
    "....PP....PP....",
    "....DD....DD....",
  ],
  palette: {
    H: "#453a4a", S: "#f2cfa6", E: "#2c3e50", M: "#c0392b", B: "#f7a8b8",
    C: "#4cc2ff", P: "#3a4258", D: "#2c3e50", T: "#6ec8ff", A: "#f0d6b4",
    X: "#c0392b", K: "#a8573f", W: "#f2ead8", O: "#8fa3c0", G: "#7fd08a",
    Y: "#ffd166", U: "#8a93a8", N: "#ffd166", J: "#d9a53f",
  },
};
export const HOST_BASE_M = HOST_BASE;

// ---------- 宿主：基底（女生版，长发及肩） ----------
// 脸区第 5-12 行与男生逐行相同（表情/生病覆盖层对齐），仅第 13-15 行改为垂肩长发
export const HOST_BASE_F = {
  grid: [
    "....HHHHHHHH....",
    "..HHHHHHHHHHHH..",
    ".HHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHH.",
    "HHSSSSSSSSSSSSHH",
    "HSSSSSSSSSSSSSSH",
    "HSSEEEESSEEEESSH",
    "HSSEEEESSEEEESSH",
    "HSSSSSSSSSSSSSSH",
    "HBBSSSSMMSSSSBBH",
    "HSSSSSSSSSSSSSSH",
    ".HSSSSSSSSSSSSH.",
    "HHSSSSSSSSSSSSHH",
    "HHSSSSSSSSSSSSHH",
    "HHSSSSSSSSSSSSHH",
    "..CCCCCCCCCCCC..",
    ".CCCCCCCCCCCCCC.",
    ".CCSSSSSSSSSSCC.",
    ".CSSSSSSSSSSSSC.",
    ".CCSSSSSSSSSSCC.",
    ".CCCCCCCCCCCCCC.",
    "....PP....PP....",
    "....DD....DD....",
  ],
  palette: HOST_BASE.palette,
};

// ---------- 宿主：个性化主题配色（任务 H） ----------
// 只重色 H 头发 / C 上衣 / P 裤子；皮肤/眼睛/表情/生病/道具字母不动，任何主题下都可读
// customColors（创建屏取色器微调）仅覆盖这三键，非法 hex 忽略
export const HOST_THEMES = [
  { id: "blue",   name: "海洋蓝", colors: { C: "#4cc2ff", H: "#453a4a", P: "#3a4258" } }, // 默认（现行配色）
  { id: "pink",   name: "樱花粉", colors: { C: "#f78fb3", H: "#6b4a3a", P: "#4a3650" } },
  { id: "red",    name: "活力红", colors: { C: "#e74c3c", H: "#3b3a4a", P: "#3a4258" } },
  { id: "green",  name: "薄荷绿", colors: { C: "#2ecc71", H: "#3a4a3a", P: "#2f4038" } },
  { id: "purple", name: "薰衣紫", colors: { C: "#9b59b6", H: "#4a3a5c", P: "#352e4a" } },
  { id: "orange", name: "暖阳橙", colors: { C: "#f39c12", H: "#5c4a3a", P: "#4a4038" } },
  { id: "white",  name: "月牙白", colors: { C: "#d5dbe3", H: "#5a6a7a", P: "#4a525e" } },
  { id: "gold",   name: "鎏金",   colors: { C: "#f0c040", H: "#5c4a3a", P: "#4a4238" } },
];
export const DEFAULT_HOST_THEME = "blue";
const HEX6 = /^#[0-9a-fA-F]{6}$/;

// ---------- 宿主：表情覆盖层（脸部位，14 宽；中性 = 不覆盖） ----------
export const HOST_FACES = {
  happy: { // 眯眼笑 + 大嘴笑（mood ≥ 70）
    grid: [
      "SSE..E..E..ESS",
      "SSEEEE..EEEESS",
      "SSSSSMMMMSSSSS",
      "SSSSSSSSSSSSSS",
    ],
    offset: { x: 1, y: 7 },
  },
  sad: { // 皱眉 + 泪滴 + 撇嘴（mood ≤ 30）
    grid: [
      ".EEEE....EEEE.",
      "SSEEEESSEEEESS",
      "SSEEEESSEEEETS",
      "SSSSSMMMMSSSTS",
      "SSSSSM..MSSSTS",
    ],
    offset: { x: 1, y: 6 },
  },
};

// ---------- 宿主：生病覆盖层（health ≤ 30 创可贴；≤ 15 追加冷汗） ----------
export const HOST_SICK = {
  bandaid: {
    grid: [".AA.", "AXXA", "AXXA", ".AA."],
    offset: { x: 2, y: 9 },
  },
  sweat: {
    grid: ["T..", "TT.", "T..", ".T."],
    offset: { x: 12, y: 6 },
  },
};

// ---------- 宿主：性格道具（主导属性决定，胸前 6×6）+ 性格称号 ----------
export const HOST_PROPS = {
  int: {
    grid: [".KKKK.", "KWWWWK", "KWWWWK", "KWWWWK", "KWWWWK", ".KKKK."],
    offset: { x: 5, y: 16 }, label: "卷王", // 书本
  },
  health: {
    grid: ["..OO..", ".OGGO.", ".OGGO.", ".OGGO.", ".OGGO.", "..OO.."],
    offset: { x: 5, y: 16 }, label: "养生", // 保温杯
  },
  charm: {
    grid: ["..YY..", ".YYYY.", "YYYYYY", ".YYYY.", "..YY..", "......"],
    offset: { x: 5, y: 16 }, label: "社交", // 星光
  },
  physique: {
    grid: ["UU..UU", "UU..UU", "......", "UU..UU", "UU..UU", "......"],
    offset: { x: 5, y: 16 }, label: "健身", // 哑铃
  },
  wealth: {
    grid: [".NNNN.", "NNJJNN", "NNJJNN", "NNJJNN", "NNJJNN", ".NNNN."],
    offset: { x: 5, y: 16 }, label: "财迷", // 金币
  },
};

// 覆盖层盖章：非 "." 字符覆盖目标行（不修改模块级基底）
function stamp(target, src, offset) {
  for (let y = 0; y < src.length; y++) {
    for (let x = 0; x < src[y].length; x++) {
      const ch = src[y][x];
      if (ch !== ".") target[y + offset.y][x + offset.x] = ch;
    }
  }
}

// 主导属性优先序（并列时取前）
const PROP_PRIORITY = ["int", "health", "charm", "physique", "wealth"];

// ---------- 宿主：挥手 / 道具动作第 2 帧素材 ----------
// 挥手臂 2×4 长臂 4 手位（offset {x:0,y:11}；画在女生长发前面是有意的）
const WAVE_ARM_A = { grid: [".S", "SS", "SS", "SS"], offset: { x: 0, y: 11 } }; // 手高举
const WAVE_ARM_B = { grid: ["..", ".S", "SS", "SS"], offset: { x: 0, y: 11 } }; // 手中位
const WAVE_ARM_C = { grid: ["..", "..", ".S", "SS"], offset: { x: 0, y: 11 } }; // 手低位
const WAVE_ARM_D = { grid: ["..", "..", "..", ".S"], offset: { x: 0, y: 11 } }; // 手垂下

// 翻书：打开的书（中缝书脊）
const BOOK_OPEN = {
  grid: [".KKKK.", "KWKKWK", "KWKKWK", "KWKKWK", "KWKKWK", ".KKKK."],
  offset: { x: 5, y: 16 },
};
// 抛星：上抛的小星
const STAR_UP = {
  grid: ["..Y...", ".YYY..", "YYYYY.", ".YYY..", "..Y...", "......"],
  offset: { x: 5, y: 13 },
};
// 数钱：金币侧影（翻面中）
const COIN_EDGE = {
  grid: ["..NN..", "..NN..", "..NN..", "..NN..", "..NN..", "..NN.."],
  offset: { x: 5, y: 16 },
};

// 各主导属性的 act 动作（第 0 帧恒为合成静止态）
const ACT_ANIMS = {
  int: { frames: [{}, { stamp: BOOK_OPEN, dy: -1 }, {}, { stamp: BOOK_OPEN }, {}], hold: 250 }, // 翻书×2 + 微点头
  health: { frames: [{}, { stamp: { grid: HOST_PROPS.health.grid, offset: { x: 5, y: 15 } }, dy: -1 }, {}], hold: 250 }, // 举杯喝茶
  charm: { frames: [{}, { stamp: STAR_UP, dy: -1 }, {}], hold: 250 }, // 抛星（抛更高）
  physique: { frames: [{}, { stamp: { grid: HOST_PROPS.physique.grid, offset: { x: 5, y: 13 } }, dy: -1 }, {}], hold: 250 }, // 高举哑铃
  wealth: { frames: [{}, { stamp: COIN_EDGE, dy: -1 }, {}], hold: 250 }, // 金币翻面
};

// 按当前属性合成宿主立绘：表情（mood）→ 生病（health）→ 性格道具（主导属性）
// gender: "male" | "female"（非 "female" 一律男生版）
// 返回 { grid, palette, overlays, persona, prop, anims, loop }
// overlays 如 ["sad","bandaid","prop:int"]；anims 的眨眼行从合成后网格生成，自动保留表情/生病细节
export function composeHostSprite(stats, gender = "male", themeId, customColors) {
  const base = gender === "female" ? HOST_BASE_F : HOST_BASE;
  const theme = HOST_THEMES.find((t) => t.id === themeId) ?? HOST_THEMES[0];
  const palette = { ...base.palette, ...theme.colors };
  if (customColors && typeof customColors === "object") { // 创建屏取色器微调：仅 H/C/P，非法 hex 忽略
    for (const k of ["H", "C", "P"]) {
      const v = customColors[k];
      if (typeof v === "string" && HEX6.test(v)) palette[k] = v;
    }
  }
  const grid = base.grid.map((r) => [...r]);
  const overlays = [];

  const mood = stats?.mood;
  const happy = typeof mood === "number" && mood >= 70;
  const sad = typeof mood === "number" && mood <= 30;
  if (happy) {
    stamp(grid, HOST_FACES.happy.grid, HOST_FACES.happy.offset);
    overlays.push("happy");
  } else if (sad) {
    stamp(grid, HOST_FACES.sad.grid, HOST_FACES.sad.offset);
    overlays.push("sad");
  }

  const health = stats?.health ?? 100;
  if (health <= 30) {
    stamp(grid, HOST_SICK.bandaid.grid, HOST_SICK.bandaid.offset);
    overlays.push("bandaid");
  }
  if (health <= 15) {
    stamp(grid, HOST_SICK.sweat.grid, HOST_SICK.sweat.offset);
    overlays.push("sweat");
  }

  let dom = null;
  let domV = -Infinity;
  for (const k of PROP_PRIORITY) {
    const v = stats?.[k];
    if (typeof v === "number" && v > domV) { dom = k; domV = v; }
  }
  let persona = null;
  if (dom) {
    const p = HOST_PROPS[dom];
    stamp(grid, p.grid, p.offset);
    overlays.push(`prop:${dom}`);
    persona = p.label;
  }

  // ---- 动画：基于合成结果动态构建（闭眼行 replaceAll 程序生成） ----
  const blink = happy
    ? { frames: [{ dy: 0 }, { dy: -2 }, { dy: 0 }], hold: 250 } // 眯眼笑已闭眼 → 大点头
    : (() => {
        const c7 = grid[7].join("").replaceAll("E", "S");
        const c8 = grid[8].join("").replaceAll("E", "S");
        return {
          frames: [
            { rows: { 7: c7 } },             // 半闭
            { rows: { 7: c7, 8: c8 }, dy: -1 }, // 全闭 + 点头
            { rows: { 7: c7, 8: c8 } },      // 全闭
            { rows: { 7: c7 } },             // 半闭
            {},                              // 睁开
          ],
          hold: 250,
        };
      })();

  const wave = {
    frames: [
      { stamp: WAVE_ARM_D }, // 垂下 → 中 → 高举 → 中 → 垂下（大摆臂）
      { stamp: WAVE_ARM_B },
      { stamp: WAVE_ARM_A },
      { stamp: WAVE_ARM_B },
      { stamp: WAVE_ARM_D },
    ],
    hold: 250,
  };

  const act = dom ? ACT_ANIMS[dom] : { frames: [{ dy: 0 }, { dy: -2 }, { dy: 0 }], hold: 250 }; // 无道具也有点头动作

  const expr = happy
    ? { frames: [{ dy: 0 }, { dy: -3 }, { dy: -2 }, { dy: -1 }, { dy: 0 }], hold: 250 }          // 开心大跳
    : sad
      ? { frames: [{ dy: 0 }, { dy: 1 }, { dy: 2 }, { dy: 3 }, { dy: 2 }, { dy: 1 }, { dy: 0 }], hold: 250 } // 叹气下沉
      : { frames: [{ dy: 0 }, { dy: -2 }, { dy: -3 }, { dy: -2 }, { dy: 0 }], hold: 250 };        // 伸懒腰

  const anims = {
    idle: { frames: [{ dy: 0 }, { dy: -2 }, { dy: 0 }, { dy: 2 }, { dy: 0 }], hold: 250 }, // 2 格呼吸起伏
    blink,
    wave,
    act,
    expr,
  };

  return {
    grid: grid.map((r) => r.join("")),
    palette,
    overlays,
    persona,
    prop: dom,
    anims,
    loop: HOST_LOOP,
  };
}

// 动画帧合成：基底 + 帧变体（rows 替换 / stamp 盖章 / dy 位移）
// 未知动作名 → 返回基底静止帧
export function animFrameGrid(sprite, animName, frameIdx) {
  const anim = sprite?.anims?.[animName];
  const frame = anim?.frames?.[frameIdx % anim.frames.length];
  if (!frame) return { grid: sprite.grid, dy: 0 };
  let grid = sprite.grid;
  if (frame.rows) grid = grid.map((row, i) => frame.rows[i] ?? row);
  if (frame.stamp) {
    grid = grid.map((r) => [...r]);
    stamp(grid, frame.stamp.grid, frame.stamp.offset);
    grid = grid.map((r) => r.join(""));
  }
  return { grid, dy: frame.dy ?? 0 };
}

// ---------- 人物立绘工厂：统一附上待机动画（idle 呼吸 / blink 眨眼 / talk 说话 / act 专属动作） ----------
// opts.eyes: "glass" 镜片角色闭眼用 E→G；"none" 无眼睛（墨镜）用点头
// opts.talk: "bob" 嘴已大张/大笑的角色说话用点头
function character(grid, palette, opts = {}) {
  const g7 = grid[7], g8 = grid[8], g10 = grid[10];
  const blink = opts.eyes === "none"
    ? { frames: [{ dy: 0 }, { dy: -2 }, { dy: 0 }], hold: 250 }
    : (() => {
        const repl = opts.eyes === "glass"
          ? (r) => r.replaceAll("E", "G")
          : (r) => r.replaceAll("E", "S");
        const sq7 = repl(g7), c7 = repl(g7), c8 = repl(g8);
        return {
          frames: [
            { rows: { 7: sq7 } },               // 半闭
            { rows: { 7: c7, 8: c8 }, dy: -1 }, // 全闭 + 点头
            { rows: { 7: c7, 8: c8 } },         // 全闭
            { rows: { 7: sq7 } },               // 半闭
            {},                                 // 睁开
          ],
          hold: 250,
        };
      })();
  const talk = opts.talk === "bob"
    ? { frames: [{ dy: 0 }, { dy: -2 }, { dy: 0 }], hold: 250 }
    : { frames: [{}, { rows: { 10: g10.slice(0, 6) + "MDDM" + g10.slice(10) }, dy: -1 }, {}], hold: 250 };
  return {
    grid, palette,
    anims: {
      idle: { frames: [{ dy: 0 }, { dy: -2 }, { dy: 0 }, { dy: 2 }, { dy: 0 }], hold: 250 },
      blink,
      talk,
      act: opts.act,
    },
    loop: CHAR_LOOP,
  };
}

// 通用手部盖章（推眼镜 / 擦围裙 / 整理领带等 2 帧动作）
const HAND_2x2 = { grid: ["SS", "SS"], offset: { x: 0, y: 0 } };

// ---------- 人物立绘（14 人，Q版大头，各带专属事件动作） ----------
export const CHAR_SPRITES = new Map([
  ["char_wang", character([ // 王小虎：游戏宅——耳机 + 红色连帽衫；act：按手柄
    "....HHHHHHHH....",
    "..AAHHHHHHHHAA..",
    ".AAHHHHHHHHHHAA.",
    ".AAHHHHHHHHHHAA.",
    ".HHHHHHHHHHHHHH.",
    "HHSSSSSSSSSSSSHH",
    "HSSSSSSSSSSSSSSH",
    "HSSEEEESSEEEESSH",
    "HSSEEEESSEEEESSH",
    "HSSSSSSSSSSSSSSH",
    "HBBSSSSMMSSSSBBH",
    "HSSSSSSSSSSSSSSH",
    ".HSSSSSSSSSSSSH.",
    "..HHHHHHHHHHHH..",
    "....SSSSSSSS....",
    "....SSSSSSSS....",
    "..CCCCCCCCCCCC..",
    ".CCCCCCDDCCCCCC.",
    ".CCSSSSSSSSSSCC.",
    ".CSSSSSSSSSSSSC.",
    ".CCSSSSSSSSSSCC.",
    ".CCCCCCCCCCCCCC.",
    "....PP....PP....",
    "....DD....DD....",
  ], {
    H: "#3b3a4a", S: "#f2cfa6", E: "#2c3e50", M: "#c0392b", B: "#f7a8b8",
    C: "#e74c3c", A: "#2c3e50", P: "#3a4258", D: "#2c3e50",
  }, {
    act: { // 手柄按压/回弹 + 身体微蹲（3 帧：按 → 回弹 → 按）
      frames: [
        { stamp: { grid: ["CCCCCC", "CDDCDD", "CDDCDD", "CCCCCC"], offset: { x: 5, y: 16 } } },
        { stamp: { grid: ["CCCCCC", "CCCCCC", "CDDCDD", "CDDCDD"], offset: { x: 5, y: 16 } }, dy: -1 },
        { stamp: { grid: ["CCCCCC", "CDDCDD", "CDDCDD", "CCCCCC"], offset: { x: 5, y: 16 } } },
      ],
      hold: 250,
    },
  })],
  ["char_li", character([ // 李思源：学霸——眼镜 + 书本 + 蓝毛衣；act：推眼镜
    "....HHHHHHHH....",
    "..HHHHHHHHHHHH..",
    ".HHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHH.",
    "HHSSSSSSSSSSSSHH",
    "HSSGGGGSSGGGGSSH",
    "HSSGEEEGGEEEGSSH",
    "HSSGEEEGGEEEGSSH",
    "HSSSSSSSSSSSSSSH",
    "HBBSSSSMMSSSSBBH",
    "HSSSSSSSSSSSSSSH",
    ".HSSSSSSSSSSSSH.",
    "..HHHHHHHHHHHH..",
    "....SSSSSSSS....",
    "....SSSSSSSS....",
    "..CCCCCCCCCCCC..",
    ".CCCCKKKKCCCCCC.",
    ".CCCCKWWKCCCCCC.",
    ".CCCCKWWKCCCCCC.",
    ".CCCCKWWKCCCCCC.",
    ".CCCCKKKKCCCCCC.",
    "....PP....PP....",
    "....DD....DD....",
  ], {
    H: "#2c3e50", S: "#f2cfa6", E: "#2c3e50", M: "#c0392b", B: "#f7a8b8",
    C: "#5b7fd4", G: "#8fa3c0", K: "#a8573f", W: "#f2ead8", P: "#3a4258", D: "#2c3e50",
  }, {
    eyes: "glass",
    act: { // 手抬向镜框（3 帧：胸前 → 镜边 → 胸前）
      frames: [
        { stamp: { grid: HAND_2x2.grid, offset: { x: 10, y: 5 } } },
        { stamp: { grid: HAND_2x2.grid, offset: { x: 11, y: 4 } }, dy: -1 },
        { stamp: { grid: HAND_2x2.grid, offset: { x: 10, y: 5 } } },
      ],
      hold: 250,
    },
  })],
  ["char_zhao", character([ // 赵铁柱：健身狂——背心 + 肌肉手臂；act：举哑铃
    "....HHHHHHHH....",
    "..HHHHHHHHHHHH..",
    ".HHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHH.",
    "HHSSSSSSSSSSSSHH",
    "HSSSSSSSSSSSSSSH",
    "HSSEEEESSEEEESSH",
    "HSSEEEESSEEEESSH",
    "HSSSSSSSSSSSSSSH",
    "HBBSSSSMMSSSSBBH",
    "HSSSSSSSSSSSSSSH",
    ".HSSSSSSSSSSSSH.",
    "..HHHHHHHHHHHH..",
    "....SSSSSSSS....",
    "....SSSSSSSS....",
    ".SSSSSSSSSSSSSS.",
    ".SSCCCCCCCCCCSS.",
    ".SSCCCCCCCCCCSS.",
    ".SSSSCCCCCCSSSS.",
    ".SSSSCCCCCCSSSS.",
    ".SSSSSSSSSSSSSS.",
    "....PP....PP....",
    "....DD....DD....",
  ], {
    H: "#3b3a4a", S: "#e8b98a", E: "#2c3e50", M: "#c0392b", B: "#f7a8b8",
    C: "#8a93a8", P: "#3a4258", D: "#2c3e50",
  }, {
    act: { // 侧举哑铃（低 → 高 → 低，D 铁块，高抬 2 格）
      frames: [
        { stamp: { grid: ["DDDD", "DDDD", "DDDD"], offset: { x: 0, y: 17 } } },
        { stamp: { grid: ["DDDD", "DDDD", "DDDD"], offset: { x: 0, y: 15 } }, dy: -1 },
        { stamp: { grid: ["DDDD", "DDDD", "DDDD"], offset: { x: 0, y: 17 } } },
      ],
      hold: 250,
    },
  })],
  ["char_qian", character([ // 钱多多：富二代——墨镜 + 金链 + 黄夹克；act：数钱
    "....HHHHHHHH....",
    "..HHHHHHHHHHHH..",
    ".HHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHH.",
    "HHSSSSSSSSSSSSHH",
    "HSSGGGGGGGGGGSSH",
    "HSSGGGGGGGGGGSSH",
    "HSSGGGGGGGGGGSSH",
    "HSSSSSSSSSSSSSSH",
    "HBBSSSSMMSSSSBBH",
    "HSSSSSSSSSSSSSSH",
    ".HSSSSSSSSSSSSH.",
    "..HHHHHHHHHHHH..",
    "...NNSSSSSSNN...",
    "....SSSSSSSS....",
    "..CCCCCCCCCCCC..",
    ".CCCCCCCCCCCCCC.",
    ".CCSSSSSSSSSSCC.",
    ".CSSSSSSSSSSSSC.",
    ".CCSSSSSSSSSSCC.",
    ".CCCCCCCCCCCCCC.",
    "....PP....PP....",
    "....DD....DD....",
  ], {
    H: "#3b3a4a", S: "#f2cfa6", E: "#2c3e50", M: "#c0392b", B: "#f7a8b8",
    C: "#f0c040", G: "#2c3e50", N: "#ffd166", P: "#3a4258", D: "#2c3e50",
  }, {
    eyes: "none",
    act: { // 金币翻面（3 帧：正面 → 窄边 → 正面）
      frames: [
        { stamp: { grid: [".NN.", "NNNN", ".NN."], offset: { x: 6, y: 17 } } },
        { stamp: { grid: ["..N.", "..N.", "..N."], offset: { x: 6, y: 17 } }, dy: -1 },
        { stamp: { grid: [".NN.", "NNNN", ".NN."], offset: { x: 6, y: 17 } } },
      ],
      hold: 250,
    },
  })],
  ["char_sun", character([ // 孙晓晓：文艺青年——怀里抱着吉他；act：拨弦
    "....HHHHHHHH....",
    "..HHHHHHHHHHHH..",
    ".HHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHH.",
    "HHSSSSSSSSSSSSHH",
    "HSSSSSSSSSSSSSSH",
    "HSSEEEESSEEEESSH",
    "HSSEEEESSEEEESSH",
    "HSSSSSSSSSSSSSSH",
    "HBBSSSSMMSSSSBBH",
    "HSSSSSSSSSSSSSSH",
    ".HSSSSSSSSSSSSH.",
    "..HHHHHHHHHHHH..",
    "....SSSSSSSS....",
    "....SSSSSSSS....",
    "..CCCCCCCCCCCC..",
    ".CCCRRRRRRRRCCC.",
    ".CCRRRRRRRRRRCC.",
    ".CSRRRROORRRRSC.",
    ".CCRRRRRRRRRRCC.",
    ".CCCRRRRRRRRCCC.",
    "....PP....PP....",
    "....DD....DD....",
  ], {
    H: "#5c4a3a", S: "#f2cfa6", E: "#2c3e50", M: "#c0392b", B: "#f7a8b8",
    C: "#7fb4d9", R: "#a8573f", O: "#2c3e50", P: "#3a4258", D: "#2c3e50",
  }, {
    act: { // 手在琴弦上左右拨动（3 帧）
      frames: [
        { stamp: { grid: [".SS.", "SS.."], offset: { x: 7, y: 16 } } },
        { stamp: { grid: ["SS..", ".SS."], offset: { x: 7, y: 16 } }, dy: -1 },
        { stamp: { grid: [".SS.", "SS.."], offset: { x: 7, y: 16 } } },
      ],
      hold: 250,
    },
  })],
  ["char_zhou", character([ // 周大力：直性子大嗓门——刺头 + 大张的嘴；act：大喊（声浪 + 震动）
    "..H.H.HHHH.H.H..",
    ".HHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHH.",
    "HHSSSSSSSSSSSSHH",
    "HSSSSSSSSSSSSSSH",
    "HSSEEEESSEEEESSH",
    "HSSEEEESSEEEESSH",
    "HSSSSSMMMMMMSSSH",
    "HSSSSSMDDDDMMSSH",
    "HSSSSSSSSSSSSSSH",
    ".HSSSSSSSSSSSSH.",
    "..HHHHHHHHHHHH..",
    "....SSSSSSSS....",
    "....SSSSSSSS....",
    "..CCCCCCCCCCCC..",
    ".CCCCCCCCCCCCCC.",
    ".CCSSSSSSSSSSCC.",
    ".CSSSSSSSSSSSSC.",
    ".CCSSSSSSSSSSCC.",
    ".CCCCCCCCCCCCCC.",
    "....PP....PP....",
    "....DD....DD....",
  ], {
    H: "#3b3a4a", S: "#f2cfa6", E: "#2c3e50", M: "#c0392b", B: "#f7a8b8",
    C: "#e08a3c", D: "#2c3e50", P: "#3a4258",
  }, {
    talk: "bob",
    act: { // 声浪两帧 + dy 大震（±2 格）
      frames: [
        { stamp: { grid: ["D.", ".D"], offset: { x: 12, y: 6 } }, dy: 0 },
        { stamp: { grid: [".D", "D."], offset: { x: 12, y: 6 } }, dy: -2 },
        { stamp: { grid: ["D.", ".D"], offset: { x: 12, y: 6 } }, dy: -1 },
      ],
      hold: 250,
    },
  })],
  ["char_wu", character([ // 吴佳佳：整洁强迫症——粉裙 + 白围裙；act：擦围裙
    "....HHHHHHHH....",
    "..HHHHHHHHHHHH..",
    ".HHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHH.",
    "HHSSSSSSSSSSSSHH",
    "HHSSSSSSSSSSSSHH",
    "HSSEEEESSEEEESSH",
    "HSSEEEESSEEEESSH",
    "HSSSSSSSSSSSSSSH",
    "HBBSSSSMMSSSSBBH",
    "HSSSSSSSSSSSSSSH",
    ".HSSSSSSSSSSSSH.",
    "..HHHHHHHHHHHH..",
    "....SSSSSSSS....",
    "....SSSSSSSS....",
    "..CCCCCCCCCCCC..",
    ".CCAAAAAAAAAACC.",
    ".CCAAAAAAAAAACC.",
    ".CCAAAAAAAAAACC.",
    ".CCAAAAAAAAAACC.",
    ".CCCCCCCCCCCCCC.",
    "....PP....PP....",
    "....DD....DD....",
  ], {
    H: "#6b4a3a", S: "#f2cfa6", E: "#2c3e50", M: "#c0392b", B: "#f7a8b8",
    C: "#e88fb5", A: "#e8eaf2", P: "#3a4258", D: "#2c3e50",
  }, {
    act: { // 手在围裙上左右擦拭（3 手位）
      frames: [
        { stamp: { grid: HAND_2x2.grid, offset: { x: 6, y: 18 } } },
        { stamp: { grid: HAND_2x2.grid, offset: { x: 9, y: 18 } } },
        { stamp: { grid: HAND_2x2.grid, offset: { x: 6, y: 18 } } },
      ],
      hold: 250,
    },
  })],
  ["char_zheng", character([ // 郑一鸣：音乐才子——大耳机 + 紫卫衣；act：打节拍（点头）
    "....AAAAAAA.....",
    "..AAHHHHHHHHAA..",
    ".AAHHHHHHHHHHAA.",
    ".AAHHHHHHHHHHAA.",
    ".AAHHHHHHHHHHAA.",
    ".AASSSSSSSSSSAA.",
    ".AASSSSSSSSSSAA.",
    ".AASSEEEESEEEESS",
    ".AASSEEEESEEEESS",
    ".AASSSSSSSSSSSSS",
    ".AABSSSMMSSSSSBB",
    ".AASSSSSSSSSSSSS",
    ".AASSSSSSSSSSSSS",
    "..HHHHHHHHHHHH..",
    "....SSSSSSSS....",
    "....SSSSSSSS....",
    "..CCCCCCCCCCCC..",
    ".CCCCCCCCCCCCCC.",
    ".CCSSSSSSSSSSCC.",
    ".CSSSSSSSSSSSSC.",
    ".CCSSSSSSSSSSCC.",
    ".CCCCCCCCCCCCCC.",
    "....PP....PP....",
    "....DD....DD....",
  ], {
    H: "#3b3a4a", S: "#f2cfa6", E: "#2c3e50", M: "#c0392b", B: "#f7a8b8",
    C: "#6c5ce7", A: "#2c3e50", P: "#3a4258", D: "#2c3e50",
  }, {
    act: { // 大摆幅打节拍（±3 格）
      frames: [{ dy: 0 }, { dy: -3 }, { dy: 0 }, { dy: -3 }],
      hold: 250,
    },
  })],
  ["char_susu", character([ // 苏苏：吃货——大笑容 + 手里的包子；act：吃包子
    "....HHHHHHHH....",
    "..HHHHHHHHHHHH..",
    ".HHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHH.",
    "HHSSSSSSSSSSSSHH",
    "HHSSSSSSSSSSSSHH",
    "HSSEEEESSEEEESSH",
    "HSSEEEESSEEEESSH",
    "HSSSSSSSSSSSSSSH",
    "HBBSSSMMMMSSSBBH",
    "HSSSSSSSSSSSSSSH",
    ".HSSSSSSSSSSSSH.",
    "..HHHHHHHHHHHH..",
    "....SSSSSSSS....",
    "....SSSSSSSS....",
    "..CCCCCCCCCCCC..",
    ".CCCCCCCCCCCCCC.",
    ".CCSSSSSSSSSSCC.",
    ".CCSSWWWWSSCCCC.",
    ".CSSSWWWWSSSCCC.",
    ".CCCCCCCCCCCCCC.",
    "....PP....PP....",
    "....DD....DD....",
  ], {
    H: "#8a5a3a", S: "#f2cfa6", E: "#2c3e50", M: "#c0392b", B: "#f7a8b8",
    C: "#f29b38", W: "#f5f0e1", P: "#3a4258", D: "#2c3e50",
  }, {
    talk: "bob",
    act: { // 包子举到嘴边（W 包子 3 帧：手中 → 嘴边 → 手中）
      frames: [
        { stamp: { grid: [".WW.", "WWWW", "WWWW", ".WW."], offset: { x: 6, y: 18 } } },
        { stamp: { grid: [".WW.", "WWWW", "WWWW", ".WW."], offset: { x: 6, y: 10 } }, dy: -1 },
        { stamp: { grid: [".WW.", "WWWW", "WWWW", ".WW."], offset: { x: 6, y: 18 } } },
      ],
      hold: 250,
    },
  })],
  ["char_chenmo", character([ // 陈默：沉默——兜帽罩头 + 灰卫衣；act：拉兜帽
    "....CCCCCCCC....",
    "..CCCCCCCCCCCC..",
    ".CCCCCCCCCCCCCC.",
    ".CCCCCCCCCCCCCC.",
    ".CCCCCCCCCCCCCC.",
    ".CSSSSSSSSSSSSC.",
    ".CSSSSSSSSSSSSC.",
    ".CSSEEEESSEEEEC.",
    ".CSSEEEESSEEEEC.",
    ".CSSSSSSSSSSSSC.",
    ".CBSSSSMMSSSSBC.",
    ".CSSSSSSSSSSSSC.",
    ".CSSSSSSSSSSSSC.",
    "..CCCCCCCCCCCC..",
    "....SSSSSSSS....",
    "....SSSSSSSS....",
    "..CCCCCCCCCCCC..",
    ".CCCCCCCCCCCCCC.",
    ".CCSSSSSSSSSSCC.",
    ".CSSSSSSSSSSSSC.",
    ".CCSSSSSSSSSSCC.",
    ".CCCCCCCCCCCCCC.",
    "....PP....PP....",
    "....DD....DD....",
  ], {
    S: "#f2cfa6", E: "#2c3e50", M: "#c0392b", B: "#f7a8b8",
    C: "#7a8296", P: "#3a4258", D: "#2c3e50",
  }, {
    act: { // 兜帽下压两格（第 0-4 行整体下移 2 行，遮住额头与眉毛）
      frames: [
        {},
        {
          rows: {
            2: "....CCCCCCCC....",
            3: "..CCCCCCCCCCCC..",
            4: ".CCCCCCCCCCCCCC.",
            5: ".CCCCCCCCCCCCCC.",
            6: ".CCCCCCCCCCCCCC.",
          },
          dy: -1,
        },
        {},
      ],
      hold: 250,
    },
  })],
  ["char_lu", character([ // 陆沉：学长——西装白衬衫红领带；act：整理领带
    "....HHHHHHHH....",
    "..HHHHHHHHHHHH..",
    ".HHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHH.",
    ".HHHHHHHHHHHHHH.",
    "HHSSSSSSSSSSSSHH",
    "HSSSSSSSSSSSSSSH",
    "HSSEEEESSEEEESSH",
    "HSSEEEESSEEEESSH",
    "HSSSSSSSSSSSSSSH",
    "HBBSSSSMMSSSSBBH",
    "HSSSSSSSSSSSSSSH",
    ".HSSSSSSSSSSSSH.",
    "..HHHHHHHHHHHH..",
    "....SSSSSSSS....",
    "....SSSSSSSS....",
    "..CCCCCCCCCCCC..",
    ".CCCCCCCCCCCCCC.",
    ".CCWWWTTWWWCCCC.",
    ".CCWWWTTWWWCCCC.",
    ".CCCCCCCCCCCCCC.",
    ".CCCCCCCCCCCCCC.",
    "....PP....PP....",
    "....DD....DD....",
  ], {
    H: "#2c3e50", S: "#f2cfa6", E: "#2c3e50", M: "#c0392b", B: "#f7a8b8",
    C: "#3a4a6b", W: "#e8eaf2", T: "#c0392b", P: "#3a4258", D: "#2c3e50",
  }, {
    act: { // 手扶领带（3 帧：胸前 → 领结 → 胸前）
      frames: [
        { stamp: { grid: HAND_2x2.grid, offset: { x: 7, y: 17 } } },
        { stamp: { grid: HAND_2x2.grid, offset: { x: 7, y: 16 } }, dy: -1 },
        { stamp: { grid: HAND_2x2.grid, offset: { x: 7, y: 17 } } },
      ],
      hold: 250,
    },
  })],
  ["char_ahao", character([ // 阿豪：体育生——发带 + 篮球背心；act：拍篮球
    "....AAAAAAAA....",
    "..AAHHHHHHHHAA..",
    ".AAHHHHHHHHHHAA.",
    ".AAHHHHHHHHHHAA.",
    ".AAHHHHHHHHHHAA.",
    "HHSSSSSSSSSSSSHH",
    "HSSSSSSSSSSSSSSH",
    "HSSEEEESSEEEESSH",
    "HSSEEEESSEEEESSH",
    "HSSSSSSSSSSSSSSH",
    "HBBSSSSMMSSSSBBH",
    "HSSSSSSSSSSSSSSH",
    ".HSSSSSSSSSSSSH.",
    "..HHHHHHHHHHHH..",
    "....SSSSSSSS....",
    "....SSSSSSSS....",
    ".SSSSSSSSSSSSSS.",
    ".SSCCCCCCCCCCSS.",
    ".SSCCCCCCCCCCSS.",
    ".SSSSCCCCCCSSSS.",
    ".SSSSCCCCCCSSSS.",
    ".SSSSSSSSSSSSSS.",
    "....PP....PP....",
    "....DD....DD....",
  ], {
    H: "#3b3a4a", S: "#e8b98a", E: "#2c3e50", M: "#c0392b", B: "#f7a8b8",
    C: "#e08a3c", A: "#c0392b", P: "#3a4258", D: "#2c3e50",
  }, {
    act: { // 篮球弹起（C 球身 D 纹路，3 帧高低）
      frames: [
        { stamp: { grid: [".CC.", "CDDC", "CDDC", ".CC."], offset: { x: 6, y: 18 } } },
        { stamp: { grid: [".CC.", "CDDC", "CDDC", ".CC."], offset: { x: 6, y: 20 } } },
        { stamp: { grid: [".CC.", "CDDC", "CDDC", ".CC."], offset: { x: 6, y: 18 } } },
      ],
      hold: 250,
    },
  })],
  ["char_linwan", character([ // 林晚：温柔——长发及肩 + 手里的书；act：捋头发
    "HHHHHHHHHHHHHHHH",
    "HHHHHHHHHHHHHHHH",
    "HHHHHHHHHHHHHHHH",
    "HHHHHHHHHHHHHHHH",
    "HHHHHHHHHHHHHHHH",
    "HHSSSSSSSSSSSSHH",
    "HHSSSSSSSSSSSSHH",
    "HHSEEEESSEEEESSH",
    "HHSEEEESSEEEESSH",
    "HHSSSSSSSSSSSSHH",
    "HHBBSSSSMMSSSSHH",
    "HHSSSSSSSSSSSSHH",
    "HHSSSSSSSSSSSSHH",
    "HHSSSSSSSSSSSSHH",
    "HHSSSSSSSSSSSSHH",
    "HHHHHHHHHHHHHHHH",
    "HHCCCCCCCCCCCCHH",
    ".CCCCKKKKCCCCCC.",
    ".CCCCKWWKCCCCCC.",
    ".CCCCKWWKCCCCCC.",
    ".CCCCKWWKCCCCCC.",
    ".CCCCKKKKCCCCCC.",
    "....PP....PP....",
    "....DD....DD....",
  ], {
    H: "#7a5a6e", S: "#f2cfa6", E: "#2c3e50", M: "#c0392b", B: "#f7a8b8",
    C: "#7fb4d9", K: "#a8573f", W: "#f2ead8", P: "#3a4258", D: "#2c3e50",
  }, {
    act: { // 发丝别到耳后（第 14 行两侧发丝内收 + 点头）
      frames: [
        {},
        { rows: { 14: "HSSSSSSSSSSSSSSH" }, dy: -1 },
        {},
      ],
      hold: 250,
    },
  })],
  ["char_profzhou", character([ // 周教授：导师——白发 + 眼镜 + 白大褂；act：推眼镜
    "....GGGGGGGG....",
    "..GGGGGGGGGGGG..",
    ".GGGGGGGGGGGGGG.",
    ".GGGGGGGGGGGGGG.",
    ".GGGGGGGGGGGGGG.",
    "GGSSSSSSSSSSSSGG",
    "GSSGGGGSSGGGGSSG",
    "GSSGEEEGGEEEGSSG",
    "GSSGEEEGGEEEGSSG",
    "GSSSSSSSSSSSSSSG",
    "GSSSSSSMMSSSSSSG",
    "GSSSSSSSSSSSSSSG",
    ".GSSSSSSSSSSSSG.",
    "..GGGGGGGGGGGG..",
    "....SSSSSSSS....",
    "....SSSSSSSS....",
    "..WWWWWWWWWWWW..",
    ".WWWWWWWWWWWWWW.",
    ".WWCCCCCCCCCCWW.",
    ".WWCCCCCCCCCCWW.",
    ".WWWWWWWWWWWWWW.",
    ".WWWWWWWWWWWWWW.",
    "....PP....PP....",
    "....DD....DD....",
  ], {
    G: "#9aa5b8", S: "#f2cfa6", E: "#2c3e50", M: "#c0392b",
    C: "#5b7fd4", W: "#e8eaf2", P: "#3a4258", D: "#2c3e50",
  }, {
    eyes: "glass",
    act: { // 手推镜框（3 帧：胸前 → 镜边 → 胸前）
      frames: [
        { stamp: { grid: HAND_2x2.grid, offset: { x: 11, y: 5 } } },
        { stamp: { grid: HAND_2x2.grid, offset: { x: 12, y: 5 } }, dy: -1 },
        { stamp: { grid: HAND_2x2.grid, offset: { x: 11, y: 5 } } },
      ],
      hold: 250,
    },
  })],
]);

// ---------- 非人物出场者（左立绘查找用，不在 CHAR_BY_ID 里） ----------
export const EXTRA_SPRITES = new Map([
  ["cat", { // 流浪猫（enc_street）；act：甩尾
    grid: [
      "....OO....OO....",
      ".OO.OO....OO.OO.",
      ".OOOOOOOOOOOOOO.",
      ".OOOOOOOOOOOOOO.",
      ".OOOOOOOOOOOOOO.",
      "OOOOOOOOOOOOOOOO",
      "OOEEEEOOOOEEEEOO",
      "OOEEEEOOOOEEEEOO",
      "OOOOOOOOOOOOOOOO",
      ".OOOOOOOOOOOOOO.",
      ".OOSSMMMMMMSSOO.",
      ".OOOOOOOOOOOOOO.",
      "..OOOOOOOOOOOO..",
      "...OOOOOOOOOO...",
      "..OOOOOOOOOOOO..",
      ".OOOOOOOOOOOOOO.",
      ".OOOOOOOOOOOOOO.",
      ".OOOOOOOOOOOOOO.",
      "..OOPPPPPPPPOO..",
      "..OOPPPPPPPPOO..",
      "..OOPPPPPPPPOO..",
      "....PPPPPPPP....",
      "................",
      "................",
    ],
    palette: {
      O: "#e8a05c", E: "#2c3e50", M: "#c0392b", S: "#f5f0e1", P: "#f0b878",
    },
    name: "流浪猫",
    traits: ["傲娇", "毛茸茸"],
    anims: {
      idle: { frames: [{ dy: 0 }, { dy: -2 }, { dy: 0 }, { dy: 2 }, { dy: 0 }], hold: 250 },
      tail: { // 尾巴沿身体左下透明区垂下：低垂 ↔ 高翘交替（甩尾）
        frames: [
          { stamp: { grid: ["O..", "OO.", ".O.", ".O."], offset: { x: 0, y: 11 } } }, // 低垂
          { stamp: { grid: ["O.", "O.", "O.", ".O", ".O", ".O"], offset: { x: 0, y: 9 } } }, // 高翘
          { stamp: { grid: ["O..", "OO.", ".O.", ".O."], offset: { x: 0, y: 11 } } },
        ],
        hold: 250,
      },
      blink: {
        frames: [
          { rows: { 6: "OOSSSSOOOOSSSSOO", 7: "OOSSSSOOOOSSSSOO" }, dy: -1 },
          { rows: { 6: "OOSSSSOOOOSSSSOO", 7: "OOSSSSOOOOSSSSOO" } },
          {},
        ],
        hold: 250,
      },
    },
    loop: CAT_LOOP,
  }],
]);

// 左立绘查找：人物立绘优先，其次非人物出场者
export function spriteFor(charId) {
  if (!charId) return null;
  return CHAR_SPRITES.get(charId) ?? EXTRA_SPRITES.get(charId) ?? null;
}
