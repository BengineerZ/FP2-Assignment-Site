import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

/**
 * FlowChart
 *
 * - Closely follows the "benoriginal" approach:
 *   - forceX, forceY with moderate .strength(0.05)
 *   - forceCollide to prevent overlaps
 *   - No heavy 'charge' or complicated damping
 *   - We do set a small velocityDecay/alphaDecay to let the cluster settle.
 * - Key fix: we only pass "alive" bubbles to the force simulation, so bubbles
 *   that have faded out do not keep re-heating the system or swirling around.
 * - That way, it will eventually settle into a stable cluster with minimal orbiting.
 */

function FlowChart({ csvUrl = "/boston_residential_sales_dummy.csv" }) {
  // ---------------------------------------------
  // 1) Config & Constants
  // ---------------------------------------------
  const BUBBLE_VALUE = 20000;    // each bubble ~ 20k
  const LIFE_SPAN_YEARS = 1.0;   // each bubble lives ~1 year in slider time
  const FADE_PORTION = 0.1;      // fraction for fade in / out
  const BUBBLE_RADIUS = 8;       // radius in px
  const COLLISION_RADIUS = 12;   // radius + a bit of padding

  // Clusters: x=650, y=150 for non-investor, y=450 for investor
  function clusterX(d) {
    return 650;
  }
  function clusterY(d) {
    return d.type === 'investor' ? 450 : 150;
  }

  // ---------------------------------------------
  // 2) State for CSV data, time, bubble list
  // ---------------------------------------------
  const [csvData, setCsvData] = useState([]);
  const [minYear, setMinYear] = useState(undefined);
  const [maxYear, setMaxYear] = useState(undefined);
  const [currentTime, setCurrentTime] = useState(undefined);

  // Master list of all bubbles that were ever created
  const [bubbles, setBubbles] = useState([]);

  // The D3 force simulation reference
  const simulationRef = useRef(null);

  // ---------------------------------------------
  // 3) Load CSV
  // ---------------------------------------------
  useEffect(() => {
    d3.csv(csvUrl).then((raw) => {
      const data = raw.map(d => ({
        year: +d.year,
        investor: +d['total investor profit'],
        noninvestor: +d['noninvestor profit']
      })).sort((a, b) => a.year - b.year);

      setCsvData(data);
      const years = data.map(d => d.year);
      setMinYear(d3.min(years));
      setMaxYear(d3.max(years));
      setCurrentTime(d3.min(years));
    });
  }, [csvUrl]);

  // ---------------------------------------------
  // 4) Interpolation
  // ---------------------------------------------
  function lerp(x0, y0, x1, y1, t) {
    if (x1 === x0) return y0;
    const alpha = (t - x0) / (x1 - x0);
    return y0 + alpha * (y1 - y0);
  }

  function getInterpolatedProfits(t) {
    if (!csvData.length) return { inv: 0, noninv: 0 };

    const earliestYear = csvData[0].year;
    if (t <= earliestYear) {
      return { inv: 0, noninv: 0 };
    }
    const latestYear = csvData[csvData.length - 1].year;
    if (t >= latestYear) {
      const last = csvData[csvData.length - 1];
      return { inv: last.investor, noninv: last.noninvestor };
    }

    let i1 = 0;
    for (let i = 0; i < csvData.length - 1; i++) {
      if (csvData[i].year <= t && t <= csvData[i + 1].year) {
        i1 = i;
        break;
      }
    }
    const d0 = csvData[i1];
    const d1 = csvData[i1 + 1];

    return {
      inv: lerp(d0.year, d0.investor, d1.year, d1.investor, t),
      noninv: lerp(d0.year, d0.noninvestor, d1.year, d1.noninvestor, t)
    };
  }

  // ---------------------------------------------
  // 5) On currentTime changes => spawn new bubbles
  // ---------------------------------------------
  useEffect(() => {
    if (!csvData.length || currentTime == null) return;

    const { inv, noninv } = getInterpolatedProfits(currentTime);
    const invCount = Math.floor(inv / BUBBLE_VALUE);
    const noninvCount = Math.floor(noninv / BUBBLE_VALUE);

    setBubbles((prev) => {
      const newBubs = [...prev];

      // Check if bubble is "alive" for this time
      const isAlive = (b) => {
        const age = currentTime - b.birthTime;
        return age >= 0 && age <= LIFE_SPAN_YEARS;
      };

      // Count how many investor & noninvestor are alive
      const invAlive = newBubs.filter(b => b.type === 'investor' && isAlive(b)).length;
      const nonInvAlive = newBubs.filter(b => b.type === 'noninvestor' && isAlive(b)).length;

      // Add any missing investor
      const addInv = invCount - invAlive;
      for (let i = 0; i < addInv; i++) {
        newBubs.push(createBubble('investor', currentTime));
      }
      // Add any missing noninvestor
      const addNonInv = noninvCount - nonInvAlive;
      for (let i = 0; i < addNonInv; i++) {
        newBubs.push(createBubble('noninvestor', currentTime));
      }

      return newBubs;
    });
  }, [currentTime, csvData]);

  // Bubble creation => place at (150, 400)
  function createBubble(type, birthTime) {
    return {
      id: Math.random().toString(36).substr(2, 9),
      type,
      birthTime,
      x: 150,
      y: 400
    };
  }

  // ---------------------------------------------
  // 6) Initialize the force simulation (like benoriginal, but with mild damping)
  // ---------------------------------------------
  useEffect(() => {
    // “benoriginal” has x,y forces with .strength(0.05) and a collision.
    // We'll add a small alphaDecay or velocityDecay so they eventually settle.
    const sim = d3.forceSimulation()
      .force('x', d3.forceX(clusterX).strength(0.05))
      .force('y', d3.forceY(clusterY).strength(0.05))
      .force('collision', d3.forceCollide(COLLISION_RADIUS))
      // Minimally damp so they settle eventually:
      .velocityDecay(0.2)     // or 0.2 -> 0.3 is usually enough to calm them
      .alphaDecay(0.02)       // let them cool off a bit
      .alphaMin(0.001)        // eventually will stop "ticking"
      .on('tick', () => {
        // We'll update positions in state so the circles re-render
        setBubbles(b => [...b]);
      });

    simulationRef.current = sim;
    return () => sim.stop();
  }, []);

  // ---------------------------------------------
  // 7) On each bubble-list change => pass only ALIVE bubbles to sim
  // ---------------------------------------------
  useEffect(() => {
    if (!simulationRef.current) return;
    const sim = simulationRef.current;

    // Filter out "dead" bubbles so they no longer affect the sim
    const aliveBubbles = bubbles.filter(b => getOpacity(b) > 0);

    // If any bubble has no x,y yet, set it to (150,400)
    aliveBubbles.forEach(b => {
      if (b.x == null || b.y == null) {
        b.x = 150;
        b.y = 400;
      }
    });

    // Update the simulation with ONLY alive nodes
    sim.nodes(aliveBubbles);

    // If we have new alive bubbles, re-heat the simulation
    // (Comparing # of alive vs. old might be used, but simpler to just do it.)
    sim.alpha(0.8).restart();
  }, [bubbles]);

  // ---------------------------------------------
  // 8) Opacity for fade in/out
  // ---------------------------------------------
  function getOpacity(b) {
    if (currentTime == null) return 0;
    const age = currentTime - b.birthTime;
    if (age < 0 || age > LIFE_SPAN_YEARS) return 0;

    const fadeInEnd = LIFE_SPAN_YEARS * FADE_PORTION;
    const fadeOutStart = LIFE_SPAN_YEARS * (1 - FADE_PORTION);

    if (age < fadeInEnd) {
      return age / fadeInEnd;        // fade in 0 -> 1
    } else if (age > fadeOutStart) {
      // fade out 1 -> 0
      const remain = LIFE_SPAN_YEARS - fadeOutStart;
      return 1 - (age - fadeOutStart) / remain;
    } else {
      return 1;
    }
  }

  // ---------------------------------------------
  // 9) Summaries
  // ---------------------------------------------
  const invVisible = bubbles.filter(b => b.type === 'investor' && getOpacity(b) > 0);
  const nonInvVisible = bubbles.filter(b => b.type === 'noninvestor' && getOpacity(b) > 0);
  const invProfit = invVisible.length * BUBBLE_VALUE;
  const nonInvProfit = nonInvVisible.length * BUBBLE_VALUE;

  // ---------------------------------------------
  // 10) Render
  // ---------------------------------------------
  if (!csvData.length || minYear == null || maxYear == null || currentTime == null) {
    return <div>Loading CSV data or initializing...</div>;
  }

  return (
    <div>
      <h2>FlowChart Demo (ben-like with stable cluster)</h2>

      {/* Slider */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="range"
          min={minYear}
          max={maxYear}
          step={0.01}
          value={currentTime}
          onChange={(e) => setCurrentTime(+e.target.value)}
          style={{ width: '400px' }}
        />
        <span style={{ marginLeft: '0.5rem' }}>
          Year: {currentTime.toFixed(2)}
        </span>
      </div>

      {/* Summary */}
      <div style={{ marginBottom: '1rem' }}>
        <div>Investor bubbles: {invVisible.length} (Profit: ${invProfit.toLocaleString()})</div>
        <div>Non-investor bubbles: {nonInvVisible.length} (Profit: ${nonInvProfit.toLocaleString()})</div>
        <div>Total Visible Profit: {(invProfit + nonInvProfit).toLocaleString()}</div>
      </div>

      {/* SVG */}
      <svg width={800} height={600} style={{ border: '1px solid #ccc' }}>
        {bubbles.map((b) => {
          const op = getOpacity(b);
          if (op <= 0) return null;
          return (
            <circle
              key={b.id}
              cx={b.x}
              cy={b.y}
              r={BUBBLE_RADIUS}
              fill={b.type === 'investor' ? 'blue' : 'green'}
              opacity={op}
            />
          );
        })}
      </svg>
    </div>
  );
}

export default FlowChart;
