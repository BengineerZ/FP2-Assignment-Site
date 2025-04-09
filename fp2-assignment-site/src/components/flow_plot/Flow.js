import React from 'react';

import './Flow.css'; 
import FlowChart from './chart'

const Flow = () => {
  return (
    <div className='flow section' id='viz'>
      <h2>Who is Collecting More Profit in the Boston Housing Market?</h2>
      <h4>Visualizing the allocation of profit between investors and non-investors.</h4>
      <FlowChart id="chart-container"/>
    </div>
  );
};

export default Flow;