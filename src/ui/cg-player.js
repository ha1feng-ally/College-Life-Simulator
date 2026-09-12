// CG 播放器：全屏覆盖层，多帧像素动画 + 打字机文案 + 跳过
import { getCG } from "../data/cg/index.js";
import { drawPixelGrid } from "../data/cg/pixel.js";

export function playCg(cgId) {
  const cg = getCG(cgId);
  if (!cg) return Promise.resolve();
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "cg-overlay";

    const scale = 14;
    const canvas = document.createElement("canvas");
    canvas.width = cg.width * scale;
    canvas.height = cg.height * scale;
    const ctx = canvas.getContext("2d");
    let frameIdx = 0;
    const draw = () => {
      drawPixelGrid(ctx, cg.frames[frameIdx % cg.frames.length], cg.palette, scale);
    };
    draw();
    const frameTimer =
      cg.frames.length > 1
        ? setInterval(() => {
            frameIdx += 1;
            draw();
          }, cg.frameDelay || 400)
        : null;

    const textEl = document.createElement("div");
    textEl.className = "cg-text";

    const skipBtn = document.createElement("button");
    skipBtn.className = "btn cg-skip";
    skipBtn.textContent = "跳过 ▸";

    overlay.append(canvas, textEl, skipBtn);
    document.body.appendChild(overlay);

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (frameTimer) clearInterval(frameTimer);
      overlay.remove();
      resolve();
    };
    skipBtn.addEventListener("click", finish);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) finish();
    });

    // 打字机
    const text = cg.text || "";
    const speed = cg.textSpeed || 30;
    let i = 0;
    const typeTimer = setInterval(() => {
      i += 1;
      textEl.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(typeTimer);
    }, speed);

    // 最小时长兜底
    setTimeout(finish, Math.max(cg.duration || 4000, text.length * speed + 1200));
  });
}

export async function playCgQueue(cgIds) {
  for (const id of cgIds) {
    if (!id) continue;
    await playCg(id);
  }
}
