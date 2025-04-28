import { useEffect, useRef } from 'react';
import { interpolate }       from 'd3-interpolate';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**  FancyScale
 *   -----------
 *   Animates the decorative SVG balance scale.
 *
 *   Props
 *   -----
 *   ratio     Number   corporate / baseline   (1  → level, >1 → left heavy)
 *   duration  Number   tween time in ms       (default 600)
 */
export default function FancyScale({ ratio = 1, duration = 600 }) {
  /* refs to the parts we animate                                  */
  const beam  = useRef(null);
  const left  = useRef(null);
  const right = useRef(null);
  const last  = useRef(ratio);

  useEffect(() => {
    /* ---------- map ratio → limited angle (±25°) ---------- */
    const from = clamp((last.current - 1) * 25, -25, 25);
    const to   = clamp((ratio        - 1) * 25, -25, 25);
    last.current = ratio;

    const lerp = interpolate(from, to);
    const ease = t => 1 - Math.pow(1 - t, 3);   // cubic-out
    const t0   = performance.now();

    function frame(t) {
      const p   = Math.min(1, (t - t0) / duration);
      const ang = clamp((lerp(ease(p)))*2.5+12, -40, 40);

      /* Beam pivots around the centre of the round boss (256, 71) */
      beam.current.setAttribute('transform', `rotate(${ang} 256 45)`);

      /* Each pan re-levels itself by rotating −ang around the
         *end of the beam* (left:  88,97   right: 424,97)          */
      left.current .setAttribute('transform', `rotate(${-ang}  97 97)`);
      right.current.setAttribute('transform', `rotate(${-ang} 434 17)`);

      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }, [ratio, duration]);

  /* ---------------------------- SVG ----------------------------- */
  return (
    <svg viewBox="-50 0 612 512" className="scale-svg">
      {/* column & base (static) */}
      <rect x="238.34" y="450.2" width="35.31" height="52.965" fill="#959CB3"/>
      <path d="M255.997,0.003c-4.929,0-8.976,3.897-9.162,8.823l-16.973,449.871
               c-0.189,5.002,3.816,9.161,8.821,9.161h34.628c5.006,0,9.01-4.158,8.821-9.161
               L265.159,8.826C264.974,3.9,260.926,0.003,255.997,0.003z"
            fill="#C7CFE2"/>
      <path d="M246.835,8.826l-16.973,449.871c-0.189,5.002,3.816,9.161,8.821,9.161h17.313V0.003
               C251.067,0.005,247.021,3.901,246.835,8.826z"
            fill="#AFB9D2"/>

      {/* ─────────────  moving beam  ───────────── */}
      <g ref={beam}>
      <path d="M88.265 97.105c-4.086 0-7.754-2.849-8.629-7.009
                 -1.004-4.771 2.047-9.452 6.819-10.457l335.443-70.62
                 c4.771-1.009 9.452 2.047 10.457 6.819
                 1.005 4.772-2.047 9.452-6.819 10.457L90.093 96.915
                 A9.028 9.028 0 0 1 88.265 97.105z"
              fill="#707487"/>
      

      {/* ─────────────  LEFT pan  ─────────────── */}
      <g ref={left}>
        <path d="M167.72,379.588c-3.858,0-7.396-2.548-8.495-6.444
                 L88.277,120.881L17.331,373.144
                 c-1.327,4.69-6.198,7.418-10.888,6.112
                 c-4.694-1.323-7.431-6.198-6.112-10.888
                 L79.778,85.89c1.074-3.81,4.543-6.44,8.5-6.44
                 c3.957,0,7.426,2.629,8.5,6.44l79.447,282.479
                 c1.319,4.69-1.418,9.565-6.112,10.888
                 C169.315,379.481,168.509,379.588,167.72,379.588z"
              fill="#959CB3"/>
        <path d="M167.724,379.583H8.83c-4.875,0-8.827-3.952-8.827-8.827
                 s3.952-8.827,8.827-8.827h158.894
                 c4.875,0,8.827,3.953,8.827,8.827
                 S172.6,379.583,167.724,379.583z"
              fill="#AFB9D2"/>
        <path d="M139.158,414.893H37.397c-6.687,0-12.801-3.778-15.791-9.76l-12.776-25.55
                 h158.894l-12.776,25.55C151.958,411.115,145.845,414.893,139.158,414.893z"
              fill="#C7CFE2"/>
        <text
            x="85"
            y={352}          /* sits inside the bowl */
            textAnchor="middle"
            fontSize="50"
            fontFamily="inherit"
            fill="#333"
            style={{ userSelect: 'none' }}
        >
            Own
        </text>
      </g>

      {/* ─────────────  RIGHT pan  ────────────── */}
      <g ref={right}>
        <path d="M503.163,308.968c-3.858,0-7.396-2.548-8.495-6.444
                 L423.72,50.261l-70.947,252.263
                 c-1.327,4.69-6.198,7.418-10.888,6.112
                 c-4.694-1.323-7.431-6.198-6.112-10.888
                 L415.22,15.27c1.074-3.81,4.543-6.44,8.5-6.44
                 s7.426,2.629,8.5,6.44l79.447,282.479
                 c1.319,4.69-1.418,9.565-6.112,10.888
                 C504.758,308.861,503.952,308.968,503.163,308.968z"
              fill="#959CB3"/>
        <path d="M503.167,308.964H344.273c-4.875,0-8.827-3.952-8.827-8.827
                 s3.952-8.827,8.827-8.827h158.894
                 c4.875,0,8.827,3.953,8.827,8.827
                 S508.043,308.964,503.167,308.964z"
              fill="#AFB9D2"/>
        <path d="M474.602,344.274H372.84c-6.687,0-12.801-3.778-15.791-9.76l-12.776-25.55h158.894
                 l-12.776,25.55C487.401,340.496,481.288,344.274,474.602,344.274z"
              fill="#C7CFE2"/>
        <text
            x="425"
            y={275}          /* sits inside the bowl */
            textAnchor="middle"
            fontSize="50"
            fontFamily="inherit"
            fill="#333"
            style={{ userSelect: 'none' }}
        >
            Corp
        </text>
      </g>
      </g>

      {/* decorative central pieces */}
      <circle cx="255.995" cy="52.964" r="26.482" fill="#959CB3"/>
      <circle cx="255.995" cy="52.964" r="8.827"  fill="#AFB9D2"/>
      <rect x="158.901" y="494.341" width="194.196" height="17.655" rx="8.827" fill="#C7CFE2"/>
    </svg>
  );
}
