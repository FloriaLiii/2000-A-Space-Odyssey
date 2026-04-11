/* =============================================
   通讯面板弹窗 JS
   ============================================= */

// === 弹窗开关 ===
let commNoiseLoop = null;
let commActiveNoise = new Set();
let commTypeTimer = null;

function openCommPanel() {
  const modal = document.getElementById("commModal");
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
  // 初始化雪花 canvas
  initCommNoise();
  // 启动打字机
  startCommTypewriter();
  // 启动随机干扰
  scheduleCommGlitch();
}

function closeCommPanel() {
  const modal = document.getElementById("commModal");
  modal.classList.remove("open");
  document.body.style.overflow = "";
  // 停止打字机
  clearTimeout(commTypeTimer);
  // 重置所有屏幕到关机状态
  document
    .querySelectorAll(".comm-monitor:not(.comm-monitor-main)")
    .forEach((m) => {
      m.classList.remove("comm-on", "comm-turning-on");
      m.classList.add("comm-off");
    });
  // 重置主屏二维码显示
  hideCommMainQR();
}

// 点击遮罩关闭
document.getElementById("commModal").addEventListener("click", function (e) {
  if (e.target === this) closeCommPanel();
});

// ESC 关闭
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") closeCommPanel();
});

// === 雪花系统 ===
function initCommNoise() {
  document.querySelectorAll(".comm-noise").forEach((el) => {
    if (el._canvas) return; // 已初始化
    const c = document.createElement("canvas");
    c.width = 200;
    c.height = 140;
    c.style.imageRendering = "pixelated";
    el.appendChild(c);
    el._ctx = c.getContext("2d");
    el._canvas = c;
  });

  // 默认小屏关机显示雪花
  document.querySelectorAll(".comm-monitor.comm-off").forEach((m) => {
    const noise = m.querySelector(".comm-noise");
    if (noise) {
      noise.style.opacity = ".7";
      commActiveNoise.add(noise);
    }
  });

  // 启动雪花渲染
  if (!commNoiseLoop) {
    let lastTime = 0;
    const FPS = 18;
    const interval = 1000 / FPS;
    function loop(now) {
      if (now - lastTime >= interval) {
        lastTime = now;
        commActiveNoise.forEach((el) => {
          if (el._ctx)
            drawCommStatic(el._ctx, el._canvas.width, el._canvas.height);
        });
      }
      commNoiseLoop = requestAnimationFrame(loop);
    }
    commNoiseLoop = requestAnimationFrame(loop);
  }
}

function drawCommStatic(ctx, w, h) {
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = Math.random();
    let v;
    if (r < 0.42) v = 0;
    else if (r < 0.82) v = 255;
    else v = 80 + Math.random() * 100;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

// === 打字机 ===
const commLines = [
  "这不是普通的雪花点",
  "这是宇宙诞生时的余辉",
  "SIGNAL: ████████░░ 82%",
  "ALL CHANNELS OPERATIONAL",
  "等待信号接入...",
];
let commLi = 0,
  commCi = 0;

function startCommTypewriter() {
  const el = document.getElementById("commMainText");
  if (!el) return;
  commLi = 0;
  commCi = 0;
  function tick() {
    if (commCi <= commLines[commLi].length) {
      el.textContent = commLines[commLi].substring(0, commCi);
      commCi++;
      commTypeTimer = setTimeout(tick, 55 + Math.random() * 35);
    } else {
      commTypeTimer = setTimeout(() => {
        commCi = 0;
        commLi = (commLi + 1) % commLines.length;
        el.textContent = "";
        commTypeTimer = setTimeout(tick, 250);
      }, 2200);
    }
  }
  tick();
}

// === 主屏二维码显示/隐藏 ===
function showCommMainQR() {
  const qr = document.getElementById("commMainQr");
  const prompt = document.querySelector(".comm-main-prompt");
  const hint = document.querySelector(".comm-main-hint");
  if (qr) qr.classList.add("show");
  if (prompt) prompt.classList.add("comm-hide");
  if (hint) hint.classList.add("comm-hide");
}
function hideCommMainQR() {
  const qr = document.getElementById("commMainQr");
  const prompt = document.querySelector(".comm-main-prompt");
  const hint = document.querySelector(".comm-main-hint");
  if (qr) qr.classList.remove("show");
  if (prompt) prompt.classList.remove("comm-hide");
  if (hint) hint.classList.remove("comm-hide");
}

// === 屏幕开关 ===
function commToggle(el) {
  if (el.classList.contains("comm-monitor-main")) return;

  // 音效
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "square";
    const isOn = el.classList.contains("comm-on");
    o.frequency.value = isOn ? 100 : 520;
    g.gain.value = 0.035;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.1);
  } catch (e) {}

  const noise = el.querySelector(".comm-noise");

  if (el.classList.contains("comm-on")) {
    // 关机
    el.classList.remove("comm-on", "comm-turning-on");
    el.classList.add("comm-off");
    if (noise) {
      noise.style.opacity = ".7";
      commActiveNoise.add(noise);
    }
    // 若关的是微信频道 → 同步隐藏主屏二维码
    if (el.dataset.qr) hideCommMainQR();
  } else {
    // 开机
    el.classList.remove("comm-off");
    el.classList.add("comm-on", "comm-turning-on");
    if (noise) {
      noise.style.opacity = ".8";
      commActiveNoise.add(noise);
    }
    setTimeout(() => {
      el.classList.remove("comm-turning-on");
      if (noise) {
        noise.style.opacity = "0";
        commActiveNoise.delete(noise);
      }
    }, 500);

    // 微信频道 → 主屏显示二维码,其他频道 → 复制 + 主屏提示
    if (el.dataset.qr) {
      showCommMainQR();
    } else {
      const copyText = el.dataset.copy;
      if (copyText) {
        navigator.clipboard
          .writeText(copyText)
          .then(() => {
            showCommCopyMsg("✓ COPIED: " + copyText);
          })
          .catch(() => {
            showCommCopyMsg("✓ " + copyText);
          });
      }
    }
  }
}

