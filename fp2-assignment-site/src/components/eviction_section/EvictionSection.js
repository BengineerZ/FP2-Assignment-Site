import React from 'react';
import "./EvictionSection.css";
import { ReactComponent as Bus } from './images/bus-svgrepo-com.svg';
import { ReactComponent as Pedestrian } from './images/pedestrian-crossing-svgrepo-com.svg';
import Burden from '../burden_plot/Burden';
import HelpIndicator from '../help_comp/HelpIndicator';

const EvictionSection = () => {
  return (
    <div className='narrative-block section' id='evict'>
      <h2>Evicted by Investment: When Renters Pay the Price</h2>
      <h4>When homes become investments, what happens to the people living in them?</h4>

      <div className='text-block'>

      <p>
      Investor activity has not only reshaped property ownership patterns, but has also contributed to rising instability in many neighborhoods.
      Areas with the highest levels of investor buying have seen increases in eviction rates, as corporate landlords, focused on maximizing returns, 
      are often quicker to remove tenants who fall behind on rent or who they believe limit the property’s market potential. Unlike traditional 
      owner-occupants or small landlords, large firms often approach property management with <strong>aggressive strategies geared toward profit 
      optimization</strong>, rather than long-term community ties. This transactional approach leaves many tenants more vulnerable to displacement, 
      even in neighborhoods that once had stable, multi-generational populations.
      </p>

      </div>

      <HelpIndicator helpText="Change the Chloropleth metric to visualise different statistics! Hover over each region to see where the eviction rates and investor share falls on the scatter plot.">
        Click the lightbulb for help!
      </HelpIndicator>

      <Burden />

      


      <div className='text-block'>

        <p>
        Investor activity has not only reshaped property ownership patterns, but has also contributed to rising instability in many neighborhoods.
         Areas with the highest levels of investor buying have seen increases in eviction rates, as corporate landlords, focused on maximizing returns, 
         are often quicker to remove tenants who fall behind on rent or who they believe limit the property’s market potential. Unlike traditional 
         owner-occupants or small landlords, large firms often approach property management with <strong>aggressive strategies geared toward profit 
         optimization</strong>, rather than long-term community ties. This transactional approach leaves many tenants more vulnerable to displacement, 
         even in neighborhoods that once had stable, multi-generational populations.
        </p>

        
        <Bus className="pic" />

        <p>
        These effects extend beyond eviction rates. As investors acquire more properties in a given area, rent burdens tend to rise, 
        putting more financial pressure on existing residents. When corporate owners renovate units to target higher-income renters, the 
        resulting <strong>rent hikes often far outpace wage growth</strong>, forcing longtime tenants either to accept unaffordable terms or move elsewhere. 
        This process, sometimes gradual and sometimes abrupt, steadily erodes the social fabric of neighborhoods, replacing families and local 
        networks with more transient, wealthier populations. The character of many Boston communities is being altered, not by organic growth, 
        but by deliberate investment decisions made far from the neighborhoods themselves.
        </p>

        <Pedestrian className="pic" />

        <p>
        Ultimately, the surge in investor ownership compounds Boston’s broader affordability crisis. Each home shifted from a family to an 
        investment portfolio further concentrates housing in the hands of those motivated primarily by profit, limiting pathways for residents 
        to build equity and stability. <strong>It also makes recovery from the affordability crunch much harder</strong>, as corporate landlords are less likely 
        to sell properties back to owner-occupants and more likely to hold them as permanent revenue streams. In this environment, policy interventions 
        alone may struggle to keep pace with the speed of private capital. For many in Greater Boston, the changing landscape of homeownership is 
        reshaping who can afford to stay and who is forced to leave.
        </p>

        </div>



    </div>
  );
};

export default EvictionSection;