import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './BarChart.css';

const BarChart = () => {
  const chartRef = useRef(null);
  const containerRef = useRef(null); // Ref for the container div
  const [animationProgress, setAnimationProgress] = useState(0); // Tracks animation progress (0 to 1)
  const [allowScroll, setAllowScroll] = useState(false); // Controls whether scrolling past the chart is allowed
  const [isActive, setIsActive] = useState(false); // Tracks if the bar chart is in view
  const [data, setData] = useState([]); // State to store the loaded data

  useEffect(() => {
    // Load the CSV file
    d3.csv(`${process.env.PUBLIC_URL}/nitishplot/income_data.csv`).then((csvData) => {
      const parsedData = csvData.map(d => ({
        year: +d.year,
        line1: +d.line1, // Convert line1 to a number
        line2: +d.line2, // Convert line2 to a number
        bar: +d.bar, // Convert bar to a number
      }));
      setData(parsedData);
      console.log('Raw CSV Data:', csvData); // Debugging: Check the parsed data
      console.log('Parsed CSV Data:', parsedData); // Debugging: Check the parsed data
    }).catch(error => {
      console.error('Error loading CSV data:', error); // Debugging: Log any errors
    });
  }, []);

  useEffect(() => {
    if (data.length === 0) return; // Wait until data is loaded
    const svg = d3.select(chartRef.current);
    const width = 800;
    const height = 500;
    const margin = { top: 60, right: 30, bottom: 70, left: 80 };

    svg.attr('width', width).attr('height', height);

    const xScale = d3.scaleBand()
      .domain(data.map(d => d.year)) // Use years from the data
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([-800000, 800000]) // Y-axis range from -800K to 800K
      .range([height - margin.bottom, margin.top]);

    // Clear previous elements
    svg.selectAll('*').remove();

    // Add graph title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', margin.top / 2 - 50) // Adjusted to prevent cutting off
      .attr('text-anchor', 'middle')
      .style('font-size', '30px')
      .style('font-weight', 'bold')
      .text('Single Family Home Price vs. Median Income');

    // Add X-axis title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - margin.bottom / 8) // Adjusted to add spacing below the axis
      .attr('text-anchor', 'middle')
      .style('font-size', '24px')
      .text('Year');

    // Add Y-axis title
    svg.append('text')
      .attr('x', -(height / 2))
      .attr('y', margin.left / 8) // Adjusted to add spacing to the left of the axis
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .style('font-size', '24px')
      .text('Dollars (USD $)');

    // Draw bars (initially hidden)
    const bars = svg
      .selectAll('.bar')
      .data(data)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.year))
      .attr('y', yScale(0)) // Start at 0
      .attr('width', xScale.bandwidth())
      .attr('height', 0) // Start with height 0
      .attr('fill', '#69b3a2')
      .attr('opacity', 0); // Initially hidden

    // Line generator
    const lineGenerator = d3.line()
      .x(d => xScale(d.year) + xScale.bandwidth() / 2)
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Draw line 1 (initially hidden)
    const line1 = svg
      .append('path')
      .datum(data.map(d => ({ year: d.year, value: d.line1 })))
      .attr('class', 'line line1')
      .attr('d', lineGenerator)
      .attr('fill', 'none')
      .attr('stroke', '#ff5733')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', function () {
        return this.getTotalLength();
      })
      .attr('stroke-dashoffset', function () {
        return this.getTotalLength();
      });

    // Draw line 2 (initially hidden)
    const line2 = svg
      .append('path')
      .datum(data.map(d => ({ year: d.year, value: d.line2 })))
      .attr('class', 'line line2')
      .attr('d', lineGenerator)
      .attr('fill', 'none')
      .attr('stroke', '#3375ff')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', function () {
        return this.getTotalLength();
      })
      .attr('stroke-dashoffset', function () {
        return this.getTotalLength();
      });

    // Add axes
    svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));

    svg.append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale).tickFormat(d => `${d / 1000}K`));
    
    // Add labels and arrows
    svg.append('text')
      .attr('x', width - margin.right)
      .attr('y', yScale(data[data.length - 1].line1) - 10)
      .attr('text-anchor', 'end')
      .attr('fill', '#ff5733')
      .text('Line 1: Single-family Median Home Price');

    svg.append('text')
      .attr('x', width - margin.right)
      .attr('y', yScale(data[data.length - 1].line2) - 10)
      .attr('text-anchor', 'end')
      .attr('fill', '#3375ff')
      .text('Line 2: Single-family Median Income');
    
    svg.append('text')
      .attr('x', width - margin.right + 200)
      .attr('y', height - margin.bottom - 100)
      .attr('text-anchor', 'end')
      .attr('fill', '#69b3a2')
      .text('Bars: Income-to-Price Deficit');

    // Update animations based on animationProgress
    const updateAnimations = () => {
      const progress = animationProgress;

      // Animate Line 1
      const line1Length = line1.node().getTotalLength();
      line1.attr('stroke-dashoffset', line1Length * (1 - Math.min(progress * 2, 1))); // First half of progress

      // Animate Line 2
      const line2Length = line2.node().getTotalLength();
      if (progress > 0.5) {
        line2.attr('stroke-dashoffset', line2Length * (1 - Math.min((progress - 0.5) * 2, 1))); // Second half of progress
      }

      // Fade in bars
      bars
        .attr('opacity', Math.max(0, Math.min((progress - 0.95) * 20, 1))) // Fade in during first half
        .attr('y', d => yScale(Math.max(0, d.bar)))
        .attr('height', d => Math.abs(yScale(d.bar) - yScale(0)));
      
      // Show annotation for Line 1
      if (progress >= 0.2) {

        svg.append('line')
          .attr('x1', xScale(data[8].year) + xScale.bandwidth() / 2) // Example: Pointing to the 6th data point
          .attr('y1', yScale(data[8].line1))
          .attr('x2', margin.left + 200) // Arrow end near the annotation
          .attr('y2', margin.top + 20)
          .attr('stroke', '#000000')
          .attr('stroke-width', 2)
          .attr('marker-end', 'url(#arrowhead)'); // Add arrowhead marker

        svg.append('foreignObject')
          .attr('x', margin.left + 20)
          .attr('y', margin.top)
          .attr('width', 200)
          .attr('height', 100)
          .append('xhtml:div')
          .style('font-size', '14px')
          .style('background', '#fff')
          .style('border', '1px solid #ccc')
          .style('padding', '10px')
          .html('Home price median dips after \'08 Great Recession.');
      }
      // Show annotation for Line 1
      if (progress >= 0.5) {

        svg.append('line')
          .attr('x1', xScale(data[20].year) + xScale.bandwidth() / 2) // Example: Pointing to the 6th data point
          .attr('y1', yScale(data[20].line1))
          .attr('x2', width - margin.right + 20) // Arrow end near the annotation
          .attr('y2', margin.top + 20)
          .attr('stroke', '#000000')
          .attr('stroke-width', 2)
          .attr('marker-end', 'url(#arrowhead)'); // Add arrowhead marker
        
        svg.append('foreignObject')
          .attr('x', width - margin.right + 20)
          .attr('y', margin.top)
          .attr('width', 200)
          .attr('height', 100)
          .append('xhtml:div')
          .style('font-size', '14px')
          .style('background', '#fff')
          .style('border', '1px solid #ccc')
          .style('padding', '10px')
          .html('Massive spike in home prices during the pandemic.');
      }

      if (progress >= 0.65) {
        // Show annotation for Line 2
        svg.append('foreignObject')
          .attr('x', width - margin.right + 10)
          .attr('y', margin.top + 150)
          .attr('width', 200)
          .attr('height', 100)
          .append('xhtml:div')
          .style('font-size', '14px')
          .style('background', '#fff')
          .style('border', '1px solid #ccc')
          .style('padding', '10px')
          .html('<strong> Family incomes fail to keep up with home prices! </strong>');
      }

      if (progress >= 0.95) {
        // Show annotation for Bars
        svg.append('foreignObject')
          .attr('x', width - margin.right - 500)
          .attr('y', height - margin.bottom - 100)
          .attr('width', 200)
          .attr('height', 100)
          .append('xhtml:div')
          .style('font-size', '14px')
          .style('background', '#fff')
          .style('border', '1px solid #ccc')
          .style('padding', '10px')
          .html('<strong> Exponential trend in price-to-income deficit! </strong>');
      }
      


    };

    updateAnimations();
  }, [animationProgress, data]);

  useEffect(() => {
    const handleScroll = (e) => {
      if (isActive && !allowScroll) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.005 : -0.005; // Adjust scroll sensitivity
        setAnimationProgress(prev => {
          const newProgress = Math.min(Math.max(prev + delta, 0), 1);
          if (newProgress === 1) setAllowScroll(true); // Allow scrolling past the chart once animation is complete
          if (newProgress === 0) setAllowScroll(false); // Allow scrolling back up
          return newProgress;
        });
      }
    };

    window.addEventListener('wheel', handleScroll, { passive: false });
    return () => window.removeEventListener('wheel', handleScroll);
  }, [isActive, allowScroll]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsActive(entry.isIntersecting); // Activate when the bar chart is in view
      },
      { threshold: 0.95 } // Trigger when 95% of the component is visible
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [data]);

  return (
    <div ref={containerRef} className='bar section' id="bar" style={{ position: 'relative', overflow: 'visible' }}>
      <svg ref={chartRef} style={{ overflow: 'visible' }}></svg>
    </div>
  );
};

export default BarChart;