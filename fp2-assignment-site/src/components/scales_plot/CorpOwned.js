import React from 'react';


import CorporateOwnershipScales from './CorporateOwnershipScales';
import { Citation } from '../citations/CitationsSystem';
import HelpIndicator from '../help_comp/HelpIndicator';

const CorpOwned = () => {
  return (
    <div className='narrative-block corpowned section' id='corp' style={{ marginTop: "20px", marginBottom: "20px", maxWidth: "800px" }}>
      <h2>Shifting the Balance of Boston Housing</h2>
      <h4>How have the corporate ownership rates of housing in the Boston area changed over time, and how does this affect rising housing costs?</h4>
    
      
      <HelpIndicator helpText="Slide the timeline to view how the balance has shifted towards more corporate ownership over time! Click on each region of Boston to see some more detailed info.">
        Hover for help!
      </HelpIndicator>

      <CorporateOwnershipScales
        csvUrl={ `${process.env.PUBLIC_URL}/scale_data/corp_vs_own_rate.csv` }
        geoJsonUrl={ `${process.env.PUBLIC_URL}/demographics/boston.geojson` }
        salesCsvUrl={ `${process.env.PUBLIC_URL}/scale_data/neighborhood-viz-data.csv` }
        width={1000}
        height={600}
      />

      <p>Data Sources: <Citation>Corporate Ownership and Owner Occupancy Rates in Boston Neighborhoods with Census 2004-2024</Citation> </p>

    



    </div>
  );
};

export default CorpOwned;