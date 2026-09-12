// 彩蛋特效：glitch / rainbow / invert / fake_crash / confetti
// 特效 2 秒内结束，不影响继续游戏

function fxClass(name, ms) {
  document.body.classList.add(name);
  return new Promise((resolve) => {
    setTimeout(() => {
      document.body.classList.remove(name);
      resolve();
    }, ms);
  });
}

// 伪装蓝屏 1.6 秒后揭示
function fakeCrash() {
  return new Promise((resolve) => {
    const div = document.createElement("div");
    div.className = "fake-crash";
    div.innerHTML = `
      <div class="crash-face">:(</div>
      <div class="crash-text">你的电脑遇到问题，需要重新启动。我们只收集某些错误信息，然后为你重新启动。</div>
      <div class="crash-percent">0%</div>
      <div class="crash-spin"></div>
    `;
    document.body.appendChild(div);

    const percentEl = div.querySelector(".crash-percent");
    let p = 0;
    const tick = setInterval(() => {
      p = Math.min(100, p + Math.floor(Math.random() * 25) + 5);
      percentEl.textContent = `${p}%`;
      if (p >= 100) {
        clearInterval(tick);
        div.classList.add("blink");
        setTimeout(() => {
          div.remove();
          resolve();
        }, 1000);
      }
    }, 220);
  });
}

function confetti() {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.id = "confetti-canvas";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    const colors = ["#ff6b6b", "#ffd166", "#5ee08a", "#4cc2ff", "#c792ea", "#ff9fc3"];
    const parts = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.6,
      w: 5 + Math.random() * 5,
      h: 8 + Math.random() * 6,
      vy: 2 + Math.random() * 3,
      vx: -1 + Math.random() * 2,
      rot: Math.random() * Math.PI,
      vr: -0.1 + Math.random() * 0.2,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));

    const start = performance.now();
    function frame(now) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of parts) {
        p.y += p.vy;
        p.x += p.vx;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (now - start < 2200) {
        requestAnimationFrame(frame);
      } else {
        canvas.remove();
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

export function runEffect(name) {
  switch (name) {
    case "glitch": return fxClass("fx-glitch", 900);
    case "rainbow": return fxClass("fx-rainbow", 2500);
    case "invert": return fxClass("fx-invert", 1300);
    case "fake_crash": return fakeCrash();
    case "confetti": return confetti();
    default: return Promise.resolve();
  }
}
