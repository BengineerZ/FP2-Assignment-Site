import React from 'react';


import CorporateOwnershipScales from './CorporateOwnershipScales';
import { Citation } from '../citations/CitationsSystem';

const CorpOwned = () => {
  return (
    <div className='corpowned section' id='corp'>
      <h2>Shifting the Balance of Boston Housing</h2>
      <h4>How have the corporate ownership rates of housing in the Boston area changed over time, and how does this affect rising housing costs?</h4>
      <CorporateOwnershipScales
        csvUrl={ `${process.env.PUBLIC_URL}/scale_data/corp_vs_own_rate.csv` }
        geoJsonUrl={ `${process.env.PUBLIC_URL}/scale_data/mass-municipalities.geojson` }
        width={1000}
        height={600}
      />

      <p>Data Sources: <Citation>Corporate Ownership and Owner Occupancy Rates in Boston Neighborhoods with Census 2004-2024</Citation> </p>

    



    </div>
  );
};

export default CorpOwned;