// === 主屏复制提示 ===
function showCommCopyMsg(text) {
  const msgEl = document.getElementById("commCopyMsg");
  const promptEl = document.querySelector(".comm-main-prompt");
  const hintEl = document.querySelector(".comm-main-hint");
  const qrEl = document.getElementById("commMainQr");
  if (!msgEl) return;

  if (promptEl) promptEl.classList.add("comm-hide");
  if (hintEl) hintEl.classList.add("comm-hide");
  // 若主屏正展示二维码,复制提示时先临时隐藏,避免重叠
  const qrWasShown = qrEl && qrEl.classList.contains("show");
  if (qrWasShown) qrEl.classList.add("comm-hide");

  msgEl.classList.remove("comm-show");
  msgEl.textContent = text;
  void msgEl.offsetWidth;
  msgEl.classList.add("comm-show");

  setTimeout(() => {
    msgEl.classList.remove("comm-show");
    if (qrWasShown) {
      // QR 仍然应该展示 → 保持 prompt/hint 隐藏,恢复 QR
      qrEl.classList.remove("comm-hide");
    } else {
      if (promptEl) promptEl.classList.remove("comm-hide");
      if (hintEl) hintEl.classList.remove("comm-hide");
    }
  }, 2600);
}

// === 随机干扰 ===
function commGlitchMonitor(mon) {
  if (!mon.classList.contains("comm-on")) return;
  const noise = mon.querySelector(".comm-noise");
  const tear = mon.querySelector(".comm-tear");
  const effects = ["comm-glitch", "comm-flicker", "comm-jitter"];
  const fx = effects[Math.floor(Math.random() * effects.length)];

  if (noise) {
    noise.style.opacity = (0.25 + Math.random() * 0.45).toFixed(2);
    commActiveNoise.add(noise);
  }
  if (tear && Math.random() > 0.3) {
    tear.style.top = Math.random() * 80 + 10 + "%";
    tear.style.opacity = "1";
  }
  mon.classList.add(fx);

  // 滋滋声
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const buf = 4096;
    const wn = ctx.createScriptProcessor(buf, 1, 1);
    const g = ctx.createGain();
    wn.onaudioprocess = (e) => {
      const out = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < buf; i++) out[i] = (Math.random() * 2 - 1) * 0.015;
    };
    wn.connect(g);
    g.connect(ctx.destination);
    g.gain.value = 0.06;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    setTimeout(() => {
      wn.disconnect();
      g.disconnect();
    }, 200);
  } catch (e) {}

  setTimeout(
    () => {
      mon.classList.remove(fx);
      if (noise) {
        noise.style.opacity = "0";
        commActiveNoise.delete(noise);
      }
      if (tear) tear.style.opacity = "0";
    },
    100 + Math.random() * 150,
  );
}

let commGlitchTimer = null;
function scheduleCommGlitch() {
  clearTimeout(commGlitchTimer);
  commGlitchTimer = setTimeout(
    () => {
      const modal = document.getElementById("commModal");
      if (!modal.classList.contains("open")) return;

      const small = [
        ...document.querySelectorAll(".comm-monitor:not(.comm-monitor-main)"),
      ];
      const onOnes = small.filter((m) => m.classList.contains("comm-on"));
      if (onOnes.length > 0) {
        const t = onOnes[Math.floor(Math.random() * onOnes.length)];
        commGlitchMonitor(t);
        if (Math.random() < 0.3) {
          setTimeout(() => commGlitchMonitor(t), 120 + Math.random() * 80);
        }
      }
      scheduleCommGlitch();
    },
    1500 + Math.random() * 3500,
  );
}
