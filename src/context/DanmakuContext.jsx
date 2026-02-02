import { createContext, useContext, useState, useMemo } from 'react';
import { useConfig } from './ConfigContext';

const DanmakuContext = createContext();

export const DanmakuProvider = ({ children }) => {
  const { config, updateConfig } = useConfig();
  const defaultMessages = useMemo(() => ([
    "Alice : Wishing you a lifetime of love and happiness!",
    "Bob : Congratulations on your wedding day!",
    "Charlie : May your love grow stronger each and every day.",
    "Diana : Best wishes on this wonderful journey, as you build your new lives together."
  ]), []);
  const wishes = Array.isArray(config?.wishes?.messages) ? config.wishes.messages : defaultMessages;

  const [isDanmakuEnabled, setIsDanmakuEnabled] = useState(true);

  const addWish = (name, message) => {
    // Format: "Guest Name : Message"
    const formattedWish = `${name.trim()} : ${message.trim()}`;
    const nextMessages = [formattedWish, ...wishes];
    updateConfig({
      ...config,
      wishes: {
        ...config.wishes,
        messages: nextMessages
      }
    });
  };

  const removeWish = (index) => {
    const nextMessages = wishes.filter((_, i) => i !== index);
    updateConfig({
      ...config,
      wishes: {
        ...config.wishes,
        messages: nextMessages
      }
    });
  };

  const clearWishes = () => {
      if (window.confirm('Are you sure you want to clear all wishes?')) {
        updateConfig({
          ...config,
          wishes: {
            ...config.wishes,
            messages: []
          }
        });
      }
  };

  const toggleDanmaku = () => {
      setIsDanmakuEnabled(prev => !prev);
  }

  return (
    <DanmakuContext.Provider value={{ wishes, addWish, removeWish, clearWishes, isDanmakuEnabled, toggleDanmaku }}>
      {children}
    </DanmakuContext.Provider>
  );
};

export const useDanmaku = () => {
  const context = useContext(DanmakuContext);
  if (!context) {
    throw new Error('useDanmaku must be used within a DanmakuProvider');
  }
  return context;
};
