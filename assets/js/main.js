// technel.world — page controller
import { Globe, AXIAL_TILT } from './globe.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// "[...]" = 未確定。表示上は少し沈ませる
const tbd = (s) => esc(s).replace(/\[([^\]]*)\]/g, '<span class="tbd">[$1]</span>');

/* =========================================================
   DATA — [ ] は未確定・仮置き
   ========================================================= */
const PROJECTS = [
  {
    id: 'makers-unlearn',
    title: 'makers Unlearn',
    titleJa: 'メイカーズ・アンラーン（mU）',
    tag: 'Field Program',
    overview: '山梨のフィールドで、技術をいちど手放し、手と身体で学び直す場。',
    partner: '[パートナー名]',
    year: '[2025]–',
    place: 'Yamanashi, JP',
    lat: 35.66, lon: 138.57,
    role: '企画・運営・プログラム設計 [要確認]',
    body: [
      'AIや生成技術が暮らしのすみずみに入り込んだいま、わたしたちは技術を「使う」ことには慣れても、技術との関係を「見る」機会をほとんど持たない。',
      'makers Unlearn（mU）は、山梨のフィールドに身を置き、いちど技術から離れ、手と身体で道具をつくり直すことで、技術との関係を学び直すプログラムである。つくることは、考えることの別名だ。',
      '[開催日程・参加者・成果などの詳細]',
    ],
    links: [{ label: 'mU 紹介ページ', href: 'https://technel.notion.site/mU-AI-36a9f9f66dda80369e64e1c99f8b18c7' }],
  },
  {
    id: 'jungle-gathering',
    title: 'JUNGLE Gathering',
    titleJa: 'ジャングル・ギャザリング',
    tag: 'Field Program',
    overview: '西表島の原生自然に身を置き、道具・身体・自然の関係を捉え直す実践。',
    partner: 'Iriomote JUNGLE CLUB [要確認]',
    year: '[2025]',
    place: 'Iriomote, JP',
    lat: 24.33, lon: 123.81,
    role: '[役割]',
    body: [
      'インフラや既存の技術から距離を置き、原生のジャングルで数日間を過ごす。圏外に出て、手を動かし、身体で環境を読む。',
      '離れて見ると、関係が見える。日常に戻ったとき、技術はもう同じ顔をしていない。',
      '[開催概要の詳細]',
    ],
    links: [{ label: 'note｜JUNGLEの記録', href: 'https://note.com/nanasawa/m/m9f28fbe15068' }],
  },
  {
    id: 'jikyu-farm',
    title: 'Self-Sufficient Fields',
    titleJa: '耕作放棄地を、みんなの自給自足畑に',
    tag: 'System Design',
    overview: '耕作放棄地を、自律分散型の共同体が営む自給自足の畑に変えるシステム。',
    partner: '[パートナー名]',
    year: '2026',
    place: '[Site], JP',
    lat: 36.2, lon: 138.25,
    role: '事業計画・システム設計',
    body: [
      '日本各地で増えつづける耕作放棄地を、地域と都市の人びとが共同で耕す自給自足畑に変える。収穫の記録とトークンで、労働と収穫の関係を見える化する。',
      '利益を目的にせず、収支をゼロに調整する自律分散型の共同体として設計している。[実施地・時期]',
    ],
    links: [{ label: '事業計画スライド', href: 'jikyu-farm/' }],
  },
  {
    id: 'nttdata-lecture',
    title: 'AI & Ethics Seminar',
    titleJa: '技術と人間の関係は、どうしたら見えるようになるのか',
    tag: 'Lecture',
    overview: 'NTTデータ「AIと倫理」ゼミでの有識者レクチャー。技術哲学の四つのレンズ。',
    partner: 'NTTデータ',
    year: '2026',
    place: 'Tokyo, JP',
    lat: 35.68, lon: 139.76,
    role: 'レクチャー',
    body: [
      '技術は透明になるほど、わたしたちの知覚と行為を深く形づくる。見えなくなった関係を、どうしたら見えるようにできるのか。',
      '「生まれながらのサイボーグ」「媒介」「手で考える」「世界の構成」という四つのレンズを手がかりに、AIと倫理の問題を、技術と人間の関係として捉え直した。',
    ],
    links: [{ label: 'レクチャースライド', href: 'nttdata-lecture/' }],
  },
  {
    id: 'ondoku',
    title: 'Ondoku',
    titleJa: '音読装置',
    tag: 'Tool',
    overview: '原稿を声に出して聞き、引っかかった文に朱を入れる道具。',
    partner: '—',
    year: '2026',
    place: 'Web / Offline',
    lat: 35.66, lon: 138.57,
    role: '設計・開発',
    body: [
      '書いた文章は、声に出すと別の顔を見せる。音読装置は、原稿を読み上げながら、耳で引っかかった文に朱を入れていくための小さな道具だ。',
      'ホーム画面に置けて、電波がなくても開く。依存のない単一のHTMLで動く。',
    ],
    links: [{ label: '音読装置をひらく', href: 'ondoku/' }],
  },
];

