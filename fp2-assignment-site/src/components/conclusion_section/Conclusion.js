import React from 'react';
import "./Conclusion.css";
import { Citation } from '../citations/CitationsSystem';

const Conclusion = () => {
  return (
    <div className="conclusion-block" >

        

      <h3>The future of housing in Boston</h3>

      <p>
    The future of housing in Boston hinges on whether the city can recalibrate its housing market away from speculative profit 
    and back toward community stability and equity. The current trajectory—fueled by corporate landlords, speculative investment, 
    and rising displacement—threatens to transform vibrant neighborhoods into high-return assets, accessible primarily to investors 
    and high-income earners. But this outcome is not inevitable.
  </p>

  <p>
    To address Boston’s affordability crisis and reclaim housing for people, not just profit, a multi-pronged strategy is necessary:
  </p>

  <ol>
    <li>
      <strong>Regulate Speculative Investment</strong><br/>
      Policymakers can implement a tax on speculative property flipping, such as a higher capital gains tax for properties 
      resold within a short time. A vacancy tax on unoccupied units owned by investors could also disincentivize the practice 
      of holding homes as dormant financial assets.
    </li>
    <li>
      <strong>Expand Community Ownership Models</strong><br/>
      Boston should invest in community land trusts (CLTs) and limited-equity cooperatives, which remove land from the 
      speculative market and ensure long-term affordability. These models allow residents to collectively own and manage 
      housing, keeping it affordable across generations.
    </li>
    <li>
      <strong>Strengthen Tenant Protections</strong><br/>
      Laws limiting no-cause evictions, capping rent increases, and providing legal representation for tenants in housing 
      court could reduce displacement. Cities like San Francisco and New York have implemented similar protections with 
      measurable success.
    </li>
    <li>
      <strong>Give Communities a First Right of Refusal</strong><br/>
      Legislation could give tenants, nonprofits, or municipal housing agencies the first opportunity to purchase 
      multi-family buildings when they go up for sale. Washington, D.C.'s Tenant Opportunity to Purchase Act (TOPA) provides 
      a useful model. <Citation>Housing Justice for All. (2025, March 7). Tenant Opportunity to Purchase Act - Housing Justice for All. https://housingjusticeforall.org/our-platform/tenant-opportunity-to-purchase-act/</Citation>
    </li>
    <li>
      <strong>Redirect Subsidies and Public Funding</strong><br/>
      Rather than incentivizing luxury development, Boston should prioritize subsidies for deeply affordable housing—homes 
      affordable to those making below 60% of area median income. Funding could be directed to nonprofit developers, 
      public housing, and mixed-income developments that include meaningful low-income units.
    </li>
    <li>
      <strong>Data Transparency and Accountability</strong><br/>
      Require landlords and investors to register their holdings publicly and disclose eviction filings, rent levels, and 
      vacancies. Transparent ownership data would empower policymakers and communities to track patterns and respond effectively.
    </li>
  </ol>

  <p>
    Without intervention, the market alone will not reverse the harms of unchecked investment-driven housing. But with bold 
    policy changes and community-centered development, Boston can chart a more inclusive path forward—one where housing is 
    treated as a human right, not a financial instrument.
  </p>

    </div>
  );
};

export default Conclusion;