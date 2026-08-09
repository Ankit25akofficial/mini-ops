import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';

const Login = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    }
  };

  return (
    <StyledLogin>
      <div className="card">
        {/* The checked state controls the monkey hands animation */}
        <input 
          type="checkbox" 
          className="blind-check" 
          id="blind-input" 
          name="blindcheck" 
          checked={!showPassword} 
          onChange={() => setShowPassword(!showPassword)}
          hidden 
        />
        <label htmlFor="blind-input" className="blind_input">
          <span className="hide">Hide</span>
          <span className="show">Show</span>
        </label>
        
        <form className="form" onSubmit={handleSubmit}>
          <div className="title">Sign In</div>
          
          {error && <div className="error-alert">{error}</div>}
          
          <label className="label_input" htmlFor="email-input">Username</label>
          <input 
            spellCheck="false" 
            className="input" 
            type="text" 
            name="username" 
            id="email-input" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            required
            placeholder="Enter username (e.g. admin)"
          />
          
          <div className="frg_pss">
            <label className="label_input" htmlFor="password-input">Password</label>
          </div>
          <input 
            spellCheck="false" 
            className="input" 
            type={showPassword ? 'text' : 'password'} 
            name="password" 
            id="password-input" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
            placeholder="Enter password (e.g. admin123)"
          />
          
          <button className="submit" type="submit" disabled={loading}>
            {loading ? <Loader /> : 'Submit'}
          </button>
        </form>
        
        <label htmlFor="blind-input" className="avatar">
          <svg xmlns="http://www.w3.org/2000/svg" width={35} height={35} viewBox="0 0 64 64" id="monkey">
            <ellipse cx="53.7" cy={33} rx="8.3" ry="8.2" fill="#89664c" />
            <ellipse cx="53.7" cy={33} rx="5.4" ry="5.4" fill="#ffc5d3" />
            <ellipse cx="10.2" cy={33} rx="8.2" ry="8.2" fill="#89664c" />
            <ellipse cx="10.2" cy={33} rx="5.4" ry="5.4" fill="#ffc5d3" />
            <g fill="#89664c">
              <path d="m43.4 10.8c1.1-.6 1.9-.9 1.9-.9-3.2-1.1-6-1.8-8.5-2.1 1.3-1 2.1-1.3 2.1-1.3-20.4-2.9-30.1 9-30.1 19.5h46.4c-.7-7.4-4.8-12.4-11.8-15.2" />
              <path d="m55.3 27.6c0-9.7-10.4-17.6-23.3-17.6s-23.3 7.9-23.3 17.6c0 2.3.6 4.4 1.6 6.4-1 2-1.6 4.2-1.6 6.4 0 9.7 10.4 17.6 23.3 17.6s23.3-7.9 23.3-17.6c0-2.3-.6-4.4-1.6-6.4 1-2 1.6-4.2 1.6-6.4" />
            </g>
            <path d="m52 28.2c0-16.9-20-6.1-20-6.1s-20-10.8-20 6.1c0 4.7 2.9 9 7.5 11.7-1.3 1.7-2.1 3.6-2.1 5.7 0 6.1 6.6 11 14.7 11s14.7-4.9 14.7-11c0-2.1-.8-4-2.1-5.7 4.4-2.7 7.3-7 7.3-11.7" fill="#e0ac7e" />
            <g fill="#3b302a" className="monkey-eye-nose">
              <path d="m35.1 38.7c0 1.1-.4 2.1-1 2.1-.6 0-1-.9-1-2.1 0-1.1.4-2.1 1-2.1.6.1 1 1 1 2.1" />
              <path d="m30.9 38.7c0 1.1-.4 2.1-1 2.1-.6 0-1-.9-1-2.1 0-1.1.4-2.1 1-2.1.5.1 1 1 1 2.1" />
              <ellipse cx="40.7" cy="31.7" rx="3.5" ry="4.5" className="monkey-eye-r" />
              <ellipse cx="23.3" cy="31.7" rx="3.5" ry="4.5" className="monkey-eye-l" />
            </g>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" width={35} height={35} viewBox="0 0 64 64" id="monkey-hands">
            <path fill="#89664C" d="M9.4,32.5L2.1,61.9H14c-1.6-7.7,4-21,4-21L9.4,32.5z" />
            <path fill="#FFD6BB" d="M15.8,24.8c0,0,4.9-4.5,9.5-3.9c2.3,0.3-7.1,7.6-7.1,7.6s9.7-8.2,11.7-5.6c1.8,2.3-8.9,9.8-8.9,9.8
        s10-8.1,9.6-4.6c-0.3,3.8-7.9,12.8-12.5,13.8C11.5,43.2,6.3,39,9.8,24.4C11.6,17,13.3,25.2,15.8,24.8" />
            <path fill="#89664C" d="M54.8,32.5l7.3,29.4H50.2c1.6-7.7-4-21-4-21L54.8,32.5z" />
            <path fill="#FFD6BB" d="M48.4,24.8c0,0-4.9-4.5-9.5-3.9c-2.3,0.3,7.1,7.6,7.1,7.6s-9.7-8.2-11.7-5.6c-1.8,2.3,8.9,9.8,8.9,9.8
        s-10-8.1-9.7-4.6c0.4,3.8,8,12.8,12.6,13.8c6.6,1.3,11.8-2.9,8.3-17.5C52.6,17,50.9,25.2,48.4,24.8" />
          </svg>
        </label>
      </div>

      <div className="login-footer">
        <p>Demo Accounts</p>
        <div className="demo-accounts">
          <span>admin / admin123 (Full Access)</span>
          <span>sales / sales123 (CRM + Challans)</span>
          <span>warehouse / warehouse123 (Stock)</span>
          <span>accounts / accounts123 (Accounts)</span>
        </div>
      </div>
    </StyledLogin>
  );
};