const PEOPLE = [
  { ja: '七沢 智樹', en: 'Tomoki Nanasawa', ini: '七', role: '代表／技術哲学', photo: null },
  { ja: '長谷川 [名]', en: 'Hasegawa [—]', ini: '長', role: '[役割・専門]', photo: null },
  { ja: '原島 [名]', en: 'Harashima [—]', ini: '原', role: '[役割・専門]', photo: null },
  { ja: '信原 [名]', en: 'Nobuhara [—]', ini: '信', role: '[役割・専門]', photo: null },
  { ja: '平野 [名]', en: 'Hirano [—]', ini: '平', role: '[役割・専門]', photo: null },
];

/* =========================================================
   CLOCK
   ========================================================= */
const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
const clocks = $$('[data-clock]');
function tick() { const t = fmt.format(new Date()); clocks.forEach((c) => { c.textContent = t; }); }
tick(); setInterval(tick, 1000);
const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

/* =========================================================
   GLOBES
   ========================================================= */
const globes = [];
let hero = null, foot = null, modalGlobe = null;

function makeGlobe(canvas, opts) {
  try {
    const g = new Globe(canvas, opts);
    g.reduced = reduced.matches;
    g.setTheme(root.dataset.theme);
    globes.push(g);
    return g;
  } catch (e) {
    root.classList.add('no-webgl');
    return null;
  }
}

// run a globe only while its canvas is on screen
function autoRun(g, el) {
  if (!g) return;
  new IntersectionObserver(([e]) => { e.isIntersecting ? g.start() : g.stop(); }, { rootMargin: '80px' }).observe(el);
}

const heroCanvas = $('#globe');
const isSmall = () => innerWidth < 760;
hero = makeGlobe(heroCanvas, {
  size: isSmall() ? 0.94 : 0.74, interactive: true, orbit: true, startLon: 100, spin: 0.05,
  markers: [{ lat: 35.66, lon: 138.57 }, { lat: 24.33, lon: 123.81 }],
});
if (hero) {
  hero.zoom = hero.tZoom = 0.78;
  autoRun(hero, heroCanvas);
  const labels = $('#markerLabels');
  labels.innerHTML = [
    ['P—01', 'makers Unlearn', 'Yamanashi 35.66N'],
    ['P—02', 'JUNGLE Gathering', 'Iriomote 24.33N'],
  ].map(([n, t, p]) => `<div class="mk"><b>${n}</b>${t}<br><span>${p}</span></div>`).join('');
  const mk = $$('.mk', labels);
  const rot = $('#hudRot'), cur = $('#hudCur');
  let lastHud = 0;
  // keep labels off the wordmark and inside the viewport
  let band = null, widths = [];
  const measure = () => { const r = $('.hero__word').getBoundingClientRect(), c = heroCanvas.getBoundingClientRect(); band = [r.top - c.top + r.height * 0.12, r.bottom - c.top]; widths = mk.map((el) => el.offsetWidth); };
  addEventListener('resize', measure);
  hero.onFrame = (s) => {
    if (!band) measure();
    s.markers.forEach((m, i) => {
      let vis = m.facing > 0.18 ? Math.min(1, (m.facing - 0.18) * 4) : 0;
      if (m.y - 4 > band[0] && m.y - 46 < band[1]) vis = 0; // label box ∩ wordmark
      if (m.x + 12 + widths[i] > hero.w - 12) vis = 0;
      mk[i].style.transform = `translate3d(${(m.x + 12).toFixed(1)}px, ${(m.y - 46).toFixed(1)}px, 0)`;
      mk[i].style.opacity = (vis * hero.alpha * (root.classList.contains('is-booting') ? 0 : 1)).toFixed(3);
    });
    const now = performance.now();
    if (now - lastHud > 90) {
      lastHud = now;
      const deg = ((-hero.spin * 180 / Math.PI) % 360 + 360) % 360;
      rot.textContent = deg.toFixed(2).padStart(6, '0') + '°';
      cur.textContent = s.cursor
        ? `${Math.abs(s.cursor.lat).toFixed(2)}°${s.cursor.lat >= 0 ? 'N' : 'S'} ${Math.abs(s.cursor.lon).toFixed(2)}°${s.cursor.lon >= 0 ? 'E' : 'W'}`
        : '— —';
    }
  };
  heroCanvas.setAttribute('aria-label', `自転する地球。地軸は${AXIAL_TILT}度傾いている。`);
}

