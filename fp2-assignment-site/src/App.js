import './App.css';
import Navigation from './components/nav_dots/Navigation';
import Header from "./components/Header_Component/Header";
import Flow from "./components/flow_plot/Flow";
import ScrollLine from './components/line_connector/ScrollLineConnector';
import BarChart from './components/bar_chart/BarChart';
// import Burden from './components/burden_plot/Burden';


function App() {
  return (
    <div className="App">
     
      <div className="wrapper">
      <Navigation />
      <Header />
      <ScrollLine />
      <Flow />
      <BarChart />
      </div>
      
    </div>
  );
}

export default App;
