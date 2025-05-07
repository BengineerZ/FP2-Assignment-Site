import React from "react";
import "./HelpIndicator.css";

const HelpIndicator = ({ children, helpText }) => {
  return (
    <div className="help-indicator">
      <span className="help-icon" title="Hover for help">
        💡
      </span>
      <span className="help-text">{children}</span>
      <div className="help-modal">
        <div className="help-modal-content">
          <p>{helpText}</p>
        </div>
      </div>
    </div>
  );
};

export default HelpIndicator;