import React, { useEffect, useState, useRef } from 'react';
import './Navigation.css'; // Ensure this file contains the necessary styles.

const sections = ['home', 'corp', 'bar', 'viz', 'burden', 'race']; // Section IDs

// Define a dictionary for custom labels
const sectionLabels = {
  home: 'Start',
  corp: 'Corporate Ownership',
  bar: 'Housing Cost',
  viz: 'Flipping',
  burden: 'Evictions',
  race: 'Displacement',
};

export default function NavigationDots() {
  const [active, setActive] = useState('');
  const [isHidden, setIsHidden] = useState(false);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight / 2 - 100;

      for (let section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;

          if (scrollPosition >= top && scrollPosition < top + height) {
            setActive(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Set active state on load
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const checkOverlap = () => {
      const sidebar = sidebarRef.current;
      if (!sidebar) return;

      const sidebarRect = sidebar.getBoundingClientRect();
      const elementsToObserve = document.querySelectorAll('.observe-overlap');

      let isOverlapping = false;

      elementsToObserve.forEach((element) => {
        const elementRect = element.getBoundingClientRect();

        // Check for actual visual overlap (both horizontally and vertically)
        const isHorizontallyOverlapping =
          sidebarRect.left < elementRect.right &&
          sidebarRect.right > elementRect.left;
        const isVerticallyOverlapping =
          sidebarRect.top < elementRect.bottom &&
          sidebarRect.bottom > elementRect.top;

        if (isHorizontallyOverlapping && isVerticallyOverlapping) {
          isOverlapping = true;
        }
      });

      setIsHidden(isOverlapping);
    };

    // Run the check on scroll and resize
    window.addEventListener('scroll', checkOverlap);
    window.addEventListener('resize', checkOverlap);

    // Initial check
    checkOverlap();

    return () => {
      window.removeEventListener('scroll', checkOverlap);
      window.removeEventListener('resize', checkOverlap);
    };
  }, []);

  const handleClick = (section) => {
    const el = document.getElementById(section);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      className={`dot-sidebar ${isHidden ? 'hidden' : ''}`}
      ref={sidebarRef}
    >
      {sections.map((section) => (
        <button
          key={section}
          onClick={() => handleClick(section)}
          className={`dot ${active === section ? 'active' : ''}`}
          aria-label={`Go to ${sectionLabels[section]}`}
        >
          <span className="dot-label">{sectionLabels[section]}</span>
        </button>
      ))}
    </div>
  );
}