const footCanvas = $('#footGlobe');
foot = makeGlobe(footCanvas, { size: 1.5, sizeRef: 'width', tilt: false, spin: 0.035, glow: 1.5, dotScale: 0.62, focus: { lat: -38, lon: 150 }, fov: 24 });
if (foot) {
  const place = () => {
    foot.resize();
    const f = foot.o.size * foot.w / foot.h; // silhouette radius in NDC (approx.)
    foot.o.offset = [0, (isSmall() ? -0.05 : -0.1) - f];
  };
  place();
  foot.place = place;
  autoRun(foot, footCanvas);
}

let resizeT;
addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    if (hero) { hero.o.size = isSmall() ? 0.94 : 0.74; hero.resize(); }
    if (foot) foot.place();
    if (modalGlobe && $('#modal').open) modalGlobe.resize();
  }, 120);
});

/* scroll → globe */
let lastY = scrollY;
function onScroll() {
  const yy = scrollY, h = innerHeight;
  $('#hd').classList.toggle('is-scrolled', yy > 12);
  if (hero && !root.classList.contains('is-booting')) {
    const p = Math.min(1, yy / h);
    hero.tZoom = 1 + p * 0.45;
    hero.tAlpha = 1 - p * 0.5;
    hero.kick((yy - lastY) * 0.0016);
  }
  lastY = yy;
}
addEventListener('scroll', onScroll, { passive: true });

/* =========================================================
   THEME
   ========================================================= */
const toggle = $('#themeToggle');
function setTheme(t, save) {
  root.dataset.theme = t;
  toggle.setAttribute('aria-checked', String(t === 'day'));
  $('meta[name="theme-color"]').content = t === 'day' ? '#ebe9e2' : '#0b0b0a';
  globes.forEach((g) => g.setTheme(t));
  if (save) try { localStorage.setItem('tw-theme', t); } catch (e) { /* private mode */ }
}
setTheme(root.dataset.theme || 'night');
toggle.addEventListener('click', () => setTheme(root.dataset.theme === 'day' ? 'night' : 'day', true));

/* =========================================================
   MENU (mobile)
   ========================================================= */
const menuBtn = $('#menuBtn'), drawer = $('#drawer');
function menu(open) {
  menuBtn.setAttribute('aria-expanded', String(open));
  drawer.hidden = !open;
  $('span', menuBtn).textContent = open ? 'CLOSE' : 'MENU';
}
menuBtn.addEventListener('click', () => menu(drawer.hidden));
$$('a', drawer).forEach((a) => a.addEventListener('click', () => menu(false)));

/* =========================================================
   TICKER — duplicate for a seamless loop
   ========================================================= */
const ticker = $('#ticker');
$$('p', ticker).forEach((p) => { const c = p.cloneNode(true); c.setAttribute('aria-hidden', 'true'); ticker.appendChild(c); });

/* =========================================================
   PROJECT LIST + MODAL
   ========================================================= */
const rows = $('#projectRows');
rows.innerHTML = PROJECTS.map((p, i) => `
  <button class="prow rv" type="button" role="row" data-i="${i}" aria-haspopup="dialog">
    <span class="prow__no" role="cell">P—${String(i + 1).padStart(2, '0')}</span>
    <span class="prow__ov" role="cell"><span class="prow__tag">${esc(p.tag)}</span><br>${tbd(p.overview)}</span>
    <span class="prow__ti" role="cell">${esc(p.title)}<small>${esc(p.titleJa)}</small></span>
    <span class="prow__pa" role="cell">${tbd(p.partner)}</span>
    <span class="prow__yr" role="cell">${tbd(p.year)}<i aria-hidden="true">→</i></span>
  </button>`).join('');
