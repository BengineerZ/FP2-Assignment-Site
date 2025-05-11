import React from 'react';
import "./PricingSection.css";
import BarChart from '../bar_chart/BarChart';
import AnimatedLineChart from '../line_chart/LineChart';
import HelpIndicator from '../help_comp/HelpIndicator';

const PricingSection = () => {
  return (
    <div className='narrative-block section' id='price' style={{ marginTop: "20px", marginBottom: "20px" , maxWidth: "800px"}} >
      <h2>Housing Out of Reach</h2>
      <h4>The Affordability Crisis for the Average Bostonian</h4>
      
      <div className='text-block'>
      <p>
        The first effect we see from speculative investment is a rise in housing prices at a disproportionate rate relative to the income growth of the average Bostonian. This is especially pronounced for single-family homes, which allow new renters and homeowners to enter the market. An increasing price for these homes, which isn't matched by income growth, will put many families out of the affordable housing market. This is precisely what we see in the historical data shown below. We display the median single-family home income for Boston in blue, along with the median home sale price for a given year, disaggregated by neighborhood. 
      </p>
      </div>

      <HelpIndicator helpText="Hover over any red line to see the median home price for that neighborhood and the corresponding Census-reported median income! Check out the dotted black lines for significant events which affected the housing market. Toggle with the zoom to see what the income curve looks like!">
        Hover for help!
      </HelpIndicator>
      
      <AnimatedLineChart />
      
      <div className='text-block'>
      <p>
        As shown over time, housing prices have dipped from recession and surged from pandemic -- and are now at a historical high. This doesn't necessarily 
        imply an affordable housing shortage, but when we look at the plot, we see an exponential growth in the deficit between the average Bostonian's income and the price of housing.
        This is a clear indicator of the affordability crisis in Boston, and it is only getting worse. Especially in neighborhoods like South End, Back Bay, Beacon Hill, and Longwood, 
        we see a concerning price growth which is so large, the growth in income is nearly fully overshadowed.
      </p>
      </div>


      <br />
      <br />
      <br />

      <hr/>

      

    </div>
  );
};

export default PricingSection;