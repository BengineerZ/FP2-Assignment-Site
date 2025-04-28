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
        Speculative investment - <strong>Speculation</strong> - involves purchasing properties primarily to profit from rapid increases in their value for quick resale, rather than for long-term use or rental income, often contributing to <strong>price inflation and market instability</strong>.
        </p>
    </div>
  );
};

export default ScrollLine;