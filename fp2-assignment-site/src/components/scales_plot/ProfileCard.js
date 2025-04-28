import React from 'react';
import FancyScale from './FancyScale';
import './ProfileCard.css';

/**
 * ProfileCard
 * -----------
 * Props
 *   region       string | null
 *   ratio        number
 *   currentRate  number
 *   onClose      () => void   – called when user clicks the “×”
 *
 * Renders the scale only (large) when region == null.
 */
export default function ProfileCard({ region, ratio, currentRate, onClose }) {
  const overview = region == null;

  return (
    <div className={`profile-card ${overview ? 'overview' : ''}`}>
      {/* close icon – only when a town is selected */}
      {!overview && (
        <button className="profile-card__close" onClick={onClose} title="Reset">
          ×
        </button>
      )}

      {/* animated balance scale */}
      <FancyScale ratio={ratio} duration={600} />
      {overview && (
        <p className="profile-card__text">
          Overall corporate-ownership rate:&nbsp;
         <strong>{(currentRate * 100).toFixed(1)} %</strong>
         <p className="profile-card__text">Relative ownership rate shown between owner occupied properties and corporate-owned, compared to 2000 levels.</p>
        </p>
        
      )}

      {/* detail text (hidden in overview mode) */}
      {!overview && (
        <>
          <h3 className="profile-card__title">{region}</h3>
          <p className="profile-card__text">
            Corporate-ownership rate:&nbsp;
            <strong>{(currentRate * 100).toFixed(1)} %</strong>
          </p>
          <p className="profile-card__text">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec eu
            bibendum velit. Quisque venenatis, nunc sit amet facilisis pulvinar,
            tellus nibh vulputate purus, at venenatis turpis odio at felis.
          </p>
        </>
      )}
    </div>
  );
}
