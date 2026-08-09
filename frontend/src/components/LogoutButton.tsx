import React from 'react';
import styled from 'styled-components';

interface LogoutButtonProps {
  onClick?: () => void;
  text?: string;
  hoverText?: string;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ onClick, text = "Logout", hoverText = "Logout" }) => {
  return (
    <StyledWrapper>
      <button onClick={onClick}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" x2="9" y1="12" y2="12"/>
        </svg>
        <span className="now">{hoverText}</span>
        <span className="play">{text}</span>
      </button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 16px;
    color: var(--text-main);
    cursor: pointer;
    border: 1px solid var(--border-color);
    letter-spacing: 0.5px;
    font-weight: 700;
    font-size: 13px;
    background-color: var(--bg-hover);
    border-radius: 8px;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
    height: 42px;
  }

  button:active {
    transform: scale(0.95);
    transition: all 100ms ease;
  }

  button svg {
    transition: all 0.3s ease;
    z-index: 2;
    stroke: var(--text-main);
  }

  .play {
    transition: all 0.3s ease;
    z-index: 2;
  }

  .now {
    position: absolute;
    left: 50%;
    transform: translate(-50%, 150%);
    transition: all 0.3s ease;
    z-index: 2;
    color: white;
    font-weight: 800;
    white-space: nowrap;
  }

  button:hover {
    background-color: #ef4444;
    border-color: #ef4444;
    color: white;
  }

  button:hover svg {
    transform: scale(1.1);
    stroke: white;
  }

  button:hover .play {
    transform: translateY(-150%);
    opacity: 0;
  }

  button:hover .now {
    transform: translate(-50%, -50%);
    top: 50%;
  }
`;

export default LogoutButton;
