import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import FancyScale from './FancyScale';
import './ProfileCard.css';

/**
 * ProfileCard
 * -----------
 * Props
 *   region       string | null
 *   ratio        number
 *   currentRate  number
 *   onClose      () => void   – called when user clicks the “×”
 *   salesData    array        – CSV data parsed into an array of objects
 *   year         number       – Current year selected on the timeline
 *
 * Renders the scale only (large) when region == null.
 */
export default function ProfileCard({ region, ratio, currentRate, onClose, salesData, year }) {
  const overview = region == null;
  const chartRef = useRef();
  const noDataRef = useRef();
  const legendRef = useRef(); 

  useEffect(() => {
    if (!region || !salesData.length) return;

    // Filter data for the selected region and the current year
    const filteredData = salesData
      .filter((d) => d.Neighborhood.toLowerCase() === region.toLowerCase() && d.Year === year)
      .reduce((acc, curr) => {
        acc[curr['Seller Investor Type']] = (acc[curr['Seller Investor Type']] || 0) + curr['Total Price Volume'];
        return acc;
      }, {});

    console.log("Filtered Data for Pie Chart:", filteredData);

    // If no data is available, display the "No data available" message
    if (Object.keys(filteredData).length === 0) {
      d3.select(chartRef.current).selectAll('*').remove(); // Clear any existing chart
      d3.select(noDataRef.current).text(
        'No data available!\nSelect a different region ...'
      ); // Display the message
      return;
    }

    // Clear the "No data available" message
    d3.select(noDataRef.current).text('');

    // Prepare the data for the pie chart
    const keys = ['Small', 'Medium', 'Large', 'Institutional']; // Ensure consistent order
    const pieData = keys.map((key) => ({
      key,
      value: filteredData[key] || 0, // Default to 0 if no data for the key
    }));
    console.log("Pie Data:", pieData);

    // Set up dimensions and margins
    const width = 300;
    const height = 100;
    const radius = 50;

    // Clear any existing chart
    // d3.select(chartRef.current).selectAll('*').remove();

    // Create the SVG container
    const svg = d3
    .select(chartRef.current)
    .selectAll('svg')
    .data([null]) // Bind a single data point to ensure the SVG is created only once
    .join('svg')
    .attr('width', width)
    .attr('height', height);

    const g = svg
    .selectAll('g')
    .data([null])
    .join('g')
    .attr('transform', `translate(${width / 2+50},${height / 2})`);
    // Create the pie generator
    const pie = d3.pie().value((d) => d.value).sort(null); // Disable automatic sorting

    // Create the arc generator
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    // Create the color scale
    const color = d3.scaleOrdinal().domain(keys).range(d3.schemePaired);

    // Add tooltip
    const tooltip = d3
      .select('body') // Append to body for proper positioning
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', '#fff')
      .style('border', '1px solid #ccc')
      .style('padding', '5px')
      .style('pointer-events', 'none');

    // Draw the pie chart with transitions
    const paths = g
      .selectAll('path')
      .data(pie(pieData), (d) => d.data.key); // Use a key function to bind data properly

    // Handle entering arcs
    paths
      .enter()
      .append('path')
      .attr('fill', (d) => color(d.data.key))
      .each(function (d) {
        // Initialize with the current state if it doesn't exist
        this._current = this._current || { startAngle: d.startAngle, endAngle: d.startAngle };
      })
      .on('mouseover', (event, d) => {
        tooltip
          .style('opacity', 1)
          .html(
            `<strong>Type:</strong> ${d.data.key}<br>
             <strong>Value:</strong> ${d.data.value.toLocaleString()}`
          );
      })
      .on('mousemove', (event) => {
        tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 28}px`);
      })
      .on('mouseout', () => {
        tooltip.style('opacity', 0);
      })
      .merge(paths) // Merge the enter and update selections
      .transition()
      .duration(400) // Smooth transition duration
      .attrTween('d', function (d) {
        const interpolate = d3.interpolate(this._current, d);
        this._current = interpolate(1); // Update the current state
        return function (t) {
          return arc(interpolate(t));
        };
      });

    // Handle exiting arcs
    paths
      .exit()
      .transition()
      .duration(750)
      .attrTween('d', function (d) {
        const interpolate = d3.interpolate(this._current, { startAngle: d.startAngle, endAngle: d.startAngle });
        return function (t) {
          return arc(interpolate(t));
        };
      })
      .remove();

    // Add legend
    
      const legend = svg
        .append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${50})`); // Position the legend to the right of the chart
  
      keys.forEach((key, i) => {
        const legendItem = legend.append('g').attr('transform', `translate(0, ${i * 20  + 10})`);
  
        legendItem
          .append('rect')
          .attr('width', 10)
          .attr('height', 10)
          .attr('fill', color(key));
  
        legendItem
          .append('text')
          .attr('x', 15)
          .attr('y', 10)
          .style('font-size', '12px')
          .text(key);
      });
  
      legendRef.current = legend;
    
  }, [region, salesData, year]);

  return (
    <div className={`profile-card ${overview ? 'overview' : ''}`}>
      {/* close icon – only when a town is selected */}
      {!overview && (
        <button className="profile-card__close" onClick={onClose} title="Reset">
          ×
        </button>
      )}

      {/* animated balance scale */}
      <FancyScale ratio={ratio} duration={600} />
      {overview && (
        <div className="profile-card__text">
          <p className="profile-card__text">
            Overall corporate-ownership rate:&nbsp;
            <strong>{(currentRate * 100).toFixed(1)} %</strong>
          </p>
          <p className="profile-card__text">
            Relative ownership rate shown between owner-occupied properties and corporate-owned, compared to a qualitatively 'balanced' 7.5% level.
          </p>
        </div>
      )}

      {/* detail text (hidden in overview mode) */}
      {!overview && (
        <>
          <h3 className="profile-card__title">{region}</h3>
          <p className="profile-card__text">
            Corporate-ownership rate:&nbsp;
            <strong>{(currentRate * 100).toFixed(1)} %</strong>
          </p>
          <div  style={{ height: '100px' }}>
          <p className='profile-card__text' style={{ textAlign: 'left' }}>Breakdown of price volume by corporate investor type: </p>

          {/* Pie Chart or No Data Message */}
          <div className="profile-card__chart" ref={chartRef}></div>
          <div className="profile-card__no-data" ref={noDataRef}></div>
          </div>
          
        </>
      )}
    </div>
  );
}
