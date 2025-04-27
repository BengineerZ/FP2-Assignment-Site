import React from 'react';

import './Burden.css'; 
import BurdenChart from './chart'

const Burden = () => {
  return (
    <div className='burden section' id='viz'>
      <h2>How Does Investor Activity Impact Renters?</h2>
      <h4>Rent Burden and No-Cause Evictions vs. Investor Change, 2012-2022</h4>
      <BurdenChart id="chart-container"/>
    </div>
  );
};

export default Burden;