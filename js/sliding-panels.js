/**
 * <sliding-panels> — macOS "슬라이드 패널(Sliding Panels)" 화면보호기를 웹의 한 영역에 재현하는 웹 컴포넌트.
 *
 * 사용법:
 *   <script type="module" src="sliding-panels.js"></script>
 *   <sliding-panels folder="images/" style="width:100%;height:480px"></sliding-panels>
 *
 * 속성(모두 선택):
 *   folder    이미지 폴더 경로 (기본 "images/")
 *   images    쉼표로 구분한 이미지 URL 목록 (지정하면 folder 대신 사용)
 *   panels    패널 개수 고정 (기본: 영역 크기에 맞춰 자동, min-panels~9)
 *   min-panels 자동 배치 시 최소 패널 개수 (기본 6)
 *   interval  패널 교체가 시작되는 간격 ms (기본 2200)
 *   duration  슬라이드 애니메이션 시간 ms (기본 1400)
 *   gap       패널 사이 간격 px (기본 4)
 *   max-ratio 패널 가로세로 비율 한도 (기본 1.7 → 1.7:1 ~ 1:1.7 사이로만 배치)
 *   layout-interval  배치 전체를 새로 짜는 간격 ms (기본 12000, 0이면 안 함)
 *   background 배경색 (기본 #000)
 *
 * 지원 형식: jpg png webp avif gif(애니메이션 포함) svg bmp, 영상 mp4 m4v webm mov (음소거·반복 재생)
 *
 * 폴더의 이미지 목록은 브라우저가 직접 읽을 수 없으므로 다음 순서로 찾는다:
 *   1) {folder}manifest.json  — ["a.jpg","b.png", ...]  (tools/make-manifest.mjs 로 생성)
 *   2) 웹서버의 디렉터리 목록 HTML (python3 -m http.server, npx serve 등)에서 이미지 링크 파싱
 */

const VIDEO_EXT = /\.(mp4|m4v|webm|mov)$/i;
const MEDIA_EXT = /\.(jpe?g|png|webp|avif|gif|svg|bmp|mp4|m4v|webm|mov)$/i;
const isVideo = (url) => VIDEO_EXT.test(new URL(url, document.baseURI).pathname);
// 빠르게 치고 들어와 길게 미끄러지며 멈추는 곡선 (expo-out)
const GLIDE = 'cubic-bezier(0.16, 1, 0.3, 1)';
// 배치 교체 때 빠져나가는 곡선 — 천천히 출발해 가속 (expo-in)
const EXIT = 'cubic-bezier(0.7, 0, 0.84, 0)';
const DIRS = ['left', 'right', 'up', 'down'];

const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
const rand = (min, max) => min + Math.random() * (max - min);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function listFolder(folder) {
  const base = new URL(folder.endsWith('/') ? folder : folder + '/', document.baseURI);

  try {
    const res = await fetch(new URL('manifest.json', base), { cache: 'no-cache' });
    if (res.ok) {
      const list = await res.json();
      const files = Array.isArray(list) ? list : list.images;
      if (files?.length) return files.map((f) => new URL(f, base).href);
    }
  } catch { /* manifest 없음 → 디렉터리 목록 시도 */ }

  try {
    const res = await fetch(base, { cache: 'no-cache' });
    if (res.ok && (res.headers.get('content-type') || '').includes('html')) {
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      const urls = [...doc.querySelectorAll('a[href]')]
        .map((a) => new URL(a.getAttribute('href'), base))
        .filter((u) => MEDIA_EXT.test(decodeURIComponent(u.pathname)))
        .map((u) => u.href);
      if (urls.length) return [...new Set(urls)];
    }
  } catch { /* 무시 */ }

  return [];
}

/** 사각형이 허용 비율(1/maxRatio ~ maxRatio)을 얼마나 벗어났는지. 0이면 범위 안. */
const badness = (r, maxRatio) => Math.max(0, Math.abs(Math.log(r.w / r.h)) - Math.log(maxRatio));

function splitRect(r, vertical, t) {
  if (vertical) {
    const cw = Math.round(r.w * t);
    return [{ x: r.x, y: r.y, w: cw, h: r.h }, { x: r.x + cw, y: r.y, w: r.w - cw, h: r.h }];
  }
  const ch = Math.round(r.h * t);
  return [{ x: r.x, y: r.y, w: r.w, h: ch }, { x: r.x, y: r.y + ch, w: r.w, h: r.h - ch }];
}

