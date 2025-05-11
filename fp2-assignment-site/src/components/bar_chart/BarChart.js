import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import './BarChart.css';

/**
 * BarLineChart React component using D3
 * Props:
 *  - csvUrl: URL/path to CSV file with headers: year, line1, line2, bar
 *  - width: SVG width
 *  - height: SVG height
 *  - margin: { top, right, bottom, left }
 */
const BarChart = ({
  csvUrl = `${process.env.PUBLIC_URL}/nitishplot/income_data.csv`,
  width = 800,
  height = 400,
  margin = { top: 20, right: 30, bottom: 30, left: 40 }
}) => {
  const containerRef = useRef();
  const svgRef = useRef();
  const tooltipRef = useRef();
  const [data, setData] = useState([]);

  // Load and parse CSV with numeric year
  useEffect(() => {
    d3.csv(csvUrl)
      .then(raw => {
        const parsed = raw.map(d => ({
          year: +d.year,
          line1: +d.line1,
          line2: +d.line2,
          bar: +d.bar
        }));
        setData(parsed);
      })
      .catch(err => console.error('Error loading CSV:', err));
  }, [csvUrl]);

  // Draw chart
  useEffect(() => {
    if (!data.length) return;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.select('.chart-content')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleBand()
      .domain(data.map(d => d.year))
      .range([0, innerWidth])
      .padding(0.1);

    const maxY = d3.max(data, d => Math.max(d.line1, d.line2, d.bar));
    const yScale = d3.scaleLinear()
      .domain([0, maxY])
      .nice()
      .range([innerHeight, 0]);

    // Axes
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format('d'));
    const yAxis = d3.axisLeft(yScale);

    g.select('.x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);
    g.select('.y-axis').call(yAxis);

    // Clear previous
    g.selectAll('.bar, .line1, .line2, .hover-capture').remove();

    // Bars
    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.year))
      .attr('width', xScale.bandwidth())
      .attr('y', innerHeight)
      .attr('height', 0)
      .transition().duration(800)
      .attr('y', d => yScale(d.bar))
      .attr('height', d => innerHeight - yScale(d.bar));

    // Lines
    ['line1', 'line2'].forEach((key, i) => {
      const lineGen = d3.line()
        .x(d => xScale(d.year) + xScale.bandwidth() / 2)
        .y(d => yScale(d[key]));

      g.append('path')
        .datum(data)
        .attr('class', key)
        .attr('fill', 'none')
        .attr('d', lineGen)
        .attr('stroke-dasharray', function() { return this.getTotalLength(); })
        .attr('stroke-dashoffset', function() { return this.getTotalLength(); })
        .transition()
        .duration(1000)
        .delay(200 * (i + 1))
        .attr('stroke-dashoffset', 0);
    });

    // Tooltip overlay
    const tooltip = d3.select(tooltipRef.current);
    g.append('rect')
      .attr('class', 'hover-capture')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .on('mousemove', event => {
        const [mx] = d3.pointer(event);
        const idx = Math.round(mx / innerWidth * (data.length - 1));
        const d = data[Math.max(0, Math.min(data.length - 1, idx))];

        tooltip.html(`
          <strong>${d.year}</strong><br/>
          Line1: ${d.line1}<br/>
          Line2: ${d.line2}<br/>
          Bar: ${d.bar}
        `)
        .style('opacity', 1)
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY + 10}px`);
      })
      .on('mouseout', () => tooltip.style('opacity', 0));

    // Scroll trigger (optional)
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) observer.disconnect();
      });
    }, { threshold: 0.1 });
    observer.observe(containerRef.current);

  }, [data, width, height, margin]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <svg ref={svgRef}>
        <g className="chart-content">
          <g className="x-axis" />
          <g className="y-axis" />
        </g>
      </svg>
      <div ref={tooltipRef} className="tooltip" />
    </div>
  );
};

export default BarChart;
