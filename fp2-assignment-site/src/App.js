import './App.css';
import Navigation from './components/nav_dots/Navigation';
import Header from "./components/Header_Component/Header";
import Flow from "./components/flow_plot/Flow";
import DevProc from './components/dev_process/DevProc';
import ScrollLine from './components/line_connector/ScrollLineConnector';
import White2010Map from './components/demographics_plot/White2010map';
import WhiteSideBySide from './components/demographics_plot/WhiteSideBySide';
import RaceSideBySide from "./components/demographics_plot/RaceSideBySide";
import RaceElevatedMap from './components/demographics_plot/RaceElevatedMap';

function App() {
  return (
    <div className="App">
     
      <div className="wrapper">
      <Navigation />
      
      <Header />
      <ScrollLine />
      <Flow />
      <RaceElevatedMap/>
      <DevProc />
      </div>
      
    </div>
  );
}

export default App;
