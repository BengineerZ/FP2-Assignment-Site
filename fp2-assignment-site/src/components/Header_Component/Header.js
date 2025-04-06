import React from 'react';

import './Header.css';  // Import Header.module.css

import { ReactComponent as House } from './images/houses-svgrepo-com.svg';

const Header = () => {
  return (
    <header className='header section' id='home'>
      <h1>Homes for Profit, Not for People</h1>
      <h3>Proof of Concept</h3>
      {/* <h2>Some kind of subheading</h2> */}
      
      <h4>How has speculative investment contributed to the growing inaccessibility of affordable housing?</h4>
      <House className="house" />
    </header>
  );
};

export default Header;