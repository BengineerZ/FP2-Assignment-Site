import React from 'react';

import './Flow.css'; 
import FlowChart from './chart'

const Flow = () => {
  return (
    <div className='flow section' id='viz'>
      <h2>Going with the Flow of Housing in Boston</h2>
      <h4>Visualizing the investment ecosystem.</h4>
      <FlowChart id="chart-container"/>
    </div>
  );
};

export default Flow;