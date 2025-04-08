import React, { Component } from "react";
import * as d3 from "d3";

class FlowChart extends Component {
  constructor(props) {
    super(props);
    // Master list so we can re-activate older spawns if the user slides back forward.
    this.allNodes = [];

    this.state = {
      data: [],          // The currently active nodes in the simulation
      csvData: [],
      loading: true,
      error: null,
      currentTime: 2000,
      minYear: 2000,
      maxYear: 2000,
      valuePerBall: 20000, // each ball is $20,000
    };
    this.simulation = null;
  }

  componentDidMount() {
    this.loadCSVData();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.data !== this.state.data) {
      if (this.simulation) {
        this.updateSimulation();
      } else {
        this.drawChart();
      }
    }
  }

  loadCSVData = () => {
    d3.csv("/boston_residential_sales_dummy.csv")
      .then(csvData => {
        const processed = csvData.map((d, i) => ({
          id: i,
          year: parseInt(d["year"], 10) || 0,
          investorProfit: +d["total investor profit"] || 0,
          noninvestorProfit: +d["noninvestor profit"] || 0
        }));
        const years = processed.map(r => r.year);
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);

        this.setState({
          csvData: processed,
          minYear,
          maxYear,
          currentTime: minYear,
          loading: false
        }, () => {
          // After CSV is loaded, generate initial nodes (none) for exactly minYear
          this.generateBallsForTime(this.state.currentTime);
        });
      })
      .catch(err => {
        console.error("Error loading CSV:", err);
        this.setState({ error: "Failed to load data", loading: false });
      });
  };

  /**
   * Called whenever the slider changes or at initial load.
   * 1) If (time == minYear && fraction=0), spawn 0 nodes => start empty.
   * 2) Otherwise, do the normal partial interpolation to decide how many investor/noninvestor.
   * 3) If we need more "born by now," we create them. 
   * 4) Filter out nodes not in [-0.2..1.2], so they do not appear or push forces.
   */
  generateBallsForTime = (time) => {
    const { csvData, valuePerBall, minYear, maxYear } = this.state;
    if (!csvData || csvData.length === 0) return;

    // clamp
    if (time < minYear) time = minYear;
    if (time > maxYear) time = maxYear;

    // figure out interpolation 
    const floorYear = Math.floor(time);
    const fraction = time - floorYear;
    const ceilYear = Math.ceil(time);

    // Special case: if time == minYear exactly and fraction=0 => spawn 0 balls
    // so we start with an empty screen. We'll fill them in as soon as the user
    // slides forward from minYear.
    let desiredInvestor = 0;
    let desiredNon = 0;
    if (!(floorYear === minYear && fraction === 0)) {
      // Normal partial interpolation
      const floorData = csvData.find(d => d.year === floorYear);
      const ceilData  = csvData.find(d => d.year === ceilYear) || floorData;
      if (!floorData) return; // edge case

      const invFloor = floorData.investorProfit / valuePerBall;
      const invCeil  = ceilData.investorProfit    / valuePerBall;
      const nonFloor = floorData.noninvestorProfit/ valuePerBall;
      const nonCeil  = ceilData.noninvestorProfit / valuePerBall;

      desiredInvestor = Math.round(invFloor*(1 - fraction) + invCeil*fraction);
      desiredNon      = Math.round(nonFloor*(1 - fraction) + nonCeil*fraction);
    }

    // figure out how many investor / noninvestor are "born" by now
    const curInv = this.allNodes.filter(n => n.type==="investor"    && n.spawnTime <= time).length;
    const curNon = this.allNodes.filter(n => n.type==="noninvestor" && n.spawnTime <= time).length;

    const deltaInv = desiredInvestor - curInv;
    const deltaNon= desiredNon      - curNon;

    // If we need more => create them 
    if (deltaInv>0)  this.addNodes("investor", deltaInv, time);
    if (deltaNon>0)  this.addNodes("noninvestor", deltaNon, time);

    // Build the active subset for dt in [-0.2..1.2] => fade in / fade out
    const activeNodes= [];
    this.allNodes.forEach(node => {
      const dt= time - node.spawnTime;
      const wasActive = node.active || false;
      const inRange = (dt >= -0.2 && dt <= 1.2);

      if (!wasActive && inRange) {
        // "respawn" at center
        node.x=400;
        node.y=200;
        node.vx=0;
        node.vy=0;
      }
      node.active= inRange;
      node.lastDt= dt;

      if (inRange) {
        activeNodes.push(node);
      }
    });

    this.setState({ data: activeNodes, currentTime: time });
  };

  addNodes= (type, howMany, time) => {
    for (let i=0; i<howMany; i++){
      this.allNodes.push({
        id: `${type}-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
        type,
        spawnTime: time,
        x:400, y:200,
        vx:0, vy:0,
        active:false,
        lastDt:0
      });
    }
  };

  handleYearChange= e=>{
    const newT= parseFloat(e.target.value);
    this.generateBallsForTime(newT);
  };

  // fade in [-0.2..0], full [0..1], fade out [1..1.2]
  updateOpacity= node=>{
    const dt= node.lastDt||0;
    if (dt< -0.2) return 0;
    else if (dt<0) {
      return (dt+0.2)/0.2;
    }
    else if (dt<1) return 1;
    else if (dt<1.2) {
      return 1 - (dt-1)/0.2;
    }
    return 0;
  };

  drawChart() {
    const width=800, height=400;
    const r= 10*(this.state.valuePerBall/20000);

    const container= d3.select(`#${this.props.id}`);
    container.select("svg").remove();

    const svg= container.append("svg")
      .attr("width", width)
      .attr("height", height);

    const investorX=400-200, noninvX=400+200;
    svg.append("text")
      .attr("x", investorX)
      .attr("y",30)
      .attr("text-anchor","middle")
      .text("Investor Profit");
    svg.append("text")
      .attr("x", noninvX)
      .attr("y",30)
      .attr("text-anchor","middle")
      .text("Non-investor Profit");

    const { data }= this.state;
    svg.selectAll("circle")
      .data(data, d=> d.id)
      .enter()
      .append("circle")
      .attr("r", r)
      .attr("fill", d=> d.type==="investor"? "red":"green")
      .attr("cx", d=> d.x)
      .attr("cy", d=> d.y);

    this.simulation= d3.forceSimulation(data)
      .force("x", d3.forceX(d=> d.type==="investor"? investorX : noninvX).strength(0.05))
      .force("y", d3.forceY(200).strength(0.05))
      .force("collision", d3.forceCollide(r+2))
      .on("tick", ()=>{
        svg.selectAll("circle")
          .attr("cx", d=> d.x)
          .attr("cy", d=> d.y)
          .attr("opacity", d=> this.updateOpacity(d));
      });
  }

  updateSimulation() {
    const { data }= this.state;
    const r= 10*(this.state.valuePerBall/20000);
    const investorX=400-200, noninvX=400+200;

    this.simulation.nodes(data);
    this.simulation
      .force("x", d3.forceX(d=> d.type==="investor"? investorX : noninvX).strength(0.05))
      .force("y", d3.forceY(200).strength(0.05))
      .force("collision", d3.forceCollide(r+2));

    const container= d3.select(`#${this.props.id} svg`);
    const bubbles= container.selectAll("circle").data(data, d=> d.id);

    bubbles.enter()
      .append("circle")
      .attr("r", r)
      .attr("fill", d=> d.type==="investor"? "red":"green")
      .attr("cx", d=> d.x)
      .attr("cy", d=> d.y);

    bubbles.exit().remove();

    this.simulation.alphaTarget(0.15).restart();
    this.simulation.on("tick", ()=>{
      container.selectAll("circle")
        .attr("cx", d=> d.x)
        .attr("cy", d=> d.y)
        .attr("opacity", d=> this.updateOpacity(d));
    });
  }

  calculateDisplayedProfits() {
    const { data, valuePerBall} = this.state;
    let inv=0, non=0;
    data.forEach(node=>{
      if (this.updateOpacity(node)>0) {
        if (node.type==="investor") inv++;
        else non++;
      }
    });
    return {
      investorProfit: inv*valuePerBall,
      noninvestorProfit: non*valuePerBall,
      totalBalls: inv+non
    };
  }

  render() {
    const { currentTime, minYear, maxYear, loading, error }= this.state;
    const info= this.calculateDisplayedProfits();

    // We'll display the year as an integer, e.g. 2000
    const displayedYear = Math.floor(currentTime);

    return (
      <div>
        {!loading && (
          <div style={{ margin:"20px 0"}}>
            <label htmlFor="year-slider">
              Year: {displayedYear}
            </label>
            <input
              type="range"
              id="year-slider"
              min={minYear}
              max={maxYear}
              step={0.01}
              value={currentTime}
              onInput={this.handleYearChange}
              list="tickmarks"
              style={{ width:"300px", margin:"0 10px"}}
            />
            <datalist id="tickmarks">
              {Array.from({length: maxYear-minYear+1}, (_,i)=>{
                const y= minYear+i;
                return <option key={y} value={y} label={y.toString()}/>;
              })}
            </datalist>
          </div>
        )}

        {loading && <p>Loading data...</p>}
        {error && <p>Error: {error}</p>}

        <div id={this.props.id} className="chart-container"></div>

        {!loading && (
          <div className="data-summary" style={{ marginTop:"20px"}}>
            <h3>Profit Visualization</h3>
            <p>Total active balls: {info.totalBalls}</p>
            <p>Investor profit: ${info.investorProfit.toLocaleString()}</p>
            <p>Non-investor profit: ${info.noninvestorProfit.toLocaleString()}</p>
            <p><em>Each ball represents ${this.state.valuePerBall.toLocaleString()}</em></p>
          </div>
        )}
      </div>
    );
  }
}

FlowChart.defaultProps = {
  id: "flowchart-container"
};

export default FlowChart;
