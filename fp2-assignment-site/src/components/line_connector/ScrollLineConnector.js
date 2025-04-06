import React, { useEffect, useRef, useState } from 'react';

const ScrollLineConnector = ({ startSectionId, endSectionId, scrollHeight }) => {
  const startSectionRef = useRef(null);
  const endSectionRef = useRef(null);
  const lineRef = useRef(null);

  const [lineHeight, setLineHeight] = useState(0);

  // Function to calculate the scroll progress and update the line height
  const handleScroll = () => {
    if (!startSectionRef.current || !endSectionRef.current || !lineRef.current) return;

    // Get the positions of the start and end sections relative to the viewport
    const startSectionBottom = startSectionRef.current.getBoundingClientRect().bottom + window.scrollY;
    const endSectionTop = endSectionRef.current.getBoundingClientRect().top + window.scrollY;

    // The scroll position (current scrollY)
    const scrollY = window.scrollY + window.innerHeight / 2;

    // Calculate the total scrollable distance between the two sections
    const totalScrollDistance = endSectionTop - startSectionBottom;

    // Ensure we're within the bounds of the two sections
    if (scrollY >= startSectionBottom && scrollY <= endSectionTop) {
      // Calculate scroll progress as a percentage (0 to 1)
      const progress = Math.min(Math.max((scrollY - startSectionBottom) / totalScrollDistance, 0), 1);

      // Calculate the line height based on the scroll progress and the desired scroll height
      const currentLineHeight = progress * scrollHeight;

      // Set the line height dynamically
      setLineHeight(currentLineHeight);

      // Position the line correctly (start at the bottom of startSection)
      lineRef.current.style.top = `${startSectionBottom - window.scrollY}px`;
    }
  };

  // Set up scroll event listener when component mounts
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initialize line height on component mount

    return () => {
      window.removeEventListener('scroll', handleScroll); // Cleanup scroll listener
    };
  }, []); // Empty dependency array ensures this effect runs only once

  return (
    <div style={{ position: 'relative' }}>
      {/* The line between the two sections */}
      <div
        ref={lineRef}
        className="line"
        style={{
          height: `${lineHeight}px`, // Use dynamic height
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          transition: 'height 0.2s ease', // Optional: Add smooth transition for height change
        }}
      ></div>
    </div>
  );
};

export default ScrollLineConnector;