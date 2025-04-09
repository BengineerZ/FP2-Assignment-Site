import React, { useEffect, useState } from 'react';
import './Navigation.css'; // We'll add this CSS file next.

const sections = ['home', 'viz', 'dev']; // section IDs

export default function NavigationDots() {
  const [active, setActive] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight / 2 -100;

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
    handleScroll(); // set active state on load
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = (section) => {
    const el = document.getElementById(section);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="dot-sidebar">
      {sections.map((section) => (
        <button
          key={section}
          onClick={() => handleClick(section)}
          className={`dot ${active === section ? 'active' : ''}`}
          aria-label={`Go to ${section}`}
        />
      ))}
    </div>
  );
}