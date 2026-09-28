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
 *   panels    패널 개수 (기본: 영역 크기에 맞춰 자동, 3~9)
 *   interval  패널 하나가 바뀌는 간격 ms (기본 3500)
 *   duration  슬라이드 애니메이션 시간 ms (기본 1100)
 *   gap       패널 사이 간격 px (기본 4)
 *   relayout  패널이 몇 번 바뀐 뒤 배치 전체를 새로 짤지 (기본 14, 0이면 안 함)
 *   background 배경색 (기본 #000)
 *
 * 폴더의 이미지 목록은 브라우저가 직접 읽을 수 없으므로 다음 순서로 찾는다:
 *   1) {folder}manifest.json  — ["a.jpg","b.png", ...]  (tools/make-manifest.mjs 로 생성)
 *   2) 웹서버의 디렉터리 목록 HTML (python3 -m http.server, npx serve 등)에서 이미지 링크 파싱
 */

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif|svg|bmp)$/i;
const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';
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
        .filter((u) => IMAGE_EXT.test(decodeURIComponent(u.pathname)))
        .map((u) => u.href);
      if (urls.length) return [...new Set(urls)];
    }
  } catch { /* 무시 */ }

  return [];
}

/** 영역을 무작위로 이분할해 n개의 사각형(모자이크)을 만든다. */
function makeLayout(w, h, n) {
  const minW = Math.max(90, w * 0.14);
  const minH = Math.max(80, h * 0.14);
  let rects = [{ x: 0, y: 0, w, h }];

  for (let guard = 0; rects.length < n && guard < 200; guard++) {
    // 면적이 큰 사각형일수록 쪼개질 확률이 높다
    const total = rects.reduce((s, r) => s + r.w * r.h, 0);
    let pick = Math.random() * total, idx = 0;
    for (; idx < rects.length - 1; idx++) {
      pick -= rects[idx].w * rects[idx].h;
      if (pick <= 0) break;
    }
    const r = rects[idx];
    const canV = r.w >= minW * 2, canH = r.h >= minH * 2;
    if (!canV && !canH) {
      if (rects.every((q) => q.w < minW * 2 && q.h < minH * 2)) break;
      continue;
    }
    const vertical = canV && canH ? (r.w / r.h > 1.1 ? Math.random() < 0.8 : r.w / r.h < 0.9 ? Math.random() < 0.2 : Math.random() < 0.5) : canV;
    const t = rand(0.36, 0.64);
    let a, b;
    if (vertical) {
      const cw = Math.round(r.w * t);
      a = { x: r.x, y: r.y, w: cw, h: r.h };
      b = { x: r.x + cw, y: r.y, w: r.w - cw, h: r.h };
    } else {
      const ch = Math.round(r.h * t);
      a = { x: r.x, y: r.y, w: r.w, h: ch };
      b = { x: r.x, y: r.y + ch, w: r.w, h: r.h - ch };
    }
    rects.splice(idx, 1, a, b);
  }
  return rects;
}

const STYLE = `
  :host { display:block; position:relative; overflow:hidden; background:var(--sp-bg,#000); contain:strict; min-height:120px; }
  .stage { position:absolute; inset:0; }
  .panel { position:absolute; overflow:hidden; background:var(--sp-bg,#000); }
  .slide { position:absolute; inset:0; background-size:cover; background-position:center; will-change:transform; }
  .msg { position:absolute; inset:0; display:grid; place-items:center; color:#888; font:14px/1.6 system-ui,sans-serif; text-align:center; padding:16px; }
  .msg code { color:#ccc; }
`;

class SlidingPanels extends HTMLElement {
  static observedAttributes = ['folder', 'images', 'panels', 'gap', 'background'];

