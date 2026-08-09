import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    // Default to dark mode for premium aesthetics!
    return 'dark';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark-mode');
      root.style.setProperty('--bg-primary', '#0b0f19');
      root.style.setProperty('--bg-secondary', '#111827');
      root.style.setProperty('--text-main', '#f3f4f6');
      root.style.setProperty('--text-muted', '#9ca3af');
      root.style.setProperty('--border-color', '#374151');
      root.style.setProperty('--accent-color', '#7c3aed'); // Violet accent
      root.style.setProperty('--card-bg', '#1f2937');
      root.style.setProperty('--bg-hover', '#374151');
      root.style.setProperty('--bg-active', '#4b5563');
      root.style.setProperty('--danger-color', '#ef4444');
      root.style.setProperty('--success-color', '#10b981');
      root.style.setProperty('--warning-color', '#f59e0b');
    } else {
      root.classList.remove('dark-mode');
      root.style.setProperty('--bg-primary', '#f3f4f6');
      root.style.setProperty('--bg-secondary', '#ffffff');
      root.style.setProperty('--text-main', '#111827');
      root.style.setProperty('--text-muted', '#6b7280');
      root.style.setProperty('--border-color', '#e5e7eb');
      root.style.setProperty('--accent-color', '#6d28d9');
      root.style.setProperty('--card-bg', '#ffffff');
      root.style.setProperty('--bg-hover', '#f3f4f6');
      root.style.setProperty('--bg-active', '#e5e7eb');
      root.style.setProperty('--danger-color', '#dc2626');
      root.style.setProperty('--success-color', '#059669');
      root.style.setProperty('--warning-color', '#d97706');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};
