import React from 'react';
import "./IntroductionBlock.css";
import { ReactComponent as Bank } from './images/skyscraper-svgrepo-com.svg';
import { Citation } from '../citations/CitationsSystem';

const HousingCostsBlock = () => {
  return (
    <div className="inarrative-block" style={{ marginTop: "20px" }} >
      <h3>The Impacts of Speculation</h3>

      <p>Housing costs in Boston have surged alongside these ownership changes. <strong>Rents and home prices are at or near record highs</strong> – in fact, median rents in the region recently plateaued, 
        but at historic peak levels<Citation>2024 GREATER
BOSTON HOUSING
REPORT CARD - https://www.tbf.org/-/media/tbf/reports-and-covers/2024/gbhrc-2024/2024gbhrc-digital-sm.pdf</Citation>. The rise of corporate landlords is one factor fueling these costs. <strong>Big investors can easily outbid local buyers</strong>, which drives up sale prices 
        across the market. For example, a Boston nonprofit developer once tried to bid around $1 million for a property, only to be told the private market would pay nearly double that amount. 
        Such deep-pocketed competition makes it “extremely difficult, if not impossible,” for community-based buyers to compete<Citation>Khan, Q. (2019, February 22). To protect affordable housing, Boston and nonprofits try taking buildings 
            off the market | Radio Boston. WBUR.org. https://www.wbur.org/radioboston/2019/02/22/city-life-nonprofits-affordable-housing</Citation> – and those higher purchase prices eventually get passed on to 
        tenants and future homebuyers. Once in control of a property, corporate owners often seek high returns, sometimes by <strong>renovating and raising rents</strong> or by <strong>emptying buildings to flip them 
        for profit.</strong> Advocates note cases of “building clear-outs,” where an owner sharply hikes rents to push out tenants, then sells the empty building for a windfall<Citation>Khan, Q. (2019, February 22). To protect affordable housing, Boston and nonprofits try taking buildings 
        off the market | Radio Boston. WBUR.org. https://www.wbur.org/radioboston/2019/02/22/city-life-nonprofits-affordable-housing</Citation>. These practices put upward 
        pressure on rents and housing prices across the board. Every home bought by an investor is also one less home available for a family to purchase to live in, adding to the competition and making housing less affordable.</p>

        <Bank className="bank" />
    
    <p>Overall, Boston’s housing landscape is being reshaped by this growth in corporate ownership. The balance of who owns Boston’s homes has <i>tilted</i>: more housing 
        is controlled by large companies and investment groups than in the past. This shift carries real consequences for residents, as higher rents and prices can push 
        people out or prevent would-be buyers from gaining a foothold. <strong>Shifting the balance of Boston housing, in other words, isn’t just a metaphor – it’s a trend playing 
        out in data and daily life</strong>, and it’s a key piece of the puzzle in Greater Boston’s affordability crisis. </p>

        <p> 

          In this article, through interactive data visualizations, we will explore the impact of speculation on housing costs in Boston. 
          We will analyze the trends in home prices and rents, and how they have been affected by the rise of corporate landlords. 
          We will also look at the implications of these changes for local communities and the future of affordable housing in the region.</p>
        

    </div>
  );
};

export default HousingCostsBlock;