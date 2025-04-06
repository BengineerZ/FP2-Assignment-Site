import React, { Component } from 'react';
import * as d3 from "d3";

class FlowChart extends Component {
    constructor(props) {
        super(props);
        this.state = {
            data: [
                { id: 1, value: 10, direction: "left" },
                { id: 2, value: 20, direction: "right" },
                { id: 3, value: 30, direction: "left" },
                { id: 4, value: 40, direction: "right" },
            ],
        };
        this.simulation = null; // Store the simulation instance
    }

    componentDidMount() {
        this.drawChart();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.data !== this.state.data) {
            this.updateSimulation(); // Update the simulation when data changes
        }
    }

    addBubbles = () => {
        let count = 0;
        const interval = setInterval(() => {
            if (count >= 10) {
                clearInterval(interval); // Stop after adding 5 bubbles
                return;
            }

            const newBubble = {
                id: this.state.data.length + 1,
                value: Math.floor(Math.random() * 50) + 10,
                direction: Math.random() > 0.5 ? "left" : "right",
            };

            this.setState((prevState) => ({
                data: [...prevState.data, newBubble],
            }));

            count++;
        }, 200); // Add a bubble every 500ms
    };

    drawChart() {
        const width = 800;
        const height = 400;
        const bubbleRadius = 10; // Each bubble represents 10k
        const poolX = width / 2; // Central pool X-coordinate
        const poolY = height / 2; // Central pool Y-coordinate

        const { data } = this.state;

        const container = d3.select(`#${this.props.id}`);
        container.select("svg").remove();

        const svg = container
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        // Create bubbles
        const bubbles = svg
            .selectAll("circle")
            .data(data, (d) => d.id) // Use `id` as the key
            .enter()
            .append("circle")
            .attr("r", bubbleRadius)
            .attr("fill", "blue")
            .attr("opacity", 0.8);

        // Initialize positions in the center
        data.forEach((d) => {
            d.x = poolX;
            d.y = poolY;
        });

        // Create the force simulation
        this.simulation = d3.forceSimulation(data)
            .force("x", d3.forceX((d) => (d.direction === "left" ? poolX - 200 : poolX + 200)).strength(0.05))
            .force("y", d3.forceY(poolY).strength(0.05))
            .force("collision", d3.forceCollide(bubbleRadius + 2)) // Prevent overlap
            .on("tick", () => {
                bubbles
                    .attr("cx", (d) => d.x)
                    .attr("cy", (d) => d.y)
                    .attr("fill", (d) => (d.direction === "left" ? "red" : "green"));
            });
    }

    updateSimulation() {
        const { data } = this.state;
    
        const width = 800; // Ensure width and height are defined
        const height = 400;
        const poolX = width / 2; // Central pool X-coordinate
        const poolY = height / 2; // Central pool Y-coordinate
    
        // Initialize positions for new bubbles
        data.forEach((d) => {
            if (d.x === undefined || d.y === undefined) {
                d.x = poolX; // Start at the center (poolX)
                d.y = poolY; // Start at the center (poolY)
            }
        });
    
        // Update the simulation with the new data
        this.simulation.nodes(data);
    
        // Reapply forces to ensure new bubbles are affected
        this.simulation
            .force("x", d3.forceX((d) => (d.direction === "left" ? poolX - 200 : poolX + 200)).strength(0.05))
            .force("y", d3.forceY(poolY).strength(0.05))
            .force("collision", d3.forceCollide(12)); // Prevent overlap (radius + padding)
    
        // Select and update the bubbles
        const container = d3.select(`#${this.props.id} svg`);
        const bubbles = container
            .selectAll("circle")
            .data(data, (d) => d.id);
    
        // Add new bubbles
        const newBubbles = bubbles
            .enter()
            .append("circle")
            .attr("r", 10)
            .attr("fill", "blue")
            .attr("opacity", 0.8)
            .attr("cx", (d) => d.x) // Use initialized x position
            .attr("cy", (d) => d.y); // Use initialized y position
    
        // Merge new and existing bubbles
        bubbles.merge(newBubbles)
            .attr("fill", (d) => (d.direction === "left" ? "red" : "green"));
    
        // Restart the simulation
        this.simulation.alpha(1).restart();
    
        // Update the tick event to ensure it applies to all bubbles
        this.simulation.on("tick", () => {
            container.selectAll("circle")
                .attr("cx", (d) => d.x)
                .attr("cy", (d) => d.y);
        });
    }

    render() {
        return (
            <div>
                <button onClick={this.addBubbles}>Add Bubbles</button>
                <div id={this.props.id} className="chart-container"></div>
            </div>
        );
    }
}

export default FlowChart;