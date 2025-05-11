import React from 'react';
import "./EvictionSection.css";
import { ReactComponent as Bus } from './images/bus-svgrepo-com.svg';
import { ReactComponent as Pedestrian } from './images/pedestrian-crossing-svgrepo-com.svg';
import Burden from '../burden_plot/Burden';
import HelpIndicator from '../help_comp/HelpIndicator';

const EvictionSection = () => {
  return (
    <div className='narrative-block section' id='evict' style={{ marginTop: "20px", marginBottom: "20px", maxWidth: "800px" }}>
      <h2>Evicted by Investment: When Renters Pay the Price</h2>
      <h4>When homes become investments, what happens to the people living in them?</h4>

      <div className='text-block'>

      <p>
      Investor activity has not only reshaped property ownership patterns, but has also contributed to rising instability in many neighborhoods.
      Areas with the highest levels of investor buying have seen increases in eviction rates, as corporate landlords, focused on maximizing returns, 
      are often quicker to remove tenants who fall behind on rent or who they believe limit the property’s market potential. Unlike traditional 
      owner-occupants or small landlords, large firms often approach property management with <strong>aggressive strategies geared toward profit 
      optimization</strong>rather than long-term community ties. This transactional approach leaves many tenants more vulnerable to displacement, 
      even in neighborhoods that once had stable, multi-generational populations.

      
      </p>

      <Bus className="pic" />

      <p>
      Two critical metrics that highlight this change are <strong>rent burden and no-cause eviction rates</strong>. Rent burden is defined as having rent cost 
      greater than 30% of the tenant’s income, and to be evicted with no cause refers to a tenant that has been evicted despite no fault or wrongdoing. 
      The following plot presents a dashboard to explore the relationship between these metrics. The map on the left represents the Metro Boston area 
      divided by its municipalities, and can be used to display the 10-year change (2012-2022) in percent of investors’ share of the housing market 
      by sales, and change in the proportion of rent-burdened individuals. The map can also display no-cause eviction rates per 100,000 households. 
      On the right hand side is a scatter plot with investors’ share of the Boston housing market on the horizontal axis and no-cause evictions per 
      100,000 households on the y-axis, with a color gradient displaying rent burden rates. Select points by hovering or dragging to see where certain 
      municipalities lie on the scatter pot.
      </p>

      </div>

      <HelpIndicator helpText="Hover or click municipalities to highlight; click multiple or click+drag to multi-select. You can also pick a specific metric!">
        Click the lightbulb for help!
      </HelpIndicator>

      <Burden />

      {/* Testimonial Cards Section */}
      <div className="testimonial-section">
        <h3>Voices from Boston Communities</h3>
        
        <div className="testimonial-cards">
          <div className="testimonial-card">
            <div className="testimonial-image">
              {/* Using Nery Parras's image with a relative path */}
              <img 
                src={require("./images/neryparras.png")} 
                alt="Nery Parras, East Boston tenant facing rent increases" 
              />
            </div>
            <div className="testimonial-quote">
              "It's hard to even eat because sometimes [we] need to decide whether we're going to eat or pay rent."
            </div>
            <div className="testimonial-source">
              — <strong>Nery Parras</strong>East Boston tenant at 298 Meridian Street, where Grid Management increased rents by up to $1,000 per month without addressing persistent issues like leaks and rats.
              <div className="source-link">
                <a href="https://baystatebanner.com/2022/06/16/east-boston-tenants-protest-rent-increases/" target="_blank" rel="noopener noreferrer">Source</a>
              </div>
            </div>
          </div>
          
          <div className="testimonial-card">
            <div className="testimonial-image">
              {/* Using the provided image with a relative path */}
              <img 
                src={require("./images/michaelprentky.png")} 
                alt="Michael Prentky, Somerville resident facing eviction" 
              />
            </div>
            <div className="testimonial-quote">
              "I'm not trying to get kicked out of my house, but it seems like, trying to look ahead, that's the fate of things here."
            </div>
            <div className="testimonial-source">
              — <strong>Michael Prentky</strong>Somerville resident whose rent was raised by $1,200 after his building was purchased by an out-of-state investor, followed by a no-fault eviction notice.
              <div className="source-link">
                <a href="https://www.boston.com/real-estate/renting/2024/05/29/renters-hit-with-no-fault-evictions/" target="_blank" rel="noopener noreferrer">Source</a>
              </div>
            </div>
          </div>
          
          <div className="testimonial-card">
            <div className="testimonial-image">
              {/* Using Laura Frost's image with a relative path */}
              <img 
                src={require("./images/laurafrost.png")} 
                alt="Laura Frost, Arlington tenant facing rent increases" 
              />
            </div>
            <div className="testimonial-quote">
              "They didn't want to give us leases at a lower rate. What they wanted was for us to clear out."
            </div>
            <div className="testimonial-source">
              — <strong>Laura Frost</strong>74-year-old Arlington tenant of 20 years, who faced doubling rents after Torrington Properties acquired her building and began remodeling units to displace long-term residents.
              <div className="source-link">
                <a href="https://www.boston.com/community/real-estate/as-apartment-prices-spike-renters-are-turning-to-tenant-unions/" target="_blank" rel="noopener noreferrer">Source</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className='text-block'>

        <p>
        These effects extend beyond eviction rates. As investors acquire more properties in a given area, rent burdens tend to rise, 
        putting more financial pressure on existing residents. When corporate owners renovate units to target higher-income renters, the 
        resulting <strong>rent hikes often far outpace wage growth</strong>forcing longtime tenants either to accept unaffordable terms or move elsewhere. 
        This process, sometimes gradual and sometimes abrupt, steadily erodes the social fabric of neighborhoods, replacing families and local 
        networks with more transient, wealthier populations. The character of many Boston communities is being altered, not by organic growth, 
        but by deliberate investment decisions made far from the neighborhoods themselves.
        </p>

        <Pedestrian className="pic" />

        <p>
        Ultimately, the surge in investor ownership compounds Boston’s broader affordability crisis. Each home shifted from a family to an 
        investment portfolio further concentrates housing in the hands of those motivated primarily by profit, limiting pathways for residents 
        to build equity and stability. <strong>It also makes recovery from the affordability crunch much harder</strong>as corporate landlords are less likely 
        to sell properties back to owner-occupants and more likely to hold them as permanent revenue streams. In this environment, policy interventions 
        alone may struggle to keep pace with the speed of private capital. For many in Greater Boston, the changing landscape of homeownership is 
        reshaping who can afford to stay and who is forced to leave.
        </p>

        </div>

        <hr/>



    </div>
  );
};

export default EvictionSection;