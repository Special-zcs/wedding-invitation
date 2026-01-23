import { createContext, useContext, useState, useEffect } from 'react';
import { siteConfig as initialConfig } from '../config/siteConfig';

const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
  // In a real app, we might load this from a backend or localStorage
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('wedding-site-config');
    return saved ? JSON.parse(saved) : initialConfig;
  });

  const updateConfig = (newConfig) => {
    setConfig(newConfig);
    localStorage.setItem('wedding-site-config', JSON.stringify(newConfig));
  };

  const resetConfig = () => {
    setConfig(initialConfig);
    localStorage.removeItem('wedding-site-config');
  };

  return (
    <ConfigContext.Provider value={{ config, updateConfig, resetConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
