import './App.css';
import Navigation from './components/nav_dots/Navigation';
import Header from "./components/Header_Component/Header";
import Flow from "./components/flow_plot/Flow";
import ScrollLine from './components/line_connector/ScrollLineConnector';
import CorpOwned from './components/scales_plot/CorpOwned';
import IntroductionBlock from './components/narrative_block/IntroductionBlock';
import HousingCostsBlock from './components/narrative_block/HousingCostsBlock';
import PricingSection from './components/pricing_section/PricingSection';
import EvictionSection from './components/eviction_section/EvictionSection';
import MinoritySection from './components/ethnicity/MinoritySection';
import CitationSystem, {
  CitationProvider,   // optional — if you prefer to wrap manually
  Citation,           // inline marker
  CitationsList       // list at the end
} from './components/citations/CitationsSystem';

import BarChart from './components/bar_chart/BarChart';
import Burden from './components/burden_plot/Burden';
import White2010Map from './components/demographics_plot/White2010map';
import WhiteSideBySide from './components/demographics_plot/WhiteSideBySide';
import RaceSideBySide from "./components/demographics_plot/RaceSideBySide";
import RaceElevatedMap from './components/demographics_plot/RaceElevatedMap';


function App() {
  return (
    <div className="App">
      <CitationProvider>
      <div className="wrapper">
      <Navigation />
      
      
      <Header />
      
      <ScrollLine />

      <IntroductionBlock />

      <CorpOwned />

      <HousingCostsBlock />
      
      <PricingSection />

      <Flow />

      
      <EvictionSection />
          
      <MinoritySection />
     

      {/* <DevProc /> */}
      <CitationsList />
      </div>
      </CitationProvider>
      
    </div>
  );
}

export default App;
