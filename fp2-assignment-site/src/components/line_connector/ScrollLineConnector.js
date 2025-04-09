import React, { useEffect, useState } from 'react';
import './ScrollLineConnector.css';

const ScrollLine = () => {
  const [lineHeight, setLineHeight] = useState(0);
  const [isScrollComplete, setIsScrollComplete] = useState(false);
  const [showInfoContainer, setShowInfoContainer] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const header = document.getElementById('info_1');
      const headerBottom = header.offsetTop + header.offsetHeight;
      const scrollPosition = window.scrollY + 400;

      if (scrollPosition < header.offsetTop) {
        setLineHeight(0); // Before the header
        setIsScrollComplete(false);
        setShowInfoContainer(false);
      } else if (scrollPosition < headerBottom) {
        const progress = (scrollPosition - header.offsetTop) / header.offsetHeight;
        setLineHeight(scrollPosition - header.offsetTop); // While scrolling in the header
        setIsScrollComplete(false);
        setShowInfoContainer(progress >= 0.4); // Show info-container at 50% scroll
      } else {
        setLineHeight(header.offsetHeight); // After scrolling past the header
        setIsScrollComplete(true);
        setShowInfoContainer(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className='info_wrapper' id='info_1'>
      <div className="vertical-line-container">
        <div className="start-node"> <div className="node-middle"></div></div>
        <div className="vertical-line" style={{ height: `${lineHeight}px` }}></div>
        {isScrollComplete && (
          <div
            className="end-node"
            style={{ position: 'absolute', top: `${lineHeight}px` }}
          >
            <div className="node-middle"></div>
          </div>
        )}
      </div>
      <p
        className='info-container'
        style={{ opacity: showInfoContainer ? 1 : 0 }}
      >
        Speculation, or the practice of housing investment for profit generation, has been a major part of the Boston housing ecosystem. In our analysis, we seek to understand the impact of speculation on housing availability and prices as well as the mechanisms by which speculation is causing disproportionate impact on the affordable housing market. We start our exploration with a visualization showing the profit generation of speculators and non-investors alongside the S&P Boston, MA Home Pricing Index (BOXRSA). 
        
        You will notice certain trends about the data, including large drops in profits during the 2008 recession and a steady increase in investor profits over time. We also see that the BOXRSA has been steadily increasing over time, indicating that housing prices are rising. This is a concerning trend, as it suggests that speculation is driving up housing prices and making it more difficult for people to afford homes.
      </p>
    </div>
  );
};

export default ScrollLine;