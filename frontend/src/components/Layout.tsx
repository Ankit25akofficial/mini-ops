import React from 'react';
import { Outlet } from 'react-router-dom';
import styled from 'styled-components';
import { useAppTheme } from '../context/ThemeContext';
import StaggeredMenu from './StaggeredMenu';
import CookieBanner from './CookieBanner';

const Layout = () => {
  const { theme } = useAppTheme();
  const menuItems = [
    { label: 'Dashboard', ariaLabel: 'Go to dashboard', link: '/' },
    { label: 'Inventory', ariaLabel: 'Check warehouse stock counts', link: '/inventory' },
    { label: 'Work Orders', ariaLabel: 'Manage work orders', link: '/work-orders' },
    { label: 'Internal Transfers', ariaLabel: 'Manage stock transfers', link: '/transfers' },
    { label: 'Customer Orders', ariaLabel: 'Manage customer sales orders', link: '/orders' }
  ];

  const socialItems = [
    { label: 'Twitter', link: 'https://twitter.com' },
    { label: 'GitHub', link: 'https://github.com' },
    { label: 'LinkedIn', link: 'https://linkedin.com' }
  ];

  return (
    <StyledLayout>
      <StaggeredMenu 
        position="right"
        items={menuItems}
        socialItems={socialItems}
        displaySocials={true}
        displayItemNumbering={true}
        colors={theme === 'dark' ? ['#111827', '#7c3aed'] : ['#f3f4f6', '#818cf8']}
        accentColor="#7c3aed"
      />
      <div className="main-wrapper">
        <main className="content">
          <Outlet />
        </main>
      </div>
      <CookieBanner />
    </StyledLayout>
  );
};

const StyledLayout = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-main);
  transition: background-color 0.3s ease, color 0.3s ease;

  .main-wrapper {
    flex: 1;
    width: 100%;
    margin-top: 80px; /* Offset to clear the fixed navigation header */
    display: flex;
    flex-direction: column;
  }

  .content {
    flex: 1;
    padding: 32px;
    max-width: 1400px;
    width: 100%;
    margin: 0 auto;
  }

  @media (max-width: 1024px) {
    .content {
      padding: 16px;
    }
  }
`;

export default Layout;
