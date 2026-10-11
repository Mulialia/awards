import React from 'react';
import {AbsoluteFill} from 'remotion';
import {theme} from '../styles/theme';
import {WIDTH, HEIGHT} from '../utils/timing';
import {CITIES, DOTS, EDGES, INBOUND, MAP_ASPECT, uv} from '../utils/africa';
import {easeInOut, easeOut, lerp, prog} from '../utils/motion';

/**
 * The continuous world behind every scene.
 *
 * `frame` is the ABSOLUTE position in the category sequence, so the continent, network and
 * light keep evolving seamlessly across nominee boundaries (no per-scene restarts).
 *   0–100   scattered points ("ideas") converge into a dot-matrix continent
 *   70–140  hubs connect; knowledge & capital arc in from beyond the continent
 *   150+    the continent recedes to a calm, slowly-moving backdrop behind the nominee
 */
export const BackgroundAtmosphere: React.FC<{frame: number}> = ({frame}) => {
  const c = theme.colors;

  // Slow "camera": gentle push-in and parallax drift over the whole category
  const H = 1010 * (1 + 0.00004 * frame);
  const W = H * MAP_ASPECT;
  const cx = 1330 - 0.012 * frame;
  const cy = 548;
  const ox = cx - W / 2;
  const oy = cy - H / 2;
  const X = (u: number) => ox + u * W;
  const Y = (v: number) => oy + v * H;

  const settle = prog(frame, 100, 156, easeInOut); // intro emphasis → nominee calm
  const dotAlpha = lerp(0.7, 0.44, settle);
  const lineAlpha = lerp(0.62, 0.4, settle);

  const quad = (x0: number, y0: number, x1: number, y1: number, bow: number) => {
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    return `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${(mx - (dy / len) * len * bow).toFixed(1)} ${(my + (dx / len) * len * bow).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };

  // Periodic pulse: travels for 42 % of the period, then rests (deterministic from frame)
  const pulse = (start: number, period: number) => {
    const t = ((frame - start) % period + period) % period;
    return frame < start ? -1 : Math.min(1.12, t / (period * 0.42));
  };

  // Soft light band crossing the frame every ~12 s
  const sweepT = (frame % 380) / 380;
  const sweepX = lerp(-0.5, 1.4, easeInOut(sweepT)) * WIDTH;

  return (
    <AbsoluteFill style={{backgroundColor: c.obsidian}}>
      {/* base depth */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(1400px 900px at 28% 56%, #17130A 0%, rgba(13,13,18,0) 62%), radial-gradient(1600px 1000px at 78% 40%, #0E0E14 0%, rgba(7,7,10,0) 70%), ${c.obsidian}`,
        }}
      />
      {/* warm lamp behind the portrait zone */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(520px 640px at 420px 560px, rgba(238,185,43,${lerp(0.05, 0.16, settle).toFixed(3)}), rgba(238,185,43,0) 70%)`,
        }}
      />

      {/* fine architectural column grid */}
      <svg width={WIDTH} height={HEIGHT} style={{position: 'absolute', inset: 0}}>
        {Array.from({length: 13}, (_, i) => {
          const x = theme.safe.x + (i * (WIDTH - theme.safe.x * 2)) / 12;
          return <line key={i} x1={x} y1={0} x2={x} y2={HEIGHT} stroke={c.ivory} strokeOpacity={0.028} strokeWidth={1} />;
        })}
      </svg>

      {/* continent + network */}
      <svg width={WIDTH} height={HEIGHT} style={{position: 'absolute', inset: 0}}>
        {/* ideas → continent */}
        {DOTS.map((d, i) => {
          const local = Math.min(1, Math.max(0, (frame - 22 - d.rank * 50) / 46));
          const e = easeOut(local);
          const tx = X(d.u);
          const ty = Y(d.v);
          const sx = cx + (d.r1 - 0.5) * 3000;
          const sy = cy + (d.r2 - 0.5) * 1900;
          const arc = Math.sin(Math.PI * e) * (d.r3 - 0.5) * 220 * (1 - e * 0.2);
          const x = lerp(sx, tx, e) + arc;
          const y = lerp(sy, ty, e) - arc * 0.6;
          const tw = 0.82 + 0.18 * Math.sin(frame * 0.045 + d.r3 * 6.28);
          const settled = e >= 1;
          const a = (settled ? 1 : Math.min(1, local * 2.2)) * dotAlpha * tw * (0.7 + d.r1 * 0.3);
          if (frame < 22) return null;
          return <circle key={i} cx={x} cy={y} r={settled ? 3.5 : 2.4 + (1 - e) * 1.6} fill={c.gold} fillOpacity={a} />;
        })}

        {/* inbound knowledge & capital */}
        {INBOUND.map((e, i) => {
          const to = uv(e.to);
          const path = quad(X(e.from[0]), Y(e.from[1]), X(to.u), Y(to.v), e.bow);
          const draw = prog(frame, 60 + e.delay, 60 + e.delay + 44, easeInOut);
          const p = pulse(130 + e.delay * 2.2, 190);
          return (
            <g key={`in${i}`}>
              <path d={path} pathLength={1} fill="none" stroke={c.gold} strokeOpacity={0.5 * lineAlpha} strokeWidth={1.4} strokeDasharray={`${draw} 2`} />
              {p >= -0.2 && draw >= 1 && (
                <path d={path} pathLength={1} fill="none" stroke={c.goldLight} strokeOpacity={0.95} strokeWidth={2.6} strokeLinecap="round" strokeDasharray="0.07 3" strokeDashoffset={-(p * 1.07 - 0.07)} />
              )}
            </g>
          );
        })}

        {/* continental network */}
        {EDGES.map((e, i) => {
          const a = uv(e.a);
          const b = uv(e.b);
          const path = quad(X(a.u), Y(a.v), X(b.u), Y(b.v), e.bow);
          const draw = prog(frame, 72 + e.delay * 0.8, 72 + e.delay * 0.8 + 38, easeInOut);
          const p = pulse(150 + e.delay * 3.1, 160 + (i % 5) * 14);
          return (
            <g key={`ed${i}`}>
              <path d={path} pathLength={1} fill="none" stroke={c.goldLight} strokeOpacity={0.55 * lineAlpha} strokeWidth={1.3} strokeDasharray={`${draw} 2`} />
              {draw >= 1 && p >= -0.2 && (
                <path d={path} pathLength={1} fill="none" stroke={c.goldLight} strokeOpacity={0.9} strokeWidth={2.4} strokeLinecap="round" strokeDasharray="0.06 3" strokeDashoffset={-(p * 1.06 - 0.06)} />
              )}
            </g>
          );
        })}

        {/* hubs */}
        {CITIES.map((n, i) => {
          const on = prog(frame, 60 + i * 3, 78 + i * 3);
          const ringT = (((frame - i * 11) % 110) + 110) % 110 / 110;
          return (
            <g key={n.id} opacity={on}>
              <circle cx={X(n.u)} cy={Y(n.v)} r={4.6} fill={c.goldLight} fillOpacity={lerp(1, 0.78, settle)} />
              <circle cx={X(n.u)} cy={Y(n.v)} r={4.6 + ringT * 26} fill="none" stroke={c.gold} strokeOpacity={(1 - ringT) * 0.5 * lineAlpha} strokeWidth={1.4} />
            </g>
          );
        })}
      </svg>

      {/* travelling light band */}
      <AbsoluteFill
        style={{
          transform: `translateX(${sweepX}px) skewX(-18deg)`,
          width: 340,
          background: 'linear-gradient(90deg, rgba(248,218,122,0), rgba(248,218,122,0.05), rgba(248,218,122,0))',
          mixBlendMode: 'screen',
        }}
      />

      {/* legibility scrim behind the text column, then cinematic vignette */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 560px at 1290px 560px, rgba(7,7,10,${lerp(0, 0.5, settle).toFixed(3)}), rgba(7,7,10,0) 72%)`,
        }}
      />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.7) 100%)'}} />
    </AbsoluteFill>
  );
};
