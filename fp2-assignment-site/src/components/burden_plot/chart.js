import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import * as XLSX from 'xlsx';
import * as topojsonServer from 'topojson-server';
import * as topojsonClient from 'topojson-client';
import * as topojsonSimplify from 'topojson-simplify';

/**
 * HousingDashboard
 *
 * Metro‑Boston ZIP‑level scatter plot linked to a municipality choropleth.
 *   • % change renter cost‑burden (2012 → 2022)
 *   • % change investor share of sales (2012 → 2022)
 *   • No‑cause evictions, 2022
 *
 * Extra packages:
 *     npm i xlsx topojson-server topojson-client topojson-simplify
 */

function HousingDashboard() {
  //--------------------------------------------------------------------
  // Layout
  //--------------------------------------------------------------------
  const MAP_W = 600;
  const MAP_H = 560;
  const SCATTER = 480;

  //--------------------------------------------------------------------
  // State
  //--------------------------------------------------------------------
  const [geo, setGeo] = useState(null);            // simplified municipal polygons
  const [zipRecords, setZipRecords] = useState(null);   // ZIP‑level metrics
  const [muniRecords, setMuniRecords] = useState(null); // municipality aggregates
  const [metric, setMetric] = useState('cost');    // choropleth toggle
  const [hoverZips, setHoverZips] = useState(new Set());
  const [lockedZips, setLockedZips] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [isScatterDragging, setIsScatterDragging] = useState(false);
  const [scatterDragStart, setScatterDragStart] = useState(null);
  const [scatterDragEnd, setScatterDragEnd] = useState(null);

  const mapRef = useRef(null);
  const scatterRef = useRef(null);
  const muni2zips = useRef({});                    // { muni : [zip,…] }

  //--------------------------------------------------------------------
  // Load & prepare data  ------------------------------------------------
  //--------------------------------------------------------------------
  useEffect(() => {
    d3.json(`${process.env.PUBLIC_URL}/burden_data/preprocessed_data.json`)
      .then(data => {
        // Extract the preprocessed data
        const { geo: rawGeo, zipRecords, muniRecords, muni2zips: muni2zipLocal } = data;
        
        // Store the municipality to ZIP mapping
        muni2zips.current = muni2zipLocal;
        
        // Apply TopoJSON simplification for map rendering
        const topo = topojsonServer.topology({ muni: rawGeo });
        topojsonSimplify.presimplify(topo);
        topojsonSimplify.simplify(topo, 1e-5);           // keep ~1% of points
        
        // Set state with preprocessed data
        setGeo(topojsonClient.feature(topo, topo.objects.muni));
        setZipRecords(zipRecords);
        setMuniRecords(muniRecords);
      });
  }, []);

  //--------------------------------------------------------------------
  // Scales
  //--------------------------------------------------------------------
  const choropleth = useMemo(() => {
    if (!muniRecords) return () => '#ccc';
    const vals = muniRecords
      .map(d => (
        metric === 'cost'     ? d.costChange :
        metric === 'investor' ? d.investorChange :
        d.evictions
      ))
      .filter(v => v !== null && Number.isFinite(v));
    const scale = d3.scaleSequential()
      .domain(d3.extent(vals))
      .interpolator(d3.interpolateBlues);
    return v => (v === null ? '#ccc' : scale(v));
  }, [muniRecords, metric]);

  const mapR = useMemo(() => {
    if (!muniRecords) return () => 0;
    return d3.scaleSqrt()
      .domain([0, d3.max(muniRecords, d => d.evictions)])
      .range([0, 16]);
  }, [muniRecords]);

  const scatterR = useMemo(() => {
    if (!muniRecords) return () => 2;
    return d3.scaleSqrt()
      .domain([0, d3.max(muniRecords, d => d.evictions)])
      .range([2, 10]);
  }, [muniRecords]);

  //--------------------------------------------------------------------
  // Map panel
  //--------------------------------------------------------------------
  useEffect(() => {
    if (!geo || !muniRecords) return;

    const muniMap = {};
    muniRecords.forEach(r => (muniMap[r.muni] = r));

    const svg = d3.select(mapRef.current);
    svg.selectAll('*').remove();

    const proj = d3.geoMercator().fitSize([MAP_W, MAP_H], geo);
    const path = d3.geoPath().projection(proj);

    // Add text label for municipality name on hover - bigger and lower position
    const muniLabel = svg.append('text')
      .attr('x', 40)         // Moved right from 10 to 20
      .attr('y', 60)         // Moved down from 25 to 40
      .attr('font-size', '28px') // Increased from 18px to 22px
      .attr('font-weight', 'bold')
      .attr('fill', '#336')
      .text('');

    // Add a semi-transparent background for better readability
    svg.append('rect')
      .attr('x', 15)         // Moved right from 5 to 15
      .attr('y', 20)         // Moved down from 25 to 20
      .attr('width', 300)     // Width that can accommodate most municipality names
      .attr('height', 25)        // Height for the text
      .attr('fill', 'rgba(255, 255, 255, 0.7)') // Semi-transparent white
      .attr('rx', 4)         // Rounded corners
      .attr('ry', 4)
      .style('visibility', 'hidden') // Start hidden, will show when text appears
      .attr('class', 'muni-label-bg');

    // Polygons
    svg.append('g')
      .selectAll('path')
      .data(geo.features)
      .join('path')
      .attr('d', path)
      .attr('fill', d => {
        const r = muniMap[d.properties.municipal];
        const v =
          metric === 'cost'     ? r?.costChange :
          metric === 'investor' ? r?.investorChange :
          r?.evictions;
        const hasData = v !== null && Number.isFinite(v);
        return hasData ? choropleth(v) : 'none';
      })
      .attr('pointer-events', d => {
        const r = muniMap[d.properties.municipal];
        const v =
          metric === 'cost'     ? r?.costChange :
          metric === 'investor' ? r?.investorChange :
          r?.evictions;
        return v !== null && Number.isFinite(v) ? 'auto' : 'none';
      })
      .attr('stroke', d => {
        const r = muniMap[d.properties.municipal];
        const v =
          metric === 'cost'     ? r?.costChange :
          metric === 'investor' ? r?.investorChange :
          r?.evictions;
        return v !== null && Number.isFinite(v) ? '#fff' : 'none';
      })
      .attr('stroke-width', d => {
        const r = muniMap[d.properties.municipal];
        const v =
          metric === 'cost'     ? r?.costChange :
          metric === 'investor' ? r?.investorChange :
          r?.evictions;
        if (v === null || !Number.isFinite(v)) return 0;
        const zips = muni2zips.current[d.properties.municipal] || [];
        return zips.some(z => hoverZips.has(z)) ? 2 : 0.4;
      })
      .on('mouseover', (_, d) => {
        const z = muni2zips.current[d.properties.municipal] || [];
        setHoverZips(new Set(z));
      })
      .on('mouseout', () => setHoverZips(new Set()))
      .on('click', (_, d) => {
        const z = muni2zips.current[d.properties.municipal] || [];
        setLockedZips(prev => {
          const s = new Set(prev);
          const all = z.every(zc => s.has(zc));
          (all ? z : []).forEach(zc => s.delete(zc));
          (!all ? z : []).forEach(zc => s.add(zc));
          return Array.from(s);
        });
      });

    // Create drag selection rect for the map with improved visibility (temporarily bright red for testing)
    const dragRect = svg.append('rect')
      .attr('class', 'drag-selection')
      .attr('fill', 'rgba(255, 0, 0, 0.4)')
      .attr('stroke', 'red')
      .attr('stroke-width', 1.5) // Increased from 1 to 1.5
      .attr('stroke-dasharray', '3,3') // Add dashed line for better visibility
      .style('display', 'none')
      .style('pointer-events', 'none'); // Make sure it doesn't interfere with other interactions
    dragRect.raise();

    // MouseDown event to start drag
    svg.on('mousedown', function(event) {
      // Only start drag if we're not on a path
      if (event.target.tagName !== 'path') {
        const [x, y] = d3.pointer(event);
        setIsDragging(true);
        setDragStart([x, y]);
        dragRect
          .attr('x', x)
          .attr('y', y)
          .attr('width', 0)
          .attr('height', 0)
          .style('display', null);
        
        // Clear previous selections if not holding shift
        if (!event.shiftKey) {
          setLockedZips([]);
        }
      }
    });

    // MouseMove event to update drag
    svg.on('mousemove', function(event) {
      if (!isDragging) return;
      
      const [x0, y0] = dragStart;
      const [x1, y1] = d3.pointer(event);
      
      dragRect
        .attr('x', Math.min(x0, x1))
        .attr('y', Math.min(y0, y1))
        .attr('width', Math.abs(x1 - x0))
        .attr('height', Math.abs(y1 - y0));
      
      setDragEnd([x1, y1]);
    });

    // MouseUp event to end drag and select municipalities
    svg.on('mouseup', function(event) {
      if (!isDragging) return;
      
      // Hide drag rectangle
      dragRect.style('display', 'none');
      
      if (dragStart && dragEnd) {
        const [x0, y0] = dragStart;
        const [x1, y1] = dragEnd;
        
        // Check if it's just a click (very small rectangle)
        if (Math.abs(x1 - x0) < 5 && Math.abs(y1 - y0) < 5) {
          // If it's a click on background, deselect everything
          if (event.target.tagName !== 'path') {
            setLockedZips([]);
          }
        } else {
          // Find municipalities in the drag rectangle
          const selectedZips = new Set();
          geo.features.forEach(f => {
            // Check if this municipality is in the drag rectangle
            const bounds = path.bounds(f);
            const inDrag = !(
              bounds[1][0] < Math.min(x0, x1) || 
              bounds[0][0] > Math.max(x0, x1) || 
              bounds[1][1] < Math.min(y0, y1) || 
              bounds[0][1] > Math.max(y0, y1)
            );
            
            if (inDrag) {
              const muni = f.properties.municipal;
              const zips = muni2zips.current[muni] || [];
              zips.forEach(z => selectedZips.add(z));
            }
          });
          
          // Update lockedZips with selected municipalities
          setLockedZips(prev => {
            const result = new Set(prev);
            selectedZips.forEach(zip => result.add(zip));
            return Array.from(result);
          });
        }
      }
      
      // Reset drag state
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    });

    // Create a legend
    const legendGroup = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${MAP_W - 160}, ${MAP_H - 300})`);
    
    // Get the data range for the current metric
    const values = muniRecords
      .map(d => (
        metric === 'cost'     ? d.costChange :
        metric === 'investor' ? d.investorChange :
        d.evictions
      ))
      .filter(v => v !== null && Number.isFinite(v));
    
    const [min, max] = d3.extent(values);
    
    // Create gradient for legend
    const legendWidth = 120;
    const legendHeight = 15;
    
    // Add title based on current metric
    legendGroup.append('text')
      .attr('x', 0)
      .attr('y', -10)
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text(() => {
        if (metric === 'cost') return 'Rent Burden Change';
        if (metric === 'investor') return 'Investor Share Change';
        return 'No-Cause Evictions';
      });
    
    // Draw the gradient rectangle
    const legendScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, legendWidth]);
    
    const numStops = 10;
    for (let i = 0; i < numStops; i++) {
      const t = i / (numStops - 1);
      legendGroup.append('rect')
        .attr('x', legendScale(i / (numStops - 1)))
        .attr('y', 0)
        .attr('width', legendWidth / numStops)
        .attr('height', legendHeight)
        .attr('fill', d3.interpolateBlues(t));
    }
    
    // Add min and max labels
    legendGroup.append('text')
      .attr('x', 0)
      .attr('y', legendHeight + 15)
      .attr('text-anchor', 'start')
      .attr('font-size', '10px')
      .text(min.toFixed(1) + (metric !== 'evict' ? '%' : ''));
    
    legendGroup.append('text')
      .attr('x', legendWidth)
      .attr('y', legendHeight + 15)
      .attr('text-anchor', 'end')
      .attr('font-size', '10px')
      .text(max.toFixed(1) + (metric !== 'evict' ? '%' : ''));
      
    // Add a border
    legendGroup.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', 'none')
      .attr('stroke', '#333')
      .attr('stroke-width', '0.5px');
      
    // Add background for better readability
    legendGroup.insert('rect', ':first-child')
      .attr('x', -10)
      .attr('y', -25)
      .attr('width', legendWidth + 20)
      .attr('height', legendHeight + 50)
      .attr('fill', 'rgba(255, 255, 255, 0.8)')
      .attr('rx', 5)
      .attr('ry', 5);
  }, [geo, muniRecords, metric, choropleth, mapR, isDragging, dragStart, dragEnd]);

  // ----- lightweight hover updates (avoid full map redraw) -------------
  useEffect(() => {
    if (!geo || !muniRecords) return;
    
    const svg = d3.select(mapRef.current);
    
    // Update polygon stroke widths
    svg.selectAll('path').attr('stroke-width', d => {
      const r = muniRecords.find(m => m.muni === d.properties.municipal);
      const v =
        metric === 'cost'     ? r?.costChange :
        metric === 'investor' ? r?.investorChange :
        r?.evictions;
      if (v === null || !Number.isFinite(v)) return 0;      // hidden region
      const zips = muni2zips.current[d.properties.municipal] || [];
      return zips.some(z => hoverZips.has(z)) ? 2 : 0.4;
    });
    
    // Update municipality label
    if (hoverZips.size > 0) {
      // Find which municipality is being hovered
      const hoveredMunis = new Set();
      muniRecords.forEach(r => {
        if (r.zips.some(z => hoverZips.has(z))) {
          hoveredMunis.add(r.muni);
        }
      });
      
      // Display the municipality name (or names if multiple)
      if (hoveredMunis.size > 0) {
        const labelText = Array.from(hoveredMunis).join(', ');
        svg.select('text').text(labelText);
      } else {
        svg.select('text').text('');
      }
    } else {
      svg.select('text').text('');
    }
  }, [hoverZips, geo, muniRecords, metric]);

  //--------------------------------------------------------------------
  // Scatter panel
  //--------------------------------------------------------------------
  useEffect(() => {
    if (!muniRecords) return;

    const svg = d3.select(scatterRef.current);
    svg.selectAll('*').remove();

    // Increase bottom margin even further to prevent text cutoff
    const m = { t: 40, r: 30, b: 150, l: 70 };
    const w = SCATTER - m.l - m.r;
    const h = SCATTER - m.t - m.b;

    const x = d3.scaleLinear()
      .domain(d3.extent(muniRecords, d => d.investorChange))
      .nice()
      .range([0, w]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(muniRecords, d => d.evictions)])
      .nice()
      .range([h, 0]);

    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).tickFormat(v => `${v}%`))
      .selectAll('text')
      .attr('font-size', 14)
      .attr('dy', '0.75em');

    g.append('g')
      .call(d3.axisLeft(y));

    // Larger tick fonts
    g.selectAll('.tick text').attr('font-size', 14);

    // Axis labels
    g.append('text')
      .attr('x', w / 2)
      .attr('y', h + 50)
      .attr('text-anchor', 'middle')
      .attr('font-size', 14)
      .text('% relative change investor share (2012–2022)');

    g.append('text')
      .attr('x', -h / 2)
      .attr('y', -55)
      .attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'middle')
      .attr('font-size', 14)
      .text('No‑cause evictions per 100 000 households (2020–2024)');

    g.append('text')
      .attr('x', w / 2)
      .attr('y', -25)
      .attr('text-anchor', 'middle')
      .attr('font-size', 18)
      .attr('font-weight', 'bold')
      .text('Investor Change vs. No‑Cause Evictions & Rent Burden');

    // ------------------------------------------------------------------
    // Linear trendline (least‑squares fit across all finite points)
    // ------------------------------------------------------------------
    const pts = muniRecords.filter(d =>
      Number.isFinite(d.investorChange) &&
      Number.isFinite(d.evictions)
    );
    if (pts.length > 1) {
      const n = pts.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      pts.forEach(p => {
        sumX  += p.investorChange;
        sumY  += p.evictions;
        sumXY += p.investorChange * p.evictions;
        sumX2 += p.investorChange * p.investorChange;
      });
      const denom = n * sumX2 - sumX * sumX;
      if (denom !== 0) {
        const slope = (n * sumXY - sumX * sumY) / denom;
        const intercept = (sumY - slope * sumX) / n;

        const x0d = x.domain()[0];
        const x1d = x.domain()[1];
        const y0d = slope * x0d + intercept;
        const y1d = slope * x1d + intercept;

        g.append('line')
          .attr('x1', x(x0d))
          .attr('y1', y(y0d))
          .attr('x2', x(x1d))
          .attr('y2', y(y1d))
          .attr('stroke', '#000')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,2')
          .attr('pointer-events', 'none');
      }
    }

    // Create color scale for rent burden
    const costExtent = d3.extent(muniRecords, d => d.costChange).map(v => 
      Number.isFinite(v) ? v : 0
    );
    const costColorScale = d3.scaleSequential()
      .domain(costExtent)
      .interpolator(d3.interpolateRdBu);

    // Points - modified to use rent burden for color and have consistent hover behavior
    g.selectAll('circle')
      .data(muniRecords)
      .join('circle')
      .attr('cx', d => x(d.investorChange))
      .attr('cy', d => y(d.evictions))
      .attr('r', d => scatterR(d.evictions))
      .attr('fill', d => Number.isFinite(d.costChange) ? costColorScale(d.costChange) : '#888')
      .attr('stroke', d => d.zips.some(z => hoverZips.has(z)) ? '#000' : '#444')
      .attr('stroke-width', d => d.zips.some(z => hoverZips.has(z)) ? 2 : 0.4)
      .attr('opacity', 0.8)
      .on('mouseover', (_, d) => setHoverZips(new Set(d.zips)))
      .on('mouseout', () => setHoverZips(new Set()))
      .on('click', (_, d) => {
        setLockedZips(prev => {
          const s = new Set(prev);
          const all = d.zips.every(z => s.has(z));
          (all ? d.zips : []).forEach(z => s.delete(z));
          (!all ? d.zips : []).forEach(z => s.add(z));
          return Array.from(s);
        });
      });

    // Create drag selection rect for the scatter plot
    const dragRect = g.append('rect')
      .attr('class', 'drag-selection')
      .attr('fill', 'rgba(100, 150, 230, 0.2)')
      .attr('stroke', 'rgba(100, 150, 230, 0.8)')
      .attr('stroke-width', 1)
      .style('pointer-events', 'none')   // prevent the selection box from capturing pointer events
      .style('display', 'none');

    // MouseDown event to start drag
    g.on('mousedown', function(event) {
      // Only start drag if not on a circle
      if (event.target.tagName !== 'circle') {
        const [xPos, yPos] = d3.pointer(event, g.node());
        setIsScatterDragging(true);
        setScatterDragStart([xPos, yPos]);
        dragRect
          .attr('x', xPos)
          .attr('y', yPos)
          .attr('width', 0)
          .attr('height', 0)
          .style('display', null);
        
        // Clear previous selections if not holding shift
        if (!event.shiftKey) {
          setLockedZips([]);
        }
      }
    });

    // MouseMove event to update drag
    g.on('mousemove', function(event) {
      if (!isScatterDragging) return;
      
      const [x0, y0] = scatterDragStart;
      const [x1, y1] = d3.pointer(event, g.node());
      
      dragRect
        .attr('x', Math.min(x0, x1))
        .attr('y', Math.min(y0, y1))
        .attr('width', Math.abs(x1 - x0))
        .attr('height', Math.abs(y1 - y0));
      
      setScatterDragEnd([x1, y1]);
    });

    // MouseUp event to end drag and select points
    g.on('mouseup', function(event) {
      if (!isScatterDragging) return;
      
      // Hide drag rectangle
      dragRect.style('display', 'none');
      
      if (scatterDragStart && scatterDragEnd) {
        const [x0, y0] = scatterDragStart;
        const [x1, y1] = scatterDragEnd;
        
        // Check if it's just a click (very small rectangle)
        if (Math.abs(x1 - x0) < 5 && Math.abs(y1 - y0) < 5) {
          // If it's a click on background, deselect everything
          if (event.target.tagName !== 'circle') {
            setLockedZips([]);
          }
        } else {
          // Find points in the drag rectangle
          const selectedZips = new Set();
          muniRecords.forEach(d => {
            const px = x(d.investorChange);
            const py = y(d.evictions);
            if (
              px >= Math.min(x0, x1) &&
              px <= Math.max(x0, x1) &&
              py >= Math.min(y0, y1) &&
              py <= Math.max(y0, y1)
            ) {
              d.zips.forEach(z => selectedZips.add(z));
            }
          });
          
          // Update lockedZips with selected points
          setLockedZips(prev => {
            const result = new Set(prev);
            selectedZips.forEach(zip => result.add(zip));
            return Array.from(result);
          });
        }
      }
      
      // Reset drag state
      setIsScatterDragging(false);
      setScatterDragStart(null);
      setScatterDragEnd(null);
    });

    // Add color legend for rent burden below the scatter plot
    const legendHeight = 15;
    const legendWidth = w * 0.4;
    const legendX = (w - legendWidth) / 2 - 70;
    const legendY = h - 250; // Increased from 65 to 80 to move it down
    
    // Create gradient definition
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'cost-burden-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');
    
    // Add gradient stops
    const numStops = 10;
    for (let i = 0; i < numStops; i++) {
      const offset = `${i / (numStops - 1) * 100}%`;
      const value = costExtent[0] + (i / (numStops - 1)) * (costExtent[1] - costExtent[0]);
      gradient.append('stop')
        .attr('offset', offset)
        .attr('stop-color', costColorScale(value));
    }
    
    // Draw legend rectangle with gradient
    g.append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#cost-burden-gradient)')
      .attr('stroke', '#333')
      .attr('stroke-width', 0.5);
    
    // Add legend title
    g.append('text')
      .attr('x', legendX + legendWidth / 2)
      .attr('y', legendY - 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', 14)
      .attr('font-weight', 'bold')
      .text('% Change in Rent Burden')
      .append('tspan')
      .attr('x', legendX + legendWidth / 2)
      .attr('dy', '1.2em')
      .text('(2012-2022)');
    
    // Add min and max labels
    g.append('text')
      .attr('x', legendX)
      .attr('y', legendY + legendHeight + 15)
      .attr('text-anchor', 'start')
      .attr('font-size', '12px')
      .text(`${costExtent[0].toFixed(1)}%`);
    
    g.append('text')
      .attr('x', legendX + legendWidth)
      .attr('y', legendY + legendHeight + 15)
      .attr('text-anchor', 'end')
      .attr('font-size', '12px')
      .text(`${costExtent[1].toFixed(1)}%`);
    
    // Add a stylized text box with key message below the scatter plot
    const messageBoxWidth = w * 0.75; // Reduced from 0.9 to keep box from being too wide
    const messageBoxX = (w - messageBoxWidth) / 2 - 20;
    const messageBoxY = h + 80;
    
    // Create message text group first to calculate its dimensions later
    const messageGroup = g.append('g')
      .attr('class', 'message-group')
      .attr('transform', `translate(${messageBoxX + messageBoxWidth/2}, ${messageBoxY + 25})`); // Added more space
    
    // Add the message text with line breaks for better layout, increased font size
    const messageText = messageGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', '18px') // Increased from 14px to 18px
      .attr('font-style', 'italic')
      .attr('fill', '#333')
      .text("Increases in investor share of sales in Boston's");
      
    // Break the first line into two lines for better fit with larger font
    messageText.append('tspan')
      .attr('x', 0)
      .attr('dy', '1.2em')
      .text("residential market track with increases");
      
    messageText.append('tspan')
      .attr('x', 0)
      .attr('dy', '1.2em')
      .text("in renter cost burden (rent >30% of income) and");
    
    messageText.append('tspan')
      .attr('x', 0)
      .attr('dy', '1.2em') // Added more vertical space before the bold line
      .text("no-cause eviction rates. People are being displaced.");
    
    // Get the bounding box of the text to size the background rectangle
    const textBBox = messageGroup.node().getBBox();
    const padding = 20; // Increased padding from 15 to 20
    
    // Create styled text box with drop shadow, positioned behind the text
    messageGroup.insert('rect', 'text')
      .attr('x', -textBBox.width/2 - padding)
      .attr('y', -textBBox.height/2 + padding/2) // Added more space at top
      .attr('width', textBBox.width + padding*2)
      .attr('height', textBBox.height + padding*2) // Doubled the padding for height
      .attr('rx', 10) // Increased from 8 to 10
      .attr('ry', 10) // Increased from 8 to 10
      .attr('fill', 'rgba(250, 250, 255, 0.95)')
      .attr('stroke', '#336')
      .attr('stroke-width', 1.5) // Increased from 1 to 1.5
      .style('filter', 'drop-shadow(3px 3px 4px rgba(0,0,0,0.25))'); // Enhanced shadow
    
    // Update the overall SVG height to ensure all content is visible
    const totalHeight = messageBoxY + textBBox.height + padding*2 + 50; // Increased margin from 20 to 50
    const minHeight = SCATTER; // Ensure we don't make the SVG smaller than its original size
    svg.attr('height', Math.max(totalHeight, minHeight));
    
    // Add a debugging rectangle to see the actual bottom boundary of our view
    // Comment this out in production
    // svg.append('rect')
    //   .attr('x', 0)
    //   .attr('y', totalHeight - 5)
    //   .attr('width', SCATTER)
    //   .attr('height', 5)
    //   .attr('fill', 'red');

  }, [muniRecords, hoverZips, scatterR, isScatterDragging, scatterDragStart, scatterDragEnd]);

  //--------------------------------------------------------------------
  // Update scatter strokes on hoverZips change
  //--------------------------------------------------------------------
  useEffect(() => {
    const svg = d3.select(scatterRef.current).select('g');
    if (!svg.empty()) {
      svg.selectAll('circle')
        .attr('stroke-width', d => d.zips && d.zips.some(z => hoverZips.has(z)) ? 2 : 0.4)
        .attr('stroke', d => d.zips && d.zips.some(z => hoverZips.has(z)) ? '#000' : '#444');
    }
  }, [hoverZips]);

  //--------------------------------------------------------------------
  // Highlight locked selections in visualizations
  //--------------------------------------------------------------------
  useEffect(() => {
    // Update map polygons to show locked selections
    if (geo && muniRecords) {
      const lockedSet = new Set(lockedZips);
      d3.select(mapRef.current).selectAll('path')
        .attr('fill-opacity', d => {
          const zips = muni2zips.current[d.properties.municipal] || [];
          return lockedZips.length > 0 && !zips.some(z => lockedSet.has(z)) ? 0.3 : 1;
        });
    }
    
    // Update scatter points to show locked selections
    const scatterG = d3.select(scatterRef.current).select('g');
    if (!scatterG.empty()) {
      const lockedSet = new Set(lockedZips);
      scatterG.selectAll('circle')
        .attr('opacity', d => {
          return lockedZips.length > 0 && !d.zips.some(z => lockedSet.has(z)) ? 0.2 : 0.8;
        })
        .attr('stroke', d => {
          return d.zips.some(z => 
            lockedSet.has(z) || hoverZips.has(z)
          ) ? '#000' : '#444';
        })
        .attr('stroke-width', d => {
          return d.zips.some(z => 
            lockedSet.has(z) || hoverZips.has(z)
          ) ? 2 : 0.4;
        });
    }
  }, [lockedZips, geo, muniRecords, hoverZips]);

  //--------------------------------------------------------------------
  // Add a side effect to cancel drag if mouse leaves the window
  //--------------------------------------------------------------------
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging || isScatterDragging) {
        if (isDragging) {
          setIsDragging(false);
          setDragStart(null);
          setDragEnd(null);
        }
        if (isScatterDragging) {
          setIsScatterDragging(false);
          setScatterDragStart(null);
          setScatterDragEnd(null);
        }
      }
    };
    
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isDragging, isScatterDragging]);

  //--------------------------------------------------------------------
  // Render
  //--------------------------------------------------------------------
  if (!zipRecords || !muniRecords) return <div>Loading data…</div>;

  return (
    <div style={{ textAlign: 'left' }}>
      <div style={{ marginBottom: '6px' }}>
        <label style={{ marginRight: '6px', fontSize: '20px', fontWeight: 'bold' }}>Choropleth metric:</label>
        <select
          value={metric}
          onChange={e => setMetric(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            // background: 'linear-gradient(180deg,#f9fbff 0%,#e7efff 100%)',
            border: '1px solid #667',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            minWidth: '260px',
            lineHeight: '1.4'
          }}
        >
          <option value="cost">% change rent cost‑burden</option>
          <option value="investor">% change investor share</option>
          <option value="evict">No‑cause evictions (2020–2024 per 100 000 households)</option>
        </select>
      </div>

      {/* <div style={{ 
        padding: '8px 16px',
        marginBottom: '12px',
        backgroundColor: 'rgba(255,248,220,0.7)',
        border: '1px solid #e0d0a0',
        borderRadius: '6px',
        fontSize: '15px',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <span style={{ marginRight: '8px', fontSize: '18px' }}>💡</span>
        <span><strong>Tip:</strong> Hover over the map or data points to see relationships.</span>
      </div> */}

      <div style={{ display: 'flex', gap: '18px' }}>
        <svg ref={mapRef} width={MAP_W} height={MAP_H} style={{ border: '0px solid #ccc' }} />
        <svg ref={scatterRef} width={SCATTER} height={SCATTER} />
      </div>

      {/* <div style={{ marginTop: '28px', fontSize: '14px', lineHeight: '1.5' }}>
        <h4 style={{ marginBottom: '8px' }}>Data sources</h4>
        <ul style={{ paddingLeft: '20px', margin: 0 }}>
          <li>IPUMS NHGIS, ACS 5‑year estimates 2009‑13 (dataset ds201) and 2019‑23 (dataset ds267) for renter cost‑burden metrics citeturn0file0turn0file1</li>
          <li>Massachusetts CHIA <em>2022 ZIP Code List</em> for municipality‑ZIP cross‑walk</li>
          <li>MAPC Regional Residential Sales file (2020‑2024) for use‑code‑filtered purchase counts</li>
          <li>Massachusetts Trial Court Electronic Case Access: no‑cause eviction filings (2020‑2024)</li>
          <li>MAPC <em>Municipalities</em> GeoJSON (simplified) for map polygons</li>
        </ul>
      </div> */}
    </div>
  );
}

export default HousingDashboard;
