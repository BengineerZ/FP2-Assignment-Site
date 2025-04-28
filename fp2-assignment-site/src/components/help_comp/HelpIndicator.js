import React, { useState } from "react";
import "./HelpIndicator.css";

const HelpIndicator = ({ children, helpText }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  return (
    <div className="help-indicator">
      <span className="help-icon" onClick={toggleModal} title="Click for help">
        💡
      </span>
      <span className="help-text">{children}</span>
      {isModalOpen && (
        <div className="help-modal">
          <div className="help-modal-content">
            <span className="close-modal" onClick={toggleModal}>
              &times;
            </span>
            <p>{helpText}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpIndicator;