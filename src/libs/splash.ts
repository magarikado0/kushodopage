/**
 * 朱墨を飛ばしたような小さな飛沫を散らした、繰り返し可能（タイル状）な SVG を作る。
 * サイト全体の背景画像として使う（src/pages/splash.svg.ts で書き出す）。
 *
 * - 背景画像にすると、ブラウザが一度だけ描いてキャッシュするので、スクロールしても重くならない
 * - タイルの端にかかる飛沫は反対側にも描き、つなぎ目が見えないようにする
 * - seed を固定しているので、ビルドごとに模様が変わることはない
 */
export interface SplashOptions {
  /** 飛沫の色 */
  color: string;
  /** タイルの大きさ（px） */
  width?: number;
  height?: number;
  /** 飛沫の数 */
  blots?: number;
  /** 飛沫の大きさの倍率 */
  scale?: number;
  /** 模様を決める数値 */
  seed?: number;
}

type Shape =
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'drop'; cx: number; cy: number; rx: number; ry: number; angle: number };

function random(seedValue: number) {
  let t = seedValue >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** 1つの飛沫（中心の塊・外へ伸びる筋・まわりの滴）と、その広がりの半径 */
function blot(rand: () => number, cx: number, cy: number, scale: number) {
  const shapes: Shape[] = [];
  const r = (14 + rand() * 42) * scale;
  let extent = r;
  shapes.push({ kind: 'circle', cx, cy, r });

  const streaks = 8 + Math.floor(rand() * 10);
  for (let j = 0; j < streaks; j++) {
    const angle = rand() * Math.PI * 2;
    const len = (18 + rand() * rand() * 140) * scale;
    const start = r * (0.6 + rand() * 0.3);
    const mid = start + len / 2;
    shapes.push({
      kind: 'drop',
      cx: cx + Math.cos(angle) * mid,
      cy: cy + Math.sin(angle) * mid,
      rx: len / 2,
      ry: Math.max(0.6, (1 + rand() * 3) * scale * 1.5),
      angle: (angle * 180) / Math.PI,
    });
    extent = Math.max(extent, start + len);
    if (rand() < 0.5) {
      const tip = start + len + (4 + rand() * 18) * scale;
      shapes.push({
        kind: 'circle',
        cx: cx + Math.cos(angle) * tip,
        cy: cy + Math.sin(angle) * tip,
        r: Math.max(0.6, (1.5 + rand() * 4.5) * scale * 1.5),
      });
      extent = Math.max(extent, tip + 4);
    }
  }

  const droplets = 10 + Math.floor(rand() * 14);
  for (let j = 0; j < droplets; j++) {
    const angle = rand() * Math.PI * 2;
    const dist = r * (1.2 + rand() * 5);
    shapes.push({
      kind: 'circle',
      cx: cx + Math.cos(angle) * dist,
      cy: cy + Math.sin(angle) * dist,
      r: Math.max(0.5, (0.8 + rand() * rand() * 7) * scale * 1.5),
    });
    extent = Math.max(extent, dist + 6);
  }
  return { shapes, extent };
}

const round = (n: number) => Math.round(n * 10) / 10;

function toSvg(s: Shape, dx: number, dy: number) {
  if (s.kind === 'circle') {
    return `<circle cx="${round(s.cx + dx)}" cy="${round(s.cy + dy)}" r="${round(s.r)}"/>`;
  }
  const x = round(s.cx + dx);
  const y = round(s.cy + dy);
  return `<ellipse cx="${x}" cy="${y}" rx="${round(s.rx)}" ry="${round(s.ry)}" transform="rotate(${round(s.angle)} ${x} ${y})"/>`;
}

export function splashSvg({
  color,
  width: W = 900,
  height: H = 700,
  blots = 14,
  scale = 0.24,
  seed = 11,
}: SplashOptions): string {
  const rand = random(seed);
  const parts: string[] = [];

  for (let i = 0; i < blots; i++) {
    const cx = rand() * W;
    const cy = rand() * H;
    const { shapes, extent } = blot(rand, cx, cy, scale);
    // タイルの端からはみ出す分を、反対側にも描く
    const xs = [0, ...(cx - extent < 0 ? [W] : []), ...(cx + extent > W ? [-W] : [])];
    const ys = [0, ...(cy - extent < 0 ? [H] : []), ...(cy + extent > H ? [-H] : [])];
    for (const dx of xs) for (const dy of ys) parts.push(...shapes.map((s) => toSvg(s, dx, dy)));
  }

  // 全体にうっすら散る細かい粒
  for (let i = 0; i < 90; i++) {
    parts.push(toSvg({ kind: 'circle', cx: rand() * W, cy: rand() * H, r: 0.5 + rand() * 1.6 }, 0, 0));
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><filter id="ink" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
<feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="${seed}"/>
<feDisplacementMap in="SourceGraphic" scale="4" xChannelSelector="R" yChannelSelector="G"/>
</filter></defs>
<g fill="${color}" filter="url(#ink)">${parts.join('')}</g>
</svg>`;
}