$('#pjCount').textContent = `${String(PROJECTS.length).padStart(2, '0')} items`;

const modal = $('#modal');
let current = 0;
function fillModal(i) {
  current = (i + PROJECTS.length) % PROJECTS.length;
  const p = PROJECTS[current];
  $('#mNo').textContent = `P—${String(current + 1).padStart(2, '0')} / ${String(PROJECTS.length).padStart(2, '0')}`;
  $('#mTitle').textContent = p.title;
  $('#mSub').textContent = p.titleJa;
  $('#mSpec').innerHTML = [['Overview', p.overview], ['Title', p.title], ['Partner', p.partner], ['Year', p.year], ['Location', p.place], ['Role', p.role]]
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${tbd(v)}</dd></div>`).join('');
  $('#mDesc').innerHTML = p.body.map((t) => `<p>${tbd(t)}</p>`).join('');
  $('#mLinks').innerHTML = p.links.map((l) => {
    const ext = /^https?:/.test(l.href);
    return `<a href="${esc(l.href)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${esc(l.label)} ${ext ? '↗' : '→'}</a>`;
  }).join('');
  $('#mGeo').innerHTML = `<b>●</b> ${tbd(p.place)} — ${Math.abs(p.lat).toFixed(2)}°${p.lat >= 0 ? 'N' : 'S'} ${p.lon.toFixed(2)}°E`;
  // restart the text entrance animation
  $$('.modal__text > *').forEach((el) => { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; });
  $('.modal__body').scrollTop = 0;
  if (modalGlobe) { modalGlobe.setMarkers([{ lat: p.lat, lon: p.lon }]); modalGlobe.setFocus(p.lat, p.lon); modalGlobe.zoom = 0.86; }
}

function openModal(i) {
  fillModal(i);
  modal.showModal();
  root.classList.add('modal-open');
  if (!modalGlobe) {
    const p = PROJECTS[current];
    modalGlobe = makeGlobe($('#modalGlobe'), { size: 0.9, tilt: false, spin: 0.012, focus: { lat: p.lat, lon: p.lon }, markers: [{ lat: p.lat, lon: p.lon }], glow: 0.9 });
    if (modalGlobe) modalGlobe.zoom = 0.86;
  }
  if (modalGlobe) { requestAnimationFrame(() => { modalGlobe.resize(); modalGlobe.start(); }); }
}
function closeModal() {
  if (!modal.open || modal.classList.contains('is-closing')) return;
  modal.classList.add('is-closing');
  setTimeout(() => {
    modal.classList.remove('is-closing');
    modal.close();
    root.classList.remove('modal-open');
    if (modalGlobe) modalGlobe.stop();
    const row = $(`.prow[data-i="${current}"]`); if (row) row.focus({ preventScroll: true });
  }, reduced.matches ? 0 : 460);
}
rows.addEventListener('click', (e) => { const b = e.target.closest('.prow'); if (b) openModal(+b.dataset.i); });
$('#mClose').addEventListener('click', closeModal);
$('#mPrev').addEventListener('click', () => fillModal(current - 1));
$('#mNext').addEventListener('click', () => fillModal(current + 1));
modal.addEventListener('cancel', (e) => { e.preventDefault(); closeModal(); });
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
modal.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') fillModal(current + 1);
  if (e.key === 'ArrowLeft') fillModal(current - 1);
});

/* =========================================================
   COLLECTIVE
   ========================================================= */
$('#people').innerHTML = PEOPLE.map((m, i) => `
  <li class="person rv">
    <div class="person__ph">
      ${m.photo ? `<img src="${esc(m.photo)}" alt="${esc(m.ja)}" loading="lazy" decoding="async">` : `<span class="person__ini" aria-hidden="true">${esc(m.ini)}</span>`}
      <span class="person__no">C—${String(i + 1).padStart(2, '0')}</span>
      ${m.photo ? '' : '<span class="person__tag">[PHOTO]</span>'}
    </div>
    <div class="person__meta">
      <p><span class="person__name">${tbd(m.ja)}</span><span class="person__en">${tbd(m.en)}</span></p>
      <p class="person__role">${tbd(m.role)}</p>
    </div>
  </li>`).join('') + `
  <li class="person person--more rv">
    <div class="person__ph"><span class="plus" aria-hidden="true">+</span></div>
    <div class="person__meta">
      <p><span class="person__name">ほか</span><span class="person__en">And more</span></p>
      <p class="person__role">[その他のメンバー]</p>
    </div>
  </li>`;

/* =========================================================
   REVEAL + NAV STATE
   ========================================================= */
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
$$('.rv').forEach((el) => io.observe(el));

const navLinks = $$('.hd__nav a');
const secIO = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  navLinks.forEach((a) => a.classList.toggle('is-current', a.hash === '#' + e.target.id));
}), { rootMargin: '-45% 0px -50% 0px' });
['project', 'collective', 'company'].forEach((id) => secIO.observe(document.getElementById(id)));

/* =========================================================
   BOOT SEQUENCE
   ========================================================= */
const boot = $('#boot'), log = $('#bootLog'), pctEl = $('#bootPct'), bar = $('#bootBar');
const LINES = [
  ['cmd', 'technel@world:~$ ./boot --planet earth --mode serious'],
  ['ok', 'kernel technē/2.0 ........ ok'],
  ['ok', 'mounting lithosphere — natural earth 1:50m'],
  ['ok', 'plotting 34,941 land points on fibonacci sphere'],
  ['ok', `axial tilt locked at ${AXIAL_TILT}°`],
  ['ok', 'syncing clock → Asia/Tokyo'],
  ['ok', 'linking collective — 6 nodes online'],
  ['ok', 'compiling statement [ja/en]'],
  ['warn', 'planetary boundaries: 7 of 9 transgressed'],
  ['ok', 'world ready. entering technel.world'],
];
function lineHTML([k, t]) {
  if (k === 'cmd') return `<span class="cmd">${esc(t)}</span>`;
  if (k === 'warn') return `<span class="ok">[!]</span> <span class="warn">${esc(t)}</span>`;
  return `<span class="ok">[✓]</span> ${esc(t)}`;
}

function runBoot() {
  const quick = root.classList.contains('is-rebooted');
  const instant = reduced.matches;
  const total = instant ? 300 : quick ? 900 : 2900;
  const tasks = { fonts: false, globe: !!hero || root.classList.contains('no-webgl') };
  document.fonts?.ready.then(() => { tasks.fonts = true; });
  setTimeout(() => { tasks.fonts = true; }, 2500); // never hang on fonts
  const t0 = performance.now();
  let shown = 0, pct = 0, done = false;

  if (instant) { log.innerHTML = LINES.map(lineHTML).join('\n'); shown = LINES.length; }

  const step = (now) => {
    if (done) return;
    const tp = Math.min(1, (now - t0) / total);
    const ready = (tasks.fonts ? 0.5 : 0) + (tasks.globe ? 0.5 : 0);
    const target = Math.min(tp, 0.82 + ready * 0.18) * 100;
    pct += (target - pct) * 0.18;
    if (target >= 100 && pct > 99.4) pct = 100;
    pctEl.textContent = String(Math.floor(pct)).padStart(3, '0');
    bar.style.transform = `scaleX(${pct / 100})`;
    const want = Math.min(LINES.length, Math.floor((pct / 100) * LINES.length + 0.4));
    if (want > shown) {
      shown = want;
      log.innerHTML = LINES.slice(0, shown).map(lineHTML).join('\n') + (shown < LINES.length ? '\n<span class="caret"></span>' : '');
    }
    if (pct >= 100 && shown >= LINES.length) { done = true; setTimeout(finish, instant ? 0 : quick ? 200 : 520); return; }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);

  function finish() {
    try { sessionStorage.setItem('tw-booted', '1'); } catch (e) { /* ignore */ }
    boot.classList.add('is-out');
    root.classList.remove('is-booting');
    root.classList.add('is-live');
    if (hero) hero.tZoom = 1;
    setTimeout(() => boot.classList.add('is-gone'), instant ? 0 : 1150);
  }
  const skip = () => { if (done) return; pct = 100; tasks.fonts = true; shown = LINES.length; log.innerHTML = LINES.map(lineHTML).join('\n'); done = true; finish(); };
  $('#bootSkip').addEventListener('click', skip);
  boot.addEventListener('click', skip);
  addEventListener('keydown', (e) => { if (!done && (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ')) skip(); });
}
runBoot();

reduced.addEventListener?.('change', () => globes.forEach((g) => { g.reduced = reduced.matches; }));
