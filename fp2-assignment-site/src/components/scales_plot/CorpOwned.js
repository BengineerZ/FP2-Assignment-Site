import React from 'react';


import CorporateOwnershipScales from './CorporateOwnershipScales';

const CorpOwned = () => {
  return (
    <div className='corpowned section' id='corp'>
      <h2>Shifting the Balance of Boston Housing</h2>
      <h4>How have the corporate ownership rates of housing in the Boston area changed over time, and how does this affect rising housing costs?</h4>
      <CorporateOwnershipScales
        csvUrl={ `${process.env.PUBLIC_URL}/corporate_sales_boston.csv` }
        geoJsonUrl={ `${process.env.PUBLIC_URL}/mass-municipalities.geojson` }
        width={1000}
        height={600}
      />

    



    </div>
  );
};

export default CorpOwned;