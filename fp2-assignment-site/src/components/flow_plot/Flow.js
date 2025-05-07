import React from 'react';

import './Flow.css'; 
import FlowChart from './chart'

import HelpIndicator from '../help_comp/HelpIndicator';

const Flow = () => {
  return (
    <div className='flow fnarrative-block section' id='viz' style={{ marginTop: "20px", marginBottom: "20px", maxWidth: "800px" }}>
      <h2>Who is Collecting More Profit in the Boston Housing Market?</h2>
      <h4>Visualizing the allocation of profit between investors and non-investors.</h4>
      <p> 
      Investment is a natural part of the housing market, but it can also act as a primary driver of prices. This is because investors put in dollars to renovate and improve properties for wealthy tenants, for which they can charge higher rents. Thus, a key indicator of a housing market would be the level of investor activity since they are trying to make larger profit margins to make up for larger monetary investments. Markets that have a large amount of investor activity will show more of this profit-greedy incentive, which may contribute to upward price pressure. To understand this pattern in the Boston housing market, we can look at the flow of profits from sales and rents. Specifically, we look at the flow of profits from sales and rents for investors and for non-investors. We represent a unit of cash profit with a green dollar sign and show it flowing from the investor or non-investor as mined from residential sales data.
      </p>

      <HelpIndicator helpText="Click and drag the timeline to see how the flow of cash has changed over time!">
        Click the lightbulb for help!
      </HelpIndicator>
      <div class="observe-overlap"><FlowChart id="chart-container"/></div>
      
      <p>
      In this plot, we observe a larger flow of cash for investors than for non-investors. We also see the flow of cash towards investors increasing over time! This is representative of the Boston housing landscape and how profit-seeking investors are squeezing out more and more profit from the market. This is relevant since large amounts of investor activity are clear causal factors in the rising prices of housing as detailed above.
      </p>
    <hr/>
      
    </div>
  );
};

export default Flow;