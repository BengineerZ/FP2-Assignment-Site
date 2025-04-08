import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

/**
 * FlowChart
 *
 * - Loads "/boston_residential_sales_dummy.csv" by default.
 * - Spawns all new bubbles at (x=150, y=400) if needed.
 * - Clusters using: 
 *     forceX -> x=550, 
 *     forceY -> y=150 for non-investors, y=450 for investors,
 *     forceCollide -> prevent overlap.
 * - Adds velocityDecay(0.15) to reduce perpetual oscillation.
 * - Bubbles fade in/out over ~1 year of slider time (same logic as before).
 */

function FlowChart({ csvUrl = "/boston_residential_sales_dummy.csv" }) {
  // -----------------------------------------------------------
  // 1) Constants & Config
  // -----------------------------------------------------------
  const BUBBLE_VALUE = 5000;     
  const LIFE_SPAN_YEARS = 1.0;    
  const FADE_PORTION = 0.05;       
  const COLLISION_RADIUS = 12 ;    
  const BUBBLE_RADIUS = 10;        
  const ANIMATION_SPEED = 0.01;   // Years per animation frame (higher = faster)
  const DOLLAR_SIGN_SIZE = "20px";

  // “Cluster” for investor vs. non-investor
  function clusterX(d) {
    // Everyone clusters at x=550 (moved 100px left from 650)
    return 550;
  }
  function clusterY(d) {
    // top cluster if non-investor, bottom cluster if investor
    return d.type === 'investor' ? 450 : 150;
  }

  // -----------------------------------------------------------
  // 2) State
  // -----------------------------------------------------------
  const [csvData, setCsvData] = useState([]);
  const [minYear, setMinYear] = useState(undefined);
  const [maxYear, setMaxYear] = useState(undefined);
  const [currentTime, setCurrentTime] = useState(undefined);
  
  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const animationRef = useRef(null);

  // Master bubble list
  const [bubbles, setBubbles] = useState([]);

  // Force simulation reference
  const simulationRef = useRef(null);

  // New state to track scheduled bubble births
  const [scheduledBubbles, setScheduledBubbles] = useState({
    investor: [],
    noninvestor: []
  });

  // -----------------------------------------------------------
  // 3) Load CSV
  // -----------------------------------------------------------
  useEffect(() => {
    d3.csv(csvUrl).then((raw) => {
      const data = raw.map(d => ({
        year: +d.year,
        investor: +d['total investor profit'],
        noninvestor: +d['noninvestor profit']
      })).sort((a, b) => a.year - b.year);

      setCsvData(data);

      const years = data.map(d => d.year);
      const minY = d3.min(years);
      const maxY = d3.max(years);

      setMinYear(minY);
      setMaxYear(maxY);
      // Start at year 2000 (which is data year 2000)
      setCurrentTime(2000); 
    });
  }, [csvUrl]);

  // -----------------------------------------------------------
  // Animation functions for autoscroll
  // -----------------------------------------------------------
  function startAnimation() {
    if (animationRef.current) return;
    setIsPlaying(true);
    
    const animate = () => {
      setCurrentTime(prev => {
        if (prev >= maxYear) {
          stopAnimation();
          return maxYear;
        }
        return Math.min(maxYear, prev + ANIMATION_SPEED);
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }
  
  function stopAnimation() {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsPlaying(false);
  }
  
  function toggleAnimation() {
    if (isPlaying) {
      stopAnimation();
    } else {
      startAnimation();
    }
  }
  
  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // -----------------------------------------------------------
  // 4) Interpolation
  // -----------------------------------------------------------
  function lerp(x0, y0, x1, y1, t) {
    if (x1 === x0) return y0;
    const alpha = (t - x0) / (x1 - x0);
    return y0 + alpha * (y1 - y0);
  }

  function getInterpolatedProfits(t) {
    if (!csvData.length) return { inv: 0, noninv: 0 };

    const earliestYear = csvData[0].year;
    const latestYear = csvData[csvData.length - 1].year;
    
    // Fix: Return the first year's data if at or before the earliest year
    if (t <= earliestYear) {
      return { 
        inv: csvData[0].investor, 
        noninv: csvData[0].noninvestor 
      };
    }
    
    // Fix: When at or after the latest year, return that exact value
    if (t >= latestYear) {
      const last = csvData[csvData.length - 1];
      return { 
        inv: last.investor, 
        noninv: last.noninvestor 
      };
    }

    // In between years - find the right interval
    let i1 = 0;
    for (let i = 0; i < csvData.length - 1; i++) {
      if (csvData[i].year <= t && t < csvData[i + 1].year) {
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

  // New function to schedule bubble births
  function scheduleBubbleBirths(csvData) {
    if (!csvData || csvData.length < 2) return;

    const invSchedule = [];
    const nonInvSchedule = [];
    
    // For each time period in the data
    for (let i = 0; i < csvData.length - 1; i++) {
      const startYear = csvData[i].year;
      const endYear = csvData[i+1].year;
      const yearSpan = endYear - startYear;
      
      // Calculate bubbles needed for each period based on interpolated profits
      for (let fraction = 0; fraction < 1.0; fraction += 0.01) { // Step through the period
        const timePoint = startYear + (yearSpan * fraction);
        const nextTimePoint = timePoint + 0.01 * yearSpan;
        
        // Get interpolated profit at current and next time points
        const currentProfit = getInterpolatedProfits(timePoint);
        const nextProfit = getInterpolatedProfits(nextTimePoint);
        
        // Calculate bubble counts at each point
        const currentInvBubbles = Math.floor(currentProfit.inv / BUBBLE_VALUE);
        const nextInvBubbles = Math.floor(nextProfit.inv / BUBBLE_VALUE);
        const currentNonInvBubbles = Math.floor(currentProfit.noninv / BUBBLE_VALUE);
        const nextNonInvBubbles = Math.floor(nextProfit.noninv / BUBBLE_VALUE);
        
        // Calculate net new bubbles needed
        const newInvBubbles = nextInvBubbles - currentInvBubbles;
        const newNonInvBubbles = nextNonInvBubbles - currentNonInvBubbles;
        
        // Also calculate how many bubbles will despawn in this interval
        const despawningInv = invSchedule.filter(time => 
          time + LIFE_SPAN_YEARS >= timePoint && 
          time + LIFE_SPAN_YEARS < nextTimePoint
        ).length;
        
        const despawningNonInv = nonInvSchedule.filter(time => 
          time + LIFE_SPAN_YEARS >= timePoint && 
          time + LIFE_SPAN_YEARS < nextTimePoint
        ).length;
        
        // Add new bubbles needed + replacement for despawning ones
        const totalNewInv = Math.max(0, newInvBubbles + despawningInv);
        const totalNewNonInv = Math.max(0, newNonInvBubbles + despawningNonInv);
        
        // Schedule new bubbles evenly across this small interval
        if (totalNewInv > 0) {
          const spacing = (0.01 * yearSpan) / totalNewInv;
          for (let j = 0; j < totalNewInv; j++) {
            invSchedule.push(timePoint + j * spacing);
          }
        }
        
        if (totalNewNonInv > 0) {
          const spacing = (0.01 * yearSpan) / totalNewNonInv;
          for (let j = 0; j < totalNewNonInv; j++) {
            nonInvSchedule.push(timePoint + j * spacing);
          }
        }
      }
    }
    
    // Handle initial bubbles for the first data point
    const initialTime = csvData[0].year;
    const initialProfits = getInterpolatedProfits(initialTime);
    
    const initialInvCount = Math.floor(initialProfits.inv / BUBBLE_VALUE);
    const initialNonInvCount = Math.floor(initialProfits.noninv / BUBBLE_VALUE);
    
    // Add initial bubbles slightly before start time (distributed over 0.5 years)
    if (initialInvCount > 0) {
      const spacing = 0.5 / initialInvCount;
      for (let i = 0; i < initialInvCount; i++) {
        invSchedule.push(initialTime - 0.5 + (i * spacing));
      }
    }
    
    if (initialNonInvCount > 0) {
      const spacing = 0.5 / initialNonInvCount;
      for (let i = 0; i < initialNonInvCount; i++) {
        nonInvSchedule.push(initialTime - 0.5 + (i * spacing));
      }
    }
    
    setScheduledBubbles({
      investor: invSchedule.sort((a, b) => a - b),
      noninvestor: nonInvSchedule.sort((a, b) => a - b)
    });
  }
  
  // Schedule bubble births after CSV data is loaded
  useEffect(() => {
    if (csvData.length > 0 && minYear !== undefined && maxYear !== undefined) {
      scheduleBubbleBirths(csvData);
    }
  }, [csvData, minYear, maxYear]);

  // -----------------------------------------------------------
  // 5) When slider changes => spawn/fade bubbles
  // -----------------------------------------------------------
  useEffect(() => {
    if (!csvData.length || currentTime == null || 
        !scheduledBubbles.investor.length) return;

    // Update bubbles based on scheduled births
    setBubbles(prevBubs => {
      // Create a copy of the existing bubbles
      const newBubs = prevBubs.filter(b => {
        // Keep all bubbles that either:
        // 1. Haven't been born yet (we'll use them for recycling)
        // 2. Are currently alive (birthTime <= currentTime && age <= LIFE_SPAN_YEARS)
        const age = currentTime - b.birthTime;
        return b.birthTime > currentTime || (age >= 0 && age <= LIFE_SPAN_YEARS);
      }).map(b => ({...b}));
      
      // For each type, find which bubbles should be active now
      ['investor', 'noninvestor'].forEach(type => {
        // Get relevant scheduled birthtimes and existing bubbles
        const scheduledTimes = scheduledBubbles[type];
        const existingBubbles = newBubs.filter(b => b.type === type);
        
        // Filter for bubbles that should be born by now but aren't dead yet
        const shouldExist = scheduledTimes.filter(time => 
          time <= currentTime && // Born by now
          (currentTime - time) <= LIFE_SPAN_YEARS // Not dead yet
        );
        
        // Get existing birth times
        const existingBirthTimes = existingBubbles
          .filter(b => b.birthTime <= currentTime) // Only consider born bubbles
          .map(b => b.birthTime);
        
        // Find birthtimes that don't have bubbles yet
        const missingBirthTimes = shouldExist.filter(
          time => !existingBirthTimes.includes(time)
        );
        
        // Create bubbles for missing birthtimes
        missingBirthTimes.forEach(birthTime => {
          // First try to recycle a future bubble
          const futureBubble = existingBubbles.find(b => b.birthTime > currentTime);
          
          if (futureBubble) {
            // Recycle by changing its birthtime
            futureBubble.birthTime = birthTime;
            // Reset position for recycled bubble
            futureBubble.x = 150;
            futureBubble.y = 300;
          } else {
            // Create a brand new bubble
            newBubs.push(createBubble(type, birthTime));
          }
        });
      });
      
      return newBubs;
    });
  }, [currentTime, scheduledBubbles]);

  // -----------------------------------------------------------
  // 6) Create a single bubble
  // -----------------------------------------------------------
  function createBubble(type, birthTime) {
    return {
      id: Math.random().toString(36).substr(2, 9),
      type,
      birthTime,
      // Spawn at (150, 400)
      x: 150,
      y: 300
    };
  }

  // -----------------------------------------------------------
  // 7) Initialize Force Simulation (with "viscosity")
  // -----------------------------------------------------------
  useEffect(() => {
    const sim = d3.forceSimulation()
      // Use moderate .strength(0.05) for X & Y like "original"
      .force("x", d3.forceX(clusterX).strength(0.05))
      .force("y", d3.forceY(clusterY).strength(0.05))
      .force("collision", d3.forceCollide(COLLISION_RADIUS))
      // Increase damping to better match original comment about 0.2-0.3 range
      .velocityDecay(0.3)   // Increased from 0.2 to 0.3
      .alphaDecay(0.02)
      .alphaMin(0.001)
      .on("tick", () => {
        // On each tick => re-render with new positions
        setBubbles(bubs => [...bubs]);
      });

    simulationRef.current = sim;
    return () => sim.stop();
  }, []);

  // -----------------------------------------------------------
  // 8) Update sim when bubble list changes
  // -----------------------------------------------------------
  useEffect(() => {
    if (!simulationRef.current) return;
    const sim = simulationRef.current;
    
    // Store previous nodes count to avoid unnecessary reheating
    const prevNodesCount = sim.nodes().length;

    // CRITICAL FIX: Only pass ALIVE bubbles to the simulation
    const aliveBubbles = bubbles.filter(b => getOpacity(b) > 0);

    // If any bubble has no coords => put it at (150,400)
    aliveBubbles.forEach(b => {
      if (b.x == null || b.y == null) {
        b.x = 150;
        b.y = 300;
      }
    });

    // Update the simulation nodes
    sim.nodes(aliveBubbles);
    
    // Only reheat if the number of nodes has changed - prevents constant vibration
    if (prevNodesCount !== aliveBubbles.length) {
      sim.alpha(0.8).restart();  // Use exact value from original (0.8)
    } else if (sim.alpha() < 0.1) {
      // Just a gentle nudge if simulation is too settled but we have same nodes
      sim.alpha(0.1).restart();
    }
  }, [bubbles]);

  // -----------------------------------------------------------
  // 9) Fade in/out
  // -----------------------------------------------------------
  function getOpacity(b) {
    if (currentTime == null) return 0;
    const age = currentTime - b.birthTime;
    if (age < 0 || age > LIFE_SPAN_YEARS) return 0;

    const fadeInEnd = LIFE_SPAN_YEARS * FADE_PORTION;
    const fadeOutStart = LIFE_SPAN_YEARS * (1 - FADE_PORTION);

    if (age < fadeInEnd) {
      // fade 0 -> 1
      return age / fadeInEnd;
    } else if (age > fadeOutStart) {
      // fade 1 -> 0
      const remain = LIFE_SPAN_YEARS - fadeOutStart;
      return 1 - (age - fadeOutStart) / remain;
    } else {
      return 1;
    }
  }

  // -----------------------------------------------------------
  // 10) Summaries
  // -----------------------------------------------------------
  const invVisible = bubbles.filter(b => b.type === 'investor' && getOpacity(b) > 0);
  const nonInvVisible = bubbles.filter(b => b.type === 'noninvestor' && getOpacity(b) > 0);

  const invProfit = invVisible.length * BUBBLE_VALUE;
  const nonInvProfit = nonInvVisible.length * BUBBLE_VALUE;

  // -----------------------------------------------------------
  // 11) Render
  // -----------------------------------------------------------
  if (!csvData.length || minYear == null || maxYear == null || currentTime == null) {
    return <div>Loading CSV data or initializing...</div>;
  }

  // Generate year marks for slider - start from 2000
  const yearMarks = [];
  for (let year = 2000; year <= 2021; year++) {
    yearMarks.push(year);
  }

  // Get the visible min year (2000) for the slider
  const visibleMinYear = 2000;

  return (
    <div>
      <h2>FlowChart Demo</h2>

      {/* Slider for time with tick marks */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="range"
          min={visibleMinYear} // Use 2000 as minimum visible year
          max={maxYear}
          step={0.01}
          value={Math.max(currentTime, visibleMinYear)} // Ensure value is never below 2000
          onChange={(e) => setCurrentTime(+e.target.value)}
          style={{ width: '400px' }}
          list="year-marks"
        />
        <datalist id="year-marks">
          {yearMarks.map(year => (
            <option key={year} value={year + 0.5} />
          ))}
        </datalist>
        <span style={{ marginLeft: '0.5rem' }}>
          Year: {Math.round(currentTime) === 1999 ? 2000 : Math.round(currentTime)}
        </span>
        
        {/* Play/Pause button for autoscroll */}
        <button 
          onClick={toggleAnimation}
          style={{ 
            marginLeft: '1rem',
            padding: '0.25rem 0.75rem',
            backgroundColor: isPlaying ? '#f44336' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {isPlaying ? '❚❚ Pause' : '▶ Play'}
        </button>
        
        {/* Reset button */}
        <button 
          onClick={() => {
            stopAnimation();
            setCurrentTime(visibleMinYear); // Reset to 2000 instead of minYear
          }}
          style={{ 
            marginLeft: '0.5rem',
            padding: '0.25rem 0.75rem',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ⟲ Reset
        </button>
      </div>

      {/* Summary */}
      <div style={{ marginBottom: '1rem' }}>
        <div>Investor bubbles: {invVisible.length} (Profit: ${invProfit.toLocaleString()})</div>
        <div>Non-investor bubbles: {nonInvVisible.length} (Profit: ${nonInvProfit.toLocaleString()})</div>
        <div>Total Visible Profit: {(invProfit + nonInvProfit).toLocaleString()}</div>
      </div>

      {/* SVG */}
      <svg width={800} height={600} style={{ border: '1px solid #ccc' }}>
        {/* Cluster labels */}
        <text 
          x={700} 
          y={150} 
          textAnchor="start" 
          dominantBaseline="middle"
          fontWeight="bold"
          fill="red"
        >
          Non-Investor
        </text>
        <text 
          x={700} 
          y={450} 
          textAnchor="start" 
          dominantBaseline="middle"
          fontWeight="bold"
          fill="#2273f3"
        >
          Investor
        </text>

        {bubbles.map((b) => {
          const opacity = getOpacity(b);
          if (opacity <= 0) return null;
          return (
            <React.Fragment key={b.id}>
              <circle
                cx={b.x}
                cy={b.y}
                r={BUBBLE_RADIUS}
                opacity={opacity}
                fill={b.type === 'investor' ? '#2273f3' : 'red'}
              />
              <text
                x={b.x}
                y={b.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={DOLLAR_SIGN_SIZE}
                fontWeight="bold"
                opacity={opacity}
              >
                $
              </text>
            </React.Fragment>
          );
        })}
      </svg>
    </div>
  );
}

export default FlowChart;
