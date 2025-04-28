import React from 'react';
import "./PricingSection.css";
import BarChart from '../bar_chart/BarChart';

const PricingSection = () => {
  return (
    <div className='Plot-section' id='price'>
      <h2>Housing Out of Reach</h2>
      <h4>The Affordability Crisis for the Average Bostonian</h4>
      <p>
        The first effect we see from speculative investment is a rise in housing prices at a disproportionate rate relative to the income growth of the average Bostonian. This is especially pronounced for single-family homes, which allow new renters and homeowners to enter the market. An increasing price for these homes, which isn't matched by income growth, will put many families out of the affordable housing market. This is precisely what we see in the historical data shown below. 
      </p>
      
      <BarChart />

      <p>
        As shown, over time housing prices have dipped from recession and surged from pandemic -- and are now at a historical high. This doesn't necessarily 
        imply an affordable housing shortage, but when we look at the median income and compute the differences in the green bars, we see an exponential growth in the
        deficit between the average Bostonian's income and the price of housing. This is a clear indicator of the affordability crisis in Boston, and it is only getting worse.
      </p>
      <br />
      <br />
      <br />

    </div>
  );
};

export default PricingSection;