  #root; #stage; #urls = []; #deck = []; #meta = new Map();
  #panels = []; #running = false; #paused = false; #changes = 0; #lastIdx = -1;
  #ro; #io; #visible = true; #resizeTimer; #loopId = 0;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    this.#root.innerHTML = `<style>${STYLE}</style><div class="stage"></div>`;
    this.#stage = this.#root.querySelector('.stage');
  }

  get #interval() { return +this.getAttribute('interval') || 3500; }
  get #duration() { return this.#reducedMotion ? 600 : +this.getAttribute('duration') || 1100; }
  get #gap() { return this.hasAttribute('gap') ? +this.getAttribute('gap') : 4; }
  get #relayoutEvery() { return this.hasAttribute('relayout') ? +this.getAttribute('relayout') : 14; }
  get #reducedMotion() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }

  connectedCallback() {
    this.style.setProperty('--sp-bg', this.getAttribute('background') || '#000');

    this.#ro = new ResizeObserver(() => {
      clearTimeout(this.#resizeTimer);
      this.#resizeTimer = setTimeout(() => this.#running && this.#rebuild(false), 250);
    });
    this.#ro.observe(this);

    this.#io = new IntersectionObserver(([e]) => { this.#visible = e.isIntersecting; });
    this.#io.observe(this);

    this.#start();
  }

  disconnectedCallback() {
    this.#running = false;
    this.#loopId++;
    this.#ro?.disconnect();
    this.#io?.disconnect();
  }

  attributeChangedCallback(name, oldV, newV) {
    if (!this.isConnected || oldV === newV) return;
    if (name === 'background') this.style.setProperty('--sp-bg', newV || '#000');
    else if (name === 'folder' || name === 'images') this.#start();
    else if (this.#running) this.#rebuild(false);
  }

  /** 외부 제어용 */
  pause() { this.#paused = true; }
  play() { this.#paused = false; }
  next() { if (this.#running) this.#changeOne(); }

  async #start() {
    const loopId = ++this.#loopId;
    this.#running = false;
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
    while (loopId === this.#loopId) {
      await sleep(this.#interval);
      if (loopId !== this.#loopId) return;
      if (this.#paused || !this.#visible || document.hidden) continue;

      if (this.#relayoutEvery > 0 && ++this.#changes >= this.#relayoutEvery) {
        this.#changes = 0;
        await this.#rebuild(true);
      } else {
        await this.#changeOne();
      }
    }
  }

  /** 이미지 로드 + 원본 비율 캐시 */
  #load(url) {
    if (this.#meta.has(url)) return this.#meta.get(url);
    const p = new Promise((resolve) => {
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

  /** 패널 비율에 가장 잘 맞는 이미지를 덱 앞쪽 후보 중에서 고른다 (세로 사진 → 세로 패널). */
  async #pickFor(ratio, exclude) {
    const need = Math.min(4, this.#urls.length);
    if (this.#deck.length < need) {
      const fresh = shuffle(this.#urls.filter((u) => !this.#deck.includes(u)));
      // 화면에 떠 있는 이미지는 되도록 덱 뒤로
      fresh.sort((a, b) => exclude.has(a) - exclude.has(b));
      this.#deck.push(...fresh);
    }
    let candidates = this.#deck.slice(0, 4).filter((u) => !exclude.has(u));
    if (!candidates.length) candidates = this.#deck.slice(0, 1);

    const metas = (await Promise.all(candidates.map((u) => this.#load(u)))).filter((m) => m.ok);
    if (!metas.length) {
      // 깨진 이미지는 목록에서 제거하고 재시도
      this.#urls = this.#urls.filter((u) => !candidates.includes(u));
      this.#deck = this.#deck.filter((u) => !candidates.includes(u));
      if (!this.#urls.length) return null;
      return this.#pickFor(ratio, exclude);
    }
    const score = (m) => Math.abs(Math.log(m.ratio / ratio)) + Math.random() * 0.15;
    const best = metas.reduce((a, b) => (score(b) < score(a) ? b : a));
    this.#deck.splice(this.#deck.indexOf(best.url), 1);
    // 다음 후보도 미리 로드
    this.#deck.slice(0, 4).forEach((u) => this.#load(u));
    return best.url;
  }

  #shown() { return new Set(this.#panels.map((p) => p.url)); }

  #panelCount(w, h) {
    const attr = +this.getAttribute('panels');
    if (attr) return Math.max(1, Math.min(attr, this.#urls.length));
    const auto = Math.round((w * h) / (340 * 260));
    return Math.max(1, Math.min(9, Math.max(3, auto), this.#urls.length));
  }

  /** 배치를 새로 짠다. animate=true면 기존 패널이 차례로 빠지고 새 패널이 차례로 들어온다. */
  async #rebuild(animate) {
    const w = this.clientWidth, h = this.clientHeight;
    if (!w || !h) return;
    const gap = this.#gap, half = gap / 2;
    const rects = makeLayout(w, h, this.#panelCount(w, h));
    const old = this.#panels;
    const dur = this.#duration;

    if (animate && old.length) {
      const order = shuffle([...old]);
      await Promise.all(order.map(async (p, i) => {
        await sleep(i * dur * 0.18);
        await this.#slideOut(p.el.firstElementChild, DIRS[Math.floor(Math.random() * 4)], dur);
      }));
    }

    const exclude = animate ? this.#shown() : new Set();
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
      p.url = reuse.shift() || (await this.#pickFor(p.rect.w / p.rect.h, exclude));
      if (p.url) exclude.add(p.url);
    }

    this.#stage.replaceChildren(...panels.map((p) => p.el));
    this.#panels = panels;
    this.#lastIdx = -1;

    const order = shuffle(panels.map((_, i) => i));
    await Promise.all(order.map(async (idx, i) => {
      const p = panels[idx];
      if (!p.url) return;
      const slide = this.#makeSlide(p.url);
      if (!animate) { p.el.append(slide); return; }
      await sleep(i * dur * 0.22);
      p.el.append(slide);
      await this.#animateIn(slide, DIRS[Math.floor(Math.random() * 4)], dur);
    }));
  }

  #makeSlide(url) {
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
      { duration: dur, easing: EASE, fill: 'both' }).finished;
  }

  async #slideOut(slide, to, dur) {
    if (!slide) return;
    const kf = this.#reducedMotion
      ? [{ opacity: 1 }, { opacity: 0 }]
      : [{ transform: 'translate(0,0)' }, { transform: this.#offset(to) }];
    await slide.animate(kf, { duration: dur * 0.8, easing: EASE, fill: 'forwards' }).finished;
  }

  /** 패널 하나를 골라 새 이미지가 기존 이미지를 밀어내며 들어온다. */
  async #changeOne() {
    const n = this.#panels.length;
    if (!n || this.#urls.length < 2) return;
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
        { duration: dur, easing: EASE, fill: 'forwards' }).finished);
    }
    await Promise.all(anims).catch(() => {});
    [...panel.el.children].forEach((c) => c !== next && c.remove());
  }
}

customElements.define('sliding-panels', SlidingPanels);
export default SlidingPanels;