/** 한 번의 시도: 영역을 무작위로 이분할해 n개 안팎의 사각형(모자이크)을 만든다. */
function tryLayout(w, h, n, maxRatio, maxN) {
  const minW = Math.max(64, w * 0.1);
  const minH = Math.max(56, h * 0.1);
  const rects = [{ x: 0, y: 0, w, h }];

  for (let guard = 0; guard < 200; guard++) {
    const bad = rects.filter((r) => badness(r, maxRatio) > 0);
    // 목표 개수에 도달했고 비율이 어긋난 패널도 없으면 끝. 어긋난 패널이 있으면 maxN까지 더 쪼갠다.
    if (rects.length >= (bad.length ? maxN : n)) break;

    // 비율이 어긋난 패널을 먼저, 없으면 면적이 클수록 쪼개질 확률이 높다
    let r;
    if (bad.length) {
      r = bad.reduce((a, b) => (badness(b, maxRatio) > badness(a, maxRatio) ? b : a));
    } else {
      const total = rects.reduce((s, q) => s + q.w * q.h, 0);
      let pick = Math.random() * total;
      r = rects.find((q) => (pick -= q.w * q.h) <= 0) || rects[rects.length - 1];
    }

    // 가능한 분할 후보 중 두 조각이 모두 허용 비율에 가장 가까운 것을 고른다
    const options = [];
    for (const vertical of [true, false]) {
      if (vertical ? r.w < minW * 2 : r.h < minH * 2) continue;
      for (let k = 0; k < 6; k++) {
        const parts = splitRect(r, vertical, rand(0.36, 0.64));
        const score = parts.reduce((s, q) => s + badness(q, maxRatio), 0) + Math.random() * 0.05;
        options.push({ parts, score });
      }
    }
    if (!options.length) {
      if (bad.length && bad.includes(r) && rects.every((q) => q === r || !bad.includes(q))) break;
      if (rects.every((q) => q.w < minW * 2 && q.h < minH * 2)) break;
      continue;
    }
    const best = options.reduce((a, b) => (b.score < a.score ? b : a));
    rects.splice(rects.indexOf(r), 1, ...best.parts);
  }
  return rects;
}

/** 여러 번 시도해 너무 가로로 길거나 세로로 긴 패널이 없는 배치를 고른다. */
function makeLayout(w, h, n, maxRatio = 1.7, maxN = n + 2) {
  let best, bestScore = Infinity;
  for (let i = 0; i < 40; i++) {
    const rects = tryLayout(w, h, n, maxRatio, maxN);
    const score = rects.reduce((s, r) => s + badness(r, maxRatio), 0) 
      + Math.max(0, n - rects.length) * 10 // 목표 개수보다 적은 배치는 강하게 배제
      + Math.max(0, rects.length - n) * 0.02;
    if (score < bestScore) { best = rects; bestScore = score; }
    if (bestScore <= 0) break;
  }
  return best;
}

const STYLE = `
  :host { display:block; position:relative; overflow:hidden; background:var(--sp-bg,#000); contain:strict; min-height:120px; }
  .stage { position:absolute; inset:0; }
  .panel { position:absolute; overflow:hidden; background:var(--sp-bg,#000); }
  .slide { position:absolute; inset:0; width:100%; height:100%; background-size:cover; background-position:center; object-fit:cover; display:block; will-change:transform; }
  .msg { position:absolute; inset:0; display:grid; place-items:center; color:#888; font:14px/1.6 system-ui,sans-serif; text-align:center; padding:16px; }
  .msg code { color:#ccc; }
`;

class SlidingPanels extends HTMLElement {
  static observedAttributes = ['folder', 'images', 'panels', 'gap', 'background'];

  #root; #stage; #urls = []; #deck = []; #meta = new Map();
  #panels = []; #running = false; #paused = false; #layoutAt = 0; #lastCount = 0; #lastIdx = -1;
  #ro; #io; #visible = true; #resizeTimer; #loopId = 0;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    this.#root.innerHTML = `<style>${STYLE}</style><div class="stage"></div>`;
    this.#stage = this.#root.querySelector('.stage');
  }

  get #interval() { return +this.getAttribute('interval') || 2200; }
  get #duration() { return this.#reducedMotion ? 600 : +this.getAttribute('duration') || 1400; }
  get #maxRatio() { return Math.max(1.05, +this.getAttribute('max-ratio') || 1.7); }
  get #minPanels() { return Math.max(1, +this.getAttribute('min-panels') || 6); }
  get #gap() { return this.hasAttribute('gap') ? +this.getAttribute('gap') : 4; }
  get #layoutInterval() { return this.hasAttribute('layout-interval') ? +this.getAttribute('layout-interval') : 12000; }
  get #reducedMotion() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }

  connectedCallback() {
    this.style.setProperty('--sp-bg', this.getAttribute('background') || '#000');

    this.#ro = new ResizeObserver(() => {
      clearTimeout(this.#resizeTimer);
      this.#resizeTimer = setTimeout(() => this.#running && this.#rebuild(false), 250);
    });
    this.#ro.observe(this);

    this.#io = new IntersectionObserver(([e]) => { this.#visible = e.isIntersecting; this.#syncPlayback(); });
    this.#io.observe(this);
    document.addEventListener('visibilitychange', this.#onVisibility);

    this.#start();
  }

  disconnectedCallback() {
    this.#running = false;
    this.#loopId++;
    this.#ro?.disconnect();
    this.#io?.disconnect();
    document.removeEventListener('visibilitychange', this.#onVisibility);
    this.#stage.querySelectorAll('video').forEach((v) => this.#dispose(v));
  }

  attributeChangedCallback(name, oldV, newV) {
    if (!this.isConnected || oldV === newV) return;
    if (name === 'background') this.style.setProperty('--sp-bg', newV || '#000');
    else if (name === 'folder' || name === 'images') this.#start();
    else if (this.#running) this.#rebuild(false);
  }

  /** 외부 제어용 */
  pause() { this.#paused = true; this.#syncPlayback(); }
  play() { this.#paused = false; this.#syncPlayback(); }

  #onVisibility = () => this.#syncPlayback();

  /** 멈춤·탭 숨김·화면 밖일 때는 영상도 멈춰 CPU를 아낀다. */
  #syncPlayback() {
    const active = !this.#paused && this.#visible && !document.hidden;
    this.#stage.querySelectorAll('video').forEach((v) => (active ? v.play().catch(() => {}) : v.pause()));
  }

  /** 영상 요소를 제거하기 전에 디코더·네트워크를 해제한다. */
  #dispose(el) {
    if (el.tagName === 'VIDEO') { el.pause(); el.removeAttribute('src'); el.load(); }
    el.remove();
  }
  next() { if (this.#running) this.#changeOne(); }

  async #start() {
    const loopId = ++this.#loopId;
    this.#running = false;
    this.#stage.querySelectorAll('video').forEach((v) => this.#dispose(v));
    this.#stage.innerHTML = '';
    this.#panels = [];

    const inline = this.getAttribute('images');
    this.#urls = inline
      ? inline.split(',').map((s) => new URL(s.trim(), document.baseURI).href).filter(Boolean)
      : await listFolder(this.getAttribute('folder') || 'images/');
    if (loopId !== this.#loopId) return;

    if (!this.#urls.length) {
      this.#stage.innerHTML = `<div class="msg"><div>이미지를 찾지 못했습니다.<br>
        <code>${this.getAttribute('folder') || 'images/'}manifest.json</code> 을 만들거나<br>
        디렉터리 목록을 제공하는 로컬 서버로 열어주세요.</div></div>`;
      return;
    }

    this.#deck = [];
    this.#running = true;
    await this.#rebuild(true);
    this.#loop(loopId);
  }

  async #loop(loopId) {
    let startedAt = performance.now();
    while (loopId === this.#loopId) {
      // interval은 교체 시작~다음 교체 시작 간격 (애니메이션 시간을 포함)
      await sleep(Math.max(200, this.#interval - (performance.now() - startedAt)));
      startedAt = performance.now();
      if (loopId !== this.#loopId) return;
      if (this.#paused || !this.#visible || document.hidden) continue;

      const li = this.#layoutInterval;
      if (li > 0 && performance.now() - this.#layoutAt >= li) {
        await this.#rebuild(true);
      } else {
        await this.#changeOne();
      }
    }
  }

  /** 이미지·영상 로드 + 원본 비율 캐시 */
  #load(url) {
    if (this.#meta.has(url)) return this.#meta.get(url);
    const p = new Promise((resolve) => {
      if (isVideo(url)) {
        // 첫 프레임까지 받아 두어 패널에 들어올 때 검은 화면이 보이지 않게 한다
        const v = document.createElement('video');
        v.muted = true;
        v.preload = 'auto';
        v.onloadeddata = () => resolve({ url, ratio: v.videoWidth / v.videoHeight || 16 / 9, ok: true });
        v.onerror = () => resolve({ url, ratio: 1, ok: false });
        v.src = url;
        return;
      }
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => img.decode().catch(() => {}).then(() =>
        resolve({ url, ratio: img.naturalWidth / img.naturalHeight || 1, ok: true }));
      img.onerror = () => resolve({ url, ratio: 1, ok: false });
      img.src = url;
    });
    this.#meta.set(url, p);
    return p;
  }

  /**
   * 패널 비율에 가장 잘 맞는 이미지를 덱 앞쪽 후보 중에서 고른다 (세로 사진 → 세로 패널).
   * exclude: 절대 고르지 않음(중복 방지), avoid: 가능하면 피함(직전에 보였던 것)
   */
  async #pickFor(ratio, exclude, avoid = new Set()) {
    const usable = this.#urls.filter((u) => !exclude.has(u));
    if (!usable.length) return null;
    if (this.#deck.filter((u) => !exclude.has(u)).length < Math.min(4, usable.length)) {
      const fresh = shuffle(this.#urls.filter((u) => !this.#deck.includes(u)));
      // 화면에 떠 있는 이미지는 되도록 덱 뒤로
      fresh.sort((a, b) => (exclude.has(a) || avoid.has(a)) - (exclude.has(b) || avoid.has(b)));
      this.#deck.push(...fresh);
    }
    const allowed = this.#deck.filter((u) => !exclude.has(u));
    const candidates = [...allowed.filter((u) => !avoid.has(u)), ...allowed.filter((u) => avoid.has(u))].slice(0, 4);

    const metas = (await Promise.all(candidates.map((u) => this.#load(u)))).filter((m) => m.ok);
    if (!metas.length) {
      // 깨진 이미지는 목록에서 제거하고 재시도
      this.#urls = this.#urls.filter((u) => !candidates.includes(u));
      this.#deck = this.#deck.filter((u) => !candidates.includes(u));
      if (!this.#urls.length) return null;
      return this.#pickFor(ratio, exclude, avoid);
    }
    const score = (m) => Math.abs(Math.log(m.ratio / ratio)) + Math.random() * 0.15;
    const best = metas.reduce((a, b) => (score(b) < score(a) ? b : a));
    const at = this.#deck.indexOf(best.url);
    if (at >= 0) this.#deck.splice(at, 1);
    // 다음 후보도 미리 로드
    this.#deck.slice(0, 4).forEach((u) => this.#load(u));
    return best.url;
  }

  #shown() { return new Set(this.#panels.map((p) => p.url)); }

  #panelCount(w, h) {
    const attr = +this.getAttribute('panels');
    if (attr) return Math.max(1, Math.min(attr, this.#urls.length));
    const max = Math.min(Math.max(9, this.#minPanels), this.#urls.length);
    const min = Math.min(this.#minPanels, max);
    const base = Math.max(min + 1, Math.round((w * h) / (340 * 260)));
    // 배치가 바뀔 때마다 패널 수도 ±1~2 흔들어 확실히 달라 보이게
    let n;
    for (let i = 0; i < 6; i++) {
      n = Math.max(min, Math.min(max, base + Math.round(rand(-2, 2))));
      if (n !== this.#lastCount) break;
    }
    return n;
  }

  /** 배치를 새로 짠다. animate=true면 기존 패널이 차례로 빠지고 새 패널이 차례로 들어온다. */
  async #rebuild(animate) {
    const w = this.clientWidth, h = this.clientHeight;
    if (!w || !h) return;
    // 도중에 폴더/목록이 바뀌어 #start가 다시 불리면 이 빌드는 폐기한다
    const loopId = this.#loopId;
    const stale = () => loopId !== this.#loopId;
    const gap = this.#gap, half = gap / 2;
    const rects = makeLayout(w, h, this.#panelCount(w, h), this.#maxRatio, Math.min(12, this.#urls.length));
    this.#lastCount = rects.length;
    const old = this.#panels;
    const dur = this.#duration;

    if (animate && old.length) {
      const order = shuffle([...old]);
      await Promise.all(order.map(async (p, i) => {
        await sleep(i * dur * 0.08);
        await this.#slideOut(p.el.firstElementChild, DIRS[Math.floor(Math.random() * 4)], dur);
      }));
    }

    if (stale()) return;
    const avoid = animate ? this.#shown() : new Set();
    const exclude = new Set();
    const panels = [];
    for (const r of rects) {
      const el = document.createElement('div');
      el.className = 'panel';
      Object.assign(el.style, {
        left: `${r.x + half}px`, top: `${r.y + half}px`,
        width: `${Math.max(0, r.w - gap)}px`, height: `${Math.max(0, r.h - gap)}px`,
      });
      panels.push({ el, rect: r, url: null });
    }

    // 리사이즈처럼 애니메이션 없는 재배치는 기존 이미지를 재사용
    const reuse = animate ? [] : old.map((p) => p.url).filter(Boolean);
    for (const p of panels) {
      p.url = reuse.shift() || (await this.#pickFor(p.rect.w / p.rect.h, exclude, avoid));
      if (p.url) exclude.add(p.url);
    }
    if (stale()) return;

    this.#stage.querySelectorAll('video').forEach((v) => this.#dispose(v));
    this.#stage.replaceChildren(...panels.map((p) => p.el));
    this.#panels = panels;
    this.#lastIdx = -1;

    const order = shuffle(panels.map((_, i) => i));
    await Promise.all(order.map(async (idx, i) => {
      const p = panels[idx];
      if (!p.url) return;
      const slide = this.#makeSlide(p.url);
      if (!animate) { p.el.append(slide); return; }
      await sleep(i * dur * 0.12);
      p.el.append(slide);
      await this.#animateIn(slide, DIRS[Math.floor(Math.random() * 4)], dur);
    }));
    this.#layoutAt = performance.now();
  }

  #makeSlide(url) {
    if (isVideo(url)) {
      const v = document.createElement('video');
      v.className = 'slide';
      Object.assign(v, { muted: true, loop: true, autoplay: true, playsInline: true, src: url });
      v.setAttribute('muted', ''); // iOS 자동재생 조건
      v.setAttribute('playsinline', '');
      if (this.#paused || !this.#visible || document.hidden) v.autoplay = false;
      return v;
    }
    // GIF는 배경 이미지로도 애니메이션이 그대로 재생된다
    const s = document.createElement('div');
    s.className = 'slide';
    s.style.backgroundImage = `url("${url.replace(/"/g, '%22')}")`;
    return s;
  }

  #offset(dir) {
    return { left: 'translate(-100%,0)', right: 'translate(100%,0)', up: 'translate(0,-100%)', down: 'translate(0,100%)' }[dir];
  }

  #animateIn(slide, from, dur) {
    if (this.#reducedMotion) {
      return slide.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, easing: 'ease', fill: 'both' }).finished;
    }
    return slide.animate([{ transform: this.#offset(from) }, { transform: 'translate(0,0)' }],
      { duration: dur, easing: GLIDE, fill: 'both' }).finished;
  }

  async #slideOut(slide, to, dur) {
    if (!slide) return;
    const kf = this.#reducedMotion
      ? [{ opacity: 1 }, { opacity: 0 }]
      : [{ transform: 'translate(0,0)' }, { transform: this.#offset(to) }];
    await slide.animate(kf, { duration: dur * 0.55, easing: EXIT, fill: 'forwards' }).finished;
  }

  /** 패널 하나를 골라 새 이미지가 기존 이미지를 밀어내며 들어온다. */
  async #changeOne() {
    const n = this.#panels.length;
    // 화면에 없는 이미지가 하나도 없으면 교체 대신 다음 배치 변경을 기다린다 (중복 표시 방지)
    if (!n || this.#urls.length <= n) return;
    let idx = Math.floor(Math.random() * n);
    if (n > 1 && idx === this.#lastIdx) idx = (idx + 1 + Math.floor(Math.random() * (n - 1))) % n;
    this.#lastIdx = idx;

    const panel = this.#panels[idx];
    const url = await this.#pickFor(panel.rect.w / panel.rect.h, this.#shown());
    if (!url || !this.#panels.includes(panel)) return;

    const oldSlide = panel.el.lastElementChild;
    const next = this.#makeSlide(url);
    panel.el.append(next);
    panel.url = url;

    const dur = this.#duration;
    // 새 이미지가 들어오는 방향: 패널이 가로로 길면 좌우, 세로로 길면 상하를 더 자주
    const r = panel.rect.w / panel.rect.h;
    const dir = Math.random() < (r >= 1 ? 0.7 : 0.3)
      ? (Math.random() < 0.5 ? 'left' : 'right')
      : (Math.random() < 0.5 ? 'up' : 'down');
    const opposite = { left: 'right', right: 'left', up: 'down', down: 'up' }[dir];

    const anims = [this.#animateIn(next, opposite, dur)];
    if (oldSlide && !this.#reducedMotion) {
      anims.push(oldSlide.animate([{ transform: 'translate(0,0)' }, { transform: this.#offset(dir) }],
        { duration: dur, easing: GLIDE, fill: 'forwards' }).finished);
    }
    await Promise.all(anims).catch(() => {});
    [...panel.el.children].forEach((c) => c !== next && this.#dispose(c));
  }
}

customElements.define('sliding-panels', SlidingPanels);
export default SlidingPanels;
