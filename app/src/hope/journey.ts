import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { F, font } from '../engine/type';
import { STORY } from './story';

// A time-addressable film: every pixel depends only on time and fixed seeds.
const INK = '#08090b', BONE = '#eee9df', ORANGE = '#ff692c', GOLD = '#ffb96c';
const TAU = Math.PI * 2;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => { const k = clamp(v); return k * k * (3 - 2 * k); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const random = (n: number) => { const x = Math.sin(n * 127.1 + 41.7) * 43758.5453; return x - Math.floor(x); };
type Point = [number, number];

// Hand-drawn 16 x 18 sprite. A = the orange scarf, E = eye, P = inner ear.
const RABBIT = [
  '....##....##....', '....#P#...#P#...', '....#P#...#P#...',
  '....#P#..##P#...', '....###..###....', '.....######.....',
  '....########....', '...##########...', '...#####E###E...',
  '...##########...', '....########....', '.....AAAAAA.....',
  '....######AA....', '...#######.AA...', '...########.....',
  '..##########....', '...########.....', '...###..###.....',
];
const BIRD = ['...#......', '..###.....', '.#####....', '####E###..', '..#####...', '...###....', '....#.....'];

export default class Journey extends Scene {
  layer = new Layer2D();
  get c() { return this.layer.ctx; }
  get chapter() { return this.ctx.params.chapter as number; }

  override async init() {
    await document.fonts.load('400 32px "Noto Sans SC"', STORY.map(s => s.cn).join(''));
  }

  line(points: Point[], color = BONE, alpha = 0.2, width = 1) {
    const c = this.c;
    c.save(); c.globalAlpha *= alpha; c.strokeStyle = color; c.lineWidth = width;
    c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.restore();
  }
  circle(x: number, y: number, r: number, color: string, alpha = 1, width = 1) {
    const c = this.c; c.save(); c.globalAlpha *= alpha; c.strokeStyle = color; c.lineWidth = width;
    c.beginPath(); c.arc(x, y, Math.max(.1, r), 0, TAU); c.stroke(); c.restore();
  }
  glow(x: number, y: number, radius: number, alpha = .3, color = '255,105,44') {
    const c = this.c; c.save(); c.globalAlpha *= alpha;
    const g = c.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `rgba(${color},.65)`); g.addColorStop(.2, `rgba(${color},.18)`); g.addColorStop(1, `rgba(${color},0)`);
    c.fillStyle = g; c.fillRect(x - radius, y - radius, 2 * radius, 2 * radius); c.restore();
  }
  mono(text: string, x: number, y: number, size = 15, alpha = .5, color = BONE) {
    const c = this.c; c.save(); c.globalAlpha *= alpha; c.fillStyle = color;
    c.font = font(F.mono(), size); c.fillText(text, x, y); c.restore();
  }
  sprite(x: number, y: number, size: number, t: number, opts: { alpha?: number; scatter?: number; rotation?: number; flip?: boolean; bird?: boolean; rest?: boolean } = {}) {
    const c = this.c, shape = opts.bird ? BIRD : RABBIT, scatter = opts.scatter ?? 0;
    c.save(); c.translate(x, y); c.rotate(opts.rotation ?? 0); c.scale(opts.flip ? -1 : 1, 1); c.globalAlpha *= opts.alpha ?? 1;
    const bob = opts.rest ? Math.sin(t * 1.6) * 1.7 : Math.sin(t * 4) * 1.3;
    shape.forEach((row, ry) => [...row].forEach((ch, rx) => {
      if (ch === '.') return;
      const seed = ry * 17 + rx;
      const dx = (random(seed) - .5) * 1000 * scatter, dy = (random(seed + 130) - .5) * 750 * scatter;
      c.globalAlpha = (opts.alpha ?? 1) * (1 - scatter * .6);
      c.fillStyle = ch === 'A' ? ORANGE : ch === 'P' ? '#b4a394' : ch === 'E' ? INK : BONE;
      const foot = ry > 15 && !opts.rest ? Math.sin(t * 9 + (rx < 7 ? 0 : Math.PI)) * 2 : 0;
      c.fillRect((rx - shape[0]!.length / 2) * size + dx, (ry - shape.length) * size + dy + bob + foot, size - .35, size - .35);
    })); c.restore();
  }
  spark(x: number, y: number, t: number, r = 5) {
    this.glow(x, y, 85, .75);
    const c = this.c; c.fillStyle = GOLD; c.fillRect(x - r / 2, y - r / 2, r, r);
    this.line([[x - 18, y], [x + 18, y]], GOLD, .55, 1);
    this.line([[x, y - 18], [x, y + 18]], GOLD, .55, 1);
    this.circle(x, y, 14 + Math.sin(t * 3) * 3, ORANGE, .4);
  }
  grid(t: number, strength = .12, tilt = 0) {
    const c = this.c; c.save(); c.translate(960, 540); c.rotate(tilt); c.translate(-960, -540);
    const shift = (t * 10) % 90;
    for (let x = -400; x < 2400; x += 90) this.line([[x + shift, -500], [x + shift, 1600]], BONE, strength, .65);
    for (let y = -500; y < 1600; y += 90) this.line([[-400, y + shift], [2400, y + shift]], BONE, strength, .65);
    c.restore();
  }
  floor(t: number, horizon = 600, intensity = .18) {
    const vx = 1250 + Math.sin(t * .14) * 80;
    this.line([[0, horizon], [1920, horizon]], ORANGE, intensity);
    for (let i = -12; i <= 12; i++) this.line([[vx + i * 15, horizon], [vx + i * 330, 1220]], BONE, intensity, .8);
    for (let i = 0; i < 18; i++) {
      const k = ((i + t * .65) % 18) / 18;
      const y = horizon + k * k * 640;
      this.line([[0, y], [1920, y]], BONE, intensity, .8);
    }
  }
  particles(t: number, amount = 70, dawn = false) {
    const c = this.c;
    for (let i = 0; i < amount; i++) {
      const x = random(i + 50) * 1920;
      const y = ((random(i + 93) * 1080 - t * (8 + random(i + 7) * 17)) % 1080 + 1080) % 1080;
      c.globalAlpha = .1 + random(i + 99) * .35;
      c.fillStyle = i % 4 === 0 || dawn ? GOLD : BONE;
      const s = 1 + random(i + 300) * 3;
      c.fillRect(x, y, s, s);
    } c.globalAlpha = 1;
  }
  title(f: Frame, x = 130, y = 350, size = 150, angle = 0) {
    const s = STORY[this.chapter]!, c = this.c;
    c.save(); c.translate(x, y); c.rotate(angle);
    [s.top, s.bottom].forEach((text, i) => {
      const k = smooth((f.lt - .35 - i * .3) / .8);
      c.save(); c.globalAlpha = k; c.translate(0, (1 - k) * 65);
      c.font = font(F.archivo(87.5, 900), size); c.fillStyle = i ? ORANGE : BONE;
      c.fillText(text, 0, i * size * .95); c.restore();
    });
    this.mono(s.note, 3, size * 1.45, 15, .6 * smooth(f.lt - 1.1));
    c.restore();
  }
  frame(f: Frame) {
    const c = this.c, s = STORY[this.chapter]!;
    this.mono('STILL BECOMING', 74, 65, 17, .72);
    this.mono(`${String(this.chapter + 1).padStart(2, '0')} / 09`, 1730, 65, 17, .65);
    this.line([[74, 83], [1846, 83]], BONE, .16);
    for (const [x, y, a, b] of [[42, 42, 1, 1], [1878, 42, -1, 1], [42, 1038, 1, -1], [1878, 1038, -1, -1]]) {
      this.line([[x! + a! * 20, y!], [x!, y!], [x!, y! + b! * 20]], BONE, .5);
    }
    c.save(); c.textAlign = 'center'; c.fillStyle = BONE; c.globalAlpha = smooth((f.lt - .5) / .6);
    c.font = '400 29px "Noto Sans SC", sans-serif'; c.fillText(s.cn, 960, 985); c.restore();
    this.line([[74, 1020], [1846, 1020]], BONE, .14);
    this.line([[74, 1020], [74 + 1772 * f.t / 72, 1020]], ORANGE, .85, 2);
  }

  opening(f: Frame) {
    const c = this.c, k = smooth(f.lt / 3.5);
    this.grid(f.t, .055, -.035); this.glow(1380, 560, 630, .38);
    c.save(); c.translate(1370, 550); c.rotate(-.17 + f.lt * .025);
    for (let r = 0; r < 5; r++) {
      const R = 190 + r * 60;
      this.circle(0, 0, R, BONE, .12 - r * .012);
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8; this.line([[Math.cos(a) * R, Math.sin(a) * R], [Math.cos(a) * (R + 8), Math.sin(a) * (R + 8)]], ORANGE, .35); }
    } c.restore();
    this.sprite(1370, 685, 13.5, f.t, { scatter: (1 - k) * .75, rest: true });
    this.spark(1395, 580, f.t, 6); this.title(f, 132, 405, 142);
    this.mono('SUBJECT 01 / A LIFE IN PROGRESS', 1185, 835, 15, .55);
    this.line([[1370, 715], [1370, 790]], ORANGE, .5);
  }
  obstacles(f: Frame) {
    const c = this.c;
    this.grid(f.t * 3, .08, -.095); this.title(f, 130, 325, 145, -.04);
    const base = 775, phase = (f.lt % 2) / 2;
    // Three attempts end before the closed door. Ghosts preserve the effort, not a score.
    for (let i = 0; i < 4; i++) {
      const x = 700 + i * 260;
      c.save(); c.translate(x, base - i * 22); c.rotate(-.09);
      this.line([[0, 0], [0, -310], [175, -310], [175, 0]], BONE, .22, 2);
      this.line([[12, -12], [12, -298], [163, -298], [163, -12]], ORANGE, .15);
      this.mono(['NOT YET', 'NOT HERE', 'TRY AGAIN', '...'][i]!, 25, -330, 16, .55);
      this.line([[70, -180], [110, -140]], ORANGE, .6, 3); this.line([[110, -180], [70, -140]], ORANGE, .6, 3); c.restore();
    }
    this.line([[100, base + 35], [1850, base - 115]], BONE, .3);
    const x = 350 + 260 * Math.sin(phase * Math.PI) ** 2;
    for (let i = 3; i > 0; i--) this.sprite(x - i * 72, base + 8, 9, f.t - i * .12, { alpha: .06 * (4 - i) });
    this.sprite(x, base - 12 - Math.sin(phase * TAU) * 15, 10, f.t);
    this.mono('EFFORT IS STILL REAL, EVEN WHEN THE DOOR STAYS CLOSED.', 125, 890, 16, .5);
  }
  falling(f: Frame) {
    const c = this.c;
    c.save(); c.translate(1230, 545); c.rotate(-.12 - f.lt * .07);
    for (let i = 0; i < 24; i++) {
      const p = ((i / 24 + f.lt * .08) % 1), r = 70 + p * p * 950;
      const cut = 1 - smooth((f.lt - 5) / 3);
      this.line([[-r, -r * .62], [r, -r * .62], [r, r * .62], [-r, r * .62], [-r, -r * .62]], i % 5 === 0 ? ORANGE : BONE, (.05 + p * .22) * cut, 1);
    } c.restore();
    this.title(f, 120, 335, 140);
    const y = 440 + f.lt * 35;
    for (let i = 0; i < 25; i++) {
      const a = i * 2.4, r = 60 + f.lt * 22 + random(i) * 190;
      c.fillStyle = i % 4 ? '#5e5b57' : ORANGE; c.globalAlpha = .4 * (1 - f.p);
      c.fillRect(1290 + Math.cos(a) * r, y + Math.sin(a) * r - f.lt * 10, 7, 7);
    } c.globalAlpha = 1;
    this.sprite(1290, y, 10 - f.p * 2, f.t, { rotation: .12 + .2 * Math.sin(f.lt), rest: true });
    this.glow(1290, y - 90, 210, .18);
  }
  resting(f: Frame) {
    this.grid(f.t, .025); const breath = (1 - Math.cos(f.lt * TAU / 5)) / 2;
    this.glow(1260, 660, 260 + breath * 160, .22 + breath * .22);
    for (let i = 0; i < 4; i++) {
      this.c.save(); this.c.translate(1260, 760); this.c.scale(1, .24);
      this.circle(0, 0, 160 + i * 75 + breath * 25, i === 0 ? ORANGE : BONE, .16 - i * .025); this.c.restore();
    }
    this.sprite(1260, 740, 10 + breath * .16, f.t, { rest: true }); this.spark(1277, 661, f.t, 4);
    this.title(f, 150, 425, 122);
    this.mono('BREATHE IN', 1120, 868, 14, .35 + breath * .35);
    this.mono('BREATHE OUT', 1285, 868, 14, .7 - breath * .35);
  }
  recognition(f: Frame) {
    const c = this.c; this.grid(f.t, .065, .02);
    this.glow(1310, 570, 520, .4);
    // Broken orbital contours find alignment as the rabbit reforms.
    const settle = smooth((f.lt - .5) / 4);
    for (let i = 0; i < 18; i++) {
      const a = i * TAU / 18 + (1 - settle) * f.lt * .22;
      const r = 240 + (1 - settle) * (100 + random(i) * 190);
      c.save(); c.translate(1310 + Math.cos(a) * r, 535 + Math.sin(a) * r);
      c.rotate(a + Math.PI / 2 + (1 - settle) * i);
      this.line([[-25, 0], [25, 0]], i % 3 ? BONE : ORANGE, .45, 2);
      this.line([[-25, -8], [-25, 8]], BONE, .2); c.restore();
    }
    this.sprite(1310, 690, 13, f.t, { scatter: (1 - settle) * .45, rest: true });
    this.title(f, 135, 420, 176); this.mono('RECOGNITION, NOT REINVENTION.', 1100, 855, 14, .6);
    this.line([[1310, 740], [1310, 810]], ORANGE, .6);
  }
  mending(f: Frame) {
    this.floor(f.t, 545, .13); this.title(f, 125, 315, 139, -.025);
    const c = this.c;
    const points: Point[] = [];
    for (let i = 0; i < 18; i++) {
      const k = smooth((f.lt - i * .24) / 1.1), x = 490 + i * 66, y = 825 - i * 13;
      const bx = x + (1 - k) * (random(i + 22) - .5) * 500;
      const by = y + (1 - k) * (250 + random(i + 61) * 140);
      c.fillStyle = i < 6 ? '#4c3024' : '#30261f'; c.globalAlpha = .2 + .8 * k;
      c.fillRect(bx, by, 58, 16); c.globalAlpha = 1;
      this.line([[bx, by], [bx + 58, by]], GOLD, .8 * k, 2);
      points.push([x + 29, y - 8]);
      if (k > .8 && i % 3 === 0) this.line([[x + 58, y - 3], [x + 68, y - 16]], ORANGE, .75, 2);
    }
    const travel = smooth((f.lt - 1) / 6), x = 500 + 920 * travel, y = 810 - 180 * travel;
    this.sprite(x, y - Math.abs(Math.sin(f.lt * Math.PI)) * 36, 9.5, f.t);
    this.spark(x + 70, y - 12, f.t, 4);
    this.mono('A WALK. A MEAL. A SMALL PROMISE KEPT.', 120, 905, 16, .55);
  }
  ownPath(f: Frame) {
    const c = this.c; this.grid(f.t, .06, -.1); this.title(f, 125, 340, 158, -.04);
    // Old prescribed route fades into a chosen orange curve.
    this.line([[180, 830], [780, 830], [780, 560], [1840, 560]], BONE, .13, 2);
    this.mono('THE OLD MAP', 1460, 536, 13, .25);
    const path: Point[] = [];
    for (let i = 0; i <= 120; i++) { const p = i / 120; path.push([220 + p * 1520, 850 - p * p * 420 + Math.sin(p * TAU) * 45]); }
    this.line(path, ORANGE, .18, 1);
    const progress = .08 + .87 * smooth(f.p), limit = Math.floor(progress * 120);
    this.line(path.slice(0, limit + 1), GOLD, .9, 3);
    const [x, y] = path[limit]!;
    for (let i = 0; i < limit; i += 8) { const [px, py] = path[i]!; c.fillStyle = '#5d4634'; c.fillRect(px - 3, py + 8, 7, 3); }
    this.sprite(x, y - 10 - Math.abs(Math.sin(f.lt * 3.6)) * 38, 9.8, f.t);
    this.spark(x + 16, y, f.t, 5);
    this.sprite(x + 180, y - 180 + Math.sin(f.lt * 2) * 30, 6, f.t, { bird: true });
    this.mono('COMPANY, WITHOUT LOSING DIRECTION.', 120, 915, 15, .5);
  }
  growing(f: Frame) {
    const c = this.c; this.floor(f.t, 610, .12); this.glow(1430, 490, 650, .65, '255,166,76');
    for (let i = 0; i < 28; i++) {
      const x = 730 + random(i + 45) * 1110, y = 680 + random(i + 99) * 205;
      const growth = smooth((f.lt - random(i + 11) * 3) / 3), h = (50 + random(i + 40) * 155) * growth;
      const s = 7 + random(i + 49) * 4;
      this.line([[x, y], [x, y - h]], '#a29677', .45, 2);
      for (let j = 0; j < 3; j++) {
        c.fillStyle = i % 3 ? '#b4ab8f' : GOLD; c.globalAlpha = growth * .55;
        c.fillRect(x + (j % 2 ? -s : 0), y - h * (.35 + j * .17), s, s);
      }
      c.fillStyle = i % 4 ? ORANGE : BONE; c.globalAlpha = growth * .75;
      c.fillRect(x - s / 2, y - h - s, s, s); c.fillRect(x - s * 1.5, y - h, s * 3, s); c.fillRect(x - s / 2, y - h + s, s, s);
    } c.globalAlpha = 1;
    this.title(f, 125, 350, 145); this.sprite(1190 + f.lt * 29, 810 - Math.abs(Math.sin(f.lt * 3)) * 24, 10, f.t);
    for (let i = 0; i < 3; i++) this.sprite(1090 + i * 200 + f.lt * 16, 450 + Math.sin(f.lt * 2 + i) * 60, 4 + i, f.t, { bird: true, alpha: .4 + i * .2 });
    this.mono('GROWTH DOES NOT HAVE TO BE LOUD.', 125, 900, 15, .6);
  }
  sunrise(f: Frame) {
    const c = this.c; const k = smooth(f.lt / 5);
    this.glow(1330, 585, 1000, .6 + k * .5, '255,172,90'); this.floor(f.t, 680, .12);
    for (let r = 0; r < 6; r++) {
      this.circle(1350, 570, 90 + r * 39 + k * 15, r % 2 ? GOLD : BONE, .1 + k * .08, 1);
    }
    const gradient = c.createLinearGradient(1220, 390, 1430, 690); gradient.addColorStop(0, '#ffe6b9'); gradient.addColorStop(1, '#f87935');
    c.fillStyle = gradient;
    // A pixel sun resolves out of the same fragments that once scattered.
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (x * x + y * y < 38) {
      c.globalAlpha = k * .85; c.fillRect(1350 + x * 14, 570 + y * 14, 12, 12);
    } c.globalAlpha = 1;
    const path: Point[] = [[550, 905], [800, 848], [1070, 773], [1310, 698]];
    this.line(path, GOLD, .65, 2);
    const walk = smooth(f.lt / 7), x = lerp(840, 1240, walk), y = lerp(836, 721, walk), size = lerp(10, 6.5, walk);
    this.sprite(x, y, size, f.t);
    this.title(f, 125, 375, 140);
    if (f.lt > 5) { c.save(); c.globalAlpha = smooth(f.lt - 5); c.font = font(F.serif(400, true), 38); c.fillStyle = BONE; c.fillText('And this time, I take myself with me.', 130, 735); c.restore(); }
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    this.layer.clear(INK);
    [this.opening, this.obstacles, this.falling, this.resting, this.recognition, this.mending, this.ownPath, this.growing, this.sunrise][this.chapter]!.call(this, f);
    this.particles(f.t, this.chapter === 3 ? 18 : 65, this.chapter > 6);
    this.frame(f);
    const { renderer, comp } = this.ctx;
    clearRT(renderer, out); comp.draw(renderer, this.layer.upload(), out);
    return { bloom: .48, bloomThreshold: .72, halation: .22, grain: .027, vignette: .2, ca: .4, hud: 0,
      fade: this.chapter === 0 ? 1 - smooth(f.lt / .6) : this.chapter === 8 ? smooth((f.lt - 7.5) / .5) : 0 };
  }
  override dispose() { this.layer.texture.dispose(); }
}
