import './App.css';
import Navigation from './components/nav_dots/Navigation';
import Header from "./components/Header_Component/Header";
import Flow from "./components/flow_plot/Flow";
import DevProc from './components/dev_process/DevProc';

function App() {
  return (
    <div className="App">
     
      <div className="wrapper">
      <Navigation />
      
      <Header />
      
      <Flow />
      <DevProc />
      </div>
      
    </div>
  );
}

export default App;
