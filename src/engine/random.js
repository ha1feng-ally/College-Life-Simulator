// PRNG（seed 可复现）+ 运气修正公式（luckFactor 唯一实现点）

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// mulberry32：轻量、可复现
export function createRng(seed) {
  let a = seed >>> 0;
  function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    chance(p) { return next() < p; },
    int(min, max) { return min + Math.floor(next() * (max - min + 1)); },
    pick(arr) { return arr[Math.floor(next() * arr.length)]; },
    weighted(items, weightFn) {
      const ws = items.map((it) => weightFn(it));
      let total = 0;
      for (const w of ws) if (typeof w === "number" && w > 0) total += w;
      if (total <= 0) return items[Math.floor(next() * items.length)];
      let r = next() * total;
      let acc = 0;
      for (let i = 0; i < items.length; i++) {
        const w = ws[i];
        if (typeof w !== "number" || w <= 0) continue;
        acc += w;
        if (r <= acc) return items[i];
      }
      return items[items.length - 1];
    },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

// 运气修正：luck=50 时无修正，0→0.5 倍，100→1.5 倍
export function luckFactor(luck) {
  return clamp(1 + (luck - 50) / 100, 0.5, 1.5);
}

// 概率保底：杜绝"永远触发不了"
export function clampProb(p) {
  return clamp(p, 0.01, 0.99);
}
