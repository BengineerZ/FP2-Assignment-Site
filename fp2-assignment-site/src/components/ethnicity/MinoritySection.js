import React from 'react';
import "./MinoritySection.css";
import { Citation } from '../citations/CitationsSystem';
// import { ReactComponent as Bus } from './images/bus-svgrepo-com.svg';
// import { ReactComponent as Pedestrian } from './images/pedestrian-crossing-svgrepo-com.svg';

const MinoritySection = () => {
  return (
    <div className='narrative-block section' id='evict'>
      <h2>Losing Ground: How Corporate Buying Is Rewriting Boston’s Neighborhoods</h2>
      <h4>As investor ownership rises, we visualize how communities of color are disproportionality pushed-out.</h4>
      
    <p>
    The rising prices due to rising corporate ownership rates in Boston are disproportionately hurting marginalized groups. 
    This is evident when you look at the demographics changes of Boston neighborhoods over the last decade. Our census demographics 
    maps highlight the <strong>percentage change of neighborhood’s racial make-up from 2010 to 2020</strong>, where the red coloring indicates a 
    declining population change over the years and blue is an increase. When compared with corporate ownership from earlier, this 
    shows the city’s affordability crisis that as capital flows in from investors long-time residents are forced out.
    </p>

    <p>
    Roxbury tells the story most starkly. Our plot shows the neighborhood’s Black population decreasing from 53% to 42% in a single decade, 
    at the same time Roxbury has a 22% corporate-ownership rate — the third-highest in Boston.<Citation>Homes for Profit: Speculation and Investment in Greater Boston – MAPC. MAPC. https://www.mapc.org/resource-library/homes-for-profit/#:~:text=MAPC%20has%20released%20research%20that,to%20View%20the%20Executive%20Summary.</Citation> MAPC’s analysis helps explain this overlap: 
    from 2004-2018 one in five Greater-Boston homes, and nearly one in three in communities of color, went to investors, who concentrate 
    in “low-income urban neighborhoods of color” where they can buy cheap, flip quickly, and harvest outsized profits. As our map demonstrates, 
    those transactions are not just abstract profits; they translate into fewer Black families living in the very heart of Boston’s historically Black community.
    </p>

    <p> 
    The same pattern emerges in Chinatown and the South Boston Waterfront. Our map shows a six percent decline in the Asian population, while 
    the corporate-ownership has been booming in that district, tied for two of the city’s highest investor activity. Residents can feel the 
    effect of getting pushed out, when a 25-story luxury tower was proposed on Harrison Avenue, one Chinatown organizer warned it would “push 
    even more longtime residents out,” noting that families already face million-dollar listing prices and investor bidding wars <Citation>Rios, S. (2023, February 21). Nonprofit buys Chinatown homes to keep them affordable — and preserve history | WBUR News. WBUR.org. https://www.wbur.org/news/2023/02/21/affordable-housing-real-estate-money-neighborhood</Citation>.  
    The demographic decline captured in our maps is the human footprint of those market dynamics.
    </p>

    <p>Investor dominance does more than raise purchase prices; it accelerates displacement. National research from Princeton’s Eviction 
    Lab finds that large landlords file eviction cases far more often than small owners, even after controlling for tenant characteristics, 
    and that Black renters face the highest risk<Citation>Who is Evicted in America. Eviction Lab. https://evictionlab.org/who-is-evicted-in-america/</Citation>. Layer that behavior onto neighborhoods like Roxbury or Chinatown, where 
    speculative ownership is dense and only rising, and the result is a pipeline that moves homes from community hands into corporate 
    portfolios, one forced move at a time.
</p>

    

    </div>
  );
};

export default MinoritySection;