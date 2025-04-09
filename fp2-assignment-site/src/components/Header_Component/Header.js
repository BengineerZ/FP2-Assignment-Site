import React, { useEffect, useState } from 'react';
import './Header.css';
import { ReactComponent as House } from './images/houses-svgrepo-com.svg';

const Header = () => {
  const [lineHeight, setLineHeight] = useState(0);
  const [isScrollComplete, setIsScrollComplete] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const header = document.getElementById('home');
      const headerBottom = header.offsetTop + header.offsetHeight;
      const scrollPosition = window.scrollY;

      if (scrollPosition < header.offsetTop) {
        setLineHeight(0); // Before the header
        setIsScrollComplete(false);
      } else if (scrollPosition < headerBottom) {
        setLineHeight(scrollPosition - header.offsetTop); // While scrolling in the header
        setIsScrollComplete(false);
      } else {
        setLineHeight(header.offsetHeight); // After scrolling past the header
        setIsScrollComplete(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className='header section' id='home'>
      {/* <div className="vertical-line-container">
        <div className="start-node"> <div className="node-middle"></div></div>
        <div className="vertical-line" style={{ height: `${lineHeight}px` }}></div>
        {isScrollComplete && <div className="end-node"><div className="node-middle"></div></div>}
      </div> */}
      <h1>Homes for Profit, Not for People</h1>
      <h3>Proof of Concept</h3>
      <h4>How has speculative investment contributed to the growing inaccessibility of affordable housing?</h4>
      <House className="house" />
    </header>
  );
};

export default Header;