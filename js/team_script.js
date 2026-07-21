const canvas = document.getElementById("field");
const ctx = canvas.getContext("2d");

const labels = {
  pre: document.getElementById("label-pre"),
  digital: document.getElementById("label-digital"),
  post: document.getElementById("label-post")
};

let w = 0;
let h = 0;
let dpr = 1;
let subLines = [];

const pointer = { x: 0, y: 0, active: false, lastMove: 0 };

const motion = {
  rx: 0,
  ry: 0,
  rz: 0,
  tx: 0,
  ty: 0,
  tz: 0
};

const mainAxes = [
  {
    key: "pre",
    baseAngle: -0.88,
    depth: 0.42,
    align: "left",
    lengthRatio: 0.78,
    backLengthRatio: 0.46
  },
  {
    key: "digital",
    baseAngle: 0.18,
    depth: -0.1,
    align: "right",
    lengthRatio: 0.76,
    backLengthRatio: 0.42
  },
  {
    key: "post",
    baseAngle: 1.34,
    depth: 0.34,
    align: "left",
    lengthRatio: 0.72,
    backLengthRatio: 0.58
  }
];

const accentAngles = [
  -2.82, -2.35, -1.72, -1.42, -1.18, -0.92, -0.62, -0.28,
   0.24,  0.52,  0.86,  1.24,  1.58,  1.92,  2.28,  2.7
];

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = window.innerWidth;
  h = window.innerHeight;

  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  buildSubLines();
}

function origin() {
  if (w < 900) return { x: w * 0.56, y: h * 0.56 };
  return { x: w * 0.43, y: h * 0.565 };
}

function buildSubLines() {
  subLines = [];

  accentAngles.forEach((angle, i) => {
    subLines.push({
      baseAngle: angle,
      depth: -0.7 + Math.random() * 1.4,
      lengthRatio: 0.2 + Math.random() * 0.72,
      alpha: 0.1 + Math.random() * 0.2,
      width: 0.5 + Math.random() * 0.45,
      ticks: Math.random() > 0.42,
      phase: i * 0.77 + Math.random() * 2
    });
  });

  mainAxes.forEach((axis, groupIndex) => {
    for (let i = 0; i < 10; i++) {
      subLines.push({
        baseAngle: axis.baseAngle + (Math.random() - 0.5) * 0.8,
        depth: axis.depth + (Math.random() - 0.5) * 0.9,
        lengthRatio: 0.3 + Math.random() * 0.62,
        alpha: 0.1 + Math.random() * 0.18,
        width: 0.5 + Math.random() * 0.4,
        ticks: Math.random() > 0.5,
        phase: groupIndex * 2.3 + i * 0.53
      });

      subLines.push({
        baseAngle: axis.baseAngle + Math.PI + (Math.random() - 0.5) * 0.56,
        depth: axis.depth + (Math.random() - 0.5) * 0.7,
        lengthRatio: 0.28 + Math.random() * 0.5,
        alpha: 0.08 + Math.random() * 0.14,
        width: 0.45 + Math.random() * 0.35,
        ticks: Math.random() > 0.55,
        phase: groupIndex * 3.1 + i * 0.61
      });
    }
  });
}

function clampEnd(from, raw, marginX, marginY) {
  const dx = raw.x - from.x;
  const dy = raw.y - from.y;
  let t = 1;

  if (raw.x < marginX && dx !== 0) t = Math.min(t, (marginX - from.x) / dx);
  if (raw.x > w - marginX && dx !== 0) t = Math.min(t, (w - marginX - from.x) / dx);
  if (raw.y < marginY && dy !== 0) t = Math.min(t, (marginY - from.y) / dy);
  if (raw.y > h - marginY && dy !== 0) t = Math.min(t, (h - marginY - from.y) / dy);

  t = Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 1;

  return {
    x: from.x + dx * t,
    y: from.y + dy * t
  };
}

function getPoint(angle, depth, length, center, time, phase) {
  const depthSwing = Math.sin(time * 0.0005 + phase) * depth;

  const parallaxX = motion.ry * (depth + depthSwing) * 92;
  const parallaxY = motion.rx * (depth - depthSwing) * 72;

  const angleSwing =
    motion.rz * 0.9 +
    Math.sin(time * 0.00036 + phase) * 0.06 +
    Math.cos(time * 0.00021 + phase * 1.7) * 0.035;

  const breathing =
    1 +
    Math.sin(time * 0.00058 + phase) * 0.055 +
    Math.cos(time * 0.00029 + phase) * 0.025;

  return {
    x: center.x + Math.cos(angle + angleSwing) * length * breathing + parallaxX,
    y: center.y + Math.sin(angle + angleSwing) * length * breathing + parallaxY
  };
}

function drawLine(from, to, alpha, width) {
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.strokeStyle = `rgba(247,247,255,${alpha})`;
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawTicks(from, to, alpha, count = 16) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const normal = angle + Math.PI / 2;

  for (let i = 1; i < count; i++) {
    const t = i / count;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    const len = i % 4 === 0 ? 8 : 4;

    ctx.beginPath();
    ctx.moveTo(x - Math.cos(normal) * len * 0.5, y - Math.sin(normal) * len * 0.5);
    ctx.lineTo(x + Math.cos(normal) * len * 0.5, y + Math.sin(normal) * len * 0.5);
    ctx.strokeStyle = `rgba(247,247,255,${alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function positionLabel(axis, point) {
  const el = labels[axis.key];
  const rect = el.getBoundingClientRect();
  const gap = 16;

  let x = axis.align === "right" ? point.x - rect.width - gap : point.x + gap;
  let y = point.y - rect.height * 0.5;

  x = Math.max(24, Math.min(w - rect.width - 24, x));
  y = Math.max(24, Math.min(h - rect.height - 24, y));

  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
}

function render(time) {
  const idle = performance.now() - pointer.lastMove > 950;

  if (pointer.active && !idle) {
    motion.tx = -pointer.y * 0.48;
    motion.ty = pointer.x * 0.56;
    motion.tz = pointer.x * 0.32;
  } else {
    motion.tx =
      Math.sin(time * 0.00042) * 0.36 +
      Math.sin(time * 0.00017) * 0.2;

    motion.ty =
      Math.cos(time * 0.00036) * 0.44 +
      Math.sin(time * 0.00019) * 0.24;

    motion.tz =
      Math.sin(time * 0.00032) * 0.34 +
      Math.cos(time * 0.00015) * 0.18;
  }

  motion.rx += (motion.tx - motion.rx) * 0.055;
  motion.ry += (motion.ty - motion.ry) * 0.055;
  motion.rz += (motion.tz - motion.rz) * 0.055;

  ctx.clearRect(0, 0, w, h);

  const center = origin();
  const baseLength = Math.min(w, h) * 0.74;

  subLines.forEach((line) => {
    const raw = getPoint(
      line.baseAngle,
      line.depth,
      baseLength * line.lengthRatio,
      center,
      time,
      line.phase
    );

    const end = clampEnd(center, raw, 36, 36);
    drawLine(center, end, line.alpha, line.width);

    if (line.ticks) {
      drawTicks(center, end, line.alpha * 0.75, 10);
    }
  });

  mainAxes.forEach((axis, index) => {
    const frontRaw = getPoint(
      axis.baseAngle,
      axis.depth,
      baseLength * axis.lengthRatio,
      center,
      time,
      index * 2.1
    );

    const backRaw = getPoint(
      axis.baseAngle + Math.PI,
      axis.depth * -0.72,
      baseLength * axis.backLengthRatio,
      center,
      time,
      index * 2.1 + 4.4
    );

    const frontEnd = clampEnd(center, frontRaw, 230, 130);
    const backEnd = clampEnd(center, backRaw, 42, 42);

    drawLine(center, backEnd, 0.82, 1.8);
    drawTicks(center, backEnd, 0.64, 12);

    drawLine(center, frontEnd, 0.92, 1.8);
    drawTicks(center, frontEnd, 0.82, 17);

    positionLabel(axis, frontEnd);
  });

  ctx.beginPath();
  ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(247,247,255,0.96)";
  ctx.fill();

  requestAnimationFrame(render);
}

window.addEventListener("resize", resize);

window.addEventListener("pointermove", (event) => {
  pointer.active = true;
  pointer.lastMove = performance.now();
  pointer.x = (event.clientX / w - 0.5) * 2;
  pointer.y = (event.clientY / h - 0.5) * 2;
});

window.addEventListener("pointerleave", () => {
  pointer.active = false;
});

resize();
requestAnimationFrame(render);