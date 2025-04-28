import React from 'react';

import './Burden.css'; 
import BurdenChart from './chart'

const Burden = () => {
  return (
    <div className='burden section' id='burden'>
      <BurdenChart id="chart-container"/>
    </div>
  );
};

export default Burden;