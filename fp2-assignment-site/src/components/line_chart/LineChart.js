import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import "./LineChart.css";






export default function AnimatedLineChart({
  width = 800,
  height = 700,
  margin = { top: 75, right: 30, bottom: 60, left: 95 }
}) {
  const svgRef = useRef();
  const tooltipRef = useRef();

  useEffect(() => {
    // clear any old content
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const chartW = width - margin.left - margin.right;
    const chartH = height - margin.top - margin.bottom;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select(tooltipRef.current);

    // Load both CSVs in parallel
    Promise.all([
      d3.csv(`${process.env.PUBLIC_URL}/nitishplot/line_data.csv`),
      d3.csv(`${process.env.PUBLIC_URL}/nitishplot/census_income.csv`)
    ]).then(([rawData, rawCensus]) => {
      // parse numeric fields
      rawData.forEach(d => {
        d.year = +d.year;
        // d.price = +d.price;
        d.price = parseFloat(d.price.replace(/[$,]/g, ""));  // remove $ and commas
      });
      rawCensus.forEach(d => {
        d.year   = +d.year;
        d.income = +d.income;
      });

      const tooltip = d3.select(tooltipRef.current);

      // group neighborhoods
      const nested = d3.group(rawData, d => d.neighborhood);
      nested.forEach(arr => arr.sort((a, b) => a.year - b.year));

      // sort census
      rawCensus.sort((a, b) => a.year - b.year);

      // scales: include both datasets in domain calculations
      const x = d3.scaleLinear()
        .domain(d3.extent([
          ...rawData.map(d => d.year),
          ...rawCensus.map(d => d.year)
        ]))
        .range([0, chartW]);

      const y = d3.scaleLinear()
        .domain([
          0,
          d3.max([
            d3.max(rawData, d => d.price),
            d3.max(rawCensus, d => d.income)
          ])
        ]).nice()
        .range([chartH, 0]);

      // axes
      g.append("g")
        .attr("transform", `translate(0,${chartH})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));
      g.append("text")
        .attr("class", "axis-label x-axis-label")
        .attr("text-anchor", "middle")
        .attr("x", chartW / 2)
        .style('font-size', '20px')
        .style('font-weight', 'bold')
        .attr("y", chartH + margin.bottom - 5)   // a few pixels above the bottom margin
        .text("Year");
    
      g.append("g")
        .call(d3.axisLeft(y));
      g.append("text")
        .attr("class", "axis-label y-axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -chartH / 2)
        .style('font-size', '20px')
        .style('font-weight', 'bold')
        .attr("y", -margin.left + 15)           // nudges it right of the left margin
        .text("US Dollars");



      // ─── LEGEND (centered above plot) ──────────────────────────────────────
        // assume legend total width of ~200px (you can tweak this if you change text)
      const legendWidth = 200;
      const legendX = (chartW - legendWidth) / 2 - 290;
      const legendY = -margin.top + 10;  // nudges it into the top margin

      const legend = g.append("g")
          .attr("class", "legend")
          .attr("transform", `translate(${legendX}, ${legendY})`);

      // blue line entry
      legend.append("line")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", 20).attr("y2", 0)
      .attr("class", "census-line");

      legend.append("text")
      .attr("x", 25).attr("y", 5)
      .text("Boston Median Single-family Income");

      // red lines entry
      legend.append("line")
      .attr("x1", 0).attr("y1", 20)
      .attr("x2", 20).attr("y2", 20)
      .attr("stroke", "red")
      .attr("stroke-width", 4)
      .attr("opacity", 0.2);

      legend.append("text")
      .attr("x", 25).attr("y", 25)
      .text("Per-neighbhorhood Median Single-family Home Prices");
      // ────────────────────────────────────────────────────────────────────────

    // ─── EVENT LINES w/ HOTSPOTS ───────────────────────────────────────────
    const events = [
        { year: 2008, label: "2008 Great Recession Dip" },
        { year: 2019, label: "COVID-19 Pandemic Surge" }
    ];
  
    events.forEach(ev => {
        const xPos = x(ev.year);
    
        // 1) visible dotted line
        g.append("line")
        .attr("class", "event-line")
        .attr("x1", xPos).attr("x2", xPos)
        .attr("y1", 0)
        .attr("y2", chartH);
    
        // 2) invisible, wide hotspot on top
        g.append("line")
        .attr("class", "event-hotspot")
        .attr("x1", xPos).attr("x2", xPos)
        .attr("y1", 0)
        .attr("y2", chartH)
        .on("mouseover", (event) => {
            const [mx, my] = d3.pointer(event, svgRef.current.parentNode);
            tooltip
            .html(ev.label)
            .style("left", `${mx + 10}px`)
            .style("top",  `${my + 10}px`)
            .style("opacity", 1);
        })
        .on("mousemove", (event) => {
            const [mx, my] = d3.pointer(event, svgRef.current.parentNode);
            tooltip
            .style("left", `${mx + 10}px`)
            .style("top",  `${my + 10}px`);
        })
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });
      });
      // ────────────────────────────────────────────────────────────────────────  


      // line generators
      const priceLine = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.price));

      const incomeLine = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.income));

      /*// draw the blue census line first (behind)
      g.append("path")
        .datum(rawCensus)
        .attr("class", "census-line")
        .attr("d", incomeLine);*/





      // draw the blue census line first (behind)
      const censusPath = g.append("path")
        .datum(rawCensus)
        .attr("class", "census-line")
        .attr("d", incomeLine)
        .on("mouseenter", (event) => {
            // bring it to front
            d3.select(event.currentTarget).raise();
        
            // get mouse position relative to chart
            // const [mx, my] = d3.pointer(event, svgRef.current.parentNode);
            const [mx, my] = d3.pointer(event, g.node());
        
            // invert x to a year, then find the nearest census datum
            const x0 = x.invert(mx);
            const bisect = d3.bisector(d => d.year).left;
            const i = bisect(rawCensus, x0);
            const d0 = rawCensus[i - 1] || rawCensus[0];
            const d1 = rawCensus[i]     || d0;
            const closest = (Math.abs(x0 - d0.year) < Math.abs(d1.year - x0)) ? d0 : d1;
        
            // show tooltip
            tooltip
              .html(`
                <strong>Census Income, ${closest.year}</strong><br/>
                $${closest.income.toLocaleString()}
              `)
              .style("left",  `${mx + margin.left + 10}px`)
              .style("top",   `${my + margin.top + 10}px`)
              .style("opacity", 1);
          })
          .on("mousemove", (event) => {
            // const [mx, my] = d3.pointer(event, svgRef.current.parentNode);
            const [mx, my] = d3.pointer(event, g.node());
            tooltip
              .style("left", `${mx + margin.left + 10}px`)
              .style("top",  `${my + margin.top + 10}px`);
          })
          .on("mouseleave", () => {
            tooltip.style("opacity", 0);
          });





      // draw animated red lines
      const lines = g.selectAll(".line")
        .data(Array.from(nested), ([key]) => key)
        .join("path")
          .attr("class", "line")
          .attr("d", ([, vals]) => priceLine(vals))
          .attr("stroke", "red")
          .attr("fill", "none")
          .attr("stroke-width", 4)
          .attr("opacity", 0.2)
          .each(function() {
            const total = this.getTotalLength();
            d3.select(this)
              .attr("stroke-dasharray", `${total} ${total}`)
              .attr("stroke-dashoffset", total);
          })
          .on("mouseover", (event, [neighborhood, vals]) => {
            // coords within container
            const [mx, my] = d3.pointer(event, svgRef.current.parentNode);
            const year0 = Math.round(x.invert(mx - margin.left));
            const point = vals.find(d => d.year === year0) || vals[0];
            // lookup census for that year
            const censusPoint = rawCensus.find(d => d.year === year0) || rawCensus[0];
            
            d3.select(event.currentTarget)
              .classed("line--highlight", true)
              .raise();

            tooltip
              .html(`
                <strong>${neighborhood}, ${point.year} </strong><br/>
                <u>Single-family Home Price:</u> $${point.price.toLocaleString()}<br/>
                <u>Single-family Income:</u> $${censusPoint.income.toLocaleString()}</span>
              `)
              .style("left", `${mx + 10}px`)
              .style("top",  `${my + 10}px`)
              .style("opacity", 1);
          })
          .on("mousemove", event => {
            const [mx, my] = d3.pointer(event, svgRef.current.parentNode);
            tooltip
              .style("left", `${mx + 10}px`)
              .style("top",  `${my + 10}px`);
          })
          .on("mouseout", event => {
            
            d3.select(event.currentTarget)
              .classed("line--highlight", false);

            tooltip.style("opacity", 0);
          });

      // animate draw
      lines.transition()
        .duration(4500)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);
      lines.raise();
      


    

  

    }).catch(err => console.error("Error loading CSVs:", err));
  }, [width, height, margin]);

  return (
    <div className="chart-container">
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} className="tooltip"></div>
    </div>
  );
}