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

function FlowChart({ csvUrl = "/mapc_region_residential_sales_clean_aggregated.csv" }) {
  // -----------------------------------------------------------
  // 1) Constants & Config
  // -----------------------------------------------------------
  const BUBBLE_VALUE = 5000;     
  const LIFE_SPAN_YEARS = 1.0;    
  const FADE_PORTION = 0.05;       
  const COLLISION_RADIUS = 9;    
  const BUBBLE_RADIUS = 7;        
  const ANIMATION_SPEED = 0.01;   // Years per animation frame (higher = faster)
  const DOLLAR_SIGN_SIZE = "16px";
  const CANVAS_HEIGHT = 700;
  const CANVAS_WIDTH = 800;
  
  // Cluster configuration
  const CLUSTER_CIRCLE_RADIUS = 135;
  const CLUSTER_CIRCLE_STROKE_WIDTH = 2;
  
  // Define spawning point coordinates
  const SPAWN_X = 180;
  const SPAWN_Y = CANVAS_HEIGHT/2;

  // “Cluster” for investor vs. non-investor
  const [clusterPositions, setClusterPositions] = useState({
    x: 630,
    nonInvY: 190,
    invY: 510
  });
  
  // Add hover state tracking
  const [hoverState, setHoverState] = useState({
    investor: false,
    noninvestor: false,
    house: false // Add house hover state
  });

  function clusterX(d) {
    // Everyone clusters at CLUSTER_X
    return clusterPositions.x;
  }
  function clusterY(d) {
    // top cluster if non-investor, bottom cluster if investor
    return d.type === 'investor' ? clusterPositions.invY : clusterPositions.nonInvY;
  }

  // Define money green color constant
  const MONEY_GREEN = "#85BB65";

  // -----------------------------------------------------------
  // 2) State
  // -----------------------------------------------------------
  const [csvData, setCsvData] = useState([]);
  const [minYear, setMinYear] = useState(undefined);
  const [maxYear, setMaxYear] = useState(undefined);
  const [currentTime, setCurrentTime] = useState(undefined);
  const [homePriceData, setHomePriceData] = useState({}); // New state for home price index
  
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

  // Load home price index data
  useEffect(() => {
    d3.csv("/home_price_index_decimal.csv").then((data) => {
      const priceData = {};
      data.forEach(d => {
        // Use the decimal year format for more precise time points
        if (d.year && d.HPI) {
          priceData[+d.year] = +d.HPI;
        }
      });
      setHomePriceData(priceData);
    }).catch(error => {
      console.error("Error loading home price index data:", error);
    });
  }, []);

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

  // Function to get the interpolated profit amounts directly from the data
  function getDataProfit(t) {
    if (!csvData.length) return { inv: 0, noninv: 0 };

    const earliestYear = csvData[0].year;
    const latestYear = csvData[csvData.length - 1].year;
    
    if (t <= earliestYear) {
      return { 
        inv: csvData[0].investor, 
        noninv: csvData[0].noninvestor 
      };
    }
    
    if (t >= latestYear) {
      const last = csvData[csvData.length - 1];
      return { 
        inv: last.investor, 
        noninv: last.noninvestor 
      };
    }

    // Find the right interval
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

  // An improved version of the bubble scheduling function that ensures exact ball counts
  function scheduleBubbleBirths(csvData) {
    if (!csvData || csvData.length < 2) return;

    const invSchedule = [];
    const nonInvSchedule = [];
    
    // For each time period in the data
    for (let i = 0; i < csvData.length - 1; i++) {
      const startYear = csvData[i].year;
      const endYear = csvData[i+1].year;
      const yearSpan = endYear - startYear;
      
      // For each year, calculate exact bubble count based on raw data
      for (let timePoint = startYear; timePoint <= endYear; timePoint += 0.1) {
        // Get target bubble counts at this exact time point
        const profits = getDataProfit(timePoint);
        const targetInvCount = Math.round(profits.inv / BUBBLE_VALUE);
        const targetNonInvCount = Math.round(profits.noninv / BUBBLE_VALUE);
        
        // Count how many bubbles will be alive at this timepoint
        // (bubbles that were born before and haven't expired yet)
        const aliveInvCount = invSchedule.filter(birthTime => 
          birthTime <= timePoint && 
          (timePoint - birthTime) <= LIFE_SPAN_YEARS
        ).length;
        
        const aliveNonInvCount = nonInvSchedule.filter(birthTime => 
          birthTime <= timePoint && 
          (timePoint - birthTime) <= LIFE_SPAN_YEARS
        ).length;
        
        // Add exactly the number of bubbles needed to match the count
        const invBubblesToAdd = Math.max(0, targetInvCount - aliveInvCount);
        const nonInvBubblesToAdd = Math.max(0, targetNonInvCount - aliveNonInvCount);
        
        // Add new bubbles with slight time offset for more natural appearance
        for (let j = 0; j < invBubblesToAdd; j++) {
          const birthTime = timePoint - (j * 0.001); // Very small offset
          invSchedule.push(birthTime);
        }
        
        for (let j = 0; j < nonInvBubblesToAdd; j++) {
          const birthTime = timePoint - (j * 0.001); // Very small offset
          nonInvSchedule.push(birthTime);
        }
      }
    }
    
    // For the initial period, add bubbles for pre-start visibility
    const initialYear = csvData[0].year;
    const initialProfits = getDataProfit(initialYear);
    const initialInvCount = Math.round(initialProfits.inv / BUBBLE_VALUE);
    const initialNonInvCount = Math.round(initialProfits.noninv / BUBBLE_VALUE);
    
    // Add bubbles in a staggered fashion before the initial year
    // to avoid all appearing at once
    for (let i = 0; i < initialInvCount; i++) {
      const birthTime = initialYear - LIFE_SPAN_YEARS * 0.9 + (i * 0.01);
      invSchedule.push(birthTime);
    }
    
    for (let i = 0; i < initialNonInvCount; i++) {
      const birthTime = initialYear - LIFE_SPAN_YEARS * 0.9 + (i * 0.01);
      nonInvSchedule.push(birthTime);
    }
    
    // Sort bubble birth times and set state
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
      // Spawn at defined spawn point
      x: SPAWN_X,
      y: SPAWN_Y
    };
  }

  // -----------------------------------------------------------
  // 7) Initialize Force Simulation (with "viscosity")
  // -----------------------------------------------------------
  useEffect(() => {
    const sim = d3.forceSimulation()
      // Use moderate .strength(0.05) for X & Y like "original"
      .force("x", d3.forceX(clusterX).strength(0.04))
      .force("y", d3.forceY(clusterY).strength(0.04))
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

    // If any bubble has no coords => put it at spawn point
    aliveBubbles.forEach(b => {
      if (b.x == null || b.y == null) {
        b.x = SPAWN_X;
        b.y = SPAWN_Y;
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

  // Calculate profit directly from data instead of counting bubbles
  const directProfit = getDataProfit(currentTime);
  const invProfit = directProfit.inv;
  const nonInvProfit = directProfit.noninv;

  // Function to get the home price index for the current time - using raw data without interpolation
  function getHomePrice() {
    // If we have loaded data
    if (Object.keys(homePriceData).length > 0) {
      // Get exact time point
      const exactTime = currentTime;
      
      // Get available time points
      const availableTimePoints = Object.keys(homePriceData).map(Number).sort((a, b) => a - b);
      
      // If before earliest data point
      if (exactTime <= availableTimePoints[0]) {
        return homePriceData[availableTimePoints[0]];
      }
      
      // If after latest data point
      if (exactTime >= availableTimePoints[availableTimePoints.length - 1]) {
        return homePriceData[availableTimePoints[availableTimePoints.length - 1]];
      }
      
      // Find the closest time point - no interpolation
      const closestTimePoint = availableTimePoints.reduce((prev, curr) => 
        Math.abs(curr - exactTime) < Math.abs(prev - exactTime) ? curr : prev
      );
      
      // Return the exact value at that time point
      return homePriceData[closestTimePoint];
    }
    
    // If data hasn't loaded yet, return a default value
    return 100; // Default value if data not loaded yet
  }

  // Additional function to get the exact time point being used
  function getDisplayTimePoint() {
    if (Object.keys(homePriceData).length > 0) {
      const exactTime = currentTime;
      const availableTimePoints = Object.keys(homePriceData).map(Number).sort((a, b) => a - b);
      
      if (exactTime <= availableTimePoints[0]) {
        return availableTimePoints[0];
      }
      
      if (exactTime >= availableTimePoints[availableTimePoints.length - 1]) {
        return availableTimePoints[availableTimePoints.length - 1];
      }
      
      return availableTimePoints.reduce((prev, curr) => 
        Math.abs(curr - exactTime) < Math.abs(prev - exactTime) ? curr : prev
      );
    }
    return currentTime;
  }

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
      {/* Removed "FlowChart Demo" heading */}

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

      {/* Wrap the SVG and label in a positioned container */}
      <div style={{ position: 'relative' }}>
        {/* Add text box label for house - positioned relative to the chart */}
        <div style={{
          position: 'absolute',
          right: 'calc(100% + 10px)', // Position just outside the left edge of SVG
          top: '50%', // Align with middle of canvas (where the house is)
          transform: 'translateY(-50%)', // Center vertically
          width: '250px',
          padding: '10px',
          background: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid #ccc',
          borderRadius: '5px',
          boxShadow: '2px 2px 5px rgba(0,0,0,0.1)',
          fontSize: '20px',
          lineHeight: '1.4',
          textAlign: 'right',
          zIndex: 5
        }}>
          {/* <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>Hover Over House</p> */}
          <p style={{margin: '0', fontFamily:"Helvetica Neue"}}>
            The Case-Shiller House Price Index (HPI), computed using repeat home sales data, has been <strong>increasing year-by-year</strong>.
          </p>
          <div style={{
            position: 'absolute',
            left: '100%', // Start from right edge of the box
            top: '50%',
            width: '40px',
            height: '2px',
            background: '#666',
            transform: 'translateY(-50%)' // Center the line
          }}></div>
          <div style={{
            position: 'absolute',
            left: 'calc(100% + 40px)', // Position at end of line
            top: '50%',
            width: '0',
            height: '0',
            borderTop: '5px solid transparent',
            borderBottom: '5px solid transparent',
            borderLeft: '5px solid #666',
            transform: 'translateY(-50%)' // Center the arrowhead
          }}></div>
        </div>

        {/* Add text box label for non-investor circle */}
        <div style={{
          position: 'absolute',
          left: 'calc(100% + 10px)', // Position just outside the right edge of SVG
          top: `${clusterPositions.nonInvY * 100 / CANVAS_HEIGHT}%`, // Position at non-investor circle height
          transform: 'translateY(-50%)', // Center vertically
          width: '250px',
          padding: '10px',
          background: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid #ccc',
          borderRadius: '5px',
          boxShadow: '2px 2px 5px rgba(0,0,0,0.1)',
          fontSize: '20px',
          lineHeight: '1.4',
          textAlign: 'left',
          zIndex: 5
        }}>
          {/* <p style={{ margin: '0 0 8px 0', fontWeight: 'bold'}}>Hover Over Circle</p> */}
          <p style={{ margin: '0', fontFamily:"Helvetica Neue"}}>
            Consistently, sales by non-investors have seen <strong>less profit</strong> as compared to sales made by investors.
          </p>
          <div style={{
            position: 'absolute',
            right: '100%', // Start from left edge of the box
            top: '50%',
            width: '40px',
            height: '2px',
            background: 'black',
            transform: 'translateY(-50%)' // Center the line
          }}></div>
          <div style={{
            position: 'absolute',
            right: 'calc(100% + 40px)', // Position at end of line
            top: '50%',
            width: '0',
            height: '0',
            borderTop: '5px solid transparent',
            borderBottom: '5px solid transparent',
            borderRight: '5px solid black',
            transform: 'translateY(-50%)' // Center the arrowhead
          }}></div>
        </div>

        {/* Add text box label for investor circle */}
        <div style={{
          position: 'absolute',
          left: 'calc(100% + 10px)', // Position just outside the right edge of SVG
          top: `${clusterPositions.invY * 100 / CANVAS_HEIGHT}%`, // Position at investor circle height
          transform: 'translateY(-50%)', // Center vertically
          width: '250px',
          padding: '10px',
          background: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid #ccc',
          borderRadius: '5px',
          boxShadow: '2px 2px 5px rgba(0,0,0,0.1)',
          fontSize: '20px',
          lineHeight: '1.4',
          textAlign: 'left',
          zIndex: 5
        }}>
          {/* <p style={{ margin: '0 0 8px 0', fontWeight: 'bold'}}>Hover Over Circle</p> */}
          <p style={{ margin: '0', fontFamily:"Helvetica Neue" }}>
            This ever-growing divide demonstrates the <strong>increase in speculative investment</strong> in the Boston housing market.
          </p>
          <div style={{
            position: 'absolute',
            right: '100%', // Start from left edge of the box
            top: '50%',
            width: '40px',
            height: '2px',
            background: 'black',
            transform: 'translateY(-50%)' // Center the line
          }}></div>
          <div style={{
            position: 'absolute',
            right: 'calc(100% + 40px)', // Position at end of line
            top: '50%',
            width: '0',
            height: '0',
            borderTop: '5px solid transparent',
            borderBottom: '5px solid transparent',
            borderRight: '5px solid black',
            transform: 'translateY(-50%)' // Center the arrowhead
          }}></div>
        </div>

        {/* SVG */}
        <svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} >
          {/* Legend in top left */}
          <g transform="translate(20, 20)">
            {/* Sample bubble */}
            <circle
              cx={BUBBLE_RADIUS*2}
              cy={CANVAS_HEIGHT - BUBBLE_RADIUS*7.2}
              r={BUBBLE_RADIUS*2}
              opacity={1}
              fill={MONEY_GREEN}
            />
            <text
              x={BUBBLE_RADIUS*2}
              y={CANVAS_HEIGHT - BUBBLE_RADIUS*7.2}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize="28px"
              fontWeight="bold"
            >
              $
            </text>
            
            {/* Legend text */}
            <text
              x={BUBBLE_RADIUS * 2 + 20}
              y={CANVAS_HEIGHT - BUBBLE_RADIUS * 7}
              textAnchor="start"
              dominantBaseline="middle"
              fontWeight="bold"
              fontFamily="Helvetica Neue"
              fontSize="20px"
              fill="#333"
            >
              = ${BUBBLE_VALUE.toLocaleString()}
            </text>
          </g>

          {/* HUGE Year display */}
          <text
            x={CANVAS_WIDTH/2}
            y={50}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="Helvetica Neue"
            fontWeight="bold"
            fontSize="64px"
            fill="#333"
            opacity="0.7"
          >
            {Math.round(currentTime) === 1999 ? 2000 : Math.round(currentTime)}
          </text>

          {/* Debug info - count display - COMMENTED OUT 
          <g transform="translate(20, 60)">
            <text
              fontFamily="Helvetica Neue"
              fontWeight="bold"
              fontSize="16px"
              fill="#666"
              textAnchor="start"
              dominantBaseline="middle"
            >
              Visible bubbles: {invVisible.length + nonInvVisible.length} 
              (Inv: {invVisible.length}, Non-Inv: {nonInvVisible.length})
            </text>
            <text
              y="25"
              fontFamily="Helvetica Neue"
              fontWeight="bold"
              fontSize="16px"
              fill="#666"
              textAnchor="start"
              dominantBaseline="middle"
            >
              Expected: {Math.round(invProfit / BUBBLE_VALUE) + Math.round(nonInvProfit / BUBBLE_VALUE)}
              (Inv: {Math.round(invProfit / BUBBLE_VALUE)}, Non-Inv: {Math.round(nonInvProfit / BUBBLE_VALUE)})
            </text>
          </g>
          */}

          {/* Money bubbles - moved BEFORE the house so they appear BEHIND */}
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
                  fill={MONEY_GREEN}
                />
                <text
                  x={b.x}
                  y={b.y+1.25}
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

          {/* Cluster background circles with hover effects */}
          <g>
            {/* Non-investor cluster */}
            <circle
              cx={clusterPositions.x}
              cy={clusterPositions.nonInvY}
              r={CLUSTER_CIRCLE_RADIUS}
              fill="blue"
              fillOpacity={hoverState.noninvestor ? 0.8 : 0.05}
              stroke="blue"
              strokeWidth={CLUSTER_CIRCLE_STROKE_WIDTH}
              onMouseEnter={() => setHoverState(prev => ({ ...prev, noninvestor: true }))}
              onMouseLeave={() => setHoverState(prev => ({ ...prev, noninvestor: false }))}
              style={{ cursor: 'pointer' }}
            />
            
            {/* Info tooltip indicator for non-investor circle */}
            <g transform={`translate(${clusterPositions.x + CLUSTER_CIRCLE_RADIUS - 35}, ${clusterPositions.nonInvY + CLUSTER_CIRCLE_RADIUS - 35})`}>
              <circle r="12" fill="white" stroke="blue" strokeWidth="1.5" />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="20px"
                fontFamily="Helvetica Neue"
                fontWeight="bold"
                fill="blue"
                style={{ pointerEvents: "none" }}
                dy="2" // Added 2px downward shift
              >
                i
              </text>
            </g>
            
            {/* Non-investor profit counter - only visible on hover */}
            <text 
              x={clusterPositions.x} 
              y={clusterPositions.nonInvY}
              textAnchor="middle" 
              dominantBaseline="middle"
              fontFamily="Helvetica Neue"
              fontWeight="bold"
              fontSize="18px"
              fill="white"
              opacity={hoverState.noninvestor ? 1 : 0}
              pointerEvents="none"
            >
              Non-Investor Profit: ${Math.round(nonInvProfit).toLocaleString()}
            </text>

            {/* Investor cluster */}
            <circle
              cx={clusterPositions.x}
              cy={clusterPositions.invY}
              r={CLUSTER_CIRCLE_RADIUS}
              fill="red"
              fillOpacity={hoverState.investor ? 0.8 : 0.05}
              stroke="red"
              strokeWidth={CLUSTER_CIRCLE_STROKE_WIDTH}
              onMouseEnter={() => setHoverState(prev => ({ ...prev, investor: true }))}
              onMouseLeave={() => setHoverState(prev => ({ ...prev, investor: false }))}
              style={{ cursor: 'pointer' }}
            />
            
            {/* Info tooltip indicator for investor circle */}
            <g transform={`translate(${clusterPositions.x + CLUSTER_CIRCLE_RADIUS - 35}, ${clusterPositions.invY + CLUSTER_CIRCLE_RADIUS - 35})`}>
              <circle r="12" fill="white" stroke="red" strokeWidth="1.5" />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="20px"
                fontFamily="Helvetica Neue"
                fontWeight="bold"
                fill="red"
                style={{ pointerEvents: "none" }}
                dy="2" // Added 2px downward shift
              >
                i
              </text>
            </g>
            
            {/* Investor profit counter - only visible on hover */}
            <text 
              x={clusterPositions.x} 
              y={clusterPositions.invY}
              textAnchor="middle" 
              dominantBaseline="middle"
              fontFamily="Helvetica Neue"
              fontWeight="bold"
              fontSize="18px"
              fill="white"
              opacity={hoverState.investor ? 1 : 0}
              pointerEvents="none"
            >
              Investor Profit: ${Math.round(invProfit).toLocaleString()}
            </text>
          </g>

          {/* Cluster labels - moved below circles and linked to circle positions */}
          <text 
            x={clusterPositions.x} 
            y={clusterPositions.nonInvY + CLUSTER_CIRCLE_RADIUS + 20}
            textAnchor="middle" 
            dominantBaseline="middle"
            fontFamily="Helvetica Neue"
            fontWeight="bold"
            fontSize="22px"
            fill="blue"
          >
            Non-Investor Average
          </text>
          <text 
            x={clusterPositions.x} 
            y={clusterPositions.invY + CLUSTER_CIRCLE_RADIUS + 20}
            textAnchor="middle" 
            dominantBaseline="middle"
            fontFamily="Helvetica Neue"
            fontWeight="bold"
            fontSize="22px"
            fill="red"
          >
            Investor Average
          </text>

          {/* House emoji at spawning point with hover effect - moved AFTER money bubbles so it appears ON TOP */}
          <g>
            <text
              x={SPAWN_X}
              y={SPAWN_Y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="120px"
              opacity={0.8}
              style={{ 
                fontFamily: 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif',
                cursor: 'pointer'
              }}
              onMouseEnter={() => setHoverState(prev => ({ ...prev, house: true }))}
              onMouseLeave={() => setHoverState(prev => ({ ...prev, house: false }))}
            >
              🏠
            </text>
            
            {/* Info tooltip indicator for house */}
            <g transform={`translate(${SPAWN_X + 40}, ${SPAWN_Y + 40})`}>
              <circle r="12" fill="white" stroke="#666" strokeWidth="1.5" />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="20px"
                fontFamily="Helvetica Neue"
                fontWeight="bold"
                fill="#666"
                style={{ pointerEvents: "none" }}
                dy="2" // Added 2px downward shift
              >
                i
              </text>
            </g>
            
            {/* House price display on hover - updated text */}
            <text
              x={SPAWN_X}
              y={SPAWN_Y - 120} 
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="Helvetica Neue"
              fontWeight="bold"
              fontSize="22px"
              fill="#333"
              opacity={hoverState.house ? 1 : 0}
              pointerEvents="none"
            >
              Boston Home Price Index:
            </text>
            <text
              x={SPAWN_X}
              y={SPAWN_Y - 90} 
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="Helvetica Neue"
              fontWeight="bold"
              fontSize="24px"
              fill="#1A6692"
              opacity={hoverState.house ? 1 : 0}
              pointerEvents="none"
            >
              {getHomePrice().toFixed(2)}
            </text>
            
            {/* Label under house */}
            <text
              x={SPAWN_X}
              y={SPAWN_Y + 80} 
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="Helvetica Neue"
              fontWeight="bold"
              fontSize="24px"
              fill="#333"
            >
              Average Profit Per Sale
            </text>
          </g>
        </svg>
      </div>
      
      {/* Citation sources */}
      <div style={{ 
        marginTop: '20px', 
        fontSize: '18px', 
        color: '#666', 
        fontStyle: 'italic',
        textAlign: 'center'
      }}>
        <p>
          Data sources: MAPC Region Residential Sales (2000-2022), 
          S&P CoreLogic Case-Shiller MA-Boston Home Price Index (1987-2024)
        </p>
      </div>
    </div>
  );
}

export default FlowChart;
