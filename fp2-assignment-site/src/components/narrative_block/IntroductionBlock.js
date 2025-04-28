import React from 'react';
import "./IntroductionBlock.css";
import { ReactComponent as Bank } from './images/bank-svgrepo-com.svg';

import { Citation } from '../citations/CitationsSystem';

const IntroductionBlock = () => {
  return (
    <div className="narrative-block" >
      <h3>The Rise of Corporate Landlords</h3>

      <p>Over the past few decades, <strong>corporate ownership of housing in the Boston area has risen dramatically</strong>. A regional study by the Metropolitan Area 
      Planning Council found that from 2004 to 2018, roughly one in five residential properties in Greater Boston was sold to an investor 
      (often a corporate landlord) rather than an owner-occupant. In some predominantly nonwhite neighborhoods, that rate was even higher 
      – nearly one-third of home sales went to investors during that period <Citation>Homes for Profit: Speculation and Investment in Greater Boston – MAPC. MAPC. https://www.mapc.org/resource-library/homes-for-profit/#:~:text=MAPC%20has%20released%20research%20that,to%20View%20the%20Executive%20Summary.</Citation>. This marks a notable shift from earlier eras when Boston’s housing 
      stock was largely in the hands of small landlords and homeowner families. In recent years, the presence of large real-estate firms has only 
      grown: <strong>national investors and real estate trusts now rank among the Boston area’s biggest property owners</strong>, acquiring 
      everything from downtown high-rises to triple-decker homes in residential neighborhoods.</p>
    
    <Bank className="bank" />

    <p>    The figure in the following section provides a dynamic visualization of this trend, 
      illustrating the changes in corporate ownership in the Boston area over time through an interactive plot and timeline. <strong>See how the scales have shifted for yourself ...</strong> 
    </p>

    <h5></h5>

    </div>
  );
};

export default IntroductionBlock;