const StyledLogin = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: var(--bg-primary, #0b0f19);
  padding: 20px;
  position: relative;
  overflow: hidden;

  /* Decorative glowing ambient backdrops */
  &::before {
    content: '';
    position: absolute;
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, rgba(0, 0, 0, 0) 70%);
    top: -100px;
    right: -100px;
    z-index: 0;
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0, 0, 0, 0) 70%);
    bottom: -100px;
    left: -100px;
    z-index: 0;
    pointer-events: none;
  }

  .card {
    --p: 32px;
    --h-form: auto;
    --w-form: 380px;
    --input-px: 0.75rem;
    --input-py: 0.65rem;
    --submit-h: 42px;
    --blind-w: 64px;
    --space-y: 0.5rem;
    width: var(--w-form);
    height: var(--h-form);
    max-width: 100%;
    border-radius: 16px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    flex-direction: column;
    overflow: hidden;
    padding: var(--p);
    z-index: 10;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
    -webkit-user-select: none;
    user-select: none;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .avatar {
    --sz-avatar: 130px;
    order: 0;
    width: var(--sz-avatar);
    min-width: var(--sz-avatar);
    max-width: var(--sz-avatar);
    height: var(--sz-avatar);
    min-height: var(--sz-avatar);
    max-height: var(--sz-avatar);
    border: 1px solid var(--border-color);
    border-radius: 9999px;
    overflow: hidden;
    cursor: pointer;
    z-index: 2;
    perspective: 80px;
    position: relative;
    margin: 0 0 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--bg-primary);
    --sz-svg: calc(var(--sz-avatar) - 10px);
  }
  
  .avatar svg {
    position: absolute;
    transition:
      transform 0.2s ease-in,
      opacity 0.1s;
    transform-origin: 50% 100%;
    height: var(--sz-svg);
    width: var(--sz-svg);
    pointer-events: none;
  }
  
  .avatar svg#monkey {
    z-index: 1;
  }
  
  .avatar svg#monkey-hands {
    z-index: 2;
    transform-style: preserve-3d;
    transform: translateY(calc(var(--sz-avatar) / 1.25)) rotateX(-21deg);
  }

  .avatar::before {
    content: "";
    border-radius: 45%;
    width: calc(var(--sz-svg) / 3.889);
    height: calc(var(--sz-svg) / 5.833);
    border: 0;
    border-bottom: calc(var(--sz-svg) * (4 / 100)) solid #3c302a;
    bottom: 20%;
    position: absolute;
    transition: all 0.2s ease;
    z-index: 3;
  }
  
  .blind-check:checked ~ .avatar::before {
    width: calc(var(--sz-svg) * (9 / 100));
    height: 0;
    border-radius: 50%;
    border-bottom: calc(var(--sz-svg) * (10 / 100)) solid #3c302a;
  }
  
  .avatar svg#monkey .monkey-eye-r,
  .avatar svg#monkey .monkey-eye-l {
    animation: blink 10s 1s infinite;
    transition: all 0.2s ease;
  }
  
  @keyframes blink {
    0%,
    2%,
    4%,
    26%,
    28%,
    71%,
    73%,
    100% {
      ry: 4.5;
      cy: 31.7;
    }
    1%,
    3%,
    27%,
    72% {
      ry: 0.5;
      cy: 30;
    }
  }
  
  .blind-check:checked ~ .avatar svg#monkey .monkey-eye-r,
  .blind-check:checked ~ .avatar svg#monkey .monkey-eye-l {
    ry: 0.5;
    cy: 30;
  }
  
  .blind-check:checked ~ .avatar svg#monkey-hands {
    transform: translate3d(0, 0, 0) rotateX(0deg);
  }
  
  .avatar svg#monkey,
  .avatar::before,
  .avatar svg#monkey .monkey-eye-nose,
  .avatar svg#monkey .monkey-eye-r,
  .avatar svg#monkey .monkey-eye-l {
    transition: all 0.2s ease;
  }
  
  .blind-check:checked ~ .form:focus-within ~ .avatar svg#monkey,
  .blind-check:checked ~ .form:focus-within ~ .avatar::before,
  .blind-check:checked ~ .form:focus-within ~ .avatar svg#monkey .monkey-eye-nose,
  .blind-check:checked ~ .form:focus-within ~ .avatar svg#monkey .monkey-eye-r,
  .blind-check:checked ~ .form:focus-within ~ .avatar svg#monkey .monkey-eye-l {
    animation: none;
  }
  
  .form:focus-within ~ .avatar svg#monkey {
    animation: slick 3s ease infinite 1s;
    --center: rotateY(0deg);
    --left: rotateY(-4deg);
    --right: rotateY(4deg);
  }
  
  .form:focus-within ~ .avatar::before,
  .form:focus-within ~ .avatar svg#monkey .monkey-eye-nose,
  .blind-check:not(:checked)
    ~ .form:focus-within
    ~ .avatar
    svg#monkey
    .monkey-eye-r,
  .blind-check:not(:checked)
    ~ .form:focus-within
    ~ .avatar
    svg#monkey
    .monkey-eye-l {
    ry: 3;
    cy: 35;
    animation: slick 3s ease infinite 1s;
    --center: translateX(0);
    --left: translateX(-0.5px);
    --right: translateX(0.5px);
  }
  
  @keyframes slick {
    0%,
    100% {
      transform: var(--center);
    }
    25% {
      transform: var(--left);
    }
    75% {
      transform: var(--right);
    }
  }

  .card label.blind_input {
    -webkit-user-select: none;
    user-select: none;
    cursor: pointer;
    z-index: 4;
    position: absolute;
    border: none;
    right: calc(var(--p) + (var(--input-px) / 2));
    bottom: calc(
      var(--p) + var(--submit-h) + var(--space-y) + (var(--input-py) / 1) + 8px
    );
    padding: 4px 0;
    width: var(--blind-w);
    border-radius: 4px;
    background-color: var(--bg-primary);
    color: var(--text-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 700;
  }
  
  .card label.blind_input:before {
    content: "";
    position: absolute;
    left: calc((var(--input-px) / 2) * -1);
    top: 0;
    height: 100%;
    width: 1px;
    background: var(--border-color);
  }
  
  .card label.blind_input:hover {
    color: var(--accent-color);
    background-color: var(--bg-hover);
  }
  
  .blind-check ~ label.blind_input span.show,
  .blind-check:checked ~ label.blind_input span.hide {
    display: none;
  }
  
  .blind-check ~ label.blind_input span.hide,
  .blind-check:checked ~ label.blind_input span.show {
    display: block;
  }

  .form {
    order: 1;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    flex-direction: column;
    width: 100%;
  }

  .form .title {
    width: 100%;
    font-size: 1.5rem;
    font-weight: 800;
    margin-top: 0;
    margin-bottom: 1rem;
    padding-top: 0;
    padding-bottom: 1rem;
    color: var(--text-main);
    border-bottom: 2px solid var(--border-color);
  }

  .form .label_input {
    white-space: nowrap;
    font-size: 0.85rem;
    margin-top: calc(var(--space-y) / 2);
    color: var(--text-muted);
    font-weight: 700;
    display: inline;
    text-align: left;
    margin-right: auto;
    position: relative;
    z-index: 9;
    -webkit-user-select: none;
    user-select: none;
  }

  .form .input {
    resize: vertical;
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    outline: none;
    padding: var(--input-py) var(--input-px);
    font-size: 15px;
    width: 100%;
    color: var(--text-main);
    margin: var(--space-y) 0;
    transition: all 0.2s ease;
  }
  
  .form .input#password-input {
    padding-right: calc(var(--blind-w) + var(--input-px) + 4px);
  }
  
  .form .input:focus {
    border-color: var(--accent-color, #7c3aed);
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15);
  }
  
  .form .frg_pss {
    width: 100%;
    display: inline-flex;
    align-items: center;
  }

  .form .submit {
    height: var(--submit-h);
    width: 100%;
    outline: none;
    cursor: pointer;
    background: linear-gradient(135deg, #7c3aed, #6366f1);
    border: none;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.95rem;
    text-align: center;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    margin: var(--space-y) 0 0;
    transition: all 0.2s ease;
    box-shadow: 0 4px 10px rgba(124, 58, 237, 0.2);
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .form .submit:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
  
  .form .submit:active:not(:disabled) {
    transform: translateY(0);
  }
  
  .form .submit:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .error-alert {
    background-color: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: var(--danger-color, #ef4444);
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 0.82rem;
    font-weight: 600;
    margin-bottom: 12px;
    text-align: center;
    width: 100%;
  }

  .login-footer {
    margin-top: 24px;
    font-size: 0.72rem;
    color: var(--text-muted, #9ca3af);
    width: 380px;
    max-width: 100%;
    z-index: 10;

    p {
      font-weight: 800;
      margin: 0 0 8px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-muted);
      text-align: center;
    }

    .demo-accounts {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-family: monospace;
      background-color: var(--bg-secondary, #111827);
      padding: 12px;
      border-radius: 12px;
      border: 1px solid var(--border-color, #374151);
      color: var(--text-muted);
      text-align: center;
    }
  }
`;

export default